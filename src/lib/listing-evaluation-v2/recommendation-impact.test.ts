import { describe, expect, it } from "vitest";
import { deterministicRecommendationImpact } from "./recommendation-impact";

describe("recommendation impact", () => {
  it("is deterministic and ignores model-provided numeric impact", () => {
    expect(deterministicRecommendationImpact("do_first", "quick")).toBe(5);
    expect(deterministicRecommendationImpact("next_if_possible", "moderate")).toBe(4);
    expect(deterministicRecommendationImpact("optional_polish", "project")).toBe(3);
  });
});
