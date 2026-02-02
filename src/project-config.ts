/**
 * Project-level configuration module
 * Loads and validates .claude-review.yml config files
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { logger } from "./logger";

/** Project metadata */
export interface ProjectInfo {
  name?: string;
  type?: "symfony" | "laravel" | "php" | "generic" | string;
}

/** Tool configuration for a specific access level */
export interface ToolConfig {
  allowed?: string[];
  blocked?: string[];
}

/** Tools configuration */
export interface ToolsConfig {
  actionable?: ToolConfig;
  informational?: ToolConfig;
}

/** Review configuration */
export interface ReviewConfig {
  prompt?: string;
  exclude?: string[];
  include?: string[];
}

/** Project configuration from .claude-review.yml */
export interface ProjectConfig {
  project?: ProjectInfo;
  review?: ReviewConfig;
  tools?: ToolsConfig;
  trigger?: string;
  model?: string;
}

/** Default config file name */
const CONFIG_FILE_NAME = ".claude-review.yml";

/** Alternative config file names to check */
const CONFIG_FILE_ALTERNATIVES = [".claude-review.yaml", "claude-review.yml", "claude-review.yaml"];

/**
 * Get the repository root directory
 */
function getRepoDir(): string {
  return process.env.BITBUCKET_CLONE_DIR || process.cwd();
}

/**
 * Find the config file path if it exists
 */
function findConfigFile(): string | null {
  const repoDir = getRepoDir();

  // Check primary config file name first
  const primaryPath = join(repoDir, CONFIG_FILE_NAME);
  if (existsSync(primaryPath)) {
    return primaryPath;
  }

  // Check alternatives
  for (const alt of CONFIG_FILE_ALTERNATIVES) {
    const altPath = join(repoDir, alt);
    if (existsSync(altPath)) {
      return altPath;
    }
  }

  return null;
}

/**
 * Load project configuration from .claude-review.yml
 * Returns null if no config file exists
 */
export function loadProjectConfig(): ProjectConfig | null {
  const configPath = findConfigFile();

  if (!configPath) {
    logger.debug("No project config file found");
    return null;
  }

  try {
    logger.info(`Loading project config from ${configPath}`);
    const content = readFileSync(configPath, "utf-8");
    const config = parse(content) as ProjectConfig;

    // Validate the config structure
    const validated = validateProjectConfig(config);

    if (validated) {
      logger.debug("Project config loaded successfully");
      return validated;
    }

    return null;
  } catch (error) {
    logger.error(`Failed to load project config: ${error}`);
    return null;
  }
}

/**
 * Validate and normalize project config
 */
function validateProjectConfig(config: unknown): ProjectConfig | null {
  if (!config || typeof config !== "object") {
    logger.warn("Invalid project config: not an object");
    return null;
  }

  const cfg = config as Record<string, unknown>;
  const result: ProjectConfig = {};

  // Validate project section
  if (cfg.project && typeof cfg.project === "object") {
    const project = cfg.project as Record<string, unknown>;
    result.project = {
      name: typeof project.name === "string" ? project.name : undefined,
      type: typeof project.type === "string" ? project.type : undefined,
    };
  }

  // Validate review section
  if (cfg.review && typeof cfg.review === "object") {
    const review = cfg.review as Record<string, unknown>;
    result.review = {
      prompt: typeof review.prompt === "string" ? review.prompt : undefined,
      exclude: Array.isArray(review.exclude)
        ? review.exclude.filter((x): x is string => typeof x === "string")
        : undefined,
      include: Array.isArray(review.include)
        ? review.include.filter((x): x is string => typeof x === "string")
        : undefined,
    };
  }

  // Validate tools section
  if (cfg.tools && typeof cfg.tools === "object") {
    const tools = cfg.tools as Record<string, unknown>;
    result.tools = {};

    if (tools.actionable && typeof tools.actionable === "object") {
      const actionable = tools.actionable as Record<string, unknown>;
      result.tools.actionable = {
        allowed: Array.isArray(actionable.allowed)
          ? actionable.allowed.filter((x): x is string => typeof x === "string")
          : undefined,
        blocked: Array.isArray(actionable.blocked)
          ? actionable.blocked.filter((x): x is string => typeof x === "string")
          : undefined,
      };
    }

    if (tools.informational && typeof tools.informational === "object") {
      const informational = tools.informational as Record<string, unknown>;
      result.tools.informational = {
        allowed: Array.isArray(informational.allowed)
          ? informational.allowed.filter((x): x is string => typeof x === "string")
          : undefined,
        blocked: Array.isArray(informational.blocked)
          ? informational.blocked.filter((x): x is string => typeof x === "string")
          : undefined,
      };
    }
  }

  // Validate trigger
  if (typeof cfg.trigger === "string") {
    result.trigger = cfg.trigger;
  }

  // Validate model
  if (typeof cfg.model === "string") {
    result.model = cfg.model;
  }

  return result;
}

/**
 * Check if a file path matches any of the glob patterns
 * Simple glob matching: supports * and ** wildcards
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");

  // Convert glob pattern to regex
  const regexPattern = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars except * and ?
    .replace(/\*\*/g, "{{GLOBSTAR}}") // Temporarily replace **
    .replace(/\*/g, "[^/]*") // Single * matches anything except /
    .replace(/\?/g, "[^/]") // ? matches single char except /
    .replace(/{{GLOBSTAR}}/g, ".*"); // ** matches anything including /

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedPath);
}

/**
 * Check if a file should be included based on include/exclude patterns
 */
export function shouldIncludeFile(
  filePath: string,
  include?: string[],
  exclude?: string[]
): boolean {
  // If exclude patterns exist, check if file matches any
  if (exclude?.length) {
    for (const pattern of exclude) {
      if (matchesPattern(filePath, pattern)) {
        return false;
      }
    }
  }

  // If include patterns exist, file must match at least one
  if (include?.length) {
    for (const pattern of include) {
      if (matchesPattern(filePath, pattern)) {
        return true;
      }
    }
    return false; // Has include patterns but didn't match any
  }

  // No include patterns = include all (that weren't excluded)
  return true;
}
