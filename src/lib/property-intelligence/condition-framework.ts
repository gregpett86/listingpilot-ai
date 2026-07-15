import {
  PROPERTY_CONDITIONS,
  PropertyCondition,
  PropertyConditionObservation,
  RoomType,
} from "./types";

const conditionScores: Record<PropertyCondition, number> = {
  Excellent: 95,
  Good: 78,
  Average: 58,
  Dated: 38,
  "Needs Improvement": 18,
};

export function conditionToScore(condition: PropertyCondition) {
  return conditionScores[condition];
}

export function scoreToCondition(score: number): PropertyCondition {
  if (score >= 88) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  if (score >= 30) return "Dated";
  return "Needs Improvement";
}

export function isSupportedPropertyCondition(
  value: string,
): value is PropertyCondition {
  return PROPERTY_CONDITIONS.includes(value as PropertyCondition);
}

export function createConditionObservation({
  condition,
  notes,
  observedIssues,
  photoCount,
  roomType,
}: {
  roomType: RoomType;
  condition: PropertyCondition;
  notes?: string;
  photoCount?: number;
  observedIssues?: string[];
}): PropertyConditionObservation {
  return {
    roomType,
    condition,
    notes,
    photoCount,
    observedIssues: observedIssues ?? [],
  };
}
