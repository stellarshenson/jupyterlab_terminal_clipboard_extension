# Defects - jupyterlab_terminal_clipboard_extension

Bugs and regressions in the terminal clipboard extension: the OSC 52 frontend handler, the clipboard shims and their installers.

## Authors

- `@kj` Konrad Jelen

## Clipboard shims `SHIM`

The xclip, xsel and wl-copy replacements that emit OSC 52

- log: 2026-11-13T09:19:43Z @kj category created

- [x] `DEF-SHIM-1-XCLIP-ABBREV` **xclip shim loses the copy on abbreviated options** - MEDIUM; `xclip -sel clip` and `xclip -selection clipboard -t text/plain` take the option value as a file name: cat error, empty OSC 52 sent, clipboard cleared instead of set; real xclip accepts any unambiguous prefix; `jupyterlab_terminal_clipboard_extension/tools/xclip-osc52`
  - evidence: parser takes -sel* and -t*, selection read by first letter; pytest test_shim_sends_the_copy_to_the_terminal passes for '-sel clip' and '-t text/plain'; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - root-cause: 2026-11-13T09:26:28Z @kj the option parser matched only the full words -selection and -target and the full selection names; any other dash word was ignored and its value became a file argument
  - repro: in a lab terminal: echo hello | xclip -sel clip; prints 'cat: clip: No such file or directory', nothing copied
  - test-tags: UNIT
  - log: 2026-11-13T09:19:43Z @kj added
  - log: 2026-11-13T09:26:29Z @kj closed
- [x] `DEF-SHIM-2-DUPLICATE` **Shim scripts kept twice** - MINOR; `tools/*-osc52` and `jupyterlab_terminal_clipboard_extension/tools/*-osc52` are byte-identical, 506 lines; a fix made in one copy leaves the other stale; the root-tools fallback in `_get_shim_source_dir` never runs and `subprocess` is imported unused; `shim_installer.py`
  - evidence: root tools/*-osc52 removed, install script reads the package copy, _get_shim_source_dir and the subprocess import removed; git ls-files lists each shim once; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - root-cause: 2026-11-13T09:26:29Z @kj the shims were first written in tools/ and later copied into the package as package data; the originals and a development fallback stayed
  - test-tags: MANUAL
  - repro: cmp tools/xclip-osc52 jupyterlab_terminal_clipboard_extension/tools/xclip-osc52 prints nothing at be46edc
  - log: 2026-11-13T09:19:43Z @kj added
  - log: 2026-11-13T09:19:56Z @kj edited test-tags added "MANUAL"
  - log: 2026-11-13T09:26:29Z @kj closed
- [x] `DEF-SHIM-8-TMUX-SETTING` **README names tmux and omits the setting it needs** - MINOR; inside tmux with the default `set-clipboard external` tmux discards an OSC 52 written by a program in a pane, and the shim still exits 0; the README lists tmux as supported and gives no setting; `README.md`
  - test-tags: MANUAL
  - evidence: README Installation section states that tmux needs 'set -g set-clipboard on' and that the shim exits 0 without it
  - repro: in tmux with no set-clipboard line in ~/.tmux.conf run 'echo x | xclip; echo $?': prints 0 and the browser clipboard is unchanged
  - root-cause: 2026-11-13T09:45:44Z @kj the README stated tmux support without the tmux option that forwards a pane's OSC 52 to the outer terminal
  - log: 2026-11-13T09:45:44Z @kj added
  - log: 2026-11-13T09:47:05Z @kj closed
  - log: 2026-11-13T09:47:10Z @kj edited test-tags added "MANUAL"
- [x] `DEF-SHIM-10-XCLIP-PREFIX` **xclip shim misses the prefixes -se and -filter** - MINOR; `echo hello | xclip -se c` prints 'cat: c: No such file or directory' and sends an empty OSC 52, a clear request, exit 0; `-filter` copies but echoes nothing to stdout; real xclip takes any unambiguous prefix; `jupyterlab_terminal_clipboard_extension/tools/xclip-osc52`
  - evidence: case arms are -se|-sel* and -f*; pytest test_shim_sends_the_copy_to_the_terminal[xclip-osc52 -se c] passes; build_test.py 2026-11-13 at 1.0.19: Jest 31, pytest 12, Galata 2 passed
  - repro: under a pty: echo hello | jupyterlab_terminal_clipboard_extension/tools/xclip-osc52 -se c
  - test-tags: UNIT
  - root-cause: 2026-11-13T18:17:12Z @kj the case arms were -sel* and -f, so -se and -fi... -filter fell to the ignore-unknown arm
  - log: 2026-11-13T18:17:12Z @kj added
  - log: 2026-11-13T18:28:38Z @kj closed

## Shim installers `SETUP`

install_shims at server start and tools/install-osc52-shims.sh

- log: 2026-11-13T09:19:56Z @kj category created

- [x] `DEF-SETUP-3-UNINSTALL-COPIES` **Uninstall script skips copied shims** - MEDIUM; `install-osc52-shims.sh --uninstall` prints 'Skipping ... (not an OSC 52 shim)' for every shim that is a regular file, which is what the server extension and `--no-symlink` install; shims stay in ~/.local/bin; `tools/install-osc52-shims.sh`
  - evidence: is_our_shim groups the symlink test in braces; pytest test_install_script_keeps_foreign_files_and_removes_its_copies passes; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - root-cause: 2026-11-13T09:26:29Z @kj in 'grep || [ -L ] && readlink | grep' the shell groups left to right, so a regular file that passed grep still had to pass the symlink test
  - repro: sh tools/install-osc52-shims.sh --no-symlink /tmp/b && sh tools/install-osc52-shims.sh --uninstall /tmp/b; ls /tmp/b still lists xclip xsel wl-copy
  - test-tags: UNIT
  - log: 2026-11-13T09:19:56Z @kj added
  - log: 2026-11-13T09:26:29Z @kj closed
- [x] `DEF-SETUP-4-SCRIPT-OVERWRITES` **Install script deletes a user's own clipboard tool** - MEDIUM; `install-osc52-shims.sh` runs `rm -f` on xclip, xsel and wl-copy in the target directory before linking, whatever the file is; README promises a tool the extension did not create is never overwritten; `tools/install-osc52-shims.sh`
  - evidence: do_install skips a target that exists and is not a shim; pytest test_install_script_keeps_foreign_files_and_removes_its_copies passes; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - root-cause: 2026-11-13T09:26:29Z @kj do_install removed the target with rm -f before any check of what it was
  - repro: printf 'mine' > /tmp/b/xclip; sh tools/install-osc52-shims.sh /tmp/b; /tmp/b/xclip is now a link to the shim
  - test-tags: UNIT
  - log: 2026-11-13T09:19:56Z @kj added
  - log: 2026-11-13T09:26:29Z @kj closed
- [x] `DEF-SETUP-5-UNTESTED` **install_shims has no test** - MEDIUM; the code that writes into ~/.local/bin at every server start, and its rule never to overwrite a foreign file, has no pytest; the package has no tests directory and CI runs no pytest; `shim_installer.py`
  - evidence: jupyterlab_terminal_clipboard_extension/tests/test_shims.py added, 11 tests; build.yml runs pytest --cov; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - root-cause: 2026-11-13T09:26:29Z @kj the package never had a tests directory, so the template's pytest step was left out of build.yml
  - repro: git ls-files | grep -c 'test_.*\.py' prints 0 at be46edc
  - test-tags: UNIT
  - log: 2026-11-13T09:19:56Z @kj added
  - log: 2026-11-13T09:26:29Z @kj closed
- [x] `DEF-SETUP-6-MKDIR-RAISES` **Unwritable home fails the server extension load** - MINOR; `target_dir.mkdir` sits outside the try that guards the copy; with a read-only home or a file at ~/.local the OSError leaves install_shims and jupyter server logs a traceback for the extension instead of one warning; `shim_installer.py`
  - evidence: mkdir moved inside the try; pytest test_unwritable_home_does_not_raise passes; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - root-cause: 2026-11-13T09:26:29Z @kj mkdir of ~/.local/bin was placed before the try that turns an OSError of the copy into a warning
  - repro: HOME=<dir holding a file named .local> python -c 'from jupyterlab_terminal_clipboard_extension.shim_installer import install_shims; install_shims()' raises NotADirectoryError
  - test-tags: UNIT
  - log: 2026-11-13T09:19:56Z @kj added
  - log: 2026-11-13T09:26:29Z @kj closed

## Browser clipboard write `COPY`

The frontend write of a copy to the browser clipboard

- log: 2026-11-13T09:45:44Z @kj category created

- [x] `DEF-COPY-7-FALLBACK-FOCUS` **execCommand fallback takes keyboard focus from the terminal** - MEDIUM; on plain http on a non-localhost host navigator.clipboard is absent, so every copy goes through the hidden textarea; `textarea.select()` focuses it and removing it leaves focus on body, so the next keystroke does not reach the terminal until the user clicks it; `src/clipboard.ts`
  - test-tags: MANUAL
  - evidence: writeToClipboard reads document.activeElement before the textarea is appended and focuses it after the removal; build_test.py 2026-11-13 at 1.0.18: Jest 31, pytest 11, Galata 1 passed
  - repro: open the lab over http://<host>:8888, run 'echo x | xclip' in a terminal, type: the keys do not reach the terminal
  - root-cause: 2026-11-13T09:45:44Z @kj the fallback selected a temporary textarea and never returned focus to the element that had it
  - log: 2026-11-13T09:45:44Z @kj added
  - log: 2026-11-13T09:47:04Z @kj closed
  - log: 2026-11-13T09:47:10Z @kj edited test-tags added "MANUAL"
- [x] `DEF-COPY-9-REPLAY` **Old terminal copy written again after a page reload** - MEDIUM; after a page reload or websocket reconnect the server resends the terminal output buffer; an OSC 52 in it is written to the browser clipboard again and replaces what the user copied since; `src/index.ts`
  - evidence: OSC 52 ignored until the first stdout of each connection is parsed; Galata 'should not copy again an OSC 52 the server resends after a reload' failed at 3131b9d with 'first', passes 12 of 12 repeats; build_test.py 2026-11-13 at 1.0.19: Jest 31, pytest 12, Galata 2
  - repro: in a terminal run printf '\033]52;c;Zmlyc3Q=\a', copy other text in the browser, reload the page: the clipboard holds 'first' again
  - test-tags: E2E
  - root-cause: 2026-11-13T18:17:12Z @kj terminado sends its whole read_buffer as the first stdout message of every websocket open, and attachOsc52Handler passed every OSC 52 to handleOsc52
  - log: 2026-11-13T18:17:12Z @kj added
  - log: 2026-11-13T18:28:37Z @kj attempted: gate connected inside ready.then, replay ended at attach when the status was connected; Galata copied again in 4 of 9 runs, the status was connected before the resent buffer came in 3 of 10 runs
  - log: 2026-11-13T18:28:42Z @kj closed
