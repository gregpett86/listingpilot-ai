import {
  CONFIDENCE_LEVELS,
  PROPERTY_CONDITIONS,
  ROOM_TYPES,
  type ConfidenceLevel,
  type ImprovementRecommendation,
  type PropertyCondition,
  type PropertyConditionObservation,
  type PropertyReadinessScore,
  type RoomType,
} from "@/lib/property-intelligence";

export type RoomSummaryForSynthesis = {
  roomType: RoomType;
  condition: PropertyCondition;
  strengths: string[];
  improvements: string[];
  confidence: ConfidenceLevel;
  readinessContribution: number;
  photoCount: number;
  visibleFindings: string[];
};

export type WholePropertyCoverage = {
  uploadedPhotoCount: number;
  analyzedRoomCount: number;
  coveredRooms: RoomType[];
  missingRecommendedRooms: RoomType[];
};

export type WholePropertySynthesisRequest = {
  roomSummaries: RoomSummaryForSynthesis[];
  readiness: PropertyReadinessScore;
  coverage: WholePropertyCoverage;
};

export type WholePropertyAnalysis = {
  executiveSummary: string;
  overallCondition: string;
  buyerAppeal: string;
  listingReadinessNarrative: string;
  topSellingFeatures: string[];
  topImprovementPriorities: string[];
  stagingObservations: string[];
  overallConfidence: ConfidenceLevel;
  marketingHighlights: string[];
};

export type WholePropertySynthesisResponse = {
  wholePropertyAnalysis: WholePropertyAnalysis;
  usedFallback: boolean;
};

const sellerSafeFallbacks = {
  executiveSummary:
    "The uploaded photos provide a room-by-room view of the home's visible presentation. The property should be prepared around its strongest photographed spaces, with final seller guidance focused on clearly visible cosmetic opportunities.",
  overallCondition:
    "Visible presentation varies by room based on the current photo set.",
  buyerAppeal:
    "Buyer appeal will depend on how cleanly the strongest spaces photograph and how well visible cosmetic friction is addressed before launch.",
  listingReadinessNarrative:
    "Use the room findings and readiness score as a preparation guide before final listing photography.",
};

function confidenceForPhotoCount(photoCount = 0): ConfidenceLevel {
  if (photoCount >= 4) return "High";
  if (photoCount >= 2) return "Medium";
  return "Low";
}

function compactStrings(values: unknown, limit: number) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function isConfidence(value: unknown): value is ConfidenceLevel {
  return (
    typeof value === "string" &&
    CONFIDENCE_LEVELS.includes(value as ConfidenceLevel)
  );
}

function isPropertyCondition(value: unknown): value is PropertyCondition {
  return (
    typeof value === "string" &&
    PROPERTY_CONDITIONS.includes(value as PropertyCondition)
  );
}

function isRoomType(value: unknown): value is RoomType {
  return typeof value === "string" && ROOM_TYPES.includes(value as RoomType);
}

function topRoomsByCondition(roomSummaries: RoomSummaryForSynthesis[]) {
  const conditionRank: Record<PropertyCondition, number> = {
    Excellent: 5,
    Good: 4,
    Average: 3,
    Dated: 2,
    "Needs Improvement": 1,
  };

  return [...roomSummaries].sort(
    (a, b) => conditionRank[b.condition] - conditionRank[a.condition],
  );
}

function fallbackFeatures(roomSummaries: RoomSummaryForSynthesis[]) {
  const featureRooms = topRoomsByCondition(roomSummaries)
    .filter((summary) => ["Excellent", "Good"].includes(summary.condition))
    .map((summary) => `${summary.roomType} presentation`)
    .slice(0, 5);

  return featureRooms.length > 0
    ? featureRooms
    : ["Clearer photo coverage will help identify the strongest selling features"];
}

function fallbackPriorities(roomSummaries: RoomSummaryForSynthesis[]) {
  const priorities = roomSummaries
    .flatMap((summary) => summary.improvements)
    .slice(0, 5);

  return priorities.length > 0
    ? priorities
    : ["Review visible presentation details before listing photography"];
}

export function buildRoomSummariesForSynthesis({
  observations,
  recommendations,
}: {
  observations: PropertyConditionObservation[];
  recommendations: ImprovementRecommendation[];
}): RoomSummaryForSynthesis[] {
  return observations.map((observation) => {
    const roomRecommendations = recommendations
      .filter(
        (recommendation) =>
          recommendation.improvement.category === observation.roomType,
      )
      .map((recommendation) => recommendation.improvement.improvementName)
      .slice(0, 4);
    const visibleFindings = observation.observedIssues?.slice(0, 8) ?? [];
    const strengths = ["Excellent", "Good"].includes(observation.condition)
      ? [
          `${observation.roomType} appears ${observation.condition.toLowerCase()} in the uploaded photos.`,
        ]
      : [];

    return {
      roomType: observation.roomType,
      condition: observation.condition,
      strengths,
      improvements: roomRecommendations,
      confidence: confidenceForPhotoCount(observation.photoCount),
      readinessContribution:
        observation.condition === "Excellent"
          ? 95
          : observation.condition === "Good"
            ? 82
            : observation.condition === "Average"
              ? 68
              : observation.condition === "Dated"
                ? 48
                : 30,
      photoCount: observation.photoCount ?? 0,
      visibleFindings,
    };
  });
}

export function fallbackWholePropertyAnalysis({
  roomSummaries,
  readiness,
}: WholePropertySynthesisRequest): WholePropertyAnalysis {
  const strongestRooms = fallbackFeatures(roomSummaries);
  const improvementPriorities = fallbackPriorities(roomSummaries);

  return {
    executiveSummary: sellerSafeFallbacks.executiveSummary,
    overallCondition: sellerSafeFallbacks.overallCondition,
    buyerAppeal: sellerSafeFallbacks.buyerAppeal,
    listingReadinessNarrative: `${readiness.status}: ${readiness.summary}`,
    topSellingFeatures: strongestRooms,
    topImprovementPriorities: improvementPriorities,
    stagingObservations: [
      "Keep preparation focused on visible presentation before listing photography.",
      "Confirm the strongest photographed rooms are clean, bright, and uncluttered.",
    ],
    overallConfidence:
      roomSummaries.length >= 5 ? "Medium" : roomSummaries.length > 0 ? "Low" : "Low",
    marketingHighlights: strongestRooms.map((room) => `${room} for listing photos`),
  };
}

export function normalizeWholePropertyAnalysis(
  value: unknown,
  fallback: WholePropertyAnalysis,
): WholePropertyAnalysis | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const executiveSummary =
    typeof candidate.executiveSummary === "string"
      ? candidate.executiveSummary.trim()
      : "";
  const overallCondition =
    typeof candidate.overallCondition === "string"
      ? candidate.overallCondition.trim()
      : "";
  const buyerAppeal =
    typeof candidate.buyerAppeal === "string" ? candidate.buyerAppeal.trim() : "";
  const listingReadinessNarrative =
    typeof candidate.listingReadinessNarrative === "string"
      ? candidate.listingReadinessNarrative.trim()
      : "";
  const overallConfidence = isConfidence(candidate.overallConfidence)
    ? candidate.overallConfidence
    : fallback.overallConfidence;

  if (
    !executiveSummary ||
    !overallCondition ||
    !buyerAppeal ||
    !listingReadinessNarrative
  ) {
    return null;
  }

  return {
    executiveSummary,
    overallCondition,
    buyerAppeal,
    listingReadinessNarrative,
    topSellingFeatures:
      compactStrings(candidate.topSellingFeatures, 5).length > 0
        ? compactStrings(candidate.topSellingFeatures, 5)
        : fallback.topSellingFeatures,
    topImprovementPriorities:
      compactStrings(candidate.topImprovementPriorities, 5).length > 0
        ? compactStrings(candidate.topImprovementPriorities, 5)
        : fallback.topImprovementPriorities,
    stagingObservations:
      compactStrings(candidate.stagingObservations, 5).length > 0
        ? compactStrings(candidate.stagingObservations, 5)
        : fallback.stagingObservations,
    overallConfidence,
    marketingHighlights:
      compactStrings(candidate.marketingHighlights, 6).length > 0
        ? compactStrings(candidate.marketingHighlights, 6)
        : fallback.marketingHighlights,
  };
}

export function validateWholePropertySynthesisRequest(
  body: unknown,
): WholePropertySynthesisRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as Partial<WholePropertySynthesisRequest>;
  const roomSummaries = Array.isArray(candidate.roomSummaries)
    ? candidate.roomSummaries.flatMap((summary) => {
        if (!summary || typeof summary !== "object") {
          return [];
        }

        const roomSummary = summary as Partial<RoomSummaryForSynthesis>;

        if (
          !isRoomType(roomSummary.roomType) ||
          !isPropertyCondition(roomSummary.condition) ||
          !isConfidence(roomSummary.confidence)
        ) {
          return [];
        }

        return [
          {
            roomType: roomSummary.roomType,
            condition: roomSummary.condition,
            strengths: compactStrings(roomSummary.strengths, 5),
            improvements: compactStrings(roomSummary.improvements, 5),
            confidence: roomSummary.confidence,
            readinessContribution:
              typeof roomSummary.readinessContribution === "number"
                ? Math.max(0, Math.min(100, roomSummary.readinessContribution))
                : 0,
            photoCount:
              typeof roomSummary.photoCount === "number"
                ? Math.max(0, Math.round(roomSummary.photoCount))
                : 0,
            visibleFindings: compactStrings(roomSummary.visibleFindings, 8),
          },
        ];
      })
    : [];

  const readiness = candidate.readiness;
  const coverage = candidate.coverage;

  if (
    roomSummaries.length === 0 ||
    !readiness ||
    typeof readiness !== "object" ||
    typeof readiness.score !== "number" ||
    typeof readiness.status !== "string" ||
    typeof readiness.summary !== "string" ||
    !coverage ||
    typeof coverage !== "object"
  ) {
    return null;
  }

  return {
    roomSummaries,
    readiness,
    coverage: {
      uploadedPhotoCount:
        typeof coverage.uploadedPhotoCount === "number"
          ? Math.max(0, Math.round(coverage.uploadedPhotoCount))
          : 0,
      analyzedRoomCount:
        typeof coverage.analyzedRoomCount === "number"
          ? Math.max(0, Math.round(coverage.analyzedRoomCount))
          : roomSummaries.length,
      coveredRooms: Array.isArray(coverage.coveredRooms)
        ? coverage.coveredRooms.filter(isRoomType)
        : roomSummaries.map((summary) => summary.roomType),
      missingRecommendedRooms: Array.isArray(coverage.missingRecommendedRooms)
        ? coverage.missingRecommendedRooms.filter(isRoomType)
        : [],
    },
  };
}
