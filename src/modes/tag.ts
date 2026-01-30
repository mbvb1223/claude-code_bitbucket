/**
 * Tag Mode
 * Responds to @claude mentions in PR comments
 * Can handle both informational requests and actionable requests
 */

import type { Config } from "../config";
import type { BitbucketClient, PRComment } from "../bitbucket";
import { runClaude } from "../claude";
import { logger } from "../logger";

export interface TagResult {
  success: boolean;
  responded: boolean;
  commentId?: number;
  error?: string;
}

/**
 * Check if tag mode should run
 */
export function shouldRunTag(config: Config): boolean {
  if (!config.prId) {
    logger.info("No PR ID - tag mode skipped");
    return false;
  }

  return config.mode === "tag";
}

/**
 * Run tag mode - find @claude mentions and respond
 */
export async function runTagMode(
  config: Config,
  client: BitbucketClient
): Promise<TagResult> {
  logger.info("Starting tag mode...");

  if (!config.prId) {
    return { success: false, responded: false, error: "No PR ID" };
  }

  // 1. Get all PR comments
  logger.info("Fetching PR comments...");
  const comments = await client.getComments(config.prId);

  if (!comments.length) {
    logger.info("No comments found");
    return { success: true, responded: false };
  }

  // 2. Find comments with trigger phrase that haven't been responded to
  const triggerComment = findTriggerComment(comments, config.triggerPhrase);

  if (!triggerComment) {
    logger.info(`No unresponded ${config.triggerPhrase} mentions found`);
    return { success: true, responded: false };
  }

  logger.info(`Found trigger comment #${triggerComment.id}`);

  // 3. Extract the user's request
  const userRequest = extractRequest(triggerComment.content.raw, config.triggerPhrase);

  if (!userRequest) {
    logger.warn("Could not extract request from comment");
    return { success: true, responded: false };
  }

  logger.info(`User request: "${userRequest.substring(0, 100)}..."`);

  // 4. Determine if actionable or informational
  const isActionable = classifyRequest(userRequest);
  logger.info(`Request type: ${isActionable ? "actionable" : "informational"}`);

  // 5. Build prompt based on request type
  const prompt = buildTagPrompt(config, triggerComment, userRequest, isActionable);

  // 6. Run Claude with appropriate tools
  const tools = isActionable
    ? {
        allowedTools: ["Read", "Edit", "Write", "Grep", "Glob", "Bash"],
        blockedTools: [],
      }
    : {
        allowedTools: ["Read", "Grep", "Glob"],
        blockedTools: ["Write", "Edit", "MultiEdit", "Bash"],
      };

  const result = await runClaude(config, prompt, tools);

  if (!result.success) {
    logger.error("Claude failed:", result.error);

    // Try to post error as reply
    if (config.bitbucketToken) {
      await client.replyToComment(
        config.prId,
        triggerComment.id,
        `Sorry, I encountered an error: ${result.error}`
      );
    }

    return { success: false, responded: false, error: result.error };
  }

  // 7. Post response as reply to the trigger comment
  if (result.output && config.bitbucketToken) {
    const reply = await client.replyToComment(
      config.prId,
      triggerComment.id,
      result.output
    );

    if (reply) {
      logger.success(`Responded to comment #${triggerComment.id}`);
      return { success: true, responded: true, commentId: reply.id };
    }
  }

  // No token - log response
  logger.info("Response (no token to post):");
  console.log(result.output);

  return { success: true, responded: false };
}

/**
 * Find the most recent comment with trigger phrase that hasn't been replied to
 */
function findTriggerComment(
  comments: PRComment[],
  triggerPhrase: string
): PRComment | null {
  // Sort by date descending (most recent first)
  const sorted = [...comments].sort(
    (a, b) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime()
  );

  // Find comments with trigger phrase
  const triggered = sorted.filter((c) =>
    c.content.raw.toLowerCase().includes(triggerPhrase.toLowerCase())
  );

  if (!triggered.length) return null;

  // Return most recent one
  // TODO: Check if already responded (by looking for replies from our bot)
  return triggered[0];
}

/**
 * Extract the actual request from the comment (after trigger phrase)
 */
function extractRequest(content: string, triggerPhrase: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(triggerPhrase.toLowerCase());

  if (idx === -1) return content;

  // Get everything after the trigger phrase
  const afterTrigger = content.substring(idx + triggerPhrase.length).trim();

  return afterTrigger || content;
}

/**
 * Classify if request is actionable (needs code changes) or informational
 */
function classifyRequest(request: string): boolean {
  const lower = request.toLowerCase();

  // Actionable keywords
  const actionablePatterns = [
    /\b(fix|change|update|add|remove|delete|modify|refactor|implement|create)\b/,
    /\b(make it|can you|please|could you).*(change|fix|add|update)/,
    /\b(this should|it should|needs to)\b/,
  ];

  // Informational keywords
  const informationalPatterns = [
    /\b(what|why|how|explain|review|check|look at|analyze)\b/,
    /\b(does this|is this|are there)\b/,
    /\?$/,  // Ends with question mark
  ];

  // Check actionable first
  for (const pattern of actionablePatterns) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  // Check informational
  for (const pattern of informationalPatterns) {
    if (pattern.test(lower)) {
      return false;
    }
  }

  // Default to informational (safer)
  return false;
}

/**
 * Build prompt for tag mode
 */
function buildTagPrompt(
  config: Config,
  comment: PRComment,
  request: string,
  isActionable: boolean
): string {
  const prId = config.prId;
  const sourceBranch = process.env.BITBUCKET_BRANCH || "unknown";
  const destBranch = config.destinationBranch;

  let contextInfo = "";

  // Add inline context if this is an inline comment
  if (comment.inline) {
    contextInfo = `
## Inline Comment Context
The user commented on file: **${comment.inline.path}**
Lines: ${comment.inline.from || "start"} - ${comment.inline.to || "end"}
`;
  }

  if (isActionable) {
    return `
# Pull Request Task

**PR #${prId}**
**Branch:** ${sourceBranch} → ${destBranch}
${contextInfo}

## User Request
${request}

## Instructions
The user has requested a code change. You should:

1. Read the relevant files to understand the context
2. Make the requested changes using Edit or Write tools
3. If you make changes, explain what you did

Be concise in your response. Focus on completing the task.
`;
  } else {
    return `
# Pull Request Question

**PR #${prId}**
**Branch:** ${sourceBranch} → ${destBranch}
${contextInfo}

## User Question
${request}

## Instructions
The user is asking a question. Provide a helpful, concise answer.

- Read relevant files if needed to understand context
- Do NOT make any code changes
- Be direct and helpful
`;
  }
}
