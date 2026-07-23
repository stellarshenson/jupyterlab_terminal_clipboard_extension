/**
 * Pure clipboard helpers - OSC 52 decoding and browser clipboard writes.
 *
 * Deliberately free of JupyterLab imports so the logic stays unit-testable
 * without pulling the whole lab runtime into the test environment.
 */

const LOG_PREFIX = '[jupyterlab_terminal_clipboard_extension:plugin]';

/**
 * Decode a base64 string to UTF-8 text.
 */
export function base64Decode(b64: string): string {
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
export async function writeToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn(`${LOG_PREFIX} Clipboard API failed, trying fallback:`, err);
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
    console.error(`${LOG_PREFIX} All clipboard methods failed:`, err);
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
export function handleOsc52(data: string): boolean {
  const semicolonIdx = data.indexOf(';');
  if (semicolonIdx === -1) {
    console.warn(`${LOG_PREFIX} Malformed OSC 52: no semicolon`);
    return false;
  }

  const target = data.substring(0, semicolonIdx);
  const payload = data.substring(semicolonIdx + 1);

  // Ignore clipboard read requests (security risk, rarely supported)
  if (payload === '?') {
    console.debug(
      `${LOG_PREFIX} OSC 52 read request ignored (target: ${target})`
    );
    return true;
  }

  // Ignore empty payload (clear request) - just acknowledge
  if (payload === '') {
    console.debug(`${LOG_PREFIX} OSC 52 clear request (target: ${target})`);
    return true;
  }

  // Validate base64
  if (!/^[A-Za-z0-9+/=]+$/.test(payload)) {
    console.warn(`${LOG_PREFIX} OSC 52 invalid base64 payload`);
    return false;
  }

  let text: string;
  try {
    text = base64Decode(payload);
  } catch (err) {
    console.warn(`${LOG_PREFIX} OSC 52 base64 decode failed:`, err);
    return false;
  }

  writeToClipboard(text).then(success => {
    if (success) {
      console.debug(
        `${LOG_PREFIX} OSC 52: copied ${text.length} chars to clipboard (target: ${target})`
      );
    }
  });

  // Return true to indicate we handled the sequence (prevent xterm.js default)
  return true;
}
