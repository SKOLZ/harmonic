import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";

describe("catalog seed", () => {
  it("lists The Basics plus the Rhythm and Meter lessons in chain order", () => {
    expect(catalog.map((entry) => entry.id)).toEqual([10, 11, 12, 13, 14, 20, 15, 16]);
    expect(catalog.map((entry) => entry.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(catalog.slice(0, 6).every((entry) => entry.section === "The Basics")).toBe(true);
    expect(catalog.slice(6).every((entry) => entry.section === "Rhythm and Meter")).toBe(true);
  });
});
