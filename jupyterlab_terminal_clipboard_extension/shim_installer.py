"""
Install OSC 52 clipboard shims for terminal clipboard support.

Copies xclip-osc52, xsel-osc52, and wl-copy-osc52 shim scripts to
~/.local/bin/ as xclip, xsel, and wl-copy - but only when the real
tools are not already functional on the system.

The shims translate clipboard operations into OSC 52 escape sequences,
which are then intercepted by the frontend extension and routed to
the browser clipboard API.
"""

import os
import shutil
import stat
import subprocess
from pathlib import Path


# Shim source name -> installed name
SHIMS = {
    "xclip-osc52": "xclip",
    "xsel-osc52": "xsel",
    "wl-copy-osc52": "wl-copy",
}


def _tool_is_functional(tool_name: str) -> bool:
    """Check if a clipboard tool is installed and can actually work.

    A tool is considered functional only if it exists in PATH
    AND is not one of our OSC 52 shims (detected by file content).
    We don't test actual clipboard access since that would require
    an X display or Wayland compositor.
    """
    tool_path = shutil.which(tool_name)
    if tool_path is None:
        return False

    # Check if the found tool is already our shim
    try:
        with open(tool_path, "r") as f:
            header = f.read(512)
            if "osc52" in header.lower() or "OSC 52" in header:
                # This is our shim from a previous install - not a real tool
                return False
    except (OSError, UnicodeDecodeError):
        # Binary tool (not our shell script shim) - it's real
        pass

    # Check if the tool can plausibly work (has display access)
    # For X11 tools, check DISPLAY; for Wayland, check WAYLAND_DISPLAY
    if tool_name in ("xclip", "xsel"):
        if not os.environ.get("DISPLAY"):
            return False
    elif tool_name == "wl-copy":
        if not os.environ.get("WAYLAND_DISPLAY"):
            return False

    return True


def _get_shim_source_dir() -> Path:
    """Get the directory containing the shim scripts."""
    # Shims are in the tools/ directory relative to the project root,
    # but when installed as a package they're in the package data directory
    package_dir = Path(__file__).parent
    # First check if shims are bundled as package data
    bundled = package_dir / "tools"
    if bundled.is_dir():
        return bundled
    # Fall back to project root tools/ dir (development mode)
    project_root = package_dir.parent
    tools_dir = project_root / "tools"
    if tools_dir.is_dir():
        return tools_dir
    raise FileNotFoundError(
        "Could not find clipboard shim scripts. "
        "Expected in package data or project tools/ directory."
    )


def install_shims(log=None):
    """Install OSC 52 clipboard shims to ~/.local/bin/.

    Only installs shims for tools that are not already functional
    on the system. Previously installed shims are updated if the
    source is newer.
    """
    target_dir = Path.home() / ".local" / "bin"

    try:
        source_dir = _get_shim_source_dir()
    except FileNotFoundError as e:
        if log:
            log.warning(f"[terminal-clipboard] {e}")
        return

    installed = []
    skipped = []

    for shim_name, tool_name in SHIMS.items():
        source = source_dir / shim_name
        if not source.exists():
            if log:
                log.debug(f"[terminal-clipboard] Shim source not found: {source}")
            continue

        # Skip if the real tool is functional
        if _tool_is_functional(tool_name):
            skipped.append(tool_name)
            continue

        # Install the shim
        target = target_dir / tool_name
        target_dir.mkdir(parents=True, exist_ok=True)

        try:
            shutil.copy2(str(source), str(target))
            # Ensure executable
            target.chmod(target.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
            installed.append(tool_name)
        except OSError as e:
            if log:
                log.warning(
                    f"[terminal-clipboard] Failed to install {tool_name} shim: {e}"
                )

    if log:
        if installed:
            log.info(
                f"[terminal-clipboard] Installed OSC 52 clipboard shims: "
                f"{', '.join(installed)} -> {target_dir}"
            )
        if skipped:
            log.info(
                f"[terminal-clipboard] Skipped shims (real tools available): "
                f"{', '.join(skipped)}"
            )
        if not installed and not skipped:
            log.debug("[terminal-clipboard] No shims needed or available")

    # Check if target_dir is in PATH
    path_dirs = os.environ.get("PATH", "").split(os.pathsep)
    target_str = str(target_dir)
    if installed and target_str not in path_dirs:
        if log:
            log.warning(
                f"[terminal-clipboard] {target_dir} is not in PATH. "
                f"Shims may not be found by terminal applications. "
                f"Add to shell profile: export PATH=\"{target_dir}:$PATH\""
            )
