import { describe, expect, test } from "bun:test";
import { isValidMode } from "../shared/types";

describe("isValidMode", () => {
  test("returns true for 'review'", () => {
    expect(isValidMode("review")).toBe(true);
  });

  test("returns true for 'tag'", () => {
    expect(isValidMode("tag")).toBe(true);
  });

  test("returns false for invalid modes", () => {
    expect(isValidMode("invalid")).toBe(false);
    expect(isValidMode("")).toBe(false);
    expect(isValidMode("REVIEW")).toBe(false);
    expect(isValidMode("TAG")).toBe(false);
    expect(isValidMode("auto")).toBe(false);
  });
});
