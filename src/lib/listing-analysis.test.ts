import { describe, expect, it } from "vitest";
import {
  buildRealPhotoValidationRows,
  buildRoomObservations,
  dedupeVisibleFindings,
} from "./listing-analysis";
import { recommendImprovements } from "./property-intelligence";
import type { VisionFinding } from "./analysis-schema";

const kitchenFindings: VisionFinding[] = [
  {
    photoId: "kitchen-1",
    roomType: "Kitchen",
    condition: "Average",
    confidence: "High",
    opportunities: ["Cabinet hardware", "lighting"],
  },
  {
    photoId: "kitchen-2",
    roomType: "Kitchen",
    condition: "Dated",
    confidence: "Medium",
    opportunities: ["cabinet hardware", "Lighting"],
  },
];

describe("listing-analysis helpers", () => {
  it("deduplicates visible findings case-insensitively", () => {
    expect(
      dedupeVisibleFindings([
        "Cabinet hardware",
        "cabinet hardware",
        " Cabinet   hardware ",
        "lighting",
      ]),
    ).toEqual(["Cabinet hardware", "lighting"]);
  });

  it("groups multiple photos of the same room into one readiness observation", () => {
    const observations = buildRoomObservations(kitchenFindings);

    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      roomType: "Kitchen",
      condition: "Dated",
      photoCount: 2,
      observedIssues: ["Cabinet hardware", "lighting"],
    });
  });

  it("prevents duplicate same-room photos from multiplying recommendations", () => {
    const observations = buildRoomObservations(kitchenFindings);
    const recommendations = recommendImprovements({
      observations,
      limit: 20,
    });

    expect(
      recommendations.every(
        (recommendation) => recommendation.improvement.category === "Kitchen",
      ),
    ).toBe(true);
    expect(
      new Set(
        recommendations.map((recommendation) => recommendation.improvement.id),
      ).size,
    ).toBe(recommendations.length);
  });

  it("builds safe real-photo validation rows without raw provider payloads", () => {
    const observations = buildRoomObservations(kitchenFindings);
    const recommendations = recommendImprovements({
      observations,
      limit: 3,
    });
    const rows = buildRealPhotoValidationRows({
      observations,
      photos: [
        {
          id: "kitchen-1",
          name: "kitchen.jpg",
          url: "blob:http://localhost/kitchen",
          area: "Kitchen",
        },
      ],
      recommendations,
      visionFindings: kitchenFindings,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        photoId: "kitchen-1",
        previewUrl: "blob:http://localhost/kitchen",
        assignedRoom: "Kitchen",
        visionRoom: "Kitchen",
        condition: "Average",
        confidence: "High",
        visibleFindings: ["Cabinet hardware", "lighting"],
        readinessContribution: 38,
      }),
    ]);
    expect(JSON.stringify(rows)).not.toContain("base64");
    expect(JSON.stringify(rows)).not.toContain("raw");
  });
});
