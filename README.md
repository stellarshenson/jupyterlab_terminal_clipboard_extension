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

Terminal programs running inside JupyterLab normally cannot copy anything to your clipboard. Tools like password managers, vim, tmux, and other TUI applications that rely on `xclip` or `xsel` fail silently because there is no X11 display in a browser-based terminal. This extension fixes that - when a terminal program copies something, it lands in your browser clipboard so you can paste it anywhere.

## Features

- **OSC 52 clipboard interception** - captures clipboard escape sequences from terminal output
- **Auto-installing shims** - deploys `xclip`, `xsel`, `wl-copy` replacements to `~/.local/bin/` on startup when real tools are not functional (no display server)
- **Smart detection** - preserves real clipboard tools when they work, only installs shims when needed

## Installation

Requires JupyterLab 4.0.0 or higher.

```bash
pip install jupyterlab_terminal_clipboard_extension
```

Ensure `~/.local/bin` is in your PATH for the shims to work:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Uninstall

```bash
pip uninstall jupyterlab_terminal_clipboard_extension
```

## Technical Details

The extension has two components. The **frontend plugin** registers an OSC 52 parser handler on each terminal's xterm.js instance. When a terminal application writes `\033]52;c;<base64>\a`, the handler decodes the payload and writes it to the browser clipboard via `navigator.clipboard.writeText()` with a `document.execCommand('copy')` fallback for HTTP (non-secure) contexts.

The **server plugin** runs on JupyterLab startup and installs lightweight POSIX shell shims into `~/.local/bin/`. These shims replace `xclip`, `xsel`, and `wl-copy` - the system clipboard tools that terminal programs call. Instead of talking to an X11 display, the shims base64-encode the input and emit an OSC 52 escape sequence to `/dev/tty`, which the frontend plugin then intercepts.

```
terminal app -> xclip/xsel (shim) -> OSC 52 escape sequence -> extension -> browser clipboard
```

Shims are only installed when the real tools cannot function (no `DISPLAY` or `WAYLAND_DISPLAY` environment variable set). If a real X11 or Wayland clipboard is available, the shims are not deployed and the original tools are preserved.
