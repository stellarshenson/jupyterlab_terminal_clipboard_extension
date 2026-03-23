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

Copy to clipboard from JupyterLab terminal sessions. Intercepts OSC 52 escape sequences and routes them to the browser clipboard. Also auto-installs drop-in shims for `xclip`, `xsel`, and `wl-copy` so programs like pass-cli, vim, and tmux can copy to clipboard without an X11 display.

```
terminal app -> xclip/xsel (shim) -> OSC 52 -> extension -> browser clipboard
```

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
