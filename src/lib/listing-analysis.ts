import {
  createConditionObservation,
  ROOM_TYPES,
  conditionToScore,
  type ConfidenceLevel,
  type ImprovementRecommendation,
  type PropertyCondition,
  type PropertyConditionObservation,
  type RoomType,
} from "@/lib/property-intelligence";
import type {
  PhotoAnalysisFailure,
  VisionFinding,
} from "@/lib/analysis-schema";

type PhotoForValidation = {
  id: string;
  name: string;
  url: string;
  area: RoomType;
  analysisFailure?: PhotoAnalysisFailure;
};

export type RealPhotoValidationRow = {
  photoId: string;
  photoName: string;
  previewUrl: string;
  assignedRoom: RoomType;
  visionRoom?: RoomType;
  categoryMatchStatus: "Match" | "Mismatch" | "No result";
  condition?: PropertyCondition;
  confidence?: ConfidenceLevel;
  visibleFindings: string[];
  supportedRecommendations: string[];
  selectedRecommendation?: string;
  readinessContribution?: number;
  failure?: string;
};

const conditionSeverity: Record<PropertyCondition, number> = {
  Excellent: 1,
  Good: 2,
  Average: 3,
  Dated: 4,
  "Needs Improvement": 5,
};

function strongestCondition(findings: VisionFinding[]): PropertyCondition {
  return findings.reduce<PropertyCondition>(
    (selectedCondition, finding) =>
      conditionSeverity[finding.condition] > conditionSeverity[selectedCondition]
        ? finding.condition
        : selectedCondition,
    "Excellent",
  );
}

function normalizeFindingText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeVisibleFindings(findings: string[]) {
  const uniqueFindings = new Map<string, string>();

  findings.forEach((finding) => {
    const normalized = normalizeFindingText(finding);

    if (normalized && !uniqueFindings.has(normalized)) {
      uniqueFindings.set(normalized, finding.trim());
    }
  });

  return Array.from(uniqueFindings.values());
}

function hasConfirmedFinding(finding: VisionFinding) {
  return (
    !finding.categoryMismatch &&
    finding.confidence !== "Low" &&
    finding.visibleFindings.length > 0
  );
}

export function buildRoomObservations(
  visionFindings: VisionFinding[],
): PropertyConditionObservation[] {
  return ROOM_TYPES.flatMap((roomType) => {
    const roomFindings = visionFindings.filter(
      (finding) =>
        finding.assignedCategory === roomType && hasConfirmedFinding(finding),
    );

    if (roomFindings.length === 0) {
      return [];
    }

    const observedIssues = dedupeVisibleFindings(
      roomFindings.flatMap((finding) => finding.visibleFindings),
    );
    const condition = strongestCondition(roomFindings);

    return [
      createConditionObservation({
        roomType,
        condition,
        photoCount: roomFindings.length,
        observedIssues,
        notes: `${roomFindings.length} uploaded photo${
          roomFindings.length === 1 ? "" : "s"
        } represented this room/category. ${
          observedIssues.length
            ? `Visible findings: ${observedIssues.join(", ")}.`
            : "No specific visible findings were returned."
        }`,
      }),
    ];
  });
}

export function buildRealPhotoValidationRows({
  observations,
  photos,
  recommendations,
  visionFindings,
}: {
  observations: PropertyConditionObservation[];
  photos: PhotoForValidation[];
  recommendations: ImprovementRecommendation[];
  visionFindings: VisionFinding[];
}): RealPhotoValidationRow[] {
  const findingByPhotoId = new Map(
    visionFindings.map((finding) => [finding.photoId, finding]),
  );
  const observationByRoom = new Map(
    observations.map((observation) => [observation.roomType, observation]),
  );
  const recommendationByRoom = new Map<RoomType, ImprovementRecommendation>();

  recommendations.forEach((recommendation) => {
    const roomType = recommendation.improvement.category;

    if (!recommendationByRoom.has(roomType)) {
      recommendationByRoom.set(roomType, recommendation);
    }
  });

  return photos.map((photo) => {
    const finding = findingByPhotoId.get(photo.id);
    const observation = observationByRoom.get(photo.area);
    const recommendation = finding?.categoryMismatch
      ? undefined
      : recommendationByRoom.get(photo.area);
    const categoryMatchStatus = finding
      ? finding.categoryMismatch
        ? "Mismatch"
        : "Match"
      : "No result";

    return {
      photoId: photo.id,
      photoName: photo.name,
      previewUrl: photo.url,
      assignedRoom: photo.area,
      visionRoom: finding?.suggestedCategory,
      categoryMatchStatus,
      condition: finding?.condition,
      confidence: finding?.confidence,
      visibleFindings: dedupeVisibleFindings(finding?.visibleFindings ?? []),
      supportedRecommendations: dedupeVisibleFindings(
        finding?.explicitlySupportedRecommendations ?? [],
      ),
      selectedRecommendation: recommendation?.improvement.improvementName,
      readinessContribution:
        finding && hasConfirmedFinding(finding) && observation
        ? conditionToScore(observation.condition)
        : undefined,
      failure: photo.analysisFailure?.message,
    };
  });
}
