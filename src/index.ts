import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ITerminalTracker } from '@jupyterlab/terminal';

import { MainAreaWidget, Notification } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { handleOsc52, writeToClipboard } from './clipboard';

const PLUGIN_ID =
  '@stellarshenson/jupyterlab-terminal-clipboard-extension:plugin';

export { base64Decode, handleOsc52, writeToClipboard } from './clipboard';

/**
 * Attach OSC 52 handler to a terminal widget.
 * Waits for the terminal to be ready, then registers the parser hook.
 */
function attachOsc52Handler(widget: MainAreaWidget): void {
  const terminal = widget.content;
  const session = (terminal as any).session;
  let xterm: any = null;
  let disposable: { dispose(): void } | null = null;

  // After every (re)connect the server resends its whole output buffer as the
  // first stdout message. An OSC 52 in it is an old copy: writing it again
  // would replace what the user has copied since.
  // shortcut: the first output of a new terminal is also taken as resent, fix when the server marks what it resends
  let replay = true;
  // The resent buffer arrived before xterm was ready
  let resent = false;
  // xterm runs write callbacks in queue order, so the flag clears only after
  // everything queued before it is parsed.
  const endReplay = () =>
    xterm.write('', () => {
      replay = false;
    });
  const onStatus = (_sender: unknown, status: string) => {
    if (status === 'connected') {
      replay = true;
    }
  };
  const onMessage = (_sender: unknown, msg: { type: string }) => {
    if (!replay || msg.type !== 'stdout') {
      return;
    }
    if (xterm) {
      // A microtask, so the widget's own slot has queued the message first
      queueMicrotask(endReplay);
    } else {
      resent = true;
    }
  };
  // Connected before the first message can arrive, not inside ready.then:
  // 'connected' alone does not tell whether the resent buffer has come yet.
  session.connectionStatusChanged.connect(onStatus);
  session.messageReceived.connect(onMessage);

  // Clean up when widget is disposed
  widget.disposed.connect(() => {
    disposable?.dispose();
    session.connectionStatusChanged.disconnect(onStatus);
    session.messageReceived.disconnect(onMessage);
  });

  // Wait for the terminal to be ready before accessing xterm internals
  (terminal as any).ready
    .then(() => {
      xterm = (terminal as any)._term;
      if (!xterm || !xterm.parser) {
        console.warn(
          `[${PLUGIN_ID}] Could not access xterm.js instance for terminal`
        );
        return;
      }
      if (resent) {
        // The widget has just queued the output it buffered while waiting
        endReplay();
      }

      // Register OSC 52 handler on the xterm.js parser
      disposable = xterm.parser.registerOscHandler(52, (data: string) => {
        if (replay) {
          console.debug(`[${PLUGIN_ID}] replayed OSC 52 ignored`);
          return true;
        }
        return handleOsc52(data);
      });

      console.debug(`[${PLUGIN_ID}] OSC 52 handler attached to terminal`);
    })
    .catch((err: Error) => {
      console.warn(`[${PLUGIN_ID}] Failed to attach OSC 52 handler:`, err);
    });
}

/**
 * Initialization data for the @stellarshenson/jupyterlab-terminal-clipboard-extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description:
    'Jupyterlab extension to handle copy to clipboard actions in a terminal to allow copy to clipboard of the browser/user',
  autoStart: true,
  optional: [ITerminalTracker, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    terminalTracker: ITerminalTracker | null,
    translator: ITranslator | null
  ) => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    console.log(
      'JupyterLab extension @stellarshenson/jupyterlab-terminal-clipboard-extension is activated!'
    );

    // Generic copy-to-clipboard command, invokable from rendered markdown via
    // <a data-commandlinker-command="clipboard:copy-text"
    //    data-commandlinker-args='{"text": "..."}'>
    app.commands.addCommand('clipboard:copy-text', {
      label: trans.__('Copy Text to Clipboard'),
      describedBy: {
        args: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description:
                'The text to write to the clipboard. An empty or absent value leaves the clipboard untouched.'
            }
          }
        }
      },
      execute: async args => {
        const text = String(args['text'] ?? '');
        if (!text) {
          return;
        }
        const ok = await writeToClipboard(text);
        if (ok) {
          Notification.success('Copied to clipboard', { autoClose: 2000 });
        } else {
          Notification.error('Clipboard copy failed', { autoClose: 3000 });
        }
      }
    });

    if (!terminalTracker) {
      console.warn(
        `[${PLUGIN_ID}] Terminal tracker not available - OSC 52 clipboard disabled`
      );
      return;
    }

    // Attach to existing terminals
    terminalTracker.forEach(widget => {
      attachOsc52Handler(widget);
    });

    // Attach to new terminals as they are created
    terminalTracker.widgetAdded.connect(
      (_sender: unknown, widget: MainAreaWidget) => {
        attachOsc52Handler(widget);
      }
    );

    console.log(`[${PLUGIN_ID}] OSC 52 clipboard handler initialized`);
  }
};

export default plugin;
