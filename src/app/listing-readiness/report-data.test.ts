import { describe, expect, it } from "vitest";
import {
  buildReadinessSummary,
  buildPhotoBackedRecommendations,
  calculatePhotoCoverage,
  calculateReadiness,
  chooseCoverPhoto,
  chooseBestRoomPhoto,
  chooseInteriorPhoto,
  groupRoomPhotos,
  resolvePropertyHeroPhoto,
  isUsableImageDataUrl,
  inferRoomFromFilename,
  improvements,
  defaultProperty,
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

function landscapePhoto(id: string, roomLabel: UploadedPhoto["roomLabel"]): UploadedPhoto {
  return {
    ...photo(id, roomLabel),
    height: 900,
    width: 1600,
  };
}

function analyzedPhoto(
  id: string,
  roomLabel: UploadedPhoto["roomLabel"],
  visibleFindings: string[],
): UploadedPhoto {
  return {
    ...photo(id, roomLabel),
    analysisStatus: "complete",
    classificationMode: "ai",
    condition: "Average",
    confidence: 0.92,
    detectedRoomLabel: roomLabel,
    visibleFindings,
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

  it("uses an agent-labeled Cover before exterior fallback", () => {
    const photos = [
      photo("front", "Exterior"),
      photo("manual-cover", "Cover"),
      photo("kitchen", "Kitchen"),
    ];

    expect(chooseCoverPhoto(photos)?.id).toBe("manual-cover");
    expect(resolvePropertyHeroPhoto(photos).source).toBe("uploaded_agent_selected");
  });

  it("selects an uploaded front exterior as the property hero", () => {
    const photos = [
      photo("kitchen", "Kitchen"),
      landscapePhoto("front-elevation-driveway", "Exterior"),
      photo("back", "Backyard"),
    ];

    const hero = resolvePropertyHeroPhoto(photos);

    expect(hero.photo?.id).toBe("front-elevation-driveway");
    expect(hero.roomClassification).toBe("front_exterior");
    expect(hero.source).toBe("uploaded_ai_selected");
  });

  it("selects the best front exterior when multiple exterior photos exist", () => {
    const photos = [
      { ...landscapePhoto("side-exterior", "Exterior"), name: "side-exterior.jpg" },
      { ...landscapePhoto("front-full-house-driveway", "Exterior"), name: "front-full-house-driveway.jpg" },
      { ...photo("front-portrait", "Exterior"), height: 1600, width: 900 },
    ];

    expect(resolvePropertyHeroPhoto(photos).photo?.id).toBe("front-full-house-driveway");
  });

  it("prefers exterior over interior for the hero", () => {
    const photos = [
      photo("living", "Living Room"),
      landscapePhoto("front", "Exterior"),
      photo("kitchen", "Kitchen"),
    ];

    expect(resolvePropertyHeroPhoto(photos).photo?.id).toBe("front");
  });

  it("requests address lookup fallback when no uploaded exterior exists", () => {
    const photos = [
      photo("living", "Living Room"),
      photo("kitchen", "Kitchen"),
    ];
    const streetViewPhoto = landscapePhoto("street-view", "Exterior");
    const hero = resolvePropertyHeroPhoto(photos, {
      photo: streetViewPhoto,
      providerName: "Street View Provider",
      source: "street_view",
    });

    expect(hero.lookupRequested).toBe(true);
    expect(hero.photo?.id).toBe("street-view");
    expect(hero.source).toBe("street_view");
  });

  it("marks the hero unavailable when lookup fails and no exterior exists", () => {
    const hero = resolvePropertyHeroPhoto([photo("living", "Living Room")], {
      error: "Provider credentials are not configured.",
      providerName: "Street View Provider",
      source: "street_view",
    });

    expect(hero.lookupRequested).toBe(true);
    expect(hero.photo).toBeUndefined();
    expect(hero.source).toBe("unavailable");
    expect(hero.reason).toContain("Provider credentials");
  });

  it("does not automatically use a living room as the cover when an exterior exists", () => {
    const photos = [
      photo("living", "Living Room"),
      landscapePhoto("front", "Exterior"),
    ];

    expect(chooseCoverPhoto(photos)?.id).toBe("front");
  });

  it("ignores unusable uploaded image data for cover selection", () => {
    const photos = [
      { ...photo("broken", "Exterior"), dataUrl: "data:text/plain;base64,broken" },
      photo("living", "Living Room"),
    ];

    expect(isUsableImageDataUrl(photos[0].dataUrl)).toBe(false);
    expect(chooseCoverPhoto(photos)).toBeUndefined();
  });

  it("infers room labels from filenames", () => {
    expect(inferRoomFromFilename("front-exterior-01.jpg")).toBe("Front Exterior");
    expect(inferRoomFromFilename("bright-kitchen-island.jpg")).toBe("Kitchen");
    expect(inferRoomFromFilename("primary-bath-vanity.jpg")).toBe("Bathroom");
    expect(inferRoomFromFilename("unknown-angle.jpg")).toBe("Unknown");
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

  it("stores fallback classification results and groups photos by room", () => {
    const photos = [
      { ...photo("bright-kitchen-island", "Unknown"), classificationMode: "manual_fallback" as const, name: "bright-kitchen-island.jpg" },
      { ...photo("living-room", "Unknown"), classificationMode: "manual_fallback" as const, name: "living-room.jpg" },
    ];
    const groups = groupRoomPhotos(photos);

    expect(groups.map((group) => group.room)).toEqual(["Kitchen", "Living Room"]);
    expect(groups[0]?.photos[0]?.classificationMode).toBe("manual_fallback");
  });

  it("lets an agent correction override fallback classification", () => {
    const corrected = {
      ...photo("filename-says-kitchen", "Office"),
      agentCorrectedClassification: true,
      classificationMode: "agent" as const,
      detectedRoomLabel: "Office" as const,
      name: "filename-says-kitchen.jpg",
    };

    expect(groupRoomPhotos([corrected])[0]?.room).toBe("Office");
  });

  it("selects the preferred best room photo and keeps only included photos", () => {
    const includedBest = { ...photo("kitchen-best", "Kitchen"), isBestRoomPhoto: true };
    const excluded = { ...photo("kitchen-excluded", "Kitchen"), includedInReport: false };

    expect(chooseBestRoomPhoto([excluded, includedBest], ["Kitchen"])?.id).toBe("kitchen-best");
    expect(groupRoomPhotos([excluded, includedBest])[0]?.photos).toHaveLength(1);
  });

  it("calculates coverage from bedroom and bathroom counts without blocking report generation", () => {
    const coverage = calculatePhotoCoverage(
      { ...defaultProperty, beds: "4", baths: "3", garageCount: "1", pool: "Yes", basement: "No" },
      [
        photo("primary", "Primary Bedroom"),
        photo("bedroom", "Bedroom"),
        photo("bath", "Bathroom"),
        photo("front", "Front Exterior"),
        photo("kitchen", "Kitchen"),
      ],
    );

    expect(coverage.find((item) => item.label === "Bedrooms detected")?.status).toBe("Partial");
    expect(coverage.find((item) => item.label === "Bathrooms detected")?.missingCount).toBe(2);
    expect(coverage.find((item) => item.label === "Pool")?.status).toBe("Missing");
    expect(coverage.find((item) => item.label === "Basement")?.status).toBe("Not Applicable");
  });

  it("passes resolved photos and coverage data to the PDF summary layer", () => {
    const mainExterior = {
      ...landscapePhoto("main-front", "Cover"),
      isCoverPreferred: true,
    };
    const kitchen = { ...photo("kitchen", "Kitchen"), isBestRoomPhoto: true };
    const living = photo("living", "Living Room");
    const summary = buildReadinessSummary(
      improvements.map((item) => item.id),
      [mainExterior, kitchen, living],
      { ...defaultProperty, beds: "2", baths: "1" },
    );

    expect(summary.propertyHeroPhoto.photo?.id).toBe("main-front");
    expect(summary.bestKitchenPhoto?.id).toBe("kitchen");
    expect(summary.bestLivingRoomPhoto?.id).toBe("living");
    expect(summary.groupedRoomPhotos.length).toBeGreaterThan(0);
    expect(summary.missingRooms).toContain("Bathrooms detected");
  });

  it("creates room-specific recommendations with their source photo", () => {
    const recommendations = buildPhotoBackedRecommendations([
      analyzedPhoto("kitchen-source", "Kitchen", [
        "clutter on kitchen counters",
        "small appliances crowd the prep surface",
      ]),
    ]);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]?.room).toBe("Kitchen");
    expect(recommendations[0]?.sourcePhoto?.id).toBe("kitchen-source");
    expect(recommendations[0]?.detectedCategory).toBe("Kitchen");
  });

  it("does not generate detailed recommendations for Unknown photos", () => {
    const recommendations = buildPhotoBackedRecommendations([
      analyzedPhoto("unknown-source", "Unknown", ["visible clutter"]),
    ]);

    expect(recommendations).toEqual([]);
  });

  it("keeps exterior recommendations isolated from kitchen and interior recommendations", () => {
    const recommendations = buildPhotoBackedRecommendations([
      analyzedPhoto("front-source", "Front Exterior", [
        "discoloration on front walkway",
        "entry surface needs cleaning",
      ]),
    ]);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every((item) => item.room === "Front Exterior")).toBe(true);
    expect(recommendations.some((item) => item.title.toLowerCase().includes("kitchen"))).toBe(false);
  });

  it("uses an agent room correction for recommendation mapping", () => {
    const recommendations = buildPhotoBackedRecommendations([
      {
        ...analyzedPhoto("corrected", "Kitchen", ["clutter on kitchen counters"]),
        agentCorrectedClassification: true,
        classificationMode: "agent",
        detectedRoomLabel: "Living Room",
      },
    ]);

    expect(recommendations[0]?.room).toBe("Kitchen");
    expect(recommendations[0]?.sourcePhoto?.id).toBe("corrected");
  });

  it("passes recommendation inclusion state and source photos to the PDF summary", () => {
    const sourcePhoto = analyzedPhoto("bath-source", "Bathroom", [
      "items crowd the vanity counter",
      "mirror area appears visually busy",
    ]);
    const recommendations = buildPhotoBackedRecommendations([sourcePhoto]);
    const selectedId = recommendations[0]?.id;
    const summary = buildReadinessSummary(
      selectedId ? [selectedId] : [],
      [sourcePhoto],
      defaultProperty,
      { recommendations },
    );

    expect(summary.selectedRecommendations).toHaveLength(selectedId ? 1 : 0);
    expect(summary.selectedRecommendations[0]?.sourcePhoto?.id).toBe("bath-source");
    expect(summary.roomOverviews.every((room) => room.room !== "Unknown")).toBe(true);
  });
});
