import { jsPDF } from "jspdf";
import type { PropertyDetails, ReadinessSummary } from "./report-data";
import { safeFilename } from "./report-data";
import {
  PdfCategoryScores,
  PdfCover,
  PdfExecutiveSummary,
  PdfImprovementPlan,
  PdfMarketingHighlights,
  PdfRoomAnalysis,
  PdfRoomOverview,
} from "./report-pdf-pages";

function preparedDate() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function createListingReadinessPdf(
  property: PropertyDetails,
  summary: ReadinessSummary,
) {
  const doc = new jsPDF({
    compress: true,
    format: "letter",
    orientation: "landscape",
    unit: "mm",
  });
  const context = { doc, pageNumber: 1, preparedDate: preparedDate() };
  const kitchen =
    summary.roomOverviews.find((room) => room.room === "Kitchen") ??
    summary.roomOverviews.find((room) => room.photo) ??
    summary.roomOverviews[0];
  const secondary =
    summary.secondaryDetailRoom ??
    summary.roomOverviews.find((room) => room.room !== kitchen?.room) ??
    kitchen;

  PdfCover(context, property, summary);
  context.pageNumber = 2;
  PdfExecutiveSummary(context, property, summary);
  context.pageNumber = 3;
  PdfCategoryScores(context, summary);
  context.pageNumber = 4;
  PdfRoomOverview(context, summary);
  context.pageNumber = 5;
  PdfRoomAnalysis(context, kitchen, summary.selectedRecommendations, "Key Room");
  context.pageNumber = 6;
  PdfRoomAnalysis(context, secondary, summary.selectedRecommendations, "Secondary Room");
  context.pageNumber = 7;
  PdfImprovementPlan(context, summary);
  context.pageNumber = 8;
  PdfMarketingHighlights(context, property, summary);

  return doc;
}

export function downloadListingReadinessPdf(
  property: PropertyDetails,
  summary: ReadinessSummary,
) {
  const doc = createListingReadinessPdf(property, summary);
  doc.save(`${safeFilename(property.address)}-listing-readiness-report.pdf`);
}
