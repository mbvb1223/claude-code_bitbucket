import { describe, expect, test } from "bun:test";
import { matchesPattern, shouldIncludeFile } from "../project-config";
import { mergeToolConfig, TOOL_CONFIGS } from "../shared";

describe("matchesPattern", () => {
  test("matches exact file names", () => {
    expect(matchesPattern("file.ts", "file.ts")).toBe(true);
    expect(matchesPattern("file.ts", "other.ts")).toBe(false);
  });

  test("matches single wildcard (*)", () => {
    expect(matchesPattern("file.ts", "*.ts")).toBe(true);
    expect(matchesPattern("file.js", "*.ts")).toBe(false);
    expect(matchesPattern("src/file.ts", "*.ts")).toBe(false); // * doesn't match /
  });

  test("matches double wildcard (**)", () => {
    expect(matchesPattern("src/file.ts", "src/**")).toBe(true);
    expect(matchesPattern("src/nested/file.ts", "src/**")).toBe(true);
    expect(matchesPattern("other/file.ts", "src/**")).toBe(false);
  });

  test("matches glob patterns with extension", () => {
    expect(matchesPattern("src/file.ts", "**/*.ts")).toBe(true);
    expect(matchesPattern("src/nested/file.ts", "**/*.ts")).toBe(true);
    expect(matchesPattern("src/file.js", "**/*.ts")).toBe(false);
  });

  test("matches directory patterns", () => {
    expect(matchesPattern("vendor/package/file.php", "vendor/**")).toBe(true);
    expect(matchesPattern("var/cache/file.php", "var/**")).toBe(true);
    expect(matchesPattern("src/file.php", "vendor/**")).toBe(false);
  });

  test("matches specific file patterns", () => {
    expect(matchesPattern("composer.lock", "*.lock")).toBe(true);
    expect(matchesPattern("package-lock.json", "*.lock")).toBe(false);
    expect(matchesPattern("nested/composer.lock", "*.lock")).toBe(false);
  });
});

describe("shouldIncludeFile", () => {
  test("includes all files when no patterns specified", () => {
    expect(shouldIncludeFile("any/file.ts")).toBe(true);
    expect(shouldIncludeFile("vendor/file.php")).toBe(true);
  });

  test("excludes files matching exclude patterns", () => {
    const exclude = ["vendor/**", "*.lock"];

    expect(shouldIncludeFile("vendor/package/file.php", undefined, exclude)).toBe(false);
    expect(shouldIncludeFile("composer.lock", undefined, exclude)).toBe(false);
    expect(shouldIncludeFile("src/file.ts", undefined, exclude)).toBe(true);
  });

  test("includes only files matching include patterns", () => {
    const include = ["src/**", "config/**"];

    expect(shouldIncludeFile("src/file.ts", include)).toBe(true);
    expect(shouldIncludeFile("config/app.php", include)).toBe(true);
    expect(shouldIncludeFile("vendor/file.php", include)).toBe(false);
    expect(shouldIncludeFile("tests/file.ts", include)).toBe(false);
  });

  test("applies both include and exclude patterns", () => {
    const include = ["src/**"];
    const exclude = ["src/generated/**"];

    expect(shouldIncludeFile("src/file.ts", include, exclude)).toBe(true);
    expect(shouldIncludeFile("src/generated/types.ts", include, exclude)).toBe(false);
    expect(shouldIncludeFile("tests/file.ts", include, exclude)).toBe(false);
  });

  test("exclude takes precedence over include", () => {
    const include = ["src/**"];
    const exclude = ["**/*.generated.ts"];

    expect(shouldIncludeFile("src/types.generated.ts", include, exclude)).toBe(false);
    expect(shouldIncludeFile("src/types.ts", include, exclude)).toBe(true);
  });
});

describe("mergeToolConfig", () => {
  test("returns default config when no project config provided", () => {
    const result = mergeToolConfig(TOOL_CONFIGS.readOnly);

    expect(result.allowedTools).toEqual(TOOL_CONFIGS.readOnly.allowedTools);
    expect(result.blockedTools).toEqual(TOOL_CONFIGS.readOnly.blockedTools);
  });

  test("returns default config when project config is empty", () => {
    const result = mergeToolConfig(TOOL_CONFIGS.fullAccess, {});

    expect(result.allowedTools).toEqual(TOOL_CONFIGS.fullAccess.allowedTools);
    expect(result.blockedTools).toEqual(TOOL_CONFIGS.fullAccess.blockedTools);
  });

  test("uses project allowed tools when specified", () => {
    const projectConfig = {
      allowed: ["Read", "Grep"],
    };

    const result = mergeToolConfig(TOOL_CONFIGS.fullAccess, projectConfig);

    expect(result.allowedTools).toEqual(["Read", "Grep"]);
    expect(result.blockedTools).toEqual(TOOL_CONFIGS.fullAccess.blockedTools);
  });

  test("uses project blocked tools when specified", () => {
    const projectConfig = {
      blocked: ["Bash", "Write"],
    };

    const result = mergeToolConfig(TOOL_CONFIGS.fullAccess, projectConfig);

    expect(result.allowedTools).toEqual(TOOL_CONFIGS.fullAccess.allowedTools);
    expect(result.blockedTools).toEqual(["Bash", "Write"]);
  });

  test("uses both allowed and blocked from project config", () => {
    const projectConfig = {
      allowed: ["Read", "Edit"],
      blocked: ["Bash"],
    };

    const result = mergeToolConfig(TOOL_CONFIGS.fullAccess, projectConfig);

    expect(result.allowedTools).toEqual(["Read", "Edit"]);
    expect(result.blockedTools).toEqual(["Bash"]);
  });
});
