/**
 * Bitbucket API client using native fetch
 * No external dependencies - just fetch!
 */

import type { Config } from "./config";
import { logger } from "./logger";

const API_BASE = "https://api.bitbucket.org/2.0";

/**
 * Comment from Bitbucket API
 */
export interface PRComment {
  id: number;
  content: {
    raw: string;
  };
  inline?: {
    path: string;
    from: number | null;
    to: number | null;
  };
  user: {
    display_name: string;
    uuid: string;
  };
  created_on: string;
}

/**
 * Pull Request from Bitbucket API
 */
export interface PullRequest {
  id: number;
  title: string;
  description: string;
  source: {
    branch: { name: string };
  };
  destination: {
    branch: { name: string };
  };
  author: {
    display_name: string;
  };
  state: string;
}

/**
 * Bitbucket API client
 */
export class BitbucketClient {
  private config: Config;
  private authHeader: string;

  constructor(config: Config) {
    this.config = config;

    // Build auth header from token
    // Format: username:app_password (will be base64 encoded)
    if (config.bitbucketToken) {
      // Check if token contains colon (username:password format)
      if (config.bitbucketToken.includes(":")) {
        const base64 = Buffer.from(config.bitbucketToken).toString("base64");
        this.authHeader = `Basic ${base64}`;
        logger.debug(`Auth: Basic auth with username:password format`);
      } else {
        // Assume it's a Bearer token
        this.authHeader = `Bearer ${config.bitbucketToken}`;
        logger.debug(`Auth: Bearer token format`);
      }
    } else {
      this.authHeader = "";
      logger.debug("Auth: No token provided");
    }
  }

  /**
   * Make authenticated request to Bitbucket API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: object
  ): Promise<T | null> {
    const url = `${API_BASE}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.authHeader) {
      headers["Authorization"] = this.authHeader;
    }

    try {
      logger.debug(`${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API error (${response.status}): ${errorText}`);
        return null;
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) return null;

      return JSON.parse(text) as T;
    } catch (error) {
      logger.error("Request failed:", error);
      return null;
    }
  }

  /**
   * Get pull request details
   */
  async getPullRequest(prId: number): Promise<PullRequest | null> {
    const path = `/repositories/${this.config.workspace}/${this.config.repoSlug}/pullrequests/${prId}`;
    return this.request<PullRequest>("GET", path);
  }

  /**
   * Get pull request diff
   */
  async getPullRequestDiff(prId: number): Promise<string> {
    const path = `/repositories/${this.config.workspace}/${this.config.repoSlug}/pullrequests/${prId}/diff`;
    const url = `${API_BASE}${path}`;

    try {
      const headers: Record<string, string> = {};
      if (this.authHeader) {
        headers["Authorization"] = this.authHeader;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        logger.error(`Failed to get diff: ${response.status}`);
        return "";
      }

      return await response.text();
    } catch (error) {
      logger.error("Failed to get diff:", error);
      return "";
    }
  }

  /**
   * Get all comments on a PR
   */
  async getComments(prId: number): Promise<PRComment[]> {
    const path = `/repositories/${this.config.workspace}/${this.config.repoSlug}/pullrequests/${prId}/comments`;

    interface CommentsResponse {
      values: PRComment[];
      next?: string;
    }

    const response = await this.request<CommentsResponse>("GET", path);
    return response?.values || [];
  }

  /**
   * Post a comment to the PR (top-level)
   */
  async postComment(prId: number, content: string): Promise<PRComment | null> {
    if (!this.authHeader) {
      logger.warn("No auth token - cannot post comment");
      return null;
    }

    const path = `/repositories/${this.config.workspace}/${this.config.repoSlug}/pullrequests/${prId}/comments`;

    return this.request<PRComment>("POST", path, {
      content: { raw: content },
    });
  }

  /**
   * Post an inline comment on specific file/line
   */
  async postInlineComment(
    prId: number,
    content: string,
    filePath: string,
    line: number
  ): Promise<PRComment | null> {
    if (!this.authHeader) {
      logger.warn("No auth token - cannot post inline comment");
      return null;
    }

    const path = `/repositories/${this.config.workspace}/${this.config.repoSlug}/pullrequests/${prId}/comments`;

    return this.request<PRComment>("POST", path, {
      content: { raw: content },
      inline: {
        path: filePath,
        to: line,
      },
    });
  }

  /**
   * Reply to an existing comment (thread)
   */
  async replyToComment(
    prId: number,
    parentId: number,
    content: string
  ): Promise<PRComment | null> {
    if (!this.authHeader) {
      logger.warn("No auth token - cannot reply to comment");
      return null;
    }

    const path = `/repositories/${this.config.workspace}/${this.config.repoSlug}/pullrequests/${prId}/comments`;

    return this.request<PRComment>("POST", path, {
      content: { raw: content },
      parent: { id: parentId },
    });
  }
}
