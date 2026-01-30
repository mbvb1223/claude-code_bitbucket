# Claude Bitbucket PR Review

A simplified TypeScript implementation for automated PR code review using Claude CLI with Bitbucket integration.

## Features

- **Review Mode**: Automatically review PRs when created
- **Tag Mode**: Respond to `@claude` mentions in PR comments
- **No external dependencies**: Uses native `fetch` for Bitbucket API
- **TypeScript**: Full type safety
- **Bun runtime**: Fast execution

## Project Structure

```
src/
├── index.ts        # Entry point - coordinates modes
├── config.ts       # Environment variable loading
├── logger.ts       # Simple logging utility
├── bitbucket.ts    # Bitbucket API client (native fetch)
├── claude.ts       # Claude CLI runner
└── modes/
    ├── review.ts   # Auto-review mode
    └── tag.ts      # @claude trigger mode
```

## How It Works

### Review Mode (`MODE=review`)

1. Triggered on every PR pipeline run
2. Fetches PR diff from Bitbucket API
3. Sends diff to Claude for review (read-only tools)
4. Posts review as PR comment

### Tag Mode (`MODE=tag`)

1. Fetches all PR comments
2. Finds comments containing `@claude`
3. Classifies request as actionable or informational
4. Runs Claude with appropriate tool permissions
5. Posts response as reply to the trigger comment

## Requirements

- [Bun](https://bun.sh/) >= 1.0.0
- [Claude CLI](https://github.com/anthropics/claude-code) installed

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | API key for Claude CLI |
| `BITBUCKET_WORKSPACE` | Yes | Bitbucket workspace name |
| `BITBUCKET_REPO_SLUG` | Yes | Repository slug |
| `BITBUCKET_PR_ID` | Yes* | Pull request ID (*provided by pipeline) |
| `BITBUCKET_PR_DESTINATION_BRANCH` | No | Target branch (default: main) |
| `BITBUCKET_ACCESS_TOKEN` | No | For posting comments: `username:app_password` |
| `MODE` | No | `review` or `tag` (default: review) |
| `TRIGGER_PHRASE` | No | Trigger for tag mode (default: @claude) |
| `MODEL` | No | Claude model (default: sonnet) |
| `MAX_TURNS` | No | Max conversation turns (default: 30) |
| `VERBOSE` | No | Enable debug logging (default: false) |

## Usage

### Local Development

```bash
# Install dependencies
bun install

# Set environment variables
export ANTHROPIC_API_KEY="your-key"
export BITBUCKET_WORKSPACE="your-workspace"
export BITBUCKET_REPO_SLUG="your-repo"
export BITBUCKET_PR_ID="123"
export BITBUCKET_ACCESS_TOKEN="username:app_password"

# Run review mode
MODE=review bun start

# Run tag mode
MODE=tag bun start
```

### Bitbucket Pipeline

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          name: Claude Code Review
          image: oven/bun:1
          script:
            # Install Claude CLI
            - curl -fsSL https://claude.ai/install.sh | sh
            - export PATH="$HOME/.local/bin:$PATH"

            # Clone this repo (or include in your project)
            - git clone https://github.com/your-org/claude-bitbucket-review.git /tmp/claude-review
            - cd /tmp/claude-review && bun install

            # Run review
            - cd $BITBUCKET_CLONE_DIR
            - MODE=review bun run /tmp/claude-review/src/index.ts
```

### Repository Variables

Set these in Bitbucket > Repository Settings > Repository Variables:

- `ANTHROPIC_API_KEY` (secured)
- `BITBUCKET_ACCESS_TOKEN` (secured) - format: `username:app_password`

## Creating a Bitbucket App Password

1. Go to [Bitbucket App Passwords](https://bitbucket.org/account/settings/app-passwords/)
2. Create new app password with permissions:
   - Repositories: Read
   - Pull requests: Read, Write
3. Use format: `your-username:app-password-here`

## Request Classification

In tag mode, requests are classified as:

| Type | Examples | Claude Tools |
|------|----------|--------------|
| **Informational** | "What does this do?", "Review this code" | Read, Grep (read-only) |
| **Actionable** | "Fix this bug", "Add error handling" | Read, Edit, Write, Bash |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    index.ts                             │
│                  (Entry Point)                          │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Review Mode    │     │    Tag Mode     │
│  (auto-review)  │     │ (@claude reply) │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │     claude.ts         │
         │  (Claude CLI Runner)  │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │    bitbucket.ts       │
         │ (API Client - fetch)  │
         └───────────────────────┘
```

## Comparison with tsadrakula/Claude_Code_Bitbucket

| Feature | This Project | tsadrakula |
|---------|--------------|------------|
| Language | TypeScript | TypeScript |
| Runtime | Bun | Bun |
| Dependencies | None (native fetch) | bitbucket SDK, MCP SDK |
| Modes | 2 (review, tag) | 3 (review, tag, agent) |
| Streaming | Basic | Full streaming comments |
| Cloud Providers | Anthropic only | Anthropic, AWS, GCP |
| Complexity | ~400 lines | ~3000+ lines |

This project is intentionally simpler for learning purposes.

## License

MIT
