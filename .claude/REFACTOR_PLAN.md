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

### Summary of Changes (Phase 1)
- Removed ~35 lines of duplicated code
- Centralized 2 regex pattern arrays (ACTIONABLE_PATTERNS, INFORMATIONAL_PATTERNS)
- Unified tool configurations (TOOL_CONFIGS.readOnly, TOOL_CONFIGS.fullAccess)
- Added type safety to config.mode (no more unsafe `as` cast)

### Phase 3: Extract Prompts
- [x] Created `src/prompts/review.ts` - `buildReviewPrompt()`, `formatReviewComment()`
- [x] Created `src/prompts/tag.ts` - `buildTagPrompt()`, `buildActionablePrompt()`, `buildInformationalPrompt()`
- [x] Created `src/prompts/index.ts` - Barrel exports
- [x] Updated `src/modes/review.ts` - Imports prompts from `../prompts`
- [x] Updated `src/modes/tag.ts` - Imports prompts from `../prompts`

### Summary of Changes (Phase 3)
- Extracted ~70 lines of prompt templates to dedicated module
- Prompts now use typed params interfaces (`ReviewPromptParams`, `TagPromptParams`)
- Cleaner separation of concerns between mode logic and prompt templates

### Phase 5: Code Quality
- [x] Added ESLint 9 flat config with TypeScript support
- [x] Added Prettier with project conventions
- [x] Created `src/__tests__/` directory with 38 unit tests
- [x] Exported `classifyRequest()` and `extractRequest()` from tag.ts for testing

### Summary of Changes (Phase 5)
- New files: `eslint.config.js`, `.prettierrc`, `src/__tests__/*.test.ts`
- Added npm scripts: `lint`, `lint:fix`, `format`, `format:check`, `test`, `check`
- 38 unit tests covering types, classification, and config modules
- All code formatted with Prettier

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

### Phase 3: Extract Prompts ✅
- [x] Create `src/prompts/review.ts` - Review prompt template
- [x] Create `src/prompts/tag.ts` - Tag mode prompts (actionable/informational)
- [x] Create `src/prompts/index.ts` - Barrel export
- [x] Update modes to import prompts from shared location

### Phase 4: Additional Validation
- [ ] Add `VALID_MODELS` constant and validate model names
- [ ] Add range validation for `maxTurns` (1-100)
- [ ] Add URL validation for Bitbucket workspace/repo
- [ ] Consider adding schema validation (e.g., Zod)

### Phase 5: Code Quality ✅
- [x] Add ESLint configuration (flat config for ESLint 9)
- [x] Add Prettier for consistent formatting
- [x] Add unit tests for:
  - [x] `classifyRequest()` function (12 tests)
  - [x] `extractRequest()` function (7 tests)
  - [x] `isValidMode()` type guard (5 tests)
  - [x] Config loading/validation (14 tests)
- [ ] Add integration tests for Claude CLI runner (deferred - requires mocking)

---

## File Structure After Refactoring

```
src/
├── index.ts                 # Entry point
├── config.ts                # Configuration (uses shared types)
├── logger.ts                # Logging utility
├── claude.ts                # Claude CLI runner
├── bitbucket.ts             # Bitbucket API client
├── __tests__/               # Unit tests ✅
│   ├── types.test.ts        # isValidMode tests
│   ├── classify.test.ts     # classifyRequest, extractRequest tests
│   └── config.test.ts       # loadConfig, validateConfig tests
├── shared/
│   ├── index.ts             # Barrel exports ✅
│   ├── constants.ts         # Centralized constants ✅
│   ├── types.ts             # Shared type definitions ✅
│   ├── usage.ts             # Usage logging utility ✅
│   └── errors.ts            # Custom error classes (TODO)
├── prompts/
│   ├── index.ts             # Barrel exports ✅
│   ├── review.ts            # Review prompts ✅
│   └── tag.ts               # Tag mode prompts ✅
├── modes/
│   ├── review.ts            # Review mode (refactored) ✅
│   └── tag.ts               # Tag mode (refactored) ✅
└── utils/
    ├── git.ts               # Git utilities
    └── install-claude.ts    # Claude CLI installation
```

---

## Deferred - Tag Mode 🔜

All tag mode improvements deferred for later:
- Duplicate response check in `findTriggerComment()`
- Tag mode integration tests
- Tag-specific error handling

**Current focus: Review Mode**

---

## Review Mode - Pending Improvements

- [ ] Fix dynamic import in `index.ts:55` - should be static import
- [ ] Review unused git utilities (`getFileDiff`, `getCurrentBranch`, `getLastCommitMessage`)
- [ ] Better error handling for `bitbucket.ts` and `git.ts` (return empty/null on errors)

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