import { describe, expect, it } from "vitest";
import {
  buildReadinessSummary,
  defaultProperty,
  improvements,
} from "./report-data";
import { createListingReadinessPdf } from "./report-pdf";

describe("createListingReadinessPdf", () => {
  it("creates the eight-page luxury report structure without requiring photos", () => {
    const summary = buildReadinessSummary(
      improvements.map((item) => item.id),
      [],
    );
    const doc = createListingReadinessPdf(defaultProperty, summary);

    expect(doc.getNumberOfPages()).toBe(8);
    expect(summary.selectedRecommendations).toHaveLength(improvements.length);
    expect(summary.coverPhoto).toBeUndefined();
  });
});
