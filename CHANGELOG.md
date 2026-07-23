# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## [1.0.7] - 2026-07-23

### Fixed

- Installer no longer overwrites clipboard tools it did not create - a user's own `xclip`, `xsel` or `wl-copy` in `~/.local/bin` is left untouched and reported instead of being replaced
- Shims no longer write the OSC 52 escape to stdout when there is no controlling terminal - the base64 clipboard payload could leak into a caller's pipe or output file while still reporting success; the shims now fail with a diagnostic on stderr and exit 1

<!-- <END NEW CHANGELOG ENTRY> -->
