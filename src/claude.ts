/**
 * Claude CLI runner
 * Executes Claude Code CLI and captures output
 */

import { spawn } from "child_process";
import type { Config } from "./config";
import { logger } from "./logger";

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd?: number;
}

export interface ClaudeResult {
  success: boolean;
  output: string;
  error?: string;
  usage?: ClaudeUsage;
}

/**
 * Run Claude CLI with a prompt
 *
 * Uses: claude -p "prompt" --output-format stream-json
 *
 * The stream-json format outputs one JSON object per line:
 * - { type: "assistant", message: { content: [...] } }
 * - { type: "result", result: "final text" }
 */
export async function runClaude(
  config: Config,
  prompt: string,
  options: {
    allowedTools?: string[];
    blockedTools?: string[];
  } = {}
): Promise<ClaudeResult> {
  logger.info("Running Claude CLI...");

  // Build command arguments
  // Use JSON output to capture usage/cost information
  const args: string[] = [
    "-p",                         // Print mode (non-interactive)
    "--output-format", "json",    // JSON output includes usage info
    "--model", config.model,
    "--max-turns", config.maxTurns.toString(),
  ];

  // Add tool restrictions if specified
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push("--allowed-tools", options.allowedTools.join(","));
  }

  if (options.blockedTools && options.blockedTools.length > 0) {
    args.push("--disallowed-tools", options.blockedTools.join(","));
  }

  logger.debug("Claude args:", args.join(" "));

  return new Promise((resolve) => {
    // Spawn Claude process
    const child = spawn("claude", args, {
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: config.anthropicApiKey,
      },
      cwd: process.env.BITBUCKET_CLONE_DIR || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Capture stdout
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    // Capture stderr
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (config.verbose) {
        logger.debug("Claude stderr:", chunk.toString());
      }
    });

    // Write prompt to stdin and close
    child.stdin.write(prompt);
    child.stdin.end();

    // Handle completion
    child.on("close", (code) => {
      logger.info(`Claude exited with code: ${code}`);

      if (code === 0) {
        // Parse JSON output to extract text and usage
        const { text, usage } = parseClaudeJsonOutput(stdout);

        resolve({
          success: true,
          output: text,
          usage,
        });
      } else {
        resolve({
          success: false,
          output: stdout.trim(),
          error: stderr || `Exit code: ${code}`,
        });
      }
    });

    // Handle spawn error
    child.on("error", (err) => {
      logger.error("Failed to spawn Claude:", err);
      resolve({
        success: false,
        output: "",
        error: err.message,
      });
    });
  });
}

/**
 * Parse Claude CLI JSON output to extract text and usage
 */
function parseClaudeJsonOutput(output: string): { text: string; usage?: ClaudeUsage } {
  // Add debug logging
  logger.debug(`Raw Claude output length: ${output.length}`);
  logger.debug(`Raw Claude output (first 500 chars): ${output.substring(0, 500)}`);

  try {
    const json = JSON.parse(output.trim());
    logger.debug(`Parsed JSON keys: ${Object.keys(json).join(", ")}`);

    // Extract text from result
    let text = "";
    if (typeof json.result === "string") {
      text = json.result;
    } else if (json.result?.text) {
      text = json.result.text;
    }

    logger.debug(`Extracted text length: ${text.length}`);

    // Extract usage information
    let usage: ClaudeUsage | undefined;
    if (json.usage || json.cost_usd !== undefined) {
      usage = {
        inputTokens: json.usage?.input_tokens || json.input_tokens || 0,
        outputTokens: json.usage?.output_tokens || json.output_tokens || 0,
        totalTokens: (json.usage?.input_tokens || json.input_tokens || 0) +
                     (json.usage?.output_tokens || json.output_tokens || 0),
        costUsd: json.cost_usd,
      };
    }

    return { text, usage };
  } catch (error) {
    // If JSON parsing fails, return raw output as text
    logger.debug(`Failed to parse JSON output: ${error}`);
    logger.debug("Using raw text instead");
    return { text: output.trim() };
  }
}

/**
 * Run Claude with streaming JSON output (advanced)
 * Returns parsed conversation turns
 */
export async function runClaudeStreaming(
  config: Config,
  prompt: string,
  options: {
    allowedTools?: string[];
    blockedTools?: string[];
    onChunk?: (text: string) => void;
  } = {}
): Promise<ClaudeResult> {
  logger.info("Running Claude CLI (streaming)...");

  const args: string[] = [
    "-p",
    "--verbose",                        // Required for stream-json
    "--output-format", "stream-json",
    "--model", config.model,
    "--max-turns", config.maxTurns.toString(),
  ];

  if (options.allowedTools?.length) {
    args.push("--allowed-tools", options.allowedTools.join(","));
  }

  if (options.blockedTools?.length) {
    args.push("--disallowed-tools", options.blockedTools.join(","));
  }

  return new Promise((resolve) => {
    const child = spawn("claude", args, {
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: config.anthropicApiKey,
      },
      cwd: process.env.BITBUCKET_CLONE_DIR || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let buffer = "";
    let finalOutput = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();

      // Parse complete JSON lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line);

          // Handle different event types
          if (event.type === "assistant" && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === "text" && block.text) {
                finalOutput += block.text;
                options.onChunk?.(block.text);
              }
            }
          } else if (event.type === "result" && event.result) {
            // Final result
            if (!finalOutput) {
              finalOutput = event.result;
            }
          }
        } catch {
          // Not JSON, might be regular output
          logger.debug("Non-JSON:", line);
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.stdin.write(prompt);
    child.stdin.end();

    child.on("close", (code) => {
      logger.info(`Claude exited with code: ${code}`);

      resolve({
        success: code === 0,
        output: finalOutput.trim(),
        error: code !== 0 ? stderr : undefined,
      });
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        output: "",
        error: err.message,
      });
    });
  });
}
