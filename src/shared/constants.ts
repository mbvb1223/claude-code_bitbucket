/**
 * Shared constants used across the application
 */

/** Maximum diff size in characters to send to Claude */
export const MAX_DIFF_SIZE = 30_000;

/** Read-only tools for informational requests */
export const READ_ONLY_TOOLS = ["Read", "Grep", "Glob"] as const;

/** Tools to block for read-only mode */
export const BLOCKED_WRITE_TOOLS = ["Write", "Edit", "MultiEdit", "Bash"] as const;

/** Full access tools for actionable requests */
export const FULL_ACCESS_TOOLS = ["Read", "Edit", "Write", "Grep", "Glob", "Bash"] as const;

/** Tool configurations for different access levels */
export const TOOL_CONFIGS = {
  readOnly: {
    allowedTools: [...READ_ONLY_TOOLS],
    blockedTools: [...BLOCKED_WRITE_TOOLS],
  },
  fullAccess: {
    allowedTools: [...FULL_ACCESS_TOOLS],
    blockedTools: [] as string[],
  },
} as const;