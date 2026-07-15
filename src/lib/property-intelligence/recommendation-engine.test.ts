import { describe, expect, it } from "vitest";
import { recommendImprovements } from "./recommendation-engine";
import type { PropertyConditionObservation } from "./types";

describe("recommendImprovements", () => {
  it("filters recommendations by room, condition, visible evidence, and priority score", () => {
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

    expect(recommendations.length).toBeGreaterThan(0);
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
          observedIssues: ["lighting"],
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

  it("does not generate unsupported recommendations from empty visible findings", () => {
    expect(
      recommendImprovements({
        observations: [
          {
            roomType: "Living Room",
            condition: "Dated",
            observedIssues: [],
          },
        ],
      }),
    ).toEqual([]);
  });

  it("never generates odor remediation from photo-only observations", () => {
    const recommendations = recommendImprovements({
      observations: [
        {
          roomType: "Basement",
          condition: "Needs Improvement",
          observedIssues: ["musty odor"],
        },
      ],
      limit: 20,
    });

    expect(
      recommendations.some(
        (recommendation) =>
          recommendation.improvement.improvementName === "Odor remediation",
      ),
    ).toBe(false);
  });

  it("does not generate unsupported moisture review from non-moisture evidence", () => {
    const recommendations = recommendImprovements({
      observations: [
        {
          roomType: "Basement",
          condition: "Needs Improvement",
          observedIssues: ["outdoor water feature"],
        },
      ],
      limit: 20,
    });

    expect(
      recommendations.some(
        (recommendation) =>
          recommendation.improvement.improvementName ===
          "Moisture issue review",
      ),
    ).toBe(false);
  });

  it("keeps Pool, Landscaping, Exterior, and Living Room recommendations isolated from Basement", () => {
    const recommendations = recommendImprovements({
      observations: [
        {
          roomType: "Pool",
          condition: "Needs Improvement",
          observedIssues: ["cloudy pool water"],
        },
        {
          roomType: "Landscaping",
          condition: "Dated",
          observedIssues: ["overgrown shrubs"],
        },
        {
          roomType: "Exterior",
          condition: "Dated",
          observedIssues: ["peeling exterior paint"],
        },
        {
          roomType: "Living Room",
          condition: "Dated",
          observedIssues: ["marked wall paint"],
        },
      ],
      limit: 20,
    });

    expect(
      recommendations.every(
        (recommendation) => recommendation.improvement.category !== "Basement",
      ),
    ).toBe(true);
  });

  it("does not create automatic recommendations for Hallway or Stairs observations", () => {
    const recommendations = recommendImprovements({
      observations: [
        {
          roomType: "Hallway",
          condition: "Dated",
          observedIssues: ["narrow hallway corridor"],
        },
        {
          roomType: "Stairs",
          condition: "Needs Improvement",
          observedIssues: ["stairway railing"],
        },
      ],
      limit: 20,
    });

    expect(recommendations).toEqual([]);
  });
});
