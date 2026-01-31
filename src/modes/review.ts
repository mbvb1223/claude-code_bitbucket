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
import { TOOL_CONFIGS, MAX_DIFF_SIZE, logClaudeUsage } from "../shared";

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
  const result = await runClaude(config, prompt, TOOL_CONFIGS.readOnly);

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
  logClaudeUsage(result.usage);

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
  const title = pr?.title || process.env.BITBUCKET_PR_TITLE || "PR";
  const sourceBranch = pr?.source?.branch?.name || process.env.BITBUCKET_BRANCH || "";
  const destBranch = pr?.destination?.branch?.name || config.destinationBranch;

  return `Review this PR. Be concise - bullet points only.

**${title}** (${sourceBranch} → ${destBranch})

Check for: bugs, security issues, logic errors. Skip style nits.

Format: 🔴 Critical | 🟡 Important | 🟢 Minor
- File:line - Issue - Fix

If code is good, just say "LGTM".

\`\`\`diff
${diff.substring(0, MAX_DIFF_SIZE)}
\`\`\``;
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
