import {
  buildReadinessSummary,
  type Improvement,
  type PropertyDetails,
  type ReadinessSummary,
  type UploadedPhoto,
} from "../listing-readiness/report-data";

export type ListingEvaluationReportData = {
  id: string;
  property: PropertyDetails;
  photos: UploadedPhoto[];
  recommendations: Improvement[];
  selectedRecommendationIds: number[];
  summary: ReadinessSummary;
};

export function createListingEvaluationReportData({
  id,
  photos,
  property,
  recommendations,
  selectedRecommendationIds,
}: {
  id: string;
  photos: UploadedPhoto[];
  property: PropertyDetails;
  recommendations: Improvement[];
  selectedRecommendationIds?: number[];
}): ListingEvaluationReportData {
  const selectedIds =
    selectedRecommendationIds ?? recommendations.map((recommendation) => recommendation.id);

  return {
    id,
    photos,
    property,
    recommendations,
    selectedRecommendationIds: selectedIds,
    summary: buildReadinessSummary(selectedIds, photos, property, {
      recommendations,
    }),
  };
}

export function updateListingEvaluationSelection(
  reportData: ListingEvaluationReportData,
  selectedRecommendationIds: number[],
) {
  return createListingEvaluationReportData({
    id: reportData.id,
    photos: reportData.photos,
    property: reportData.property,
    recommendations: reportData.recommendations,
    selectedRecommendationIds,
  });
}
