/**
 * Claude CLI Installation Utility
 * Checks if Claude CLI is installed, installs if missing
 */

import { execSync, spawn } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { logger } from "./logger";

/**
 * Check if Claude CLI is available
 */
export function isClaudeInstalled(): boolean {
  try {
    execSync("claude --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Claude CLI version
 */
export function getClaudeVersion(): string | null {
  try {
    const output = execSync("claude --version", { encoding: "utf-8" });
    return output.trim();
  } catch {
    return null;
  }
}

/**
 * Install Claude CLI using npm
 */
async function installWithNpm(): Promise<boolean> {
  logger.info("Installing Claude CLI via npm...");

  return new Promise((resolve) => {
    const child = spawn("npm", ["install", "-g", "@anthropic-ai/claude-code"], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });

    child.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Install Claude CLI using the official install script
 */
async function installWithScript(): Promise<boolean> {
  logger.info("Installing Claude CLI via install script...");

  return new Promise((resolve) => {
    // The official install script
    const child = spawn("sh", ["-c", "curl -fsSL https://claude.ai/install.sh | sh"], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        // Add to PATH for current session
        const localBin = join(homedir(), ".local", "bin");
        process.env.PATH = `${localBin}:${process.env.PATH}`;
      }
      resolve(code === 0);
    });

    child.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Ensure Claude CLI is installed
 * Returns true if Claude is available (already installed or successfully installed)
 */
export async function ensureClaudeCLI(): Promise<boolean> {
  // Check if already installed
  if (isClaudeInstalled()) {
    const version = getClaudeVersion();
    logger.info(`Claude CLI already installed: ${version}`);
    return true;
  }

  logger.info("Claude CLI not found, attempting to install...");

  // Try npm first (works in most environments)
  const npmSuccess = await installWithNpm();
  if (npmSuccess && isClaudeInstalled()) {
    const version = getClaudeVersion();
    logger.success(`Claude CLI installed successfully: ${version}`);
    return true;
  }

  // Fallback to install script
  const scriptSuccess = await installWithScript();
  if (scriptSuccess && isClaudeInstalled()) {
    const version = getClaudeVersion();
    logger.success(`Claude CLI installed successfully: ${version}`);
    return true;
  }

  logger.error("Failed to install Claude CLI");
  logger.error("Please install manually: npm install -g @anthropic-ai/claude-code");
  return false;
}
