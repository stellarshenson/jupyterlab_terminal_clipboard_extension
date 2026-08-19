/**
 * Unit tests for the OSC 52 clipboard helpers.
 */
import { base64Decode, handleOsc52, writeToClipboard } from '../clipboard';

/** Base64-encode a UTF-8 string the same way the shims do. */
function b64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

// jsdom reports document.hasFocus() as false unless something has been focused,
// so every test that expects a write to happen has to say so. Tests that want
// the unfocused path re-mock this to false.
beforeEach(() => {
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('base64Decode', () => {
  it('decodes ASCII', () => {
    expect(base64Decode(b64('hello world'))).toEqual('hello world');
  });

  it('decodes multibyte UTF-8', () => {
    expect(base64Decode(b64('zażółć gęślą jaźń'))).toEqual('zażółć gęślą jaźń');
  });

  it('decodes an empty payload', () => {
    expect(base64Decode('')).toEqual('');
  });
});

describe('writeToClipboard', () => {
  let execCommand: jest.Mock;

  beforeEach(() => {
    execCommand = jest.fn().mockReturnValue(true);
    (document as any).execCommand = execCommand;
    delete (navigator as any).clipboard;
  });

  it('uses the Clipboard API when available', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };

    await expect(writeToClipboard('secret')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('secret');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('falls back to execCommand when the Clipboard API is absent', async () => {
    await expect(writeToClipboard('secret')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('falls back to execCommand when the Clipboard API rejects', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('not allowed'));
    (navigator as any).clipboard = { writeText };

    await expect(writeToClipboard('secret')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('reports failure when execCommand fails', async () => {
    execCommand.mockReturnValue(false);
    await expect(writeToClipboard('secret')).resolves.toBe(false);
  });

  it('logs the refusal when execCommand fails', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    execCommand.mockReturnValue(false);

    await expect(writeToClipboard('secret')).resolves.toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('leaves no scratch textarea behind', async () => {
    await writeToClipboard('secret');
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('skips the fallback when focus is lost mid-write', async () => {
    // The entry gate cannot see a focus loss that happens during the await.
    const hasFocus = jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    const writeText = jest.fn().mockImplementation(() => {
      hasFocus.mockReturnValue(false);
      return Promise.reject(new Error('Document is not focused'));
    });
    (navigator as any).clipboard = { writeText };
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const debug = jest
      .spyOn(console, 'debug')
      .mockImplementation(() => undefined);

    await expect(writeToClipboard('secret')).resolves.toBe(false);
    expect(execCommand).not.toHaveBeenCalled();
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
    // The unfocused case is expected, so it is reported once and at debug -
    // the rejection it arrives as must not also surface as a warning.
    expect(warn).not.toHaveBeenCalled();
    expect(debug).toHaveBeenCalledWith(
      expect.stringContaining('focus lost during the write')
    );
  });

  it('refuses both paths while the document is unfocused', async () => {
    jest.spyOn(document, 'hasFocus').mockReturnValue(false);
    const writeText = jest.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };

    await expect(writeToClipboard('secret')).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(execCommand).not.toHaveBeenCalled();
    // The fallback steals the page's selection to do its work, so it must not
    // even be reached for a write that could never have landed.
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });
});

describe('handleOsc52', () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };
    // Raw property assignment, so restoreAllMocks cannot undo it - each test
    // that changes execCommand would otherwise dictate the next one's result.
    (document as any).execCommand = jest.fn().mockReturnValue(true);
  });

  it('copies a valid clipboard payload', () => {
    expect(handleOsc52(`c;${b64('hunter2')}`)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hunter2');
  });

  it.each(['c', 'p', 's'])('accepts the %s selection target', target => {
    expect(handleOsc52(`${target};${b64('x')}`)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('x');
  });

  it('rejects a payload with no target separator', () => {
    expect(handleOsc52('no-semicolon')).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('acknowledges a read request without touching the clipboard', () => {
    expect(handleOsc52('c;?')).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('acknowledges a clear request without touching the clipboard', () => {
    expect(handleOsc52('c;')).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('rejects a non-base64 payload', () => {
    expect(handleOsc52('c;not base64!')).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('reports a lost copy rather than failing silently', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    delete (navigator as any).clipboard;
    (document as any).execCommand = jest.fn().mockReturnValue(false);

    expect(handleOsc52(`c;${b64('hunter2')}`)).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('copy lost'));
  });
});

describe('handleOsc52 while unfocused', () => {
  let writeText: jest.Mock;
  let execCommand: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };
    execCommand = jest.fn().mockReturnValue(true);
    (document as any).execCommand = execCommand;
    jest.spyOn(document, 'hasFocus').mockReturnValue(false);
  });

  afterEach(() => {
    // The deferral slot is module state and outlives the test that filled it.
    // Drain it here or it flushes into the next test's focus dispatch.
    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));
  });

  it('defers the copy instead of attempting a write that cannot land', () => {
    // The return value is asserted on the calling statement: xterm.js reads it
    // synchronously, so deferring must not make the handler asynchronous.
    expect(handleOsc52(`c;${b64('hunter2')}`)).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
    expect(execCommand).not.toHaveBeenCalled();

    // The three assertions above hold just as well for a payload dropped on
    // the floor - only the flush proves it was held.
    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));
    expect(writeText).toHaveBeenCalledWith('hunter2');
  });

  it('logs the unfocused case at debug, never at warn', () => {
    const debug = jest
      .spyOn(console, 'debug')
      .mockImplementation(() => undefined);
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    handleOsc52(`c;${b64('hunter2')}`);

    expect(debug).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('flushes the deferred copy when the window regains focus', () => {
    handleOsc52(`c;${b64('hunter2')}`);
    expect(writeText).not.toHaveBeenCalled();

    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));

    expect(writeText).toHaveBeenCalledWith('hunter2');
  });

  it('flushes the deferred copy when the tab becomes visible', () => {
    handleOsc52(`c;${b64('hunter2')}`);

    // A visibilitychange while still unfocused is not a wakeup - the copy stays
    // held rather than being spent on another doomed attempt.
    document.dispatchEvent(new Event('visibilitychange'));
    expect(writeText).not.toHaveBeenCalled();

    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(writeText).toHaveBeenCalledWith('hunter2');
  });

  it('keeps only the newest copy - one slot, last write wins', () => {
    handleOsc52(`c;${b64('first')}`);
    handleOsc52(`c;${b64('second')}`);

    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('second');
  });

  it('spends the deferred copy once - a later wakeup writes nothing', () => {
    handleOsc52(`c;${b64('hunter2')}`);

    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));
    expect(writeText).toHaveBeenCalledTimes(1);

    // A slot left full under a listener left armed would re-write the payload
    // on every focus event for the life of the page, overwriting whatever the
    // user copied since.
    writeText.mockClear();
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('discards a copy that waited past the deadline', () => {
    const windowRemove = jest.spyOn(window, 'removeEventListener');
    const documentRemove = jest.spyOn(document, 'removeEventListener');
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    handleOsc52(`c;${b64('hunter2')}`);

    // Focus returns half an hour later: the clipboard now holds whatever the
    // user copied in the meantime, and this payload must not land over it.
    now.mockReturnValue(1000 + 30 * 60 * 1000);
    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));

    expect(writeText).not.toHaveBeenCalled();

    // Discarding has to release the slot and disarm the wakeups, not just skip
    // the write - a slot left filled would land on the next focus after all,
    // and listeners left armed accumulate for the life of the page.
    expect(windowRemove).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(documentRemove).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
    window.dispatchEvent(new Event('focus'));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('restarts the deadline when a newer copy supersedes the held one', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    handleOsc52(`c;${b64('first')}`);

    // The second copy arrives 14s later - inside the first one's window, so it
    // replaces it. Its own deadline runs from now, not from the first's.
    now.mockReturnValue(1000 + 14000);
    handleOsc52(`c;${b64('second')}`);

    // 20s after the first arrived but only 6s after the second: still fresh.
    now.mockReturnValue(1000 + 20000);
    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));

    expect(writeText).toHaveBeenCalledWith('second');
  });

  it('drops the held copy when a later write goes straight through', () => {
    handleOsc52(`c;${b64('first')}`);

    // Focused again, but with no wakeup event dispatched, so the slot is still
    // armed when the newer payload is written directly.
    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    handleOsc52(`c;${b64('second')}`);
    window.dispatchEvent(new Event('focus'));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('second');
  });

  it('cancels a deferred copy when a clear request arrives', () => {
    // The program asked for the clipboard to be emptied and was told the
    // request was handled - writing the earlier payload afterwards inverts it.
    handleOsc52(`c;${b64('sensitive')}`);
    expect(handleOsc52('c;')).toBe(true);

    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));

    expect(writeText).not.toHaveBeenCalled();
  });

  it('disarms with the exact listener reference it armed', () => {
    // removeEventListener only matches an identical reference, so registering
    // a fresh closure per deferral would leak a listener pair every time.
    const windowAdd = jest.spyOn(window, 'addEventListener');
    const windowRemove = jest.spyOn(window, 'removeEventListener');
    const documentAdd = jest.spyOn(document, 'addEventListener');
    const documentRemove = jest.spyOn(document, 'removeEventListener');

    handleOsc52(`c;${b64('hunter2')}`);
    const onFocus = windowAdd.mock.calls.find(call => call[0] === 'focus')?.[1];
    const onVisibility = documentAdd.mock.calls.find(
      call => call[0] === 'visibilitychange'
    )?.[1];

    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));

    expect(onFocus).toEqual(expect.any(Function));
    expect(windowRemove).toHaveBeenCalledWith('focus', onFocus);
    expect(documentRemove).toHaveBeenCalledWith(
      'visibilitychange',
      onVisibility
    );
  });
});
