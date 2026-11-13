# Acceptance Criteria - jupyterlab_terminal_clipboard_extension

A copy made by a terminal program (xclip, xsel, wl-copy or a raw OSC 52 sequence) lands in the browser clipboard.

## Authors

- `@kj` Konrad Jelen

## OSC 52 handler `FRONT`

The frontend plugin that reads OSC 52 from each terminal and writes the browser clipboard

- log: 2026-11-13T09:24:38Z @kj category created

- [x] `ACC-FRONT-1-OSC52-COPY` **OSC 52 copy reaches the browser clipboard** - CRITICAL; a terminal writing ESC ] 52 ; c ; <base64> BEL puts the decoded UTF-8 text in the browser clipboard, by the Clipboard API or by execCommand on an http page
  - evidence: jest 'copies a valid clipboard payload' and the writeToClipboard suite pass; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - test: jest: handleOsc52 'copies a valid clipboard payload', writeToClipboard fallback tests
  - test-tags: UNIT
  - log: 2026-11-13T09:24:38Z @kj added
  - log: 2026-11-13T09:26:29Z @kj closed
- [x] `ACC-FRONT-2-DEFER-FOCUS` **Unfocused copy waits for focus** - HIGH; a copy that arrives while the document is unfocused is held and written at the next focus or visibilitychange; one copy held, newest wins; discarded with a warning after 15 seconds
  - evidence: jest suite 'handleOsc52 while unfocused', 11 tests, passes; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - test: jest: describe 'handleOsc52 while unfocused'
  - test-tags: UNIT
  - log: 2026-11-13T09:24:38Z @kj added
  - log: 2026-11-13T09:26:29Z @kj closed
- [x] `ACC-FRONT-3-READ-IGNORED` **Clipboard read request is ignored** - HIGH; OSC 52 with payload ? is acknowledged and never reads or writes the clipboard; an empty payload writes nothing and drops a held copy
  - evidence: jest 'acknowledges a read request without touching the clipboard' and 'cancels a deferred copy when a clear request arrives' pass; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - test: jest: 'acknowledges a read request without touching the clipboard', 'cancels a deferred copy when a clear request arrives'
  - test-tags: UNIT
  - log: 2026-11-13T09:24:38Z @kj added
  - log: 2026-11-13T09:26:30Z @kj closed
- [x] `ACC-FRONT-4-ACTIVATES` **Extension activates in JupyterLab** - MEDIUM; the lab loads the plugin and logs its activation line once
  - evidence: Galata 'should emit an activation console message' passes; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - test: Galata: 'should emit an activation console message'
  - test-tags: E2E
  - log: 2026-11-13T09:24:38Z @kj added
  - log: 2026-11-13T09:26:30Z @kj closed

## Clipboard shims `SHIM`

The xclip, xsel and wl-copy replacements and their installation into ~/.local/bin

- log: 2026-11-13T09:24:39Z @kj category created

- [x] `ACC-SHIM-5-EMIT-TTY` **Shims send the copy as OSC 52 to the terminal** - CRITICAL; xclip, xsel and wl-copy shims base64-encode stdin and write the OSC 52 sequence to /dev/tty, with full and abbreviated xclip options (-selection clipboard, -sel clip, -t TYPE)
  - evidence: pytest test_shim_sends_the_copy_to_the_terminal passes, 5 command lines; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - test: pytest: test_shim_sends_the_copy_to_the_terminal
  - test-tags: UNIT
  - log: 2026-11-13T09:24:39Z @kj added
  - log: 2026-11-13T09:26:30Z @kj closed
- [x] `ACC-SHIM-6-NO-TTY` **Shim without a terminal fails and writes nothing to stdout** - HIGH; called with no controlling terminal a shim exits 1 with a message on stderr; the escape sequence never goes to stdout
  - evidence: pytest test_shim_without_a_terminal_fails_and_keeps_stdout_clean passes; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - test: pytest: test_shim_without_a_terminal_fails_and_keeps_stdout_clean
  - test-tags: UNIT
  - log: 2026-11-13T09:24:39Z @kj added
  - log: 2026-11-13T09:26:30Z @kj closed
- [x] `ACC-SHIM-7-AUTO-INSTALL` **Shims installed at server start when no tool works** - HIGH; loading the server extension copies xclip, xsel and wl-copy shims, executable, into ~/.local/bin for each tool that is absent or has no DISPLAY / WAYLAND_DISPLAY; a real tool with its display set gets no shim
  - evidence: pytest test_installs_every_shim_when_no_tool_works and test_leaves_a_working_real_tool_alone pass; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - test: pytest: test_installs_every_shim_when_no_tool_works, test_leaves_a_working_real_tool_alone
  - test-tags: UNIT
  - log: 2026-11-13T09:24:39Z @kj added
  - log: 2026-11-13T09:26:30Z @kj closed
- [x] `ACC-SHIM-8-NO-OVERWRITE` **A tool the extension did not create is never overwritten** - CRITICAL; install_shims and tools/install-osc52-shims.sh leave an existing xclip, xsel or wl-copy in the target directory untouched unless it is one of the shims
  - evidence: pytest test_never_overwrites_a_file_it_did_not_create and test_install_script_keeps_foreign_files_and_removes_its_copies pass; build_test.py 2026-11-13 at 1.0.17: Jest 31, pytest 11, Galata 1 passed
  - test: pytest: test_never_overwrites_a_file_it_did_not_create, test_install_script_keeps_foreign_files_and_removes_its_copies
  - test-tags: UNIT
  - log: 2026-11-13T09:24:39Z @kj added
  - log: 2026-11-13T09:26:30Z @kj closed
