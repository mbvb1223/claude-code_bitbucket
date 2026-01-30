/**
 * Git utilities
 * Run git commands in the repository directory
 */

import { execSync } from "child_process";
import { logger } from "../logger";

/**
 * Get the repository directory
 * Uses BITBUCKET_CLONE_DIR in pipeline, or current directory locally
 */
function getRepoDir(): string {
  const repoDir = process.env.BITBUCKET_CLONE_DIR || process.cwd();
  logger.debug(`Repository directory: ${repoDir}`);
  return repoDir;
}

/**
 * Run a git command in the repository directory
 */
function gitExec(command: string, options: { maxBuffer?: number } = {}): string {
  const cwd = getRepoDir();
  logger.debug(`Running in ${cwd}: ${command}`);

  return execSync(command, {
    encoding: "utf-8",
    cwd,
    maxBuffer: options.maxBuffer || 10 * 1024 * 1024, // 10MB default
  });
}

/**
 * Get the diff between current HEAD and destination branch
 */
export function getLocalDiff(destinationBranch: string): string {
  try {
    // Fetch to ensure we have the latest remote refs
    try {
      gitExec("git fetch origin");
    } catch {
      logger.debug("git fetch failed, continuing with local refs");
    }

    // Get diff between destination branch and HEAD
    const diff = gitExec(`git diff origin/${destinationBranch}...HEAD`);
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
    const output = gitExec(`git diff --name-only origin/${destinationBranch}...HEAD`);
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
    return gitExec(`git diff origin/${destinationBranch}...HEAD -- "${filePath}"`);
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
    return gitExec("git rev-parse --abbrev-ref HEAD").trim();
  } catch {
    return "unknown";
  }
}

/**
 * Get the last commit message
 */
export function getLastCommitMessage(): string {
  try {
    return gitExec("git log -1 --pretty=%B").trim();
  } catch {
    return "";
  }
}