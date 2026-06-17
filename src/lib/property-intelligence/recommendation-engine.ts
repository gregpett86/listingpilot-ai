import { IMPROVEMENT_LIBRARY } from "./improvement-library";
import { buildSellerTalkingPoints } from "./seller-talking-points";
import {
  ConfidenceLevel,
  ImprovementRecommendation,
  ImprovementRecord,
  PropertyCondition,
  PropertyConditionObservation,
  RecommendationPriority,
} from "./types";

const conditionWeights: Record<PropertyCondition, number> = {
  Excellent: 4,
  Good: 18,
  Average: 44,
  Dated: 72,
  "Needs Improvement": 96,
};

const confidenceWeights: Record<ConfidenceLevel, number> = {
  High: 12,
  Medium: 7,
  Low: 3,
};

function priorityFromScore(score: number): RecommendationPriority {
  if (score >= 82) return "High";
  if (score >= 58) return "Medium";
  return "Low";
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function issueMatchBoost(
  improvement: ImprovementRecord,
  observedIssues: string[] = [],
) {
  const searchable = [
    improvement.improvementName,
    improvement.description,
    ...improvement.sellerTalkingPoints,
  ]
    .join(" ")
    .toLowerCase();

  return observedIssues.some((issue) =>
    searchable.includes(issue.toLowerCase()),
  )
    ? 8
    : 0;
}

function buildReasons({
  improvement,
  observation,
  priorityScore,
}: {
  improvement: ImprovementRecord;
  observation: PropertyConditionObservation;
  priorityScore: number;
}) {
  const reasons = [
    `${observation.roomType} was assessed as ${observation.condition}.`,
    `${improvement.improvementName} is a ${improvement.confidenceLevel.toLowerCase()}-confidence recommendation for this condition.`,
    `Priority score: ${priorityScore}/100.`,
  ];

  if (observation.photoCount != null) {
    reasons.push(
      `${observation.photoCount} photo${observation.photoCount === 1 ? "" : "s"} supported this room assessment.`,
    );
  }

  if (observation.notes) {
    reasons.push(observation.notes);
  }

  return reasons;
}

export function recommendImprovements({
  limit = 12,
  observations,
}: {
  observations: PropertyConditionObservation[];
  limit?: number;
}): ImprovementRecommendation[] {
  const recommendations = observations.flatMap((observation) => {
    const candidates = IMPROVEMENT_LIBRARY.filter(
      (improvement) =>
        improvement.category === observation.roomType &&
        improvement.targetConditions.includes(observation.condition),
    );

    return candidates.map((improvement) => {
      const score = clampScore(
        improvement.priorityBase * 0.45 +
          conditionWeights[observation.condition] * 0.4 +
          confidenceWeights[improvement.confidenceLevel] +
          issueMatchBoost(improvement, observation.observedIssues),
      );

      return {
        improvement,
        priority: priorityFromScore(score),
        priorityScore: score,
        reasons: buildReasons({
          improvement,
          observation,
          priorityScore: score,
        }),
        sellerTalkingPoints: buildSellerTalkingPoints({
          condition: observation.condition,
          improvement,
          roomType: observation.roomType,
        }),
      };
    });
  });

  return recommendations
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}
