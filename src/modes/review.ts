/**
 * Review Mode
 * Automatically reviews PR when created/updated
 * No trigger phrase needed - runs on every PR
 */

import type { Config } from "../config";
import type { BitbucketClient, PullRequest } from "../bitbucket";
import { runClaude } from "../claude";
import { logger } from "../logger";
import {
  getLocalDiff,
  getChangedFiles,
  filterDiffByPatterns,
  filterFilesByPatterns,
} from "../utils/git";
import { TOOL_CONFIGS, logClaudeUsage, type ReviewResult } from "../shared";
import { buildReviewPrompt, formatReviewComment } from "../prompts";

export type { ReviewResult };

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
  const allChangedFiles = getChangedFiles(config.destinationBranch);

  // Apply file patterns from project config
  const includePatterns = config.projectConfig?.review?.include;
  const excludePatterns = config.projectConfig?.review?.exclude;

  const changedFiles = filterFilesByPatterns(allChangedFiles, includePatterns, excludePatterns);

  if (includePatterns?.length || excludePatterns?.length) {
    logger.info(`File patterns applied: ${allChangedFiles.length} → ${changedFiles.length} files`);
  }
  logger.info(`Changed files: ${changedFiles.length}`);

  let diff = getLocalDiff(config.destinationBranch);

  // Filter diff by patterns
  diff = filterDiffByPatterns(diff, includePatterns, excludePatterns);

  if (!diff) {
    logger.warn("No diff found (after filtering)");
    return { success: true, reviewPosted: false, error: "No diff" };
  }

  logger.info(`Diff size: ${diff.length} characters`);

  // 3. Build review prompt
  const title = pr?.title || process.env.BITBUCKET_PR_TITLE || "PR";
  const sourceBranch = pr?.source?.branch?.name || process.env.BITBUCKET_BRANCH || "";
  const destBranch = pr?.destination?.branch?.name || config.destinationBranch;

  const prompt = buildReviewPrompt({
    title,
    sourceBranch,
    destBranch,
    diff,
    customPrompt: config.projectConfig?.review?.prompt,
    projectName: config.projectConfig?.project?.name,
    projectType: config.projectConfig?.project?.type,
  });

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
