/**
 * Shared utilities for Claude usage logging
 */

import type { ClaudeUsage } from "../claude";
import { logger } from "../logger";

/**
 * Log Claude API usage information
 */
export function logClaudeUsage(usage: ClaudeUsage | undefined): void {
  if (!usage) return;

  logger.info("--- Claude Usage ---");
  logger.info(`  Input tokens:  ${usage.inputTokens.toLocaleString()}`);
  logger.info(`  Output tokens: ${usage.outputTokens.toLocaleString()}`);
  logger.info(`  Total tokens:  ${usage.totalTokens.toLocaleString()}`);
  if (usage.costUsd !== undefined) {
    logger.info(`  Cost:          $${usage.costUsd.toFixed(4)}`);
  }
  logger.info("--------------------");
}
