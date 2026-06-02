import { describe, expect, it } from "vitest";

import { getSpendingIntensityColor } from "./ReportSpendingHeatmap";

describe("getSpendingIntensityColor", () => {
  it("uses a neutral color when there is no spending intensity", () => {
    expect(getSpendingIntensityColor(0, 100)).toBe("#f8fafc");
    expect(getSpendingIntensityColor(100, 0)).toBe("#f8fafc");
  });

  it("maps spending intensity to progressively stronger red tones", () => {
    expect(getSpendingIntensityColor(10, 100)).toBe("#fee2e2");
    expect(getSpendingIntensityColor(25, 100)).toBe("#fca5a5");
    expect(getSpendingIntensityColor(50, 100)).toBe("#ef4444");
    expect(getSpendingIntensityColor(75, 100)).toBe("#991b1b");
  });
});
