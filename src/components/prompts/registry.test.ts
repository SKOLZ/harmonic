import { describe, expect, it } from "vitest";
import TextPrompt from "./TextPrompt";
import { getPromptComponent, promptRegistry } from "./registry";

describe("prompt registry", () => {
  it("registers the text renderer", () => {
    expect(promptRegistry.text).toBe(TextPrompt);
    expect(getPromptComponent("text")).toBe(TextPrompt);
  });

  it("throws a clear error naming the kind for unregistered kinds", () => {
    // staff / audio / keyboard arrive in T5c; until then they must fail loud.
    for (const kind of ["staff", "audio", "keyboard"] as const) {
      expect(() => getPromptComponent(kind)).toThrow(new RegExp(`"${kind}"`));
    }
  });
});
