import { describe, expect, it } from "vitest";
import {
  createListingEvaluationReportData,
  updateListingEvaluationSelection,
} from "./report-view-model";
import {
  buildPhotoBackedRecommendations,
  defaultProperty,
  type UploadedPhoto,
} from "../listing-readiness/report-data";

const validPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function analyzedPhoto(
  id: string,
  roomLabel: UploadedPhoto["roomLabel"],
  visibleFindings: string[],
): UploadedPhoto {
  return {
    analysisStatus: "complete",
    classificationMode: "ai",
    condition: "Average",
    confidence: 0.92,
    dataUrl: validPngDataUrl,
    detectedRoomLabel: roomLabel,
    id,
    includedInReport: true,
    name: `${id}.png`,
    roomLabel,
    visibleFindings,
  };
}

describe("ListingEvaluationReportData", () => {
  it("uses one shared report data object for online report and PDF inputs", () => {
    const photos = [
      { ...analyzedPhoto("front", "Cover", []), isCoverPreferred: true },
      analyzedPhoto("kitchen", "Kitchen", ["clutter on kitchen counters"]),
    ];
    const recommendations = buildPhotoBackedRecommendations(photos);
    const reportData = createListingEvaluationReportData({
      id: "evaluation-1",
      photos,
      property: defaultProperty,
      recommendations,
    });

    expect(reportData.summary.propertyHeroPhoto.photo?.id).toBe("front");
    expect(reportData.summary.selectedRecommendations[0]?.sourcePhoto?.id).toBe("kitchen");
    expect(reportData.summary.roomOverviews.every((room) => room.room !== "Unknown")).toBe(true);
  });

  it("updates include/exclude state for both online report and PDF summary", () => {
    const photos = [
      analyzedPhoto("kitchen", "Kitchen", ["clutter on kitchen counters"]),
      analyzedPhoto("bath", "Bathroom", ["items crowd the vanity counter"]),
    ];
    const recommendations = buildPhotoBackedRecommendations(photos);
    const reportData = createListingEvaluationReportData({
      id: "evaluation-2",
      photos,
      property: defaultProperty,
      recommendations,
    });
    const excluded = recommendations[0]?.id;
    const updated = updateListingEvaluationSelection(
      reportData,
      reportData.selectedRecommendationIds.filter((id) => id !== excluded),
    );

    expect(updated.summary.selectedRecommendations.map((item) => item.id)).not.toContain(excluded);
    expect(updated.summary.currentScore).toBeLessThanOrEqual(reportData.summary.currentScore);
  });
});
