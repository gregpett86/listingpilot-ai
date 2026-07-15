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
  return hasIssueTextMatch(improvement, observedIssues)
    ? 8
    : 0;
}

function searchableImprovementText(improvement: ImprovementRecord) {
  return [
    improvement.improvementName,
    improvement.description,
    ...improvement.sellerTalkingPoints,
  ]
    .join(" ")
    .toLowerCase();
}

function hasIssueTextMatch(
  improvement: ImprovementRecord,
  observedIssues: string[] = [],
) {
  const searchable = searchableImprovementText(improvement);
  const stopWords = new Set([
    "area",
    "clear",
    "issue",
    "photo",
    "property",
    "visible",
    "with",
  ]);

  return observedIssues.some((issue) => {
    const normalizedIssue = issue.trim().toLowerCase();
    const issueTokens = normalizedIssue
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !stopWords.has(token));

    return (
      normalizedIssue.length > 0 &&
      (searchable.includes(normalizedIssue) ||
        issueTokens.some((token) => searchable.includes(token)))
    );
  });
}

function observedText(observedIssues: string[] = []) {
  return observedIssues.join(" ").toLowerCase();
}

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isPhotoSupportedRecommendation({
  improvement,
  observation,
}: {
  improvement: ImprovementRecord;
  observation: PropertyConditionObservation;
}) {
  const issues = observation.observedIssues ?? [];

  if (issues.length === 0) {
    return false;
  }

  const name = improvement.improvementName.toLowerCase();
  const evidence = observedText(issues);

  if (name.includes("odor")) {
    return false;
  }

  if (name.includes("moisture") || name.includes("dehumidifier")) {
    return containsAny(evidence, [
      "stain",
      "standing water",
      "leak",
      "damp",
      "wet",
      "mold",
      "mildew",
      "discoloration",
      "moisture",
    ]);
  }

  if (name.includes("floor")) {
    return containsAny(evidence, [
      "floor",
      "flooring",
      "carpet",
      "tile",
      "hardwood",
      "stain",
      "scratch",
      "debris",
      "damage",
      "deteriorat",
      "wear",
      "worn",
    ]);
  }

  if (name.includes("declutter") || name.includes("organize")) {
    return containsAny(evidence, [
      "clutter",
      "crowded",
      "storage",
      "boxes",
      "excess",
      "mess",
      "debris",
    ]);
  }

  if (name.includes("paint")) {
    return containsAny(evidence, [
      "paint",
      "wall",
      "scuff",
      "mark",
      "damage",
      "dated",
      "chip",
      "peel",
      "worn",
      "faded",
    ]);
  }

  if (
    improvement.category === "Pool" ||
    name.includes("pool") ||
    name.includes("water clarity")
  ) {
    return containsAny(evidence, [
      "pool",
      "water",
      "cloudy",
      "clarity",
      "surface",
      "coping",
      "deck",
      "tile",
      "furniture",
      "equipment",
      "stain",
      "crack",
      "clutter",
    ]);
  }

  if (
    improvement.category === "Landscaping" ||
    name.includes("landscap") ||
    name.includes("mulch") ||
    name.includes("shrub") ||
    name.includes("lawn") ||
    name.includes("weed") ||
    name.includes("edging")
  ) {
    return containsAny(evidence, [
      "overgrown",
      "debris",
      "dead",
      "weed",
      "edging",
      "mulch",
      "shrub",
      "lawn",
      "vegetation",
      "plant",
      "thin",
      "dry patch",
    ]);
  }

  return hasIssueTextMatch(improvement, issues);
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
        improvement.targetConditions.includes(observation.condition) &&
        isPhotoSupportedRecommendation({ improvement, observation }),
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
