import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { registeredLessonIds } from "./registry";

/**
 * Catalog invariants, not an ephemeral snapshot. The catalog is designed to
 * grow (one append per lesson batch), so exact id/order arrays encode a chain
 * state the next append breaks identically. These four properties stay true
 * for every future append while keeping the real coverage: a well-formed,
 * section-major chain order that every registered lesson appears in.
 */
describe("catalog invariants", () => {
  it("lists unique lesson ids", () => {
    const ids = catalog.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("numbers the chain contiguously from 1, in array order", () => {
    expect(catalog.map((entry) => entry.order)).toEqual(
      catalog.map((_, index) => index + 1),
    );
  });

  it("groups each section into one consecutive run of orders", () => {
    // Chain order is section-major: every section occupies a single
    // uninterrupted block, so its orders form one contiguous integer run.
    const sections = [...new Set(catalog.map((entry) => entry.section))];
    expect(sections.length).toBeGreaterThan(1);
    for (const section of sections) {
      const orders = catalog
        .filter((entry) => entry.section === section)
        .map((entry) => entry.order)
        .sort((a, b) => a - b);
      expect(orders.length, `section ${section} is empty`).toBeGreaterThan(0);
      orders.forEach((order, index) => {
        expect(order, `section ${section} has a gap at position ${index}`).toBe(
          orders[0] + index,
        );
      });
    }
  });

  it("contains every registered lesson id", () => {
    for (const id of registeredLessonIds()) {
      expect(
        catalog.some((entry) => entry.id === id),
        `lesson ${id} is registered but missing from the catalog`,
      ).toBe(true);
    }
  });
});
