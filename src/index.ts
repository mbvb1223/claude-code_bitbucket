#!/usr/bin/env bun
/**
 * Claude Bitbucket PR Review
 *
 * Entry point - coordinates the review/tag modes
 *
 * Modes:
 * - review: Automatically review PR when created (MODE=review)
 * - tag: Respond to @claude mentions in comments (MODE=tag)
 */

import { loadConfig, validateConfig } from "./shared/config";
import { BitbucketClient } from "./services/bitbucket";
import { logger, setVerbose } from "./utils/logger";
import { shouldRunReview, runReviewMode } from "./modes/review";
import { shouldRunTag, runTagMode } from "./modes/tag";
import { ensureClaudeCLI } from "./utils/install-claude";

async function main(): Promise<void> {
  logger.info("Claude Bitbucket Review starting...");

  // Step 1: Ensure Claude CLI is installed
  const claudeReady = await ensureClaudeCLI();
  if (!claudeReady) {
    logger.error("Claude CLI is required but not available");
    process.exit(1);
  }

  // Step 2: Load configuration from environment variables
  const config = loadConfig();
  setVerbose(config.verbose);

  logger.info(config.bitbucketToken);
  logger.info(`Mode: ${config.mode}`);
  logger.info(`Workspace: ${config.workspace || "(not set)"}`);
  logger.info(`Repo: ${config.repoSlug || "(not set)"}`);
  logger.info(`PR ID: ${config.prId || "(not set)"}`);
  logger.info(`Trigger: ${config.triggerPhrase}`);
  logger.info(`Model: ${config.model}`);

  // Step 3: Validate required configuration
  const errors = validateConfig(config);
  if (errors.length > 0) {
    logger.error("Configuration errors:");
    for (const error of errors) {
      logger.error(`  - ${error}`);
    }
    process.exit(1);
  }

  logger.success("Configuration valid!");

  // Step 4: Create Bitbucket client (for posting comments)
  const client = new BitbucketClient(config);

  // Test git access
  const { getChangedFiles } = await import("./utils/git");
  const changedFiles = getChangedFiles(config.destinationBranch);
  if (changedFiles.length > 0) {
    logger.info(`Found ${changedFiles.length} changed files via git`);
  } else {
    logger.warn("No changed files found (or git diff failed)");
  }

  logger.success("Setup complete!");

  // Step 5: Run appropriate mode
  try {
    if (config.mode === "review") {
      // Review mode: automatically review the PR
      if (!shouldRunReview(config)) {
        logger.info("Review mode skipped (no PR ID)");
        process.exit(0);
      }

      logger.info("Running review mode...");
      const result = await runReviewMode(config, client);

      if (!result.success) {
        logger.error("Review failed:", result.error);
        process.exit(1);
      }

      if (result.reviewPosted) {
        logger.success("Review completed and posted to PR!");
      } else {
        logger.info("Review completed (no comment posted)");
      }
    } else if (config.mode === "tag") {
      // Tag mode: respond to @claude mentions
      if (!shouldRunTag(config)) {
        logger.info("Tag mode skipped (no PR ID)");
        process.exit(0);
      }

      logger.info("Running tag mode...");
      const result = await runTagMode(config, client);

      if (!result.success) {
        logger.error("Tag mode failed:", result.error);
        process.exit(1);
      }

      if (result.responded) {
        logger.success(`Responded to comment #${result.commentId}`);
      } else {
        logger.info("No @claude mentions to respond to");
      }
    } else {
      logger.error(`Unknown mode: ${config.mode}`);
      process.exit(1);
    }

    logger.success("Done!");
    process.exit(0);
  } catch (error) {
    logger.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run
main();
