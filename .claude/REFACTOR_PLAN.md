# Refactoring Plan - Claude Bitbucket PR Review

## Completed ✅

### Phase 1: Code Deduplication
- [x] Created `src/shared/constants.ts` - Centralized constants (MAX_DIFF_SIZE, tool configs)
- [x] Created `src/shared/usage.ts` - Shared `logClaudeUsage()` function
- [x] Created `src/shared/types.ts` - Unified result types (`ModeResult`, `ReviewResult`, `TagResult`, `Mode`)
- [x] Created `src/shared/index.ts` - Barrel exports
- [x] Updated `src/modes/review.ts` - Uses shared constants, logging, and types
- [x] Updated `src/modes/tag.ts` - Uses shared constants, patterns, logging, and types
- [x] Updated `src/config.ts` - Uses `Mode` type with `isValidMode()` type guard

### Summary of Changes
- Removed ~35 lines of duplicated code
- Centralized 2 regex pattern arrays (ACTIONABLE_PATTERNS, INFORMATIONAL_PATTERNS)
- Unified tool configurations (TOOL_CONFIGS.readOnly, TOOL_CONFIGS.fullAccess)
- Added type safety to config.mode (no more unsafe `as` cast)

---

## Remaining Tasks 📋

### Phase 2: Error Handling
- [ ] Create `src/shared/errors.ts` with custom error classes:
  - `ConfigError` - Configuration validation errors
  - `ClaudeError` - Claude CLI execution errors
  - `BitbucketApiError` - API request failures
- [ ] Update `src/bitbucket.ts` to throw typed errors instead of returning null
- [ ] Update `src/claude.ts` to use ClaudeError
- [ ] Add error recovery/retry logic where appropriate

### Phase 3: Extract Prompts
- [ ] Create `src/prompts/review.ts` - Review prompt template
- [ ] Create `src/prompts/tag.ts` - Tag mode prompts (actionable/informational)
- [ ] Create `src/prompts/index.ts` - Barrel export
- [ ] Update modes to import prompts from shared location

### Phase 4: Additional Validation
- [ ] Add `VALID_MODELS` constant and validate model names
- [ ] Add range validation for `maxTurns` (1-100)
- [ ] Add URL validation for Bitbucket workspace/repo
- [ ] Consider adding schema validation (e.g., Zod)

### Phase 5: Code Quality (Optional)
- [ ] Add ESLint configuration
- [ ] Add Prettier for consistent formatting
- [ ] Add unit tests for:
  - `classifyRequest()` function
  - `isValidMode()` type guard
  - Config loading/validation
- [ ] Add integration tests for Claude CLI runner

---

## File Structure After Refactoring

```
src/
├── index.ts                 # Entry point
├── config.ts                # Configuration (uses shared types)
├── logger.ts                # Logging utility
├── claude.ts                # Claude CLI runner
├── bitbucket.ts             # Bitbucket API client
├── shared/
│   ├── index.ts             # Barrel exports ✅
│   ├── constants.ts         # Centralized constants ✅
│   ├── types.ts             # Shared type definitions ✅
│   ├── usage.ts             # Usage logging utility ✅
│   └── errors.ts            # Custom error classes (TODO)
├── prompts/                 # (TODO)
│   ├── index.ts
│   ├── review.ts
│   └── tag.ts
├── modes/
│   ├── review.ts            # Review mode (refactored) ✅
│   └── tag.ts               # Tag mode (refactored) ✅
└── utils/
    ├── git.ts               # Git utilities
    └── install-claude.ts    # Claude CLI installation
```

---

## How to Continue

1. Run `bun run typecheck` to verify current state
2. Pick a phase from "Remaining Tasks"
3. Follow the checklist items in order

## Commands Reference

```bash
# Type check
bun run typecheck

# Run the app
bun start

# Build for production
bun build ./src/index.ts --outdir ./dist --target bun
```