/**
 * Git utilities
 * Run git commands locally
 */

import { execSync } from "child_process";
import { logger } from "../logger";

/**
 * Get the diff between current HEAD and destination branch
 */
export function getLocalDiff(destinationBranch: string): string {
  try {
    // Fetch to ensure we have the latest remote refs
    try {
      execSync("git fetch origin", { stdio: "pipe" });
    } catch {
      logger.debug("git fetch failed, continuing with local refs");
    }

    // Get diff between destination branch and HEAD
    const command = `git diff origin/${destinationBranch}...HEAD`;
    logger.debug(`Running: ${command}`);

    const diff = execSync(command, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
    });

    return diff;
  } catch (error) {
    logger.error("Failed to get git diff:", error);
    return "";
  }
}

/**
 * Get list of changed files
 */
export function getChangedFiles(destinationBranch: string): string[] {
  try {
    const command = `git diff --name-only origin/${destinationBranch}...HEAD`;
    logger.debug(`Running: ${command}`);

    const output = execSync(command, { encoding: "utf-8" });
    return output.trim().split("\n").filter(Boolean);
  } catch (error) {
    logger.error("Failed to get changed files:", error);
    return [];
  }
}

/**
 * Get diff for a specific file
 */
export function getFileDiff(destinationBranch: string, filePath: string): string {
  try {
    const command = `git diff origin/${destinationBranch}...HEAD -- "${filePath}"`;
    logger.debug(`Running: ${command}`);

    return execSync(command, { encoding: "utf-8" });
  } catch (error) {
    logger.error(`Failed to get diff for ${filePath}:`, error);
    return "";
  }
}

/**
 * Get current branch name
 */
export function getCurrentBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Get the last commit message
 */
export function getLastCommitMessage(): string {
  try {
    return execSync("git log -1 --pretty=%B", {
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}