# jupyterlab_terminal_clipboard_extension

[![GitHub Actions](https://github.com/stellarshenson/jupyterlab_terminal_clipboard_extension/actions/workflows/build.yml/badge.svg)](https://github.com/stellarshenson/jupyterlab_terminal_clipboard_extension/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/jupyterlab_terminal_clipboard_extension.svg)](https://www.npmjs.com/package/jupyterlab_terminal_clipboard_extension)
[![PyPI version](https://img.shields.io/pypi/v/jupyterlab-terminal-clipboard-extension.svg)](https://pypi.org/project/jupyterlab-terminal-clipboard-extension/)
[![Total PyPI downloads](https://static.pepy.tech/badge/jupyterlab-terminal-clipboard-extension)](https://pepy.tech/project/jupyterlab-terminal-clipboard-extension)
[![JupyterLab 4](https://img.shields.io/badge/JupyterLab-4-orange.svg)](https://jupyterlab.readthedocs.io/en/stable/)
[![Brought To You By KOLOMOLO](https://img.shields.io/badge/Brought%20To%20You%20By-KOLOMOLO-00ffff?style=flat)](https://kolomolo.com)
[![Donate PayPal](https://img.shields.io/badge/Donate-PayPal-blue?style=flat)](https://www.paypal.com/donate/?hosted_button_id=B4KPBJDLLXTSA)

> [!TIP]
> This extension is part of the [stellars_jupyterlab_extensions](https://github.com/stellarshenson/stellars_jupyterlab_extensions) metapackage. Install all Stellars extensions at once: `pip install stellars_jupyterlab_extensions`

Copy to clipboard from JupyterLab terminal sessions. This extension bridges the gap between terminal applications and the browser clipboard by intercepting OSC 52 escape sequences and routing them to the browser's Clipboard API. It also installs drop-in replacements for `xclip`, `xsel`, and `wl-copy` so that programs which rely on system clipboard tools work transparently in browser-based terminals.

## How It Works

The extension has two components that work together:

**Frontend plugin** intercepts OSC 52 escape sequences in terminal output. When a terminal application writes `\033]52;c;<base64>\a`, the extension decodes the base64 payload and writes the text to the browser clipboard via `navigator.clipboard.writeText()`.

**Server plugin** installs lightweight shell shims (`xclip`, `xsel`, `wl-copy`) into `~/.local/bin/` on first JupyterLab startup. These shims replace the real clipboard tools only when the originals cannot function (no X11 `DISPLAY` or `WAYLAND_DISPLAY` set). If the real tools are already working, the shims are not installed.

The result is a complete clipboard pipeline:

```
terminal app -> xclip/xsel (shim) -> OSC 52 escape sequence -> extension -> browser clipboard
```

## Features

- **OSC 52 clipboard interception** - captures clipboard escape sequences emitted by terminal applications
- **Browser clipboard API integration** - routes terminal clipboard content to the browser's native clipboard
- **Automatic shim installation** - server plugin deploys `xclip`, `xsel`, and `wl-copy` shims on startup when the real tools are not functional
- **Smart detection** - only installs shims when system clipboard tools cannot work (no display server), preserves real tools when they are functional
- **Transparent operation** - works automatically with any terminal program that supports OSC 52 or calls `xclip`/`xsel`/`wl-copy`

## Installation

Requires JupyterLab 4.0.0 or higher.

```bash
pip install jupyterlab_terminal_clipboard_extension
```

After installation, restart JupyterLab. The server plugin will automatically install clipboard shims to `~/.local/bin/` if needed. Ensure `~/.local/bin` is in your PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Manual Shim Management

The shims can also be managed independently using the included installer script:

```bash
# Install shims manually
./tools/install-osc52-shims.sh

# Install to a custom directory
./tools/install-osc52-shims.sh /usr/local/bin

# Remove shims
./tools/install-osc52-shims.sh --uninstall
```

## Uninstall

```bash
pip uninstall jupyterlab_terminal_clipboard_extension
```
