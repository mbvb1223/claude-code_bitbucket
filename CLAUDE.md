# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Bitbucket PR Review - A TypeScript automation tool that integrates Claude AI with Bitbucket for intelligent pull request reviews and AI-powered code assistance. Runs in Bitbucket pipelines using the Claude Code CLI.

## Commands

```bash
# Run the application
bun start

# Type checking
bun run typecheck

# Build for production
bun build ./src/index.ts --outdir ./dist --target bun
```

## Architecture

```
index.ts (Main Coordinator)
    ↓
[Configuration Validation] ← config.ts
    ↓
[Mode Dispatcher]
    ├─→ Review Mode (modes/review.ts) - Read-only PR analysis
    └─→ Tag Mode (modes/tag.ts) - @claude trigger responses
    ↓
[Claude CLI Runner] ← claude.ts (spawns process)
    ↓
[Bitbucket Integration] ← bitbucket.ts (posts results)
```

### Key Files

- **src/index.ts**: Entry point, mode orchestration
- **src/config.ts**: Environment variable loading and validation
- **src/claude.ts**: Claude CLI process spawning with JSON output parsing, tool restrictions via `--allowed-tools`/`--disallowed-tools`
- **src/bitbucket.ts**: Bitbucket API client (native fetch, no external HTTP libs)
- **src/modes/review.ts**: Automatic PR review with severity badges (🔴🟡🟢)
- **src/modes/tag.ts**: Comment trigger handling with smart request classification
- **src/utils/git.ts**: Git commands via execSync (diff, changed files, branches)

### Operating Modes

**Review Mode** (`MODE=review`): Automatic PR review, read-only tools (Read, Grep, Glob)

**Tag Mode** (`MODE=tag`): Responds to `@claude` mentions. Classifies requests:
- Actionable (fix, change, add, refactor) → Full tool access including Edit, Write, Bash
- Informational (what, why, explain, review) → Read-only tools

### Request Classification (`modes/tag.ts`)

Actionable patterns: fix, change, update, add, remove, modify, refactor, implement, create, "make it", "can you"

Informational patterns: what, why, how, explain, review, check, analyze, questions ending with `?`

Default fallback: Informational (safer)

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Yes | - | Claude API auth |
| `BITBUCKET_WORKSPACE` | Yes | - | Workspace name |
| `BITBUCKET_REPO_SLUG` | Yes | - | Repository slug |
| `BITBUCKET_PR_ID` | Pipeline-set | - | PR identifier |
| `BITBUCKET_PR_DESTINATION_BRANCH` | No | `main` | Target branch for diffs |
| `BITBUCKET_ACCESS_TOKEN` | No | - | For posting comments (`username:app_password` or API token) |
| `MODE` | No | `review` | `review` or `tag` |
| `TRIGGER_PHRASE` | No | `@claude` | Comment trigger |
| `MODEL` | No | `haiku` | Claude model |
| `MAX_TURNS` | No | `30` | Max conversation turns |
| `VERBOSE` | No | `false` | Debug logging |

## Tech Stack

- **Runtime**: Bun >= 1.0.0
- **Language**: TypeScript 5.6.2 (ES2022, strict mode)
- **HTTP**: Native fetch (no external dependencies)
- **Git**: execSync commands

## Design Patterns

- **Minimal dependencies**: Native fetch, no external HTTP libraries
- **Local-first**: Uses git commands instead of API calls when possible
- **Environment-driven**: All configuration via environment variables
- **Tool safety**: Dynamic tool access based on request classification