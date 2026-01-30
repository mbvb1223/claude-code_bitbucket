/**
 * Review Mode
 * Automatically reviews PR when created/updated
 * No trigger phrase needed - runs on every PR
 */

import type { Config } from "../config";
import type { BitbucketClient, PullRequest } from "../bitbucket";
import { runClaude } from "../claude";
import { logger } from "../logger";
import { getLocalDiff, getChangedFiles } from "../utils/git";

export interface ReviewResult {
  success: boolean;
  reviewPosted: boolean;
  error?: string;
}

/**
 * Check if review mode should run
 */
export function shouldRunReview(config: Config): boolean {
  // Review mode needs a PR
  if (!config.prId) {
    logger.info("No PR ID - review mode skipped");
    return false;
  }

  return config.mode === "review";
}

/**
 * Run automatic PR review
 */
export async function runReviewMode(
  config: Config,
  client: BitbucketClient
): Promise<ReviewResult> {
  logger.info("Starting review mode...");

  if (!config.prId) {
    return { success: false, reviewPosted: false, error: "No PR ID" };
  }

  // 1. Get PR details (optional - for metadata only)
  let pr: PullRequest | null = null;
  if (config.bitbucketToken) {
    pr = await client.getPullRequest(config.prId);
    if (!pr) {
      logger.warn("Could not fetch PR details, using environment variables");
    }
  }

  // 2. Get diff using local git (no API call needed!)
  logger.info("Getting diff from local git...");
  const changedFiles = getChangedFiles(config.destinationBranch);
  logger.info(`Changed files: ${changedFiles.length}`);

  const diff = getLocalDiff(config.destinationBranch);

  if (!diff) {
    logger.warn("No diff found");
    return { success: true, reviewPosted: false, error: "No diff" };
  }

  logger.info(`Diff size: ${diff.length} characters`);

  // 3. Build review prompt
  const prompt = buildReviewPrompt(config, pr, diff);

  // 4. Run Claude with read-only tools (no editing)
  const result = await runClaude(config, prompt, {
    allowedTools: ["Read", "Grep", "Glob"],
    blockedTools: ["Write", "Edit", "MultiEdit", "Bash"],
  });

  if (!result.success) {
    logger.error("Claude review failed:", result.error);
    return { success: false, reviewPosted: false, error: result.error };
  }

  // Debug logging for Claude output
  logger.debug(`Claude output length: ${result.output?.length || 0}`);
  logger.debug(`Claude output preview: ${result.output?.substring(0, 200) || "(empty)"}`);

  // Show full output to console for debugging
  if (result.output) {
    console.log("\n=== REVIEW OUTPUT ===");
    console.log(result.output);
    console.log("=== END OUTPUT ===\n");
  } else {
    logger.warn("Claude returned empty output");
  }

  // Log usage/cost information
  if (result.usage) {
    logger.info("--- Claude Usage ---");
    logger.info(`  Input tokens:  ${result.usage.inputTokens.toLocaleString()}`);
    logger.info(`  Output tokens: ${result.usage.outputTokens.toLocaleString()}`);
    logger.info(`  Total tokens:  ${result.usage.totalTokens.toLocaleString()}`);
    if (result.usage.costUsd !== undefined) {
      logger.info(`  Cost:          $${result.usage.costUsd.toFixed(4)}`);
    }
    logger.info("--------------------");
  }

  // 5. Post review comment
  if (result.output && config.bitbucketToken) {
    const comment = formatReviewComment(result.output);
    const posted = await client.postComment(config.prId, comment);

    if (posted) {
      logger.success("Review posted to PR");
      return { success: true, reviewPosted: true };
    } else {
      logger.error("Failed to post review comment");
      return { success: true, reviewPosted: false, error: "Failed to post comment" };
    }
  }

  // No token - just log the review
  logger.info("Review output (no token to post):");
  console.log(result.output);

  return { success: true, reviewPosted: false };
}

/**
 * Build the prompt for Claude to review the PR
 */
function buildReviewPrompt(
  config: Config,
  pr: PullRequest | null,
  diff: string
): string {
  const title = pr?.title || process.env.BITBUCKET_PR_TITLE || "Pull Request";
  const description = pr?.description || process.env.BITBUCKET_PR_DESCRIPTION || "";
  const sourceBranch = pr?.source?.branch?.name || process.env.BITBUCKET_BRANCH || "unknown";
  const destBranch = pr?.destination?.branch?.name || config.destinationBranch;
  const author = pr?.author?.display_name || "unknown";

  return `
# Pull Request Review

**Title:** ${title}
**Author:** ${author}
**Branch:** ${sourceBranch} → ${destBranch}

## Description
${description || "No description provided"}

## Your Task
Review the code changes in this PR. Provide constructive feedback.

**Important:** You have access to the full codebase. Use the Read, Grep, and Glob tools to:
- Read related files to understand context
- Check how changed code interacts with other parts
- Verify imports, function calls, and dependencies
- Look for similar patterns in the codebase

### Review Areas

1. **Code Quality** - Readability, naming, organization
2. **Bugs & Logic** - Errors, edge cases, error handling
3. **Security** - Vulnerabilities, input validation, sensitive data
4. **Performance** - Inefficient patterns, unnecessary operations
5. **Compatibility** - Does it break existing code? Are imports correct?

## Format
For each issue found:
- **File & Line**: Specify location
- **Severity**: 🔴 Critical | 🟡 Important | 🟢 Minor
- **Issue**: Describe the problem
- **Suggestion**: How to fix it

If the code looks good, say so! No need to find issues where there are none.

## PR Diff
\`\`\`diff
${diff.substring(0, 50000)}
\`\`\`
${diff.length > 50000 ? "\n(diff truncated...)" : ""}
`;
}

/**
 * Format the review output for posting as a comment
 */
function formatReviewComment(output: string): string {
  return `## Claude Code Review

${output}

---
*Automated review by Claude*`;
}
