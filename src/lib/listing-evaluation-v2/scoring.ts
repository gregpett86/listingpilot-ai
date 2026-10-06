import type {
  ConfidenceLevel,
  ImprovementRecommendation,
  ListingEvaluationV2,
  PhotoCoverage,
  SpaceAnalysis,
  SpaceCategory,
} from "./types";

export const COMPONENT_WEIGHTS = {
  conditionScore: 0.35,
  presentationScore: 0.25,
  photoReadinessScore: 0.25,
  marketabilityScore: 0.15,
} as const;

export const CATEGORY_WEIGHTS: Record<SpaceCategory, number> = {
  bedroom: 1,
  bathroom: 1.15,
  kitchen: 1.5,
  living: 1.35,
  dining: 0.8,
  office: 0.65,
  laundry: 0.45,
  entry: 0.75,
  hallway: 0.35,
  stairs: 0.35,
  garage: 0.55,
  basement: 0.65,
  attic: 0.25,
  exterior: 1.4,
  landscaping: 1.25,
  pool: 0.65,
  spa: 0.45,
  deck_patio: 0.7,
  guest_house: 0.85,
  adu: 0.9,
  specialty: 0.45,
  custom: 0.45,
};

const COVERAGE_CONFIDENCE: Record<PhotoCoverage, number> = {
  none: 0,
  limited: 0.45,
  good: 0.75,
  excellent: 1,
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function calculateSpaceCurrentScore(input: {
  conditionScore: number;
  presentationScore: number;
  photoReadinessScore: number;
  marketabilityScore: number;
}) {
  return clamp(
    input.conditionScore * COMPONENT_WEIGHTS.conditionScore +
      input.presentationScore * COMPONENT_WEIGHTS.presentationScore +
      input.photoReadinessScore * COMPONENT_WEIGHTS.photoReadinessScore +
      input.marketabilityScore * COMPONENT_WEIGHTS.marketabilityScore,
  );
}

export function calculateSpacePotentialScore(
  currentScore: number,
  recommendations: ImprovementRecommendation[],
) {
  const impact = recommendations
    .filter((recommendation) => recommendation.selected)
    .reduce((sum, recommendation) => sum + recommendation.scoreImpact, 0);
  return clamp(currentScore + impact);
}

export function calculatePropertyScores(evaluation: ListingEvaluationV2) {
  const analysisBySpace = new Map(evaluation.analyses.map((analysis) => [analysis.spaceId, analysis]));
  const eligible = evaluation.spaces.flatMap((space) => {
    const analysis = analysisBySpace.get(space.id);
    if (!analysis || space.status === "not_evaluated") return [];
    return [{ space, analysis }];
  });

  const totalWeight = eligible.reduce(
    (sum, item) => sum + CATEGORY_WEIGHTS[item.space.category],
    0,
  );

  if (!totalWeight) {
    return { currentScore: undefined, potentialScore: undefined, confidence: "low" as ConfidenceLevel };
  }

  const currentScore = clamp(
    eligible.reduce(
      (sum, item) => sum + item.analysis.currentScore * CATEGORY_WEIGHTS[item.space.category],
      0,
    ) / totalWeight,
  );

  const potentialScore = clamp(
    eligible.reduce(
      (sum, item) => sum + item.analysis.potentialScore * CATEGORY_WEIGHTS[item.space.category],
      0,
    ) / totalWeight,
  );

  const confidenceValue =
    eligible.reduce(
      (sum, item) =>
        sum + COVERAGE_CONFIDENCE[item.analysis.coverage] * CATEGORY_WEIGHTS[item.space.category],
      0,
    ) / totalWeight;

  const confidence: ConfidenceLevel =
    confidenceValue >= 0.8 ? "high" : confidenceValue >= 0.55 ? "medium" : "low";

  return { currentScore, potentialScore, confidence };
}

export function recalculateSpaceAnalysis(
  analysis: Omit<SpaceAnalysis, "currentScore" | "potentialScore">,
  recommendations: ImprovementRecommendation[],
): SpaceAnalysis {
  const currentScore = calculateSpaceCurrentScore(analysis);
  const potentialScore = calculateSpacePotentialScore(
    currentScore,
    recommendations.filter((recommendation) => recommendation.spaceId === analysis.spaceId),
  );

  return { ...analysis, currentScore, potentialScore };
}
