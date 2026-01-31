import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { loadConfig, validateConfig } from "../config";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("loads required values from environment", () => {
    process.env.BITBUCKET_WORKSPACE = "my-workspace";
    process.env.BITBUCKET_REPO_SLUG = "my-repo";
    process.env.ANTHROPIC_API_KEY = "test-key";

    const config = loadConfig();

    expect(config.workspace).toBe("my-workspace");
    expect(config.repoSlug).toBe("my-repo");
    expect(config.anthropicApiKey).toBe("test-key");
  });

  test("uses default values when not specified", () => {
    const config = loadConfig();

    expect(config.destinationBranch).toBe("main");
    expect(config.mode).toBe("review");
    expect(config.triggerPhrase).toBe("@claude");
    expect(config.model).toBe("haiku");
    expect(config.maxTurns).toBe(30);
    expect(config.verbose).toBe(false);
  });

  test("parses MODE correctly", () => {
    process.env.MODE = "tag";
    expect(loadConfig().mode).toBe("tag");

    process.env.MODE = "review";
    expect(loadConfig().mode).toBe("review");
  });

  test("defaults to review for invalid MODE", () => {
    process.env.MODE = "invalid";
    expect(loadConfig().mode).toBe("review");
  });

  test("parses VERBOSE correctly", () => {
    process.env.VERBOSE = "true";
    expect(loadConfig().verbose).toBe(true);

    process.env.VERBOSE = "false";
    expect(loadConfig().verbose).toBe(false);
  });

  test("parses PR_ID as number", () => {
    process.env.BITBUCKET_PR_ID = "123";
    expect(loadConfig().prId).toBe(123);
  });

  test("returns undefined for missing PR_ID", () => {
    delete process.env.BITBUCKET_PR_ID;
    expect(loadConfig().prId).toBeUndefined();
  });
});

describe("validateConfig", () => {
  test("returns errors for missing required fields", () => {
    const config = loadConfig();
    const errors = validateConfig(config);

    expect(errors).toContain("BITBUCKET_WORKSPACE is required");
    expect(errors).toContain("BITBUCKET_REPO_SLUG is required");
    expect(errors).toContain("ANTHROPIC_API_KEY is required");
  });

  test("returns warning for missing Bitbucket token", () => {
    process.env.BITBUCKET_WORKSPACE = "ws";
    process.env.BITBUCKET_REPO_SLUG = "repo";
    process.env.ANTHROPIC_API_KEY = "key";

    const config = loadConfig();
    const errors = validateConfig(config);

    expect(errors.some((e) => e.includes("BITBUCKET_ACCESS_TOKEN"))).toBe(true);
  });

  test("returns empty array when all required fields present", () => {
    process.env.BITBUCKET_WORKSPACE = "ws";
    process.env.BITBUCKET_REPO_SLUG = "repo";
    process.env.ANTHROPIC_API_KEY = "key";
    process.env.BITBUCKET_ACCESS_TOKEN = "token";

    const config = loadConfig();
    const errors = validateConfig(config);

    expect(errors).toEqual([]);
  });
});
