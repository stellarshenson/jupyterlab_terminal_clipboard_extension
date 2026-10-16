# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## [1.0.9] - 2026-10-16

### Changed

- Dependencies upgraded to their current releases
- Licence metadata moved to the SPDX form (`license = "BSD-3-Clause"` with `license-files`), and the source distribution no longer ships the legacy `setup.py` shim

<!-- <END NEW CHANGELOG ENTRY> -->

## [1.0.8] - 2026-08-19

### Fixed

- A copy made while the JupyterLab window was not focused is no longer lost - both browser clipboard paths require a focused document, and a terminal program emits OSC 52 whenever it likes, so the copy is now held and written when focus returns
- Every outcome of a copy is now logged: a refused write, a failed fallback and a discarded stale copy all report at warning level instead of vanishing silently

### Changed

- One copy is held at a time and the newest supersedes the older, matching how the system clipboard itself behaves
- A held copy older than 15 seconds is discarded rather than landing on top of something copied elsewhere in the meantime

## [1.0.7] - 2026-07-23

### Fixed

- Installer no longer overwrites clipboard tools it did not create - a user's own `xclip`, `xsel` or `wl-copy` in `~/.local/bin` is left untouched and reported instead of being replaced
- Shims no longer write the OSC 52 escape to stdout when there is no controlling terminal - the base64 clipboard payload could leak into a caller's pipe or output file while still reporting success; the shims now fail with a diagnostic on stderr and exit 1
