import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";

describe("catalog seed", () => {
  it("lists the first six lessons of The Basics in chain order", () => {
    expect(catalog.map((entry) => entry.id)).toEqual([10, 11, 12, 13, 14, 20]);
    expect(catalog.map((entry) => entry.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(catalog.every((entry) => entry.section === "The Basics")).toBe(true);
  });
});
