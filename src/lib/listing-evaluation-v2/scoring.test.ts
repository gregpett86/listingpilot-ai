import { describe, expect, it } from "vitest";
import { calculatePropertyScores, calculateSpaceCurrentScore } from "./scoring";
import type { ListingEvaluationV2 } from "./types";

describe("listing evaluation scoring", () => {
  it("produces deterministic room scoring", () => {
    expect(
      calculateSpaceCurrentScore({
        conditionScore: 80,
        presentationScore: 60,
        photoReadinessScore: 70,
        marketabilityScore: 90,
      }),
    ).toBe(74);
  });

  it("excludes not-evaluated spaces instead of treating them as zero", () => {
    const evaluation = {
      id: "e1",
      property: { address: "1 Main", cityStateZip: "Town", source: "manual", agentEditable: true },
      spaces: [
        { id: "k", category: "kitchen", defaultLabel: "Kitchen", sequence: 1, status: "complete", photoIds: [] },
        { id: "g", category: "garage", defaultLabel: "Garage", sequence: 1, status: "not_evaluated", photoIds: [] },
      ],
      photos: [],
      analyses: [
        {
          spaceId: "k",
          visibleFindings: [],
          conditionScore: 80,
          presentationScore: 80,
          photoReadinessScore: 80,
          marketabilityScore: 80,
          currentScore: 80,
          potentialScore: 90,
          confidence: "high",
          coverage: "excellent",
          analyzedAt: new Date().toISOString(),
        },
      ],
      recommendations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies ListingEvaluationV2;

    expect(calculatePropertyScores(evaluation)).toMatchObject({
      currentScore: 80,
      potentialScore: 90,
      confidence: "high",
    });
  });
});
