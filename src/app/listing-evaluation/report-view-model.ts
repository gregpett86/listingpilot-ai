import {
  buildReadinessSummary,
  type Improvement,
  type PropertyDetails,
  type ReadinessSummary,
  type UploadedPhoto,
} from "../listing-readiness/report-data";

export type ListingEvaluationReportData = {
  id: string;
  createdAt: string;
  property: PropertyDetails;
  photos: UploadedPhoto[];
  recommendations: Improvement[];
  selectedRecommendationIds: number[];
  status: ListingEvaluationReportStatus;
  summary: ReadinessSummary;
  updatedAt: string;
};

export type ListingEvaluationReportStatus =
  | "Draft"
  | "Analyzing"
  | "Ready"
  | "Needs Review";

export function createListingEvaluationReportData({
  createdAt,
  id,
  photos,
  property,
  recommendations,
  selectedRecommendationIds,
  status,
  updatedAt,
}: {
  createdAt?: string;
  id: string;
  photos: UploadedPhoto[];
  property: PropertyDetails;
  recommendations: Improvement[];
  selectedRecommendationIds?: number[];
  status?: ListingEvaluationReportStatus;
  updatedAt?: string;
}): ListingEvaluationReportData {
  const selectedIds =
    selectedRecommendationIds ?? recommendations.map((recommendation) => recommendation.id);
  const timestamp = new Date().toISOString();

  return {
    createdAt: createdAt ?? timestamp,
    id,
    photos,
    property,
    recommendations,
    selectedRecommendationIds: selectedIds,
    status:
      status ??
      (photos.some((photo) => photo.analysisStatus === "needs_review")
        ? "Needs Review"
        : "Ready"),
    summary: buildReadinessSummary(selectedIds, photos, property, {
      recommendations,
    }),
    updatedAt: updatedAt ?? timestamp,
  };
}

export function updateListingEvaluationSelection(
  reportData: ListingEvaluationReportData,
  selectedRecommendationIds: number[],
) {
  return createListingEvaluationReportData({
    createdAt: reportData.createdAt,
    id: reportData.id,
    photos: reportData.photos,
    property: reportData.property,
    recommendations: reportData.recommendations,
    selectedRecommendationIds,
    status: reportData.status,
  });
}
