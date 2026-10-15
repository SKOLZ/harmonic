import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { getLessonModule, registeredLessonIds } from "./registry";

describe("getLessonModule", () => {
  it("returns the module registered for a known lesson id", () => {
    for (const id of [10, 11]) {
      const module = getLessonModule(id);
      expect(module.entry.id).toBe(id);
      expect(typeof module.generateRounds).toBe("function");
      expect(module.entry).toEqual(catalog.find((entry) => entry.id === id));
    }
  });

  it("throws a clear error naming the unknown id", () => {
    expect(() => getLessonModule(999)).toThrow(/999/);
    expect(() => getLessonModule(999)).toThrow(/lesson module/i);
  });

  it("only claims ids that are actually registered", () => {
    for (const id of registeredLessonIds()) {
      expect(() => getLessonModule(id)).not.toThrow();
    }
    expect(registeredLessonIds().every((id) => catalog.some((entry) => entry.id === id))).toBe(
      true,
    );
  });
});
