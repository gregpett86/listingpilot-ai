import { describe, expect, it } from "vitest";
import {
  buildReadinessSummary,
  calculateReadiness,
  chooseCoverPhoto,
  chooseInteriorPhoto,
  isUsableImageDataUrl,
  inferRoomFromFilename,
  improvements,
  type UploadedPhoto,
} from "./report-data";

const validPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function photo(id: string, roomLabel: UploadedPhoto["roomLabel"]): UploadedPhoto {
  return {
    id,
    name: `${id}.jpg`,
    dataUrl: validPngDataUrl,
    roomLabel,
  };
}

describe("listing readiness report data", () => {
  it("calculates current and potential scores from selected recommendations", () => {
    const firstTwo = improvements.slice(0, 2).map((item) => item.id);
    const result = calculateReadiness(firstTwo);

    expect(result.currentScore).toBe(74);
    expect(result.potentialScore).toBe(92);
    expect(result.selectedRecommendations.map((item) => item.title)).toEqual([
      "Fresh Interior Paint",
      "Upgrade Light Fixtures",
    ]);
  });

  it("updates score when a selected recommendation is removed", () => {
    const allSelected = calculateReadiness(improvements.map((item) => item.id));
    const withoutPaint = calculateReadiness(
      improvements.filter((item) => item.title !== "Fresh Interior Paint").map((item) => item.id),
    );

    expect(allSelected.currentScore - withoutPaint.currentScore).toBe(8);
  });

  it("prioritizes exterior photos for the cover and interior photos for the summary", () => {
    const photos = [
      photo("kitchen", "Kitchen"),
      photo("front", "Exterior"),
      photo("living", "Living Room"),
    ];

    expect(chooseCoverPhoto(photos)?.id).toBe("front");
    expect(chooseInteriorPhoto(photos)?.id).toBe("kitchen");
  });

  it("honors an explicitly selected cover photo", () => {
    const selectedCover = photo("living", "Living Room");
    const photos = [
      photo("front", "Exterior"),
      { ...selectedCover, isCoverPreferred: true },
      photo("kitchen", "Kitchen"),
    ];

    expect(chooseCoverPhoto(photos)?.id).toBe("living");
  });

  it("uses a photo labeled Cover before exterior fallback", () => {
    const photos = [
      photo("front", "Exterior"),
      photo("manual-cover", "Cover"),
      photo("kitchen", "Kitchen"),
    ];

    expect(chooseCoverPhoto(photos)?.id).toBe("manual-cover");
  });

  it("uses exterior as the cover when no explicit cover is designated", () => {
    const photos = [
      photo("kitchen", "Kitchen"),
      photo("front", "Exterior"),
      photo("back", "Backyard"),
    ];

    expect(chooseCoverPhoto(photos)?.id).toBe("front");
  });

  it("falls back to the first valid uploaded image when no cover or exterior exists", () => {
    const photos = [
      photo("living", "Living Room"),
      photo("kitchen", "Kitchen"),
    ];

    expect(chooseCoverPhoto(photos)?.id).toBe("living");
  });

  it("uses backyard or rear exterior before the first uploaded fallback", () => {
    const photos = [
      photo("living", "Living Room"),
      photo("back", "Backyard"),
      photo("kitchen", "Kitchen"),
    ];

    expect(chooseCoverPhoto(photos)?.id).toBe("back");
  });

  it("ignores unusable uploaded image data for cover selection", () => {
    const photos = [
      { ...photo("broken", "Exterior"), dataUrl: "data:text/plain;base64,broken" },
      photo("living", "Living Room"),
    ];

    expect(isUsableImageDataUrl(photos[0].dataUrl)).toBe(false);
    expect(chooseCoverPhoto(photos)?.id).toBe("living");
  });

  it("infers room labels from filenames", () => {
    expect(inferRoomFromFilename("front-exterior-01.jpg")).toBe("Exterior");
    expect(inferRoomFromFilename("bright-kitchen-island.jpg")).toBe("Kitchen");
    expect(inferRoomFromFilename("primary-bath-vanity.jpg")).toBe("Primary Bathroom");
    expect(inferRoomFromFilename("unknown-angle.jpg")).toBe("Other");
  });

  it("builds PDF-ready room overviews with missing-photo placeholders", () => {
    const summary = buildReadinessSummary(
      improvements.map((item) => item.id),
      [photo("front", "Exterior"), photo("kitchen", "Kitchen")],
    );

    expect(summary.coverPhoto?.id).toBe("front");
    expect(summary.photos).toHaveLength(2);
    expect(summary.photos[0]?.dataUrl).toBe(validPngDataUrl);
    expect(summary.executivePhoto?.id).toBe("kitchen");
    expect(summary.marketingPhoto?.id).toBe("kitchen");
    expect(summary.roomOverviews.find((room) => room.room === "Kitchen")?.photo?.id).toBe(
      "kitchen",
    );
    expect(summary.roomOverviews.find((room) => room.room === "Primary Bathroom")?.photo).toBeUndefined();
  });

  it("uses only selected recommendations in the report summary", () => {
    const kitchen = improvements.find((item) => item.room === "Kitchen");
    expect(kitchen).toBeDefined();

    const summary = buildReadinessSummary(kitchen ? [kitchen.id] : [], [
      photo("kitchen", "Kitchen"),
    ]);

    expect(summary.selectedRecommendations).toHaveLength(1);
    expect(summary.selectedRecommendations[0]?.room).toBe("Kitchen");
    expect(summary.selectedPoints).toBe(kitchen?.points);
  });
});
