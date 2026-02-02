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

/**
 * Filter a unified diff to only include changes for files matching patterns
 * @param diff The full unified diff string
 * @param include Array of glob patterns for files to include
 * @param exclude Array of glob patterns for files to exclude
 * @returns Filtered diff containing only matching file changes
 */
export function filterDiffByPatterns(diff: string, include?: string[], exclude?: string[]): string {
  // Dynamic import to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { shouldIncludeFile } = require("../project-config");

  if (!include?.length && !exclude?.length) {
    return diff;
  }

  // Split diff into file chunks
  // Each chunk starts with "diff --git a/path b/path"
  const fileChunks = diff.split(/(?=diff --git)/);

  const filteredChunks: string[] = [];

  for (const chunk of fileChunks) {
    if (!chunk.trim()) continue;

    // Extract file path from diff header
    // Format: "diff --git a/path/to/file b/path/to/file"
    const match = chunk.match(/^diff --git a\/(.+?) b\/(.+)/);
    if (!match) {
      // Not a valid diff chunk, include as-is (might be header info)
      filteredChunks.push(chunk);
      continue;
    }

    const filePath = match[2]; // Use the "b" path (destination)

    // Check if file should be included
    if (shouldIncludeFile(filePath, include, exclude)) {
      filteredChunks.push(chunk);
    }
  }

  return filteredChunks.join("");
}

/**
 * Filter list of files by include/exclude patterns
 */
export function filterFilesByPatterns(
  files: string[],
  include?: string[],
  exclude?: string[]
): string[] {
  // Dynamic import to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { shouldIncludeFile } = require("../project-config");

  if (!include?.length && !exclude?.length) {
    return files;
  }

  return files.filter((file) => shouldIncludeFile(file, include, exclude));
}
