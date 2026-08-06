import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validPngBase64 } from "@/test/fixtures/images";
import {
  buildPhotoBackedRecommendations,
  defaultProperty,
  type UploadedPhoto,
} from "../listing-readiness/report-data";
import { createListingEvaluationReportData } from "../listing-evaluation/report-view-model";
import {
  clearListingEvaluationReports,
  saveListingEvaluationReport,
} from "../listing-evaluation/listing-evaluation-repository";
import { ListingReportsPage } from "./listing-reports-client";

const { downloadPdfMock } = vi.hoisted(() => ({
  downloadPdfMock: vi.fn(),
}));

vi.mock("../listing-readiness/report-pdf", () => ({
  downloadListingReadinessPdf: downloadPdfMock,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={String(props.alt ?? "")}
      {...Object.fromEntries(
        Object.entries(props).filter(
          ([key]) => key !== "priority" && key !== "alt",
        ),
      )}
    />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

const validDataUrl = `data:image/png;base64,${validPngBase64}`;

function photo(id: string, roomLabel: UploadedPhoto["roomLabel"]): UploadedPhoto {
  return {
    analysisStatus: "complete",
    classificationMode: "ai",
    confidence: 0.91,
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

function saveReport(id = "evaluation-ui") {
  const photos = [photo("cover", "Cover"), photo("kitchen", "Kitchen")];
  const report = createListingEvaluationReportData({
    id,
    photos,
    property: {
      ...defaultProperty,
      address: "901 One Button Way",
      homeownerName: "Jane Homeowner",
    },
    recommendations: buildPhotoBackedRecommendations(photos),
  });
  saveListingEvaluationReport(report);
  return report;
}

describe("ListingReportsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    downloadPdfMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    clearListingEvaluationReports();
  });

  it("renders the Listing Reports empty state", async () => {
    render(<ListingReportsPage />);

    expect(await screen.findByText("No Listing Reports Yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create Listing Evaluation" }),
    ).toHaveAttribute("href", "/listing-evaluation/new");
    expect(screen.queryByText("My Reports")).not.toBeInTheDocument();
  });

  it("renders saved reports with production actions", async () => {
    saveReport();
    render(<ListingReportsPage />);

    expect(await screen.findByText("901 One Button Way")).toBeInTheDocument();
    expect(screen.getByText("Jane Homeowner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Report" })).toHaveAttribute(
      "href",
      "/listing-evaluation/evaluation-ui",
    );
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("downloads the saved report data from the library", async () => {
    const report = saveReport();
    render(<ListingReportsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Download PDF" }));

    expect(downloadPdfMock).toHaveBeenCalledWith(report.property, report.summary);
  });

  it("duplicates and deletes reports with confirmation", async () => {
    saveReport();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ListingReportsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Duplicate" }));
    await waitFor(() => {
      expect(screen.getByText(/duplicated as a Draft report/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/901 One Button Way/i).length).toBeGreaterThan(1);

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await userEvent.click(deleteButtons[0]!);

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete this Listing Report?\n\nThis will permanently remove the saved evaluation from this browser.",
    );
  });
});
