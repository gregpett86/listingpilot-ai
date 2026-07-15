import { conditionToScore } from "./condition-framework";
import {
  ImprovementRecommendation,
  PropertyConditionObservation,
  PropertyReadinessScore,
  PropertyReadinessStatus,
} from "./types";

function readinessStatus(score: number): PropertyReadinessStatus {
  if (score >= 85) return "Listing Ready";
  if (score >= 68) return "Minor Improvements Recommended";
  if (score >= 45) return "Significant Opportunity";
  return "Needs Review";
}

function readinessSummary(status: PropertyReadinessStatus) {
  switch (status) {
    case "Listing Ready":
      return "The property appears close to listing-ready based on the current observations.";
    case "Minor Improvements Recommended":
      return "The property should show well after targeted cosmetic or presentation improvements.";
    case "Significant Opportunity":
      return "The property has meaningful upside if high-priority visual issues are addressed before launch.";
    case "Needs Review":
      return "The property needs closer review before a confident listing preparation plan is finalized.";
  }
}

export function calculatePropertyReadinessScore({
  observations,
  recommendations,
}: {
  observations: PropertyConditionObservation[];
  recommendations: ImprovementRecommendation[];
}): PropertyReadinessScore {
  const observationScore =
    observations.length > 0
      ? observations.reduce(
          (sum, observation) => sum + conditionToScore(observation.condition),
          0,
        ) / observations.length
      : 0;

  const highPriorityCount = recommendations.filter(
    (recommendation) => recommendation.priority === "High",
  ).length;
  const mediumPriorityCount = recommendations.filter(
    (recommendation) => recommendation.priority === "Medium",
  ).length;
  const lowPriorityCount = recommendations.filter(
    (recommendation) => recommendation.priority === "Low",
  ).length;

  const recommendationPenalty =
    highPriorityCount * 6 + mediumPriorityCount * 3 + lowPriorityCount;

  const score = Math.max(
    0,
    Math.min(100, Math.round(observationScore - recommendationPenalty)),
  );
  const status = readinessStatus(score);

  return {
    score,
    status,
    summary: readinessSummary(status),
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
  };
}
