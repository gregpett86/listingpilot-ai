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
    assignedCategory: "Kitchen",
    suggestedCategory: "Kitchen",
    categoryMismatch: false,
    condition: "Average",
    confidence: "High",
    visibleFindings: ["Cabinet hardware", "lighting"],
    explicitlySupportedRecommendations: ["Cabinet hardware refresh"],
    evidenceForEachRecommendation: [
      {
        recommendation: "Cabinet hardware refresh",
        evidence: "visible cabinet hardware",
      },
    ],
  },
  {
    photoId: "kitchen-2",
    assignedCategory: "Kitchen",
    suggestedCategory: "Kitchen",
    categoryMismatch: false,
    condition: "Dated",
    confidence: "Medium",
    visibleFindings: ["cabinet hardware", "Lighting"],
    explicitlySupportedRecommendations: ["Cabinet hardware refresh"],
    evidenceForEachRecommendation: [
      {
        recommendation: "Cabinet hardware refresh",
        evidence: "visible cabinet hardware",
      },
    ],
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
          displayLabel: "Photo 1",
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
        photoName: "Photo 1",
        previewUrl: "blob:http://localhost/kitchen",
        assignedRoom: "Kitchen",
        visionRoom: "Kitchen",
        categoryMatchStatus: "Match",
        condition: "Average",
        confidence: "High",
        visibleFindings: ["Cabinet hardware", "lighting"],
        supportedRecommendations: ["Cabinet hardware refresh"],
        readinessContribution: 38,
      }),
    ]);
    expect(JSON.stringify(rows)).not.toContain("base64");
    expect(JSON.stringify(rows)).not.toContain("raw");
  });

  it("treats the user-assigned category as authoritative and blocks mismatches from scoring", () => {
    const observations = buildRoomObservations([
      {
        photoId: "pool-1",
        assignedCategory: "Pool",
        suggestedCategory: "Basement",
        categoryMismatch: true,
        condition: "Needs Improvement",
        confidence: "High",
        visibleFindings: ["clear water feature"],
        explicitlySupportedRecommendations: ["Moisture issue review"],
        evidenceForEachRecommendation: [
          {
            recommendation: "Moisture issue review",
            evidence: "water visible outdoors",
          },
        ],
      },
    ]);

    expect(observations).toEqual([]);
  });

  it("ignores low-confidence and empty-finding photos for readiness observations", () => {
    const observations = buildRoomObservations([
      {
        photoId: "living-1",
        assignedCategory: "Living Room",
        suggestedCategory: "Living Room",
        categoryMismatch: false,
        condition: "Dated",
        confidence: "Low",
        visibleFindings: ["paint looks dated"],
        explicitlySupportedRecommendations: ["Wall paint refresh"],
        evidenceForEachRecommendation: [
          {
            recommendation: "Wall paint refresh",
            evidence: "paint looks dated",
          },
        ],
      },
      {
        photoId: "exterior-1",
        assignedCategory: "Exterior",
        suggestedCategory: "Exterior",
        categoryMismatch: false,
        condition: "Average",
        confidence: "High",
        visibleFindings: [],
        explicitlySupportedRecommendations: [],
        evidenceForEachRecommendation: [],
      },
    ]);

    expect(observations).toEqual([]);
  });
});
