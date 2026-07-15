import { describe, expect, it } from "vitest";
import {
  buildPreparationItems,
  buildReadinessPresentation,
  buildSellerChecklist,
  effortLevelForRecommendation,
  readinessLabelForScore,
} from "./seller-report";
import type { ImprovementRecommendation } from "./property-intelligence";
import type { WholePropertyAnalysis } from "./whole-property-synthesis";

function recommendation(
  overrides: Partial<ImprovementRecommendation> = {},
): ImprovementRecommendation {
  return {
    improvement: {
      id: "kitchen-hardware",
      improvementName: "Cabinet hardware refresh",
      category: "Kitchen",
      description: "Refresh visible cabinet hardware.",
      typicalCostRange: { min: 100, max: 400 },
      potentialAddedSaleValueRange: { min: 500, max: 1200 },
      confidenceLevel: "High",
      sellerTalkingPoints: [],
      targetConditions: ["Average"],
      priorityBase: 60,
    },
    priority: "Medium",
    priorityScore: 70,
    reasons: [],
    sellerTalkingPoints: [],
    ...overrides,
  };
}

const synthesis: WholePropertyAnalysis = {
  executiveSummary: "The home presents well from the uploaded photos.",
  overallCondition: "Good visible presentation.",
  buyerAppeal: "Bright and approachable for buyers.",
  listingReadinessNarrative:
    "The home is close to listing ready with a few visible prep items.",
  topSellingFeatures: ["Bright kitchen", "Strong first impression"],
  topImprovementPriorities: ["Cabinet hardware refresh"],
  stagingObservations: ["Keep counters clear"],
  overallConfidence: "High",
  marketingHighlights: ["Excellent natural lighting"],
};

describe("seller report presentation helpers", () => {
  it("maps readiness scores to seller-friendly labels", () => {
    expect(readinessLabelForScore(95)).toBe("Listing Ready");
    expect(readinessLabelForScore(84)).toBe(
      "Minor Preparation Recommended",
    );
    expect(readinessLabelForScore(74)).toBe("Good Opportunity");
    expect(readinessLabelForScore(64)).toBe("Preparation Recommended");
    expect(readinessLabelForScore(55)).toBe(
      "Significant Preparation Opportunity",
    );
  });

  it("assigns every recommendation an effort level and broad time estimate", () => {
    const items = buildPreparationItems([recommendation()]);

    expect(items).toMatchObject([
      {
        effortLevel: "Quick Win",
        estimatedTime: "Under 1 hour",
        priority: "Medium",
      },
    ]);
  });

  it("deduplicates checklist items and groups them for seller prep", () => {
    const duplicate = recommendation({
      improvement: {
        ...recommendation().improvement,
        id: "duplicate-id",
      },
    });

    const checklist = buildSellerChecklist({
      recommendations: [recommendation(), duplicate],
      synthesis,
    });

    expect(checklist).toHaveLength(1);
    expect(checklist[0]).toMatchObject({
      group: "Optional Enhancements",
      room: "Kitchen",
      task: "Cabinet hardware refresh",
    });
  });

  it("uses professional upgrade for high-priority larger prep work", () => {
    expect(
      effortLevelForRecommendation(
        recommendation({
          improvement: {
            ...recommendation().improvement,
            id: "paint-refresh",
            improvementName: "Interior paint refresh",
            description: "Refresh visibly worn paint.",
          },
          priority: "High",
        }),
      ),
    ).toBe("Professional Upgrade");
  });

  it("builds readiness presentation from the synthesis narrative", () => {
    const readiness = buildReadinessPresentation({
      confidence: "High",
      readinessScore: {
        score: 86,
        status: "Listing Ready",
        summary: "Internal summary",
        highPriorityCount: 0,
        mediumPriorityCount: 1,
        lowPriorityCount: 0,
      },
      synthesis,
    });

    expect(readiness).toEqual({
      score: 86,
      label: "Minor Preparation Recommended",
      confidence: "High",
      narrative:
        "The home is close to listing ready with a few visible prep items.",
    });
  });
});
