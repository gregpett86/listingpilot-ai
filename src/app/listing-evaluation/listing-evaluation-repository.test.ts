import { beforeEach, describe, expect, it, vi } from "vitest";
import { validPngBase64 } from "@/test/fixtures/images";
import {
  buildPhotoBackedRecommendations,
  defaultProperty,
  type UploadedPhoto,
} from "../listing-readiness/report-data";
import { createListingEvaluationReportData } from "./report-view-model";
import {
  clearListingEvaluationReports,
  deleteListingEvaluationReport,
  duplicateListingEvaluationReport,
  getListingEvaluationReport,
  listingEvaluationRepositoryKey,
  listListingEvaluationReports,
  migrateSessionReports,
  saveListingEvaluationReport,
  updateListingEvaluationReport,
} from "./listing-evaluation-repository";

const validDataUrl = `data:image/png;base64,${validPngBase64}`;

function photo(id: string, roomLabel: UploadedPhoto["roomLabel"]): UploadedPhoto {
  return {
    analysisStatus: "complete",
    classificationMode: "ai",
    confidence: 0.94,
    dataUrl: validDataUrl,
    detectedRoomLabel: roomLabel,
    id,
    includedInReport: true,
    isCoverPreferred: roomLabel === "Cover",
    name: `${id}.png`,
    roomLabel,
    visibleFindings:
      roomLabel === "Kitchen" ? ["clutter on kitchen counters"] : [],
  };
}

function report(id = "evaluation-1") {
  const photos = [photo("cover", "Cover"), photo("kitchen", "Kitchen")];
  return createListingEvaluationReportData({
    id,
    photos,
    property: {
      ...defaultProperty,
      address: "901 One Button Way",
      homeownerName: "Jane Homeowner",
    },
    recommendations: buildPhotoBackedRecommendations(photos),
  });
}

describe("listing evaluation repository", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("saves reports, lists them, and opens by ID after a refresh", () => {
    const saved = saveListingEvaluationReport(report());

    expect(saved.success).toBe(true);
    expect(listListingEvaluationReports()).toHaveLength(1);
    expect(getListingEvaluationReport("evaluation-1")?.propertyAddress).toBe(
      "901 One Button Way",
    );

    const raw = localStorage.getItem(listingEvaluationRepositoryKey);
    expect(raw).toContain("901 One Button Way");
  });

  it("updates include/exclude state and updatedAt metadata", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T10:00:00.000Z"));
    const first = report();
    saveListingEvaluationReport(first);

    vi.setSystemTime(new Date("2026-08-05T10:30:00.000Z"));
    const updated = {
      ...first,
      selectedRecommendationIds: [],
      updatedAt: new Date("2026-08-05T10:30:00.000Z").toISOString(),
    };
    updateListingEvaluationReport(updated);

    const stored = getListingEvaluationReport(first.id);
    expect(stored?.selectedRecommendationIds).toEqual([]);
    expect(stored?.updatedAt).toBe("2026-08-05T10:30:00.000Z");
  });

  it("duplicates a report as a Draft with a new ID", () => {
    saveListingEvaluationReport(report());
    const duplicated = duplicateListingEvaluationReport("evaluation-1");

    expect(duplicated?.id).not.toBe("evaluation-1");
    expect(duplicated?.status).toBe("Draft");
    expect(duplicated?.propertyAddress).toContain("Copy");
    expect(listListingEvaluationReports()).toHaveLength(2);
  });

  it("deletes a report from the library", () => {
    saveListingEvaluationReport(report());
    deleteListingEvaluationReport("evaluation-1");

    expect(listListingEvaluationReports()).toEqual([]);
  });

  it("handles localStorage quota failure with a clear warning", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    const result = saveListingEvaluationReport(report());

    expect(result.success).toBe(false);
    expect(result.storageWarning).toMatch(/storage/i);
  });

  it("migrates old session reports and preserves the report ID", () => {
    const legacy = report("legacy-report");
    sessionStorage.setItem(
      "listingpilot:listingevaluation:legacy-report",
      JSON.stringify(legacy),
    );

    migrateSessionReports();

    expect(getListingEvaluationReport("legacy-report")?.id).toBe("legacy-report");
    expect(listListingEvaluationReports()).toHaveLength(1);
  });

  it("clears saved reports", () => {
    saveListingEvaluationReport(report());
    clearListingEvaluationReports();

    expect(listListingEvaluationReports()).toEqual([]);
  });
});
