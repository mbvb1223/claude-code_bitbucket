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

  // Step 4: Create Bitbucket client and test connection
  const client = new BitbucketClient(config);

  if (config.prId) {
    logger.info(`Testing Bitbucket API - fetching PR #${config.prId}...`);

    const pr = await client.getPullRequest(config.prId);
    if (pr) {
      logger.success(`PR found: "${pr.title}"`);
      logger.info(`  Author: ${pr.author?.display_name || "unknown"}`);
      logger.info(`  Branch: ${pr.source?.branch?.name} → ${pr.destination?.branch?.name}`);
      logger.info(`  State: ${pr.state}`);
    } else {
      logger.warn("Could not fetch PR details (check token permissions)");
    }

    // Also test fetching diff
    logger.info("Testing diff fetch...");
    const diff = await client.getPullRequestDiff(config.prId);
    if (diff) {
      logger.success(`Diff fetched: ${diff.length} characters`);
    } else {
      logger.warn("Could not fetch diff");
    }
  } else {
    logger.info("No PR ID provided - skipping Bitbucket API test");
  }

  logger.success("Step 4 complete!");

  // Step 5: Test Claude CLI with a simple prompt
  logger.info("Testing Claude CLI...");

  const { runClaude } = await import("./claude");

  const testResult = await runClaude(config, "Say 'Hello from Claude!' in exactly 5 words.", {
    allowedTools: [], // No tools for this test
  });

  if (testResult.success) {
    logger.success("Claude CLI working!");
    logger.info(`Response: ${testResult.output}`);
  } else {
    logger.error("Claude CLI failed:", testResult.error);
    process.exit(1);
  }

  logger.success("All steps complete! Ready to run modes.");
  process.exit(0);

  // TODO Step 6: Run appropriate mode
  // if (config.mode === "review") { ... }
  // if (config.mode === "tag") { ... }
}

// Run
main();
