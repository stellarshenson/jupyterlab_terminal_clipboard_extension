/**
 * Pure clipboard helpers - OSC 52 decoding and browser clipboard writes.
 *
 * Deliberately free of JupyterLab imports so the logic stays unit-testable
 * without pulling the whole lab runtime into the test environment.
 *
 * Not quite stateless: one module-level slot holds a copy that arrived while
 * the document was unfocused, until focus comes back (see `deferUntilFocused`).
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
 *
 * Both paths need a focused document, so an unfocused call is refused before
 * either is tried: the Clipboard API would reject with NotAllowedError, and
 * the fallback would fail the same way after stealing the page's text
 * selection to do it. Callers that can wait should defer instead - the OSC 52
 * handler below does.
 */
export async function writeToClipboard(text: string): Promise<boolean> {
  if (!document.hasFocus()) {
    console.debug(
      `${LOG_PREFIX} Clipboard write skipped: the document is not focused`
    );
    return false;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // A focus lost during the await is the expected rejection here and the
      // entry gate cannot see it: debug rather than warn, and skip the
      // fallback, which would steal the page's selection to fail the same way.
      if (!document.hasFocus()) {
        console.debug(
          `${LOG_PREFIX} Clipboard write abandoned: focus lost during the write`
        );
        return false;
      }
      console.warn(`${LOG_PREFIX} Clipboard API write failed:`, err);
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
    if (!success) {
      // execCommand refuses by returning false rather than throwing, so the
      // catch below never sees it. Unlogged, the copy would vanish silently.
      console.warn(`${LOG_PREFIX} execCommand('copy') refused the write`);
    }
    return success;
  } catch (err) {
    console.error(`${LOG_PREFIX} All clipboard methods failed:`, err);
    return false;
  }
}

/**
 * The one copy waiting for focus.
 *
 * A single slot: a newer OSC 52 supersedes an older one. The browser clipboard
 * is itself a single slot, so replaying a backlog would leave exactly the same
 * value behind at more cost. The slot is module state shared by every terminal -
 * `src/index.ts` registers the bare `handleOsc52` reference for each one, so
 * there is no per-terminal identity to hang a queue off.
 *
 * The wait is bounded by `DEFER_MAX_AGE_MS`: it exists for a focus blip, and a
 * copy older than that would land over whatever the user has copied since.
 */
const DEFER_MAX_AGE_MS = 15000;

let deferred: { text: string; target: string; at: number } | null = null;

/**
 * Hold a copy until the document is focused again.
 */
function deferUntilFocused(text: string, target: string): void {
  deferred = { text, target, at: Date.now() };
  // Always the same function reference, so a repeat registration is a no-op
  // per the DOM spec - nothing needs to track whether the pair is already armed.
  window.addEventListener('focus', flushDeferred);
  document.addEventListener('visibilitychange', flushDeferred);
  console.debug(
    `${LOG_PREFIX} OSC 52: document unfocused, holding ${text.length} chars until focus (target: ${target})`
  );
}

/**
 * Forget the held copy and disarm the wakeups.
 *
 * The same `flushDeferred` reference that `deferUntilFocused` registered, so
 * the removals match; a fresh closure here would leak a listener pair.
 */
function dropDeferred(): void {
  deferred = null;
  window.removeEventListener('focus', flushDeferred);
  document.removeEventListener('visibilitychange', flushDeferred);
}

/**
 * Write the held copy now that focus is back.
 *
 * One-shot and best-effort: the slot is spent here whatever the write does, so
 * a browser that refuses this one attempt loses the copy for good - `copyNow`
 * reports that, and the user re-runs the command.
 */
function flushDeferred(): void {
  if (!deferred) {
    return;
  }
  if (Date.now() - deferred.at > DEFER_MAX_AGE_MS) {
    // Warn, not debug: this is a copy the user asked for and will not get, and
    // Chrome hides debug by default - the silent loss C2 was filed for. Read
    // the slot before dropping it so the line carries the same detail as the
    // rest.
    const { text, target } = deferred;
    dropDeferred();
    console.warn(
      `${LOG_PREFIX} OSC 52: held copy of ${text.length} chars waited longer than ${DEFER_MAX_AGE_MS}ms, discarded (target: ${target})`
    );
    return;
  }
  // A hidden document is never a focused one, so this single check serves both
  // the 'focus' and the 'visibilitychange' wakeup. Still unfocused - which a
  // visibilitychange to hidden is - means stay armed and wait for the next one.
  if (!document.hasFocus()) {
    return;
  }

  const { text, target } = deferred;
  // Clear the slot and disarm before writing: this flush owns the copy from
  // here on, and an OSC 52 arriving during the write must be free to defer
  // itself afresh rather than be dropped on top of ours.
  dropDeferred();

  copyNow(text, target);
}

/**
 * Write a copy and report what happened to it - a lost copy is never silent.
 */
function copyNow(text: string, target: string): void {
  writeToClipboard(text)
    .then(success => {
      if (success) {
        console.debug(
          `${LOG_PREFIX} OSC 52: copied ${text.length} chars to clipboard (target: ${target})`
        );
      } else {
        console.warn(
          `${LOG_PREFIX} OSC 52: clipboard write refused, copy lost (target: ${target})`
        );
      }
    })
    .catch(err => {
      console.warn(`${LOG_PREFIX} OSC 52: clipboard write failed:`, err);
    });
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

  // Empty payload is a clear request. Nothing to write, but a copy still held
  // from an earlier sequence has to go: landing it after the program asked for
  // the clipboard to be emptied inverts the request it already acknowledged.
  if (payload === '') {
    dropDeferred();
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

  // An OSC 52 arrives whenever the shell emits one, routinely while the user is
  // in another window - so unlike a click-driven copy it can afford to wait.
  // The focus check is made here rather than left to writeToClipboard's own
  // gate so that a false return from it means a real loss, never "not tried".
  if (document.hasFocus()) {
    // This write supersedes anything still held, which a later flush of the
    // older payload would otherwise undo.
    dropDeferred();
    copyNow(text, target);
  } else {
    deferUntilFocused(text, target);
  }

  // Return true to indicate we handled the sequence (prevent xterm.js default)
  return true;
}
