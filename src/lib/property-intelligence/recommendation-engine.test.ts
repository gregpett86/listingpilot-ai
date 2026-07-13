import { describe, expect, it } from "vitest";
import { recommendImprovements } from "./recommendation-engine";
import type { PropertyConditionObservation } from "./types";

describe("recommendImprovements", () => {
  it("filters recommendations by room and condition and sorts by priority score", () => {
    const observations: PropertyConditionObservation[] = [
      {
        roomType: "Kitchen",
        condition: "Dated",
        photoCount: 3,
        observedIssues: ["cabinet"],
      },
    ];

    const recommendations = recommendImprovements({
      observations,
      limit: 5,
    });

    expect(recommendations).toHaveLength(5);
    expect(
      recommendations.every(
        (recommendation) => recommendation.improvement.category === "Kitchen",
      ),
    ).toBe(true);
    expect(recommendations.map((item) => item.priorityScore)).toEqual(
      [...recommendations]
        .map((item) => item.priorityScore)
        .sort((a, b) => b - a),
    );
  });

  it("boosts recommendations whose text matches observed issues", () => {
    const withCabinetIssue = recommendImprovements({
      observations: [
        {
          roomType: "Kitchen",
          condition: "Average",
          observedIssues: ["cabinet"],
        },
      ],
      limit: 12,
    }).find(
      (recommendation) =>
        recommendation.improvement.improvementName ===
        "Cabinet hardware refresh",
    );
    const withoutCabinetIssue = recommendImprovements({
      observations: [
        {
          roomType: "Kitchen",
          condition: "Average",
          observedIssues: [],
        },
      ],
      limit: 12,
    }).find(
      (recommendation) =>
        recommendation.improvement.improvementName ===
        "Cabinet hardware refresh",
    );

    expect(withCabinetIssue?.priorityScore).toBeGreaterThan(
      withoutCabinetIssue?.priorityScore ?? 0,
    );
  });

  it("returns an empty list when there are no observations", () => {
    expect(recommendImprovements({ observations: [] })).toEqual([]);
  });
});
