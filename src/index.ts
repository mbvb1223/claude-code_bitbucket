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

import { loadConfig, validateConfig } from "./config";
import { BitbucketClient } from "./bitbucket";
import { logger, setVerbose } from "./logger";
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

  logger.info(`Mode: ${config.mode}`);
  logger.info(`Workspace: ${config.workspace || "(not set)"}`);
  logger.info(`Repo: ${config.repoSlug || "(not set)"}`);
  logger.info(`PR ID: ${config.prId || "(not set)"}`);
  logger.info(`Trigger: ${config.triggerPhrase}`);

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
  process.exit(0);

  // TODO Step 4: Create Bitbucket client
  // const client = new BitbucketClient(config);

  // TODO Step 5: Run appropriate mode
  // if (config.mode === "review") { ... }
  // if (config.mode === "tag") { ... }
}

// Run
main();
