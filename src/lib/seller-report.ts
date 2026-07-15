import type {
  ConfidenceLevel,
  ImprovementRecommendation,
  PropertyCondition,
  PropertyReadinessScore,
  RecommendationPriority,
  RoomType,
} from "@/lib/property-intelligence";
import type {
  RoomSummaryForSynthesis,
  WholePropertyAnalysis,
} from "@/lib/whole-property-synthesis";

export type EffortLevel =
  | "Quick Win"
  | "Weekend Project"
  | "Professional Upgrade";

export type ChecklistGroup =
  | "Before Professional Photos"
  | "Before Showings"
  | "Optional Enhancements";

export type SellerReadinessPresentation = {
  score: number;
  label: string;
  confidence: ConfidenceLevel;
  narrative: string;
};

export type SellerPreparationItem = {
  id: string;
  task: string;
  room: RoomType;
  effortLevel: EffortLevel;
  estimatedTime: string;
  priority: RecommendationPriority;
  reason: string;
  group: ChecklistGroup;
};

export type SellerRoomSummary = {
  room: RoomType;
  overallCondition: PropertyCondition;
  confidence: ConfidenceLevel;
  strongestSellingFeature: string;
  topPreparationRecommendation: string;
  shortSummary: string;
};

export const limitationsNote =
  "This assessment is based only on visible presentation in the uploaded photos. It is not a home inspection and does not evaluate hidden defects or mechanical systems. Recommendations should be reviewed by the agent and homeowner before final listing preparation.";

const quickWinTerms = [
  "clean",
  "declutter",
  "organize",
  "hardware",
  "lighting",
  "counter",
  "surface",
  "staging",
];

const professionalTerms = [
  "floor",
  "carpet",
  "paint",
  "repair",
  "fixture",
  "pool",
  "landscap",
  "mulch",
  "shrub",
];

function normalizedText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function readinessLabelForScore(score: number) {
  if (score >= 90) return "Listing Ready";
  if (score >= 80) return "Minor Preparation Recommended";
  if (score >= 70) return "Good Opportunity";
  if (score >= 60) return "Preparation Recommended";
  return "Significant Preparation Opportunity";
}

export function effortLevelForRecommendation(
  recommendation: ImprovementRecommendation,
): EffortLevel {
  const searchable = normalizedText(
    [
      recommendation.improvement.improvementName,
      recommendation.improvement.description,
      recommendation.improvement.category,
    ].join(" "),
  );

  if (containsAny(searchable, quickWinTerms)) {
    return "Quick Win";
  }

  if (
    recommendation.priority === "High" ||
    containsAny(searchable, professionalTerms)
  ) {
    return "Professional Upgrade";
  }

  return "Weekend Project";
}

export function estimatedTimeForEffort(effortLevel: EffortLevel) {
  switch (effortLevel) {
    case "Quick Win":
      return "Under 1 hour";
    case "Weekend Project":
      return "Half day to one weekend";
    case "Professional Upgrade":
      return "Schedule with a professional";
  }
}

export function buildSellerFriendlyReason(
  recommendation: ImprovementRecommendation,
) {
  const room = recommendation.improvement.category.toLowerCase();

  if (recommendation.priority === "High") {
    return `This visible ${room} prep item is likely to influence the first impression in photos and showings.`;
  }

  if (recommendation.priority === "Medium") {
    return `This can help the ${room} feel more polished without changing the home's fundamentals.`;
  }

  return `This is a light presentation detail that may help the ${room} feel more ready for buyers.`;
}

function checklistGroupForItem({
  effortLevel,
  priority,
}: {
  effortLevel: EffortLevel;
  priority: RecommendationPriority;
}): ChecklistGroup {
  if (priority === "High") return "Before Professional Photos";
  if (priority === "Low" || effortLevel === "Quick Win") {
    return "Optional Enhancements";
  }
  return "Before Showings";
}

export function buildPreparationItems(
  recommendations: ImprovementRecommendation[],
): SellerPreparationItem[] {
  const seen = new Set<string>();

  return recommendations.flatMap((recommendation) => {
    const task = recommendation.improvement.improvementName.trim();
    const room = recommendation.improvement.category;
    const dedupeKey = `${room}:${normalizedText(task)}`;

    if (!task || seen.has(dedupeKey)) {
      return [];
    }

    seen.add(dedupeKey);
    const effortLevel = effortLevelForRecommendation(recommendation);

    return [
      {
        id: recommendation.improvement.id,
        task,
        room,
        effortLevel,
        estimatedTime: estimatedTimeForEffort(effortLevel),
        priority: recommendation.priority,
        reason: buildSellerFriendlyReason(recommendation),
        group: checklistGroupForItem({
          effortLevel,
          priority: recommendation.priority,
        }),
      },
    ];
  });
}

export function buildSellerChecklist({
  recommendations,
  synthesis,
}: {
  recommendations: ImprovementRecommendation[];
  synthesis: WholePropertyAnalysis;
}) {
  const topPriorityText = new Set(
    synthesis.topImprovementPriorities.map(normalizedText),
  );

  return buildPreparationItems(recommendations)
    .sort((a, b) => {
      const aSynth = topPriorityText.has(normalizedText(a.task)) ? 1 : 0;
      const bSynth = topPriorityText.has(normalizedText(b.task)) ? 1 : 0;

      if (aSynth !== bSynth) return bSynth - aSynth;

      const priorityWeight: Record<RecommendationPriority, number> = {
        High: 3,
        Medium: 2,
        Low: 1,
      };

      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })
    .slice(0, 8);
}

export function buildReadinessPresentation({
  confidence,
  readinessScore,
  synthesis,
}: {
  confidence: ConfidenceLevel;
  readinessScore: PropertyReadinessScore;
  synthesis: WholePropertyAnalysis;
}): SellerReadinessPresentation {
  return {
    score: readinessScore.score,
    label: readinessLabelForScore(readinessScore.score),
    confidence,
    narrative: synthesis.listingReadinessNarrative,
  };
}

export function buildSellerRoomSummaries({
  preparationItems,
  roomSummaries,
}: {
  preparationItems: SellerPreparationItem[];
  roomSummaries: RoomSummaryForSynthesis[];
}): SellerRoomSummary[] {
  return roomSummaries.map((summary) => {
    const roomPrepItem = preparationItems.find(
      (item) => item.room === summary.roomType,
    );
    const strongestSellingFeature =
      summary.strengths[0] ??
      (summary.condition === "Excellent" || summary.condition === "Good"
        ? `${summary.roomType} shows well in the uploaded photos.`
        : "Further agent review can identify the strongest presentation angle.");
    const topPreparationRecommendation =
      roomPrepItem?.task ??
      summary.improvements[0] ??
      "No major preparation item selected";

    return {
      room: summary.roomType,
      overallCondition: summary.condition,
      confidence: summary.confidence,
      strongestSellingFeature,
      topPreparationRecommendation,
      shortSummary: `${summary.roomType} is currently presented as ${summary.condition.toLowerCase()} with ${summary.confidence.toLowerCase()} confidence based on the uploaded photos.`,
    };
  });
}

export function groupChecklistItems(items: SellerPreparationItem[]) {
  const groups: Record<ChecklistGroup, SellerPreparationItem[]> = {
    "Before Professional Photos": [],
    "Before Showings": [],
    "Optional Enhancements": [],
  };

  items.forEach((item) => {
    groups[item.group].push(item);
  });

  return groups;
}
