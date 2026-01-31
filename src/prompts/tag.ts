/**
 * Tag mode prompt templates
 */

export interface TagPromptParams {
  prId: number;
  sourceBranch: string;
  destBranch: string;
  request: string;
  inlineContext?: {
    path: string;
    from: number | null;
    to: number | null;
  };
}

/**
 * Build prompt for actionable requests (code changes)
 */
export function buildActionablePrompt(params: TagPromptParams): string {
  const { prId, sourceBranch, destBranch, request, inlineContext } = params;

  const contextInfo = inlineContext
    ? `
## Inline Comment Context
The user commented on file: **${inlineContext.path}**
Lines: ${inlineContext.from || "start"} - ${inlineContext.to || "end"}
`
    : "";

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
}

/**
 * Build prompt for informational requests (questions)
 */
export function buildInformationalPrompt(params: TagPromptParams): string {
  const { prId, sourceBranch, destBranch, request, inlineContext } = params;

  const contextInfo = inlineContext
    ? `
## Inline Comment Context
The user commented on file: **${inlineContext.path}**
Lines: ${inlineContext.from || "start"} - ${inlineContext.to || "end"}
`
    : "";

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

/**
 * Build tag prompt based on request type
 */
export function buildTagPrompt(params: TagPromptParams, isActionable: boolean): string {
  return isActionable ? buildActionablePrompt(params) : buildInformationalPrompt(params);
}
