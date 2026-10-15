import { describe, expect, it } from "vitest";
import { PROMPT_KINDS, type PromptSpec } from "../../lib/rounds/types";
import AudioPrompt from "./AudioPrompt";
import KeyboardPrompt from "./KeyboardPrompt";
import StaffPrompt from "./StaffPrompt";
import TextPrompt from "./TextPrompt";
import { getPromptComponent, promptRegistry } from "./registry";

describe("prompt registry", () => {
  it("registers the text renderer", () => {
    expect(promptRegistry.text).toBe(TextPrompt);
    expect(getPromptComponent("text")).toBe(TextPrompt);
  });

  it("registers the staff, audio and keyboard renderers", () => {
    expect(promptRegistry.staff).toBe(StaffPrompt);
    expect(getPromptComponent("staff")).toBe(StaffPrompt);
    expect(promptRegistry.audio).toBe(AudioPrompt);
    expect(getPromptComponent("audio")).toBe(AudioPrompt);
    expect(promptRegistry.keyboard).toBe(KeyboardPrompt);
    expect(getPromptComponent("keyboard")).toBe(KeyboardPrompt);
  });

  it("resolves a renderer for every prompt kind in the contract", () => {
    for (const kind of PROMPT_KINDS) {
      expect(promptRegistry[kind]).toBeDefined();
      expect(getPromptComponent(kind)).toBe(promptRegistry[kind]);
    }
  });

  it("throws a clear error naming the kind for unregistered kinds", () => {
    // Kinds outside the contract's four must still fail loud rather than
    // render an empty prompt.
    expect(() => getPromptComponent("diagram" as PromptSpec["kind"])).toThrow(
      new RegExp(`"diagram"`),
    );
  });
});
