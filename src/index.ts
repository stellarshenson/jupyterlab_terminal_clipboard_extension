import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ITerminalTracker } from '@jupyterlab/terminal';

import { MainAreaWidget, Notification } from '@jupyterlab/apputils';

import { handleOsc52, writeToClipboard } from './clipboard';

const PLUGIN_ID = 'jupyterlab_terminal_clipboard_extension:plugin';

export { base64Decode, handleOsc52, writeToClipboard } from './clipboard';

/**
 * Attach OSC 52 handler to a terminal widget.
 * Waits for the terminal to be ready, then registers the parser hook.
 */
function attachOsc52Handler(widget: MainAreaWidget): void {
  const terminal = widget.content;

  // Wait for the terminal to be ready before accessing xterm internals
  (terminal as any).ready
    .then(() => {
      const xterm = (terminal as any)._term;
      if (!xterm || !xterm.parser) {
        console.warn(
          `[${PLUGIN_ID}] Could not access xterm.js instance for terminal`
        );
        return;
      }

      // Register OSC 52 handler on the xterm.js parser
      const disposable = xterm.parser.registerOscHandler(52, handleOsc52);

      // Clean up when widget is disposed
      widget.disposed.connect(() => {
        disposable.dispose();
      });

      console.debug(`[${PLUGIN_ID}] OSC 52 handler attached to terminal`);
    })
    .catch((err: Error) => {
      console.warn(`[${PLUGIN_ID}] Failed to attach OSC 52 handler:`, err);
    });
}

/**
 * Initialization data for the jupyterlab_terminal_clipboard_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description:
    'Jupyterlab extension to handle copy to clipboard actions in a terminal to allow copy to clipboard of the browser/user',
  autoStart: true,
  optional: [ITerminalTracker],
  activate: (
    app: JupyterFrontEnd,
    terminalTracker: ITerminalTracker | null
  ) => {
    console.log(
      'JupyterLab extension jupyterlab_terminal_clipboard_extension is activated!'
    );

    // Generic copy-to-clipboard command, invokable from rendered markdown via
    // <a data-commandlinker-command="clipboard:copy-text"
    //    data-commandlinker-args='{"text": "..."}'>
    app.commands.addCommand('clipboard:copy-text', {
      label: 'Copy Text to Clipboard',
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
