/**
 * Shared type definitions
 */

/** Base result interface for mode operations */
export interface ModeResult {
  success: boolean;
  error?: string;
}

/** Result from review mode */
export interface ReviewResult extends ModeResult {
  reviewPosted: boolean;
}

/** Result from tag mode */
export interface TagResult extends ModeResult {
  responded: boolean;
  commentId?: number;
}

/** Valid mode types */
export type Mode = "review" | "tag";

/** Type guard to check if a string is a valid mode */
export function isValidMode(value: string): value is Mode {
  return value === "review" || value === "tag";
}