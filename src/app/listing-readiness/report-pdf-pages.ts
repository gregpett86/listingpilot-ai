import type { Improvement, PropertyDetails, ReadinessSummary, RoomOverview } from "./report-data";
import { marketingHighlights } from "./report-data";
import {
  addReportPage,
  drawBody,
  drawDisclaimer,
  drawFooter,
  drawKicker,
  drawMetric,
  drawPhotoFrame,
  drawProgressBar,
  drawReportBadge,
  drawScoreGauge,
  drawTitle,
  type PdfContext,
  setFillColor,
  setTextColor,
  textLines,
} from "./report-pdf-components";
import { pdfColors, pdfPage } from "./report-pdf-styles";

function homeownerName(property: PropertyDetails) {
  return property.homeownerName.trim() || "Homeowner";
}

function recommendedForRoom(room: RoomOverview, selected: Improvement[]) {
  return (
    room.recommendations[0] ??
    selected.find((item) => item.room === room.room) ??
    selected.find((item) => item.room === "Whole Home") ??
    selected[0]
  );
}

export function PdfCover(ctx: PdfContext, property: PropertyDetails, summary: ReadinessSummary) {
  const { doc } = ctx;
  addReportPage(ctx);

  if (summary.coverPhoto) {
    drawPhotoFrame(doc, summary.coverPhoto, { x: 0, y: 0, w: pdfPage.width, h: 142 }, { placeholder: "none" });
    setFillColor(doc, pdfColors.navyDark);
    doc.rect(0, 134, pdfPage.width, 82, "F");
  } else {
    setFillColor(doc, pdfColors.navyDark);
    doc.rect(0, 0, pdfPage.width, pdfPage.height, "F");
    setFillColor(doc, pdfColors.navy);
    doc.rect(0, 0, pdfPage.width, 112, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setTextColor(doc, pdfColors.goldSoft);
    doc.text("Property photography will appear here once uploaded.", pdfPage.margin, 88);
  }

  setFillColor(doc, pdfColors.gold);
  doc.rect(0, 134, pdfPage.width, 2.5, "F");
  drawKicker(doc, "Realty Edge Pro", pdfPage.margin, 151, pdfColors.gold);
  drawTitle(doc, "Listing Readiness Report", pdfPage.margin, 168, 28, pdfColors.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setTextColor(doc, [218, 225, 235]);
  doc.text(`${property.address} | ${property.cityStateZip}`, pdfPage.margin, 179);
  doc.text(`${property.beds} Beds | ${property.baths} Baths | ${property.sqft} Sq Ft`, pdfPage.margin, 187);
  drawScoreGauge(doc, summary.currentScore, 215, 166);
  drawMetric(doc, "Potential Score", `${summary.potentialScore}`, 249, 166, {
    align: "center",
    color: pdfColors.gold,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setTextColor(doc, [205, 214, 226]);
  doc.text(`Prepared for ${homeownerName(property)}`, pdfPage.margin, 200);
  doc.text(`Prepared by ${property.agentName}, ${property.brokerage}`, 104, 200);
  doc.text(`${property.agentPhone} | ${property.agentEmail}`, 104, 207);
  doc.text(`Date prepared: ${ctx.preparedDate}`, pdfPage.margin, 207);
}

export function PdfExecutiveSummary(ctx: PdfContext, property: PropertyDetails, summary: ReadinessSummary) {
  const { doc } = ctx;
  addReportPage(ctx);
  drawPhotoFrame(doc, summary.executivePhoto, { x: 14, y: 18, w: 145, h: 170 }, { label: "Interior photo not provided", placeholder: "compact" });
  drawKicker(doc, "Executive Summary", 174, 31);
  drawTitle(doc, "A clear path to a stronger listing launch.", 174, 45, 19);
  let y = drawBody(
    doc,
    `${property.address} is being evaluated through the lens of buyer presentation, photography readiness, and first-impression quality. The recommendations focus on visible preparation choices that can help the home feel more polished before it reaches the market.`,
    174,
    61,
    82,
    9.5,
  );
  y = drawBody(
    doc,
    "The score is a marketing-readiness signal based on the photos and information provided. It is not an appraisal, inspection, or promise of market performance.",
    174,
    y + 5,
    82,
    9.5,
  );
  drawMetric(doc, "Current Score", `${summary.currentScore}`, 174, y + 24);
  drawMetric(doc, "Potential Score", `${summary.potentialScore}`, 214, y + 24, { color: pdfColors.positive });
  drawMetric(doc, "Opportunity Points", `+${summary.totalPossibleIncrease}`, 174, y + 53, { color: pdfColors.gold });
  drawReportBadge(doc, "Marketing preparation guidance", 214, y + 44, 44, "gold");
  drawFooter(ctx);
}

export function PdfCategoryScores(ctx: PdfContext, summary: ReadinessSummary) {
  const { doc } = ctx;
  addReportPage(ctx);
  drawKicker(doc, "Readiness by Category", 18, 28);
  drawTitle(doc, "Where preparation has the most visual leverage.", 18, 42, 21);
  let y = 62;
  summary.categoryScores.forEach((category) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTextColor(doc, pdfColors.gold);
    doc.text(category.icon.toUpperCase(), 20, y);
    doc.setFontSize(12);
    setTextColor(doc, pdfColors.navy);
    doc.text(category.name, 44, y);
    drawProgressBar(doc, 44, y + 9, 116, category.current, category.potential);
    drawMetric(doc, "Current", `${category.current}`, 177, y + 2);
    drawMetric(doc, "Potential", `${category.potential}`, 222, y + 2, { color: pdfColors.positive });
    y += 26;
  });
  setFillColor(doc, pdfColors.white);
  doc.roundedRect(18, 173, 243, 21, 3, 3, "F");
  drawKicker(doc, "Top Strengths", 26, 184);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  setTextColor(doc, pdfColors.slate);
  marketingHighlights.slice(0, 4).forEach((highlight, index) => {
    doc.text(`- ${highlight}`, 78 + (index % 2) * 86, 181 + Math.floor(index / 2) * 8);
  });
  drawFooter(ctx);
}

export function PdfRoomOverview(ctx: PdfContext, summary: ReadinessSummary) {
  const { doc } = ctx;
  addReportPage(ctx);
  drawKicker(doc, "Room-by-Room Overview", 18, 27);
  drawTitle(doc, "Photography first. Minimal notes. Clear priorities.", 18, 40, 20);
  const rooms = summary.roomOverviews.slice(0, 6);
  rooms.forEach((room, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 18 + col * 84;
    const y = 56 + row * 70;
    drawPhotoFrame(doc, room.photo, { x, y, w: 76, h: 42 }, { label: `${room.room} photo not provided`, placeholder: "compact" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setTextColor(doc, pdfColors.navy);
    doc.text(room.room, x, y + 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    setTextColor(doc, pdfColors.slate);
    doc.text(textLines(doc, room.status, 45), x, y + 59);
    drawMetric(doc, "Now", `${room.current}`, x + 52, y + 53, { align: "right" });
    drawMetric(doc, "Goal", `${room.potential}`, x + 75, y + 53, {
      align: "right",
      color: pdfColors.positive,
    });
  });
  drawFooter(ctx);
}

export function PdfRoomAnalysis(ctx: PdfContext, room: RoomOverview, selected: Improvement[], fallbackTitle: string) {
  const { doc } = ctx;
  const recommendation = recommendedForRoom(room, selected);
  addReportPage(ctx);
  if (room.photo) {
    drawPhotoFrame(doc, room.photo, { x: 0, y: 0, w: 160, h: pdfPage.height }, { placeholder: "compact" });
  } else {
    setFillColor(doc, pdfColors.navyDark);
    doc.rect(0, 0, 160, pdfPage.height, "F");
    setFillColor(doc, pdfColors.navy);
    doc.rect(0, 0, 160, 120, "F");
    drawKicker(doc, room.room || fallbackTitle, 22, 86, pdfColors.gold);
    drawTitle(doc, "Photo not provided", 22, 101, 18, pdfColors.white);
    drawBody(
      doc,
      "Add a room-specific photo to make this page fully photo-driven.",
      22,
      113,
      86,
      8,
      4.5,
      [218, 225, 235],
    );
  }
  setFillColor(doc, pdfColors.paper);
  doc.rect(151, 0, 128.4, pdfPage.height, "F");
  drawKicker(doc, "Detailed Room Analysis", 172, 28);
  drawTitle(doc, room.room || fallbackTitle, 172, 43, 23);
  drawMetric(doc, "Current Room Score", `${room.current}`, 172, 66);
  drawMetric(doc, "Potential Room Score", `${room.potential}`, 225, 66, {
    color: pdfColors.positive,
  });
  drawKicker(doc, "What's Working Well", 172, 94, pdfColors.gold);
  drawBody(
    doc,
    `${room.room} can play an important role in the listing story when the photo is clean, bright, and visually calm. The goal is to reduce distraction and let the strongest architectural or lifestyle cue lead.`,
    172,
    106,
    82,
    8.6,
  );
  drawKicker(doc, "Recommended Improvements", 172, 124, pdfColors.gold);
  if (recommendation) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setTextColor(doc, pdfColors.navy);
    doc.text(recommendation.title, 172, 137);
    drawBody(doc, recommendation.description, 172, 148, 82, 8.4);
    drawReportBadge(doc, `+${recommendation.points} points`, 172, 165, 30, "positive");
    drawReportBadge(doc, recommendation.difficulty, 207, 165, 26, "gold");
    drawReportBadge(doc, recommendation.time, 238, 165, 25, "muted");
    drawKicker(doc, "Why it matters", 172, 182, pdfColors.gold);
    drawBody(
      doc,
      recommendation.reasons.slice(0, 2).join("  "),
      172,
      190,
      82,
      7.2,
      3.5,
    );
  } else {
    drawBody(doc, "No selected recommendation is assigned to this room.", 172, 137, 82, 8.6);
  }
  drawFooter(ctx);
}

export function PdfImprovementPlan(ctx: PdfContext, summary: ReadinessSummary) {
  const { doc } = ctx;
  addReportPage(ctx);
  drawKicker(doc, "Improvement Plan", 18, 28);
  drawTitle(doc, `Fastest path to ${summary.potentialScore}`, 18, 43, 23);
  drawBody(
    doc,
    "A focused preparation sequence using only the recommendations selected by the agent.",
    18,
    55,
    120,
    9,
  );
  drawMetric(doc, "Current", `${summary.currentScore}`, 178, 40);
  drawMetric(doc, "Potential", `${summary.potentialScore}`, 215, 40, { color: pdfColors.positive });
  drawMetric(doc, "Gain", `+${summary.selectedPoints}`, 248, 40, {
    align: "right",
    color: pdfColors.gold,
  });
  const top = summary.selectedRecommendations.slice().sort((a, b) => b.points - a.points).slice(0, 3);
  top.forEach((item, index) => {
    drawReportBadge(doc, `${index + 1}. ${item.title}`, 18 + index * 74, 75, 67, "gold");
  });
  setFillColor(doc, pdfColors.navy);
  doc.roundedRect(18, 95, 243, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setTextColor(doc, pdfColors.white);
  ["Priority", "Room", "Improvement", "Score Points", "Difficulty", "Estimated Time"].forEach((heading, index) => {
    doc.text(heading, [24, 57, 94, 174, 208, 236][index], 103);
  });
  let y = 119;
  summary.selectedRecommendations
    .slice()
    .sort((a, b) => b.points - a.points)
    .forEach((item, index) => {
      if (index % 2 === 0) {
        setFillColor(doc, pdfColors.white);
        doc.roundedRect(18, y - 8, 243, 15, 1.5, 1.5, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      setTextColor(doc, pdfColors.slate);
      doc.text(item.priority, 24, y);
      doc.text(item.room, 57, y);
      doc.text(textLines(doc, item.title, 66), 94, y);
      doc.text(`+${item.points}`, 181, y);
      doc.text(item.difficulty, 208, y);
      doc.text(item.time, 236, y);
      y += 16;
    });
  drawFooter(ctx);
}

export function PdfMarketingHighlights(ctx: PdfContext, property: PropertyDetails, summary: ReadinessSummary) {
  const { doc } = ctx;
  addReportPage(ctx);
  if (summary.marketingPhoto) {
    drawPhotoFrame(doc, summary.marketingPhoto, { x: 0, y: 0, w: 142, h: pdfPage.height }, { placeholder: "compact" });
  } else {
    setFillColor(doc, pdfColors.navyDark);
    doc.rect(0, 0, 142, pdfPage.height, "F");
    setFillColor(doc, pdfColors.navy);
    doc.rect(0, 0, 142, 122, "F");
    drawKicker(doc, "Marketing Image", 22, 86, pdfColors.gold);
    drawTitle(doc, "Photo pending", 22, 101, 18, pdfColors.white);
    drawBody(
      doc,
      "Upload another strong property image to complete this final presentation page.",
      22,
      113,
      82,
      8,
      4.5,
      [218, 225, 235],
    );
  }
  setFillColor(doc, pdfColors.paper);
  doc.rect(134, 0, 145.4, pdfPage.height, "F");
  drawKicker(doc, "Marketing Highlights + Next Steps", 154, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setTextColor(doc, pdfColors.navy);
  const titleLines = textLines(doc, "Prepare the story before the listing launches.", 82);
  doc.text(titleLines, 154, 38);
  drawKicker(doc, "Marketing Highlights", 154, 68);
  marketingHighlights.slice(0, 4).forEach((highlight, index) => {
    drawBody(doc, `- ${highlight}`, 154, 80 + index * 7, 100, 7.7, 4.2);
  });
  drawKicker(doc, "Photo Recommendations", 154, 117);
  drawBody(
    doc,
    "Lead with the strongest exterior image, follow with kitchen and living spaces, avoid duplicate angles, and retake any dark or cluttered rooms after preparation is complete.",
    154,
    128,
    100,
    7.8,
    4.2,
  );
  drawKicker(doc, "Next Steps", 154, 159);
  [
    "Review recommendations",
    "Complete selected preparation items",
    "Schedule professional photography",
    "Launch the listing",
  ].forEach((step, index) => {
    drawReportBadge(doc, String(index + 1), 154, 168 + index * 7, 8, "gold");
    drawBody(doc, step, 166, 173 + index * 7, 42, 7.1, 3.8);
  });
  setFillColor(doc, pdfColors.navy);
  doc.roundedRect(213, 165, 48, 27, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  setTextColor(doc, pdfColors.gold);
  doc.text(textLines(doc, property.agentName, 39), 218, 174);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  setTextColor(doc, pdfColors.white);
  doc.text(textLines(doc, property.brokerage, 39), 218, 181);
  doc.text(property.agentPhone, 218, 187);
  doc.text(textLines(doc, property.agentEmail, 39), 218, 191);
  drawDisclaimer(doc, 154, 198, 100);
}
