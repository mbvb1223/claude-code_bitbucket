/**
 * Review mode prompt templates
 */

import { MAX_DIFF_SIZE } from "../shared";

export interface ReviewPromptParams {
  title: string;
  sourceBranch: string;
  destBranch: string;
  diff: string;
}

/**
 * Build the prompt for Claude to review the PR
 */
export function buildReviewPrompt(params: ReviewPromptParams): string {
  const { title, sourceBranch, destBranch, diff } = params;

  return `Review this PR. Be concise - bullet points only.

**${title}** (${sourceBranch} → ${destBranch})

Check for: bugs, security issues, logic errors. Skip style nits.

Format: 🔴 Critical | 🟡 Important | 🟢 Minor
- File:line - Issue - Fix

If code is good, just say "LGTM".

\`\`\`diff
${diff.substring(0, MAX_DIFF_SIZE)}
\`\`\``;
}

/**
 * Format the review output for posting as a comment
 */
export function formatReviewComment(output: string): string {
  return `## Claude Code Review

${output}

---
*Automated review by Claude*`;
}
