/**
 * Configuration module
 * Loads and validates environment variables
 */

import { isValidMode, type Mode } from "./shared";
import { loadProjectConfig, type ProjectConfig } from "./project-config";

export interface Config {
  // Bitbucket settings
  workspace: string;
  repoSlug: string;
  prId: number | undefined;
  destinationBranch: string;

  // Authentication
  bitbucketToken: string; // username:app_password or x-token-auth:token
  anthropicApiKey: string;

  // Mode settings
  mode: Mode; // review = auto-review, tag = @claude mentions
  triggerPhrase: string; // default: @claude

  // Optional
  model: string;
  maxTurns: number;
  verbose: boolean;

  // Project-level config (from .claude-review.yml)
  projectConfig: ProjectConfig | null;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  // Load project config first (may override some env defaults)
  const projectConfig = loadProjectConfig();

  const modeValue = env("MODE", "review");
  const mode: Mode = isValidMode(modeValue) ? modeValue : "review";

  // Project config can override trigger and model if not set in env
  const triggerFromEnv = process.env.TRIGGER_PHRASE;
  const modelFromEnv = process.env.MODEL;

  return {
    // Bitbucket (from pipeline environment)
    workspace: env("BITBUCKET_WORKSPACE"),
    repoSlug: env("BITBUCKET_REPO_SLUG"),
    prId: optionalInt("BITBUCKET_PR_ID"),
    destinationBranch: env("BITBUCKET_PR_DESTINATION_BRANCH", "main"),

    // Authentication
    bitbucketToken: env("BITBUCKET_ACCESS_TOKEN", ""),
    anthropicApiKey: env("ANTHROPIC_API_KEY", ""),

    // Mode (validated)
    mode,
    // Use env var if set, otherwise project config, otherwise default
    triggerPhrase: triggerFromEnv || projectConfig?.trigger || "@claude",

    // Optional settings
    // Use env var if set, otherwise project config, otherwise default
    model: modelFromEnv || projectConfig?.model || "haiku",
    maxTurns: parseInt(env("MAX_TURNS", "30")),
    verbose: env("VERBOSE", "false") === "true",

    // Project-level config
    projectConfig,
  };
}

/**
 * Validate that required config is present
 */
export function validateConfig(config: Config): string[] {
  const errors: string[] = [];

  if (!config.workspace) {
    errors.push("BITBUCKET_WORKSPACE is required");
  }

  if (!config.repoSlug) {
    errors.push("BITBUCKET_REPO_SLUG is required");
  }

  if (!config.anthropicApiKey) {
    errors.push("ANTHROPIC_API_KEY is required");
  }

  // Warning (not error) if no Bitbucket token
  if (!config.bitbucketToken) {
    errors.push("[WARN] BITBUCKET_ACCESS_TOKEN not set - cannot post comments to PR");
  }

  return errors;
}

// Helper: get env var with optional default
function env(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    return "";
  }
  return value;
}

// Helper: get optional integer env var
function optionalInt(key: string): number | undefined {
  const value = process.env[key];
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}
