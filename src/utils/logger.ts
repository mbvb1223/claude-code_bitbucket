/**
 * Simple logger with levels and formatting
 */

type LogLevel = "debug" | "info" | "warn" | "error";

let verboseMode = false;

export function setVerbose(verbose: boolean) {
  verboseMode = verbose;
}

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, ...args: unknown[]) {
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;

  switch (level) {
    case "debug":
      if (verboseMode) {
        console.log(prefix, ...args);
      }
      break;
    case "info":
      console.log(prefix, ...args);
      break;
    case "warn":
      console.warn(prefix, ...args);
      break;
    case "error":
      console.error(prefix, ...args);
      break;
  }
}

export const logger = {
  debug: (...args: unknown[]) => log("debug", ...args),
  info: (...args: unknown[]) => log("info", ...args),
  warn: (...args: unknown[]) => log("warn", ...args),
  error: (...args: unknown[]) => log("error", ...args),
  success: (...args: unknown[]) => log("info", "✓", ...args),
};
