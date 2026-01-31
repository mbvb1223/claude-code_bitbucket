# Claude Bitbucket PR Review

A TypeScript automation tool for PR code review using Claude CLI with Bitbucket integration.

## Features

- **Review Mode**: Automatically review PRs when created
- **Tag Mode**: Respond to `@claude` mentions in PR comments
- **No external dependencies**: Uses native `fetch` for Bitbucket API
- **TypeScript**: Full type safety with strict mode
- **Bun runtime**: Fast execution
- **Well tested**: Unit tests with Bun test runner

## Project Structure

```
src/
├── index.ts           # Entry point - coordinates modes
├── config.ts          # Environment variable loading
├── logger.ts          # Simple logging utility
├── bitbucket.ts       # Bitbucket API client (native fetch)
├── claude.ts          # Claude CLI runner
├── __tests__/         # Unit tests
│   ├── types.test.ts
│   ├── classify.test.ts
│   └── config.test.ts
├── shared/            # Shared utilities
│   ├── constants.ts   # Centralized constants
│   ├── types.ts       # Shared type definitions
│   └── usage.ts       # Usage logging
├── prompts/           # Prompt templates
│   ├── review.ts      # Review mode prompts
│   └── tag.ts         # Tag mode prompts
├── modes/
│   ├── review.ts      # Auto-review mode
│   └── tag.ts         # @claude trigger mode
└── utils/
    ├── git.ts         # Git utilities
    └── install-claude.ts
```

## How It Works

### Review Mode (`MODE=review`)

1. Triggered on every PR pipeline run
2. Gets PR diff using local git commands
3. Sends diff to Claude for review (read-only tools)
4. Posts review as PR comment with severity badges (🔴🟡🟢)

### Tag Mode (`MODE=tag`)

1. Fetches all PR comments
2. Finds comments containing `@claude`
3. Classifies request as actionable or informational
4. Runs Claude with appropriate tool permissions
5. Posts response as reply to the trigger comment

## Requirements

- [Bun](https://bun.sh/) >= 1.0.0
- [Claude CLI](https://github.com/anthropics/claude-code) (auto-installed if missing)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | API key for Claude CLI |
| `BITBUCKET_WORKSPACE` | Yes | - | Bitbucket workspace name |
| `BITBUCKET_REPO_SLUG` | Yes | - | Repository slug |
| `BITBUCKET_PR_ID` | Yes* | - | Pull request ID (*provided by pipeline) |
| `BITBUCKET_PR_DESTINATION_BRANCH` | No | `main` | Target branch |
| `BITBUCKET_ACCESS_TOKEN` | No | - | For posting comments |
| `MODE` | No | `review` | `review` or `tag` |
| `TRIGGER_PHRASE` | No | `@claude` | Trigger for tag mode |
| `MODEL` | No | `haiku` | Claude model |
| `MAX_TURNS` | No | `30` | Max conversation turns |
| `VERBOSE` | No | `false` | Enable debug logging |

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

### Development Commands

```bash
# Run the application
bun start

# Type checking
bun run typecheck

# Linting
bun run lint
bun run lint:fix

# Formatting
bun run format
bun run format:check

# Run tests
bun test

# Run all checks (typecheck + lint + format)
bun run check

# Build for production
bun run build
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

## Request Classification (Tag Mode)

| Type | Examples | Claude Tools |
|------|----------|--------------|
| **Informational** | "What does this do?", "Review this code" | Read, Grep, Glob |
| **Actionable** | "Fix this bug", "Add error handling" | Read, Edit, Write, Bash |

## Architecture

```
index.ts (Entry Point)
    │
    ├── config.ts (Load & validate env vars)
    │
    ├── [Mode Dispatcher]
    │   ├── review.ts (Auto PR review)
    │   └── tag.ts (@claude responses)
    │
    ├── claude.ts (CLI runner)
    │
    └── bitbucket.ts (API client)
```

## License

MIT