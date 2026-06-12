import { describe, expect, it } from "vitest";

import { getSpendingIntensityColor } from "./ReportSpendingHeatmap";

describe("getSpendingIntensityColor", () => {
  it("uses a neutral color when there is no spending intensity", () => {
    expect(getSpendingIntensityColor(0, 100)).toBe("var(--bg-stripe)");
    expect(getSpendingIntensityColor(100, 0)).toBe("var(--bg-stripe)");
  });

  it("maps spending intensity to progressively stronger red tones", () => {
    expect(getSpendingIntensityColor(10, 100)).toBe("var(--expense-50)");
    expect(getSpendingIntensityColor(25, 100)).toBe("var(--expense-100)");
    expect(getSpendingIntensityColor(50, 100)).toBe("var(--expense-400)");
    expect(getSpendingIntensityColor(75, 100)).toBe("var(--expense-700)");
  });
});
