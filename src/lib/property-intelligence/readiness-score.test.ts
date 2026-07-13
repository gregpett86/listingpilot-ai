import { describe, expect, it } from "vitest";
import { calculatePropertyReadinessScore } from "./readiness-score";
import type {
  ImprovementRecommendation,
  PropertyConditionObservation,
} from "./types";

function observation(
  condition: PropertyConditionObservation["condition"],
): PropertyConditionObservation {
  return {
    roomType: "Kitchen",
    condition,
  };
}

function recommendation(
  priority: ImprovementRecommendation["priority"],
): ImprovementRecommendation {
  return {
    priority,
    priorityScore: priority === "High" ? 90 : priority === "Medium" ? 70 : 40,
    reasons: [],
    sellerTalkingPoints: [],
    improvement: {
      id: `test-${priority}`,
      improvementName: `${priority} improvement`,
      category: "Kitchen",
      description: "",
      typicalCostRange: { min: 0, max: 0 },
      potentialAddedSaleValueRange: { min: 0, max: 0 },
      confidenceLevel: "High",
      sellerTalkingPoints: [],
      targetConditions: ["Average"],
      priorityBase: 0,
    },
  };
}

describe("calculatePropertyReadinessScore", () => {
  it("calculates status boundaries from observed condition scores", () => {
    expect(
      calculatePropertyReadinessScore({
        observations: [observation("Excellent")],
        recommendations: [],
      }).status,
    ).toBe("Listing Ready");
    expect(
      calculatePropertyReadinessScore({
        observations: [observation("Good")],
        recommendations: [],
      }).status,
    ).toBe("Minor Improvements Recommended");
    expect(
      calculatePropertyReadinessScore({
        observations: [observation("Average")],
        recommendations: [],
      }).status,
    ).toBe("Significant Opportunity");
    expect(
      calculatePropertyReadinessScore({
        observations: [observation("Needs Improvement")],
        recommendations: [],
      }).status,
    ).toBe("Needs Review");
  });

  it("applies high, medium, and low recommendation penalties", () => {
    const result = calculatePropertyReadinessScore({
      observations: [observation("Excellent")],
      recommendations: [
        recommendation("High"),
        recommendation("Medium"),
        recommendation("Low"),
      ],
    });

    expect(result.highPriorityCount).toBe(1);
    expect(result.mediumPriorityCount).toBe(1);
    expect(result.lowPriorityCount).toBe(1);
    expect(result.score).toBe(85);
  });

  it("returns Needs Review for empty observations", () => {
    expect(
      calculatePropertyReadinessScore({
        observations: [],
        recommendations: [],
      }),
    ).toMatchObject({
      score: 0,
      status: "Needs Review",
    });
  });
});
