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

  it('leaves no scratch textarea behind', async () => {
    await writeToClipboard('secret');
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });
});

describe('handleOsc52', () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };
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
});
