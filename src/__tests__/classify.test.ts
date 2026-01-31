import { describe, expect, test } from "bun:test";
import { classifyRequest, extractRequest } from "../modes/tag";

describe("classifyRequest", () => {
  describe("actionable requests", () => {
    test("detects 'fix' keyword", () => {
      expect(classifyRequest("fix this bug")).toBe(true);
      expect(classifyRequest("please fix the error")).toBe(true);
    });

    test("detects 'change' keyword", () => {
      expect(classifyRequest("change this to use async")).toBe(true);
    });

    test("detects 'update' keyword", () => {
      expect(classifyRequest("update the function signature")).toBe(true);
    });

    test("detects 'add' keyword", () => {
      expect(classifyRequest("add error handling")).toBe(true);
    });

    test("detects 'remove' keyword", () => {
      expect(classifyRequest("remove this unused variable")).toBe(true);
    });

    test("detects 'refactor' keyword", () => {
      expect(classifyRequest("refactor this function")).toBe(true);
    });

    test("detects 'implement' keyword", () => {
      expect(classifyRequest("implement the interface")).toBe(true);
    });

    test("detects 'create' keyword", () => {
      expect(classifyRequest("create a new helper function")).toBe(true);
    });

    test("detects 'can you' pattern", () => {
      expect(classifyRequest("can you fix this")).toBe(true);
      expect(classifyRequest("can you add validation")).toBe(true);
    });

    test("detects 'please' pattern", () => {
      expect(classifyRequest("please change the return type")).toBe(true);
    });
  });

  describe("informational requests", () => {
    test("detects 'what' keyword", () => {
      expect(classifyRequest("what does this function do")).toBe(false);
    });

    test("detects 'why' keyword", () => {
      expect(classifyRequest("why is this async")).toBe(false);
    });

    test("detects 'how' keyword", () => {
      expect(classifyRequest("how does this work")).toBe(false);
    });

    test("detects 'explain' keyword", () => {
      expect(classifyRequest("explain this code")).toBe(false);
    });

    test("detects 'review' keyword", () => {
      expect(classifyRequest("review this code")).toBe(false);
    });

    test("detects question mark", () => {
      expect(classifyRequest("is this correct?")).toBe(false);
    });

    test("detects 'does this' pattern", () => {
      expect(classifyRequest("does this handle errors")).toBe(false);
    });
  });

  describe("default behavior", () => {
    test("defaults to informational (false) for ambiguous requests", () => {
      expect(classifyRequest("hello")).toBe(false);
      expect(classifyRequest("thanks")).toBe(false);
    });
  });
});

describe("extractRequest", () => {
  test("extracts text after trigger phrase", () => {
    expect(extractRequest("@claude fix this bug", "@claude")).toBe("fix this bug");
  });

  test("handles trigger phrase at start", () => {
    expect(extractRequest("@claude please review", "@claude")).toBe("please review");
  });

  test("handles trigger phrase in middle", () => {
    expect(extractRequest("Hey @claude can you help", "@claude")).toBe("can you help");
  });

  test("handles case-insensitive trigger", () => {
    expect(extractRequest("@CLAUDE fix this", "@claude")).toBe("fix this");
  });

  test("returns original content if no trigger found", () => {
    expect(extractRequest("fix this bug", "@claude")).toBe("fix this bug");
  });

  test("trims whitespace", () => {
    expect(extractRequest("@claude   fix this  ", "@claude")).toBe("fix this");
  });

  test("returns original if only trigger phrase", () => {
    expect(extractRequest("@claude", "@claude")).toBe("@claude");
  });
});
