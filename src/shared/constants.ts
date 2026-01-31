/**
 * Shared constants used across the application
 */

/** Maximum diff size in characters to send to Claude */
export const MAX_DIFF_SIZE = 30_000;

/** Patterns that indicate an actionable request (code changes needed) */
export const ACTIONABLE_PATTERNS = [
  /\b(fix|change|update|add|remove|delete|modify|refactor|implement|create)\b/,
  /\b(make it|can you|please|could you).*(change|fix|add|update)/,
  /\b(this should|it should|needs to)\b/,
];

/** Patterns that indicate an informational request (read-only) */
export const INFORMATIONAL_PATTERNS = [
  /\b(what|why|how|explain|review|check|look at|analyze)\b/,
  /\b(does this|is this|are there)\b/,
  /\?$/, // Ends with question mark
];

/** Read-only tools for informational requests */
export const READ_ONLY_TOOLS = ["Read", "Grep", "Glob"] as const;

/** Tools to block for read-only mode */
export const BLOCKED_WRITE_TOOLS = ["Write", "Edit", "MultiEdit", "Bash"] as const;

/** Full access tools for actionable requests */
export const FULL_ACCESS_TOOLS = ["Read", "Edit", "Write", "Grep", "Glob", "Bash"] as const;

/** Tool configurations for different access levels */
export const TOOL_CONFIGS = {
  readOnly: {
    allowedTools: [...READ_ONLY_TOOLS] as string[],
    blockedTools: [...BLOCKED_WRITE_TOOLS] as string[],
  },
  fullAccess: {
    allowedTools: [...FULL_ACCESS_TOOLS] as string[],
    blockedTools: [] as string[],
  },
};