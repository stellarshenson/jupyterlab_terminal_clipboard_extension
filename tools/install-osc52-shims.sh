#!/bin/sh
# install-osc52-shims.sh - Install OSC 52 clipboard shims
#
# Creates symlinks that override xclip, xsel, and wl-copy with OSC 52
# versions, enabling clipboard operations from JupyterLab terminal sessions.
#
# Usage:
#   ./install-osc52-shims.sh              # install to ~/.local/bin (default)
#   ./install-osc52-shims.sh /usr/local/bin  # install to specific directory
#   ./install-osc52-shims.sh --uninstall  # remove shims

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_TARGET="$HOME/.local/bin"

print_usage() {
    cat <<'USAGE'
Usage: install-osc52-shims.sh [OPTIONS] [TARGET_DIR]

Install OSC 52 clipboard shims as drop-in replacements for xclip, xsel, and wl-copy.

Arguments:
    TARGET_DIR          Installation directory (default: ~/.local/bin)

Options:
    --uninstall         Remove previously installed shims
    --no-symlink        Copy scripts instead of creating symlinks
    -h, --help          Display this help

The shims are installed with their original names (xclip, xsel, wl-copy),
so they override system versions when TARGET_DIR appears earlier in PATH.

Ensure TARGET_DIR is in your PATH before system directories:
    export PATH="$HOME/.local/bin:$PATH"
USAGE
}

do_install() {
    TARGET="$1"
    USE_SYMLINK="$2"

    mkdir -p "$TARGET"

    for shim in xclip-osc52 xsel-osc52 wl-copy-osc52; do
        src="$SCRIPT_DIR/$shim"
        # Derive the original tool name (strip -osc52 suffix)
        tool_name=$(echo "$shim" | sed 's/-osc52$//')
        dst="$TARGET/$tool_name"

        if [ ! -f "$src" ]; then
            echo "Warning: $src not found, skipping" >&2
            continue
        fi

        # Remove existing target
        rm -f "$dst"

        if [ "$USE_SYMLINK" -eq 1 ]; then
            ln -s "$src" "$dst"
            echo "Linked $dst -> $src"
        else
            cp "$src" "$dst"
            chmod +x "$dst"
            echo "Copied $src -> $dst"
        fi
    done

    # Verify PATH
    case ":$PATH:" in
        *:"$TARGET":*) ;;
        *)
            echo ""
            echo "Warning: $TARGET is not in your PATH"
            echo "Add to your shell profile:"
            echo "    export PATH=\"$TARGET:\$PATH\""
            ;;
    esac

    echo ""
    echo "OSC 52 clipboard shims installed. Terminal clipboard operations"
    echo "will now route through the JupyterLab terminal clipboard extension."
}

do_uninstall() {
    TARGET="$1"

    for tool_name in xclip xsel wl-copy; do
        dst="$TARGET/$tool_name"
        if [ -L "$dst" ] || [ -f "$dst" ]; then
            # Verify it's our shim before removing
            if grep -q "osc52\|OSC 52" "$dst" 2>/dev/null || \
               [ -L "$dst" ] && readlink "$dst" | grep -q "osc52"; then
                rm -f "$dst"
                echo "Removed $dst"
            else
                echo "Skipping $dst (not an OSC 52 shim)"
            fi
        fi
    done

    echo "OSC 52 clipboard shims removed."
}

# Parse arguments
UNINSTALL=0
USE_SYMLINK=1
TARGET=""

while [ $# -gt 0 ]; do
    case "$1" in
        --uninstall)
            UNINSTALL=1
            ;;
        --no-symlink)
            USE_SYMLINK=0
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        -*)
            echo "Unknown option: $1" >&2
            print_usage
            exit 1
            ;;
        *)
            TARGET="$1"
            ;;
    esac
    shift
done

TARGET="${TARGET:-$DEFAULT_TARGET}"

if [ "$UNINSTALL" -eq 1 ]; then
    do_uninstall "$TARGET"
else
    do_install "$TARGET" "$USE_SYMLINK"
fi
