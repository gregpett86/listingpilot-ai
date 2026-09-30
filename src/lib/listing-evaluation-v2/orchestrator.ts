import { SPECIALIST_BY_CATEGORY, type SpaceAgentInput, type SpecialistAgentKind } from "./agent-contracts";
import type { ListingEvaluationV2, PropertySpace } from "./types";

export type SpaceAnalysisJob = {
  id: string;
  specialist: SpecialistAgentKind;
  input: SpaceAgentInput;
};

export function buildSpaceAnalysisJobs(
  evaluation: ListingEvaluationV2,
  photoDataById: Map<string, string>,
): SpaceAnalysisJob[] {
  return evaluation.spaces.flatMap((space) => {
    if (space.status === "not_evaluated") return [];

    const photos = space.photoIds.flatMap((photoId) => {
      const dataUrl = photoDataById.get(photoId);
      return dataUrl ? [{ id: photoId, dataUrl }] : [];
    });

    if (photos.length === 0) return [];

    return [
      {
        id: `${evaluation.id}:${space.id}`,
        specialist: SPECIALIST_BY_CATEGORY[space.category],
        input: {
          evaluationId: evaluation.id,
          spaceId: space.id,
          category: space.category,
          displayName: space.customLabel?.trim() || space.defaultLabel,
          photos,
          propertyContext: {
            propertyType: evaluation.property.propertyType,
            yearBuilt: evaluation.property.yearBuilt,
          },
        },
      },
    ];
  });
}

export function spaceCanBeCompleted(space: PropertySpace) {
  return space.status === "not_evaluated" || space.photoIds.length > 0;
}
