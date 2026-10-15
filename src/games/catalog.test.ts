import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";

describe("catalog seed", () => {
  it("lists the chain in musictheory.net index order, section by section", () => {
    expect(catalog.map((entry) => entry.id)).toEqual([
      10, 11, 12, 13, 14, 20, 15, 16, 21, 22, 23,
    ]);
    expect(catalog.map((entry) => entry.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(catalog.slice(0, 6).every((entry) => entry.section === "The Basics")).toBe(true);
    expect(catalog.slice(6, 8).every((entry) => entry.section === "Rhythm and Meter")).toBe(true);
    expect(catalog.slice(8).every((entry) => entry.section === "Scales and Key Signatures")).toBe(
      true,
    );
  });
});
