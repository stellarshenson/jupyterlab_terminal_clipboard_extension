<!-- @import /home/lab/.claude/CLAUDE.md -->
<!-- @import /home/lab/workspace/.claude/CLAUDE.md -->

# Project-Specific Configuration

This file is a thin overlay. It imports and does not duplicate:

- **User-level** (global, every project on this machine): `/home/lab/.claude/CLAUDE.md`
- **Workspace-level** (everything under `/home/lab/workspace`): `/home/lab/workspace/.claude/CLAUDE.md`

All rules in both layers apply here. Only project-specific rules live below. Depth lives in the
skills under `/home/lab/.claude/skills/`, which load on their own triggers.

## Mandatory Bans (Reinforced)

The following workspace rules are STRICTLY ENFORCED for this project:

- **No automatic git tags** - only create tags when user explicitly requests
- **No automatic version changes** - only modify version in package.json/pyproject.toml/etc. when user explicitly requests
- **No automatic publishing** - never run `make publish`, `npm publish`, `twine upload`, or similar without explicit user request
- **No manual package installs if Makefile exists** - use `make install` or equivalent Makefile targets, not direct `pip install`/`uv install`/`npm install`
- **No automatic git commits or pushes** - only when user explicitly requests

## Build Lifecycle - Makefile Only

**MANDATORY**: the project `Makefile` owns the entire build lifecycle. Never run `pip`, `jlpm`,
`yarn`, `npm`, build, publish, or clean commands directly.

- `make install` - raise the patch version, build, then install the wheel with every optional-dependency group
- `make build` - build only; does not raise the version
- `make test` - jest, then pytest and the auth gate when `jupyterlab_terminal_clipboard_extension/tests` exists
- `make upgrade` - upgrade npm dependencies and report advisories
- `make publish` - release (explicit user request only, per the bans above)
- `make clean` / `make mrproper` - remove build artefacts / all build and venv artefacts
- `make help` - list all targets

**Makefile currency**: the local `Makefile` is a verbatim copy of the canonical
`/home/lab/workspace/private/jupyterlab/@utils/jupyterlab-extensions/Makefile`. Compare line 1
(`# Makefile for Jupyterlab extensions version N.NN`) and re-copy the canonical file whenever it is
newer - do not hand-edit the local copy.

## Project Context

JupyterLab 4.x frontend extension providing clipboard integration for terminal sessions. Intercepts
OSC 52 escape sequences from terminal applications and routes clipboard content to the browser's
clipboard API, enabling copy operations from terminal programs to work in the browser environment.

- **Technology stack**: TypeScript, JupyterLab 4 extension API, Lumino widgets
- **Build system**: Makefile (v1.46), hatchling (Python), jlpm/rspack (TypeScript)
- **Package name (npm)**: `jupyterlab_terminal_clipboard_extension`
- **Package name (PyPI)**: `jupyterlab-terminal-clipboard-extension`
- **GitHub owner**: `stellarshenson`
- **Scaffolding**: copier template `jupyterlab/extension-template`; answers in `.copier-answers.yml`, which is never hand-edited - update with `copier update --trust --skip-answered --defaults`

**The shim layer carries the real-world blast radius.** `install_shims()` writes into the user's
`~/.local/bin`, so it must never overwrite a file it did not create; and the shims must never write
an OSC 52 escape to stdout, where it would corrupt a caller's pipe instead of reaching the terminal.

## Required Workspace Skills

Skills live at `/home/lab/.claude/skills/` (global, available in every project).

- **`jupyterlab-extension`** - extension development guidelines, testing strategy, CI/CD with jupyter-releaser, TypeScript compatibility caveats, local development patterns. Mandatory for all work in this repository
- **`my-browser`** - Playwright browser automation for screenshots, UI verification, and integration testing against a running JupyterLab
- **`graphify`** - impact analysis before editing existing code; artefacts land in `tmp/graphify-out/`

## Journal Rules (Project-Specific)

- **APPEND ONLY**: New journal entries MUST be appended at the end of the file, never inserted between existing entries
- Entries maintain strict chronological order by position - the last entry in the file is always the most recent work
- Never reorder, move, or insert entries out of sequence
- The Stellars **journal plugin** is the canonical tool for this file: create via `/journal:create`, append via `/journal:update`, archive via `/journal:archive`. The `journal:journal` skill auto-triggers on any mention of "journal" and runs `journal-tools check` after every write
- Direct edits to `JOURNAL.md` are a last resort - prefer the plugin so modus secundis format, continuous numbering and append-only order are enforced automatically

## Package Metadata Files

**MANDATORY**: Always commit both `package.json` and `package-lock.json` together. These files must be tracked in git and kept in sync.

## Strengthened Rules

- Always use `make install` to install packages - never run `npm install`, `jlpm install`, or `pip install` directly
- The `Makefile` is the single entry point for all build, install, test, and publish operations
- Both `package-lock.json` and `yarn.lock` are tracked - `make publish` stages the lockfiles, so a release that reverts build-tool re-resolution must keep the version lines and drop only the churn
