<!-- @import /home/lab/workspace/.claude/CLAUDE.md -->

# Project-Specific Configuration

This file imports workspace-level configuration from `/home/lab/workspace/.claude/CLAUDE.md`.
All workspace rules apply. Project-specific rules below strengthen or extend them.

The workspace `/home/lab/workspace/.claude/` directory contains additional instruction files
(MERMAID.md, NOTEBOOK.md, DATASCIENCE.md, GIT.md, and others) referenced by CLAUDE.md.
Consult workspace CLAUDE.md and the .claude directory to discover all applicable standards.

## Mandatory Bans (Reinforced)

The following workspace rules are STRICTLY ENFORCED for this project:

- **No automatic git tags** - only create tags when user explicitly requests
- **No automatic version changes** - only modify version in package.json/pyproject.toml/etc. when user explicitly requests
- **No automatic publishing** - never run `make publish`, `npm publish`, `twine upload`, or similar without explicit user request
- **No manual package installs if Makefile exists** - use `make install` or equivalent Makefile targets, not direct `pip install`/`uv install`/`npm install`
- **No automatic git commits or pushes** - only when user explicitly requests

## Project Context

JupyterLab 4.x frontend extension providing clipboard integration for terminal sessions. Intercepts OSC 52 escape sequences from terminal applications and routes clipboard content to the browser's clipboard API, enabling copy operations from terminal programs to work in the browser environment.

- **Technology stack**: TypeScript, JupyterLab 4 extension API, Lumino widgets
- **Build system**: Makefile (v1.30), hatchling (Python), jlpm/webpack (TypeScript)
- **Package name (npm)**: `jupyterlab_terminal_clipboard_extension`
- **Package name (PyPI)**: `jupyterlab-terminal-clipboard-extension`
- **GitHub owner**: `stellarshenson`

## Required Workspace Skills

The following workspace skills MUST be consulted when working on this project:

- **jupyterlab-extension** (`/home/lab/workspace/.claude/skills/jupyterlab-extension/SKILL.md`) - extension development guidelines, testing strategy, CI/CD workflows with jupyter-releaser, TypeScript compatibility caveats, and local development patterns
- **playwright** (`/home/lab/workspace/.claude/skills/playwright/SKILL.md`) - browser automation for screenshots, UI verification, and integration testing

## Makefile Version Tracking

**MANDATORY**: Before any build or development task, compare the local `Makefile` version header against the canonical version at `/home/lab/workspace/private/jupyterlab/@utils/jupyterlab-extensions/Makefile`. If the canonical Makefile has a newer version number, update the local Makefile immediately before proceeding.

The version is declared on line 1: `# Makefile for Jupyterlab extensions version X.XX`

## Package Metadata Files

**MANDATORY**: Always commit both `package.json` and `package-lock.json` together. These files must be tracked in git and kept in sync.

## Strengthened Rules

- Always use `make install` to install packages - never run `npm install`, `jlpm install`, or `pip install` directly
- The `Makefile` is the single entry point for all build, install, test, and publish operations
