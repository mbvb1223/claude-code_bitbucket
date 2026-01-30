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

async function main(): Promise<void> {
  logger.info("Claude Bitbucket Review starting...");
  process.exit(1);

  // // 1. Load configuration
  // const config = loadConfig();
  // setVerbose(config.verbose);
  //
  // logger.info(`Mode: ${config.mode}`);
  // logger.info(`Workspace: ${config.workspace}/${config.repoSlug}`);
  // if (config.prId) {
  //   logger.info(`PR: #${config.prId}`);
  // }
  //
  // // 2. Validate configuration
  // const errors = validateConfig(config);
  // if (errors.length > 0) {
  //   for (const error of errors) {
  //     logger.error(error);
  //   }
  //   process.exit(1);
  // }
  //
  // // 3. Create Bitbucket client
  // const client = new BitbucketClient(config);
  //
  // // 4. Run appropriate mode
  // try {
  //   if (config.mode === "review" && shouldRunReview(config)) {
  //     const result = await runReviewMode(config, client);
  //
  //     if (!result.success) {
  //       logger.error("Review mode failed:", result.error);
  //       process.exit(1);
  //     }
  //
  //     if (result.reviewPosted) {
  //       logger.success("Review completed and posted!");
  //     } else {
  //       logger.info("Review completed (no comment posted)");
  //     }
  //   } else if (config.mode === "tag" && shouldRunTag(config)) {
  //     const result = await runTagMode(config, client);
  //
  //     if (!result.success) {
  //       logger.error("Tag mode failed:", result.error);
  //       process.exit(1);
  //     }
  //
  //     if (result.responded) {
  //       logger.success(`Responded to comment #${result.commentId}`);
  //     } else {
  //       logger.info("No trigger comments to respond to");
  //     }
  //   } else {
  //     logger.info("No action needed for current configuration");
  //   }
  //
  //   logger.success("Done!");
  //   process.exit(0);
  // } catch (error) {
  //   logger.error("Fatal error:", error);
  //   process.exit(1);
  // }
}

// Run
main();
