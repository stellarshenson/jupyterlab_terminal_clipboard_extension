import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ITerminalTracker } from '@jupyterlab/terminal';

import { MainAreaWidget } from '@jupyterlab/apputils';

const PLUGIN_ID = 'jupyterlab_terminal_clipboard_extension:plugin';

/**
 * Decode a base64 string to UTF-8 text.
 */
function base64Decode(b64: string): string {
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Write text to the browser clipboard via the Clipboard API.
 * Falls back to execCommand for older browsers or non-secure contexts.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn(`[${PLUGIN_ID}] Clipboard API failed, trying fallback:`, err);
    }
  }

  // Fallback for non-secure contexts (http, iframe without permission)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error(`[${PLUGIN_ID}] All clipboard methods failed:`, err);
    return false;
  }
}

/**
 * Handle OSC 52 escape sequence data.
 *
 * OSC 52 format: Pc ; Pd
 *   Pc = clipboard target: c (clipboard), p (primary), s (secondary), or combinations
 *   Pd = base64-encoded data, or "?" to request clipboard contents
 */
function handleOsc52(data: string): boolean {
  const semicolonIdx = data.indexOf(';');
  if (semicolonIdx === -1) {
    console.warn(`[${PLUGIN_ID}] Malformed OSC 52: no semicolon`);
    return false;
  }

  const target = data.substring(0, semicolonIdx);
  const payload = data.substring(semicolonIdx + 1);

  // Ignore clipboard read requests (security risk, rarely supported)
  if (payload === '?') {
    console.debug(`[${PLUGIN_ID}] OSC 52 read request ignored (target: ${target})`);
    return true;
  }

  // Ignore empty payload (clear request) - just acknowledge
  if (payload === '') {
    console.debug(`[${PLUGIN_ID}] OSC 52 clear request (target: ${target})`);
    return true;
  }

  // Validate base64
  if (!/^[A-Za-z0-9+/=]+$/.test(payload)) {
    console.warn(`[${PLUGIN_ID}] OSC 52 invalid base64 payload`);
    return false;
  }

  let text: string;
  try {
    text = base64Decode(payload);
  } catch (err) {
    console.warn(`[${PLUGIN_ID}] OSC 52 base64 decode failed:`, err);
    return false;
  }

  writeToClipboard(text).then(success => {
    if (success) {
      console.debug(
        `[${PLUGIN_ID}] OSC 52: copied ${text.length} chars to clipboard (target: ${target})`
      );
    }
  });

  // Return true to indicate we handled the sequence (prevent xterm.js default)
  return true;
}

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

      console.debug(
        `[${PLUGIN_ID}] OSC 52 handler attached to terminal`
      );
    })
    .catch((err: Error) => {
      console.warn(
        `[${PLUGIN_ID}] Failed to attach OSC 52 handler:`,
        err
      );
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

    console.log(
      `[${PLUGIN_ID}] OSC 52 clipboard handler initialized`
    );
  }
};

export default plugin;
