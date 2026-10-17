import { describe, expect, it } from "vitest";
import { QUESTION_TIME_MS, remainingFraction, remainingSeconds } from "./timer";

describe("remainingSeconds", () => {
  it("rounds up to whole seconds so the display starts at the full duration", () => {
    expect(remainingSeconds(QUESTION_TIME_MS)).toBe(20);
    expect(remainingSeconds(QUESTION_TIME_MS - 1)).toBe(20);
    expect(remainingSeconds(1)).toBe(1);
    expect(remainingSeconds(0)).toBe(0);
  });
});

describe("remainingFraction", () => {
  it("maps the remaining milliseconds onto a 0..1 share of the question duration", () => {
    expect(remainingFraction(QUESTION_TIME_MS)).toBe(1);
    expect(remainingFraction(QUESTION_TIME_MS / 2)).toBe(0.5);
    expect(remainingFraction(QUESTION_TIME_MS / 4)).toBe(0.25);
  });

  it("clamps out-of-range values instead of overshooting the ring", () => {
    expect(remainingFraction(0)).toBe(0);
    expect(remainingFraction(-500)).toBe(0);
    expect(remainingFraction(QUESTION_TIME_MS * 2)).toBe(1);
  });
});
