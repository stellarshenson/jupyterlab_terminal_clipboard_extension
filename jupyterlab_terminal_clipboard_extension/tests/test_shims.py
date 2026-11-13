"""The shim installers and the shims themselves, run against a scratch home."""

import os
import pty
import subprocess
from pathlib import Path

import pytest

from jupyterlab_terminal_clipboard_extension import shim_installer

TOOLS = Path(shim_installer.__file__).parent / "tools"
INSTALLER = Path(shim_installer.__file__).parents[1] / "tools" / "install-osc52-shims.sh"
HELLO = b"\x1b]52;c;aGVsbG8=\x07"  # OSC 52, clipboard, base64 of "hello"


@pytest.fixture
def home(tmp_path, monkeypatch):
    """A scratch home with no display and no clipboard tool in PATH."""
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("PATH", str(tmp_path / "path"))
    monkeypatch.delenv("DISPLAY", raising=False)
    monkeypatch.delenv("WAYLAND_DISPLAY", raising=False)
    return tmp_path


def run_in_pty(command):
    """Run a shell command with a controlling terminal and return what it wrote there."""
    pid, fd = pty.fork()
    if pid == 0:
        os.execv("/bin/sh", ["sh", "-c", command])
    out = b""
    while True:
        try:
            chunk = os.read(fd, 4096)
        except OSError:  # the child closed the terminal
            break
        if not chunk:
            break
        out += chunk
    os.waitpid(pid, 0)
    return out


def test_installs_every_shim_when_no_tool_works(home):
    shim_installer.install_shims()
    for name in ("xclip", "xsel", "wl-copy"):
        target = home / ".local" / "bin" / name
        assert shim_installer._is_our_shim(target)
        assert os.access(target, os.X_OK)


def test_never_overwrites_a_file_it_did_not_create(home):
    mine = home / ".local" / "bin" / "xclip"
    mine.parent.mkdir(parents=True)
    mine.write_text("#!/bin/sh\necho mine\n")
    shim_installer.install_shims()
    assert mine.read_text() == "#!/bin/sh\necho mine\n"
    assert (mine.parent / "xsel").exists()


def test_leaves_a_working_real_tool_alone(home, monkeypatch):
    real = home / "path" / "xclip"
    real.parent.mkdir()
    real.write_text("#!/bin/sh\n")
    real.chmod(0o755)
    monkeypatch.setenv("DISPLAY", ":0")
    shim_installer.install_shims()
    assert not (home / ".local" / "bin" / "xclip").exists()
    assert (home / ".local" / "bin" / "wl-copy").exists()


def test_unwritable_home_does_not_raise(home):
    (home / ".local").write_text("a file where the directory should be")
    shim_installer.install_shims()


@pytest.mark.parametrize(
    "command",
    [
        "xclip-osc52 -selection clipboard",
        "xclip-osc52 -sel clip",
        "xclip-osc52 -se c",
        "xclip-osc52 -selection clipboard -t text/plain",
        "xsel-osc52 --clipboard --input",
        "wl-copy-osc52",
    ],
)
def test_shim_sends_the_copy_to_the_terminal(command):
    assert HELLO in run_in_pty(f"printf hello | {TOOLS}/{command}")


def test_shim_without_a_terminal_fails_and_keeps_stdout_clean():
    done = subprocess.run(
        [str(TOOLS / "xclip-osc52"), "-selection", "clipboard"],
        input=b"hello",
        capture_output=True,
        start_new_session=True,  # no controlling terminal
    )
    assert done.returncode == 1
    assert done.stdout == b""
    assert b"no controlling terminal" in done.stderr


@pytest.mark.skipif(not INSTALLER.exists(), reason="the script is not in the wheel")
def test_install_script_keeps_foreign_files_and_removes_its_copies(tmp_path):
    (tmp_path / "xclip").write_text("#!/bin/sh\necho mine\n")
    subprocess.run(["sh", str(INSTALLER), "--no-symlink", str(tmp_path)], check=True)
    assert (tmp_path / "xclip").read_text() == "#!/bin/sh\necho mine\n"
    assert (tmp_path / "xsel").exists()
    subprocess.run(["sh", str(INSTALLER), "--uninstall", str(tmp_path)], check=True)
    assert sorted(p.name for p in tmp_path.iterdir()) == ["xclip"]
