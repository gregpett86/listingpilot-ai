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
  drawTitle,
  type PdfContext,
  setDrawColor,
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

function readinessLabel(score: number) {
  if (score >= 90) return "Strong Foundation";
  if (score >= 80) return "Market Ready";
  if (score >= 70) return "Nearly Ready";
  return "Preparation Opportunity";
}

function agentInitials(property: PropertyDetails) {
  return (
    property.agentName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0]?.toUpperCase())
      .join("") || "RE"
  );
}

function drawHouseMark(ctx: PdfContext, x: number, y: number, size = 8) {
  const { doc } = ctx;
  setDrawColor(doc, pdfColors.gold);
  doc.setLineWidth(0.55);
  doc.line(x, y + size * 0.46, x + size * 0.5, y);
  doc.line(x + size * 0.5, y, x + size, y + size * 0.46);
  doc.line(x + size * 0.16, y + size * 0.36, x + size * 0.16, y + size);
  doc.line(x + size * 0.84, y + size * 0.36, x + size * 0.84, y + size);
  doc.line(x + size * 0.16, y + size, x + size * 0.84, y + size);
  doc.line(x + size * 0.38, y + size, x + size * 0.38, y + size * 0.62);
  doc.line(x + size * 0.38, y + size * 0.62, x + size * 0.62, y + size * 0.62);
  doc.line(x + size * 0.62, y + size * 0.62, x + size * 0.62, y + size);
}

function drawHeroBrand(ctx: PdfContext) {
  const { doc } = ctx;
  drawHouseMark(ctx, 222, 14, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  setTextColor(doc, pdfColors.navy);
  doc.text("REALTY", 236, 18);
  doc.text("EDGE", 236, 25);
  setTextColor(doc, pdfColors.gold);
  doc.text("PRO", 258, 25);
}

function drawFooterBrand(ctx: PdfContext, x: number, y: number) {
  const { doc } = ctx;
  drawHouseMark(ctx, x, y - 6.4, 7.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextColor(doc, pdfColors.white);
  doc.text("REALTY EDGE", x + 10, y);
  setTextColor(doc, pdfColors.gold);
  doc.text("PRO", x + 44, y);
}

function drawFactIcon(ctx: PdfContext, kind: "beds" | "baths" | "sqft", x: number, y: number) {
  const { doc } = ctx;
  setDrawColor(doc, pdfColors.gold);
  doc.setLineWidth(0.5);

  if (kind === "beds") {
    doc.rect(x, y - 2.5, 9, 4.5);
    doc.line(x, y - 0.5, x + 9, y - 0.5);
    doc.line(x + 1.5, y + 2, x + 1.5, y + 3.6);
    doc.line(x + 7.5, y + 2, x + 7.5, y + 3.6);
    return;
  }

  if (kind === "baths") {
    doc.roundedRect(x, y - 2, 8.5, 4, 1, 1);
    doc.line(x + 1, y + 2, x + 1, y + 3.2);
    doc.line(x + 7.5, y + 2, x + 7.5, y + 3.2);
    doc.circle(x + 7.4, y - 4, 0.8);
    return;
  }

  doc.rect(x, y - 4, 8.5, 6);
  doc.line(x, y - 1, x + 8.5, y - 1);
  doc.line(x + 4.2, y - 4, x + 4.2, y + 2);
}

function drawFact(ctx: PdfContext, kind: "beds" | "baths" | "sqft", value: string, label: string, x: number, y: number) {
  const { doc } = ctx;
  drawFactIcon(ctx, kind, x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setTextColor(doc, pdfColors.white);
  doc.text(value, x + 12, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  setTextColor(doc, [180, 194, 211]);
  doc.text(label.toUpperCase(), x + 12, y + 5);
}

function drawGoldRule(ctx: PdfContext, x: number, y: number, width: number) {
  const { doc } = ctx;
  setDrawColor(doc, pdfColors.gold);
  doc.setLineWidth(0.55);
  doc.line(x, y, x + width, y);
}

function drawCoverScore(ctx: PdfContext, score: number, x: number, y: number) {
  const { doc } = ctx;
  setDrawColor(doc, pdfColors.goldSoft);
  doc.setLineWidth(3);
  doc.circle(x, y, 20, "S");
  setDrawColor(doc, pdfColors.gold);
  doc.setLineWidth(5.6);
  doc.circle(x, y, 20, "S");
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(31);
  setTextColor(doc, pdfColors.white);
  doc.text(String(score), x, y - 1, { align: "center" });
  doc.setFontSize(10);
  setTextColor(doc, [204, 215, 228]);
  doc.text("/100", x, y + 9, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  setTextColor(doc, pdfColors.gold);
  doc.text("CURRENT SCORE", x, y + 29, { align: "center" });
  setTextColor(doc, pdfColors.white);
  doc.text(readinessLabel(score).toUpperCase(), x, y + 37, { align: "center" });
}

function drawAgentAvatar(ctx: PdfContext, property: PropertyDetails, x: number, y: number) {
  const { doc } = ctx;
  if (property.agentHeadshotDataUrl) {
    drawPhotoFrame(
      doc,
      {
        dataUrl: property.agentHeadshotDataUrl,
        id: "agent-headshot",
        name: "Agent headshot",
        roomLabel: "Other",
      },
      { x, y, w: 17, h: 17 },
      { placeholder: "compact", radius: 8.5 },
    );
    return;
  }

  setFillColor(doc, pdfColors.goldSoft);
  doc.circle(x + 8.5, y + 8.5, 8.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setTextColor(doc, pdfColors.navy);
  doc.text(agentInitials(property), x + 8.5, y + 10.8, { align: "center" });
}

function drawCoverDisclaimer(ctx: PdfContext) {
  const { doc } = ctx;
  setFillColor(doc, [253, 250, 241]);
  doc.rect(0, 207.6, pdfPage.width, 8.3, "F");
  setDrawColor(doc, pdfColors.gold);
  doc.setLineWidth(0.4);
  doc.line(18, 211.2, 22, 209.7);
  doc.line(22, 209.7, 26, 211.2);
  doc.line(18, 211.2, 18.8, 214);
  doc.line(26, 211.2, 25.2, 214);
  doc.line(18.8, 214, 22, 215.2);
  doc.line(25.2, 214, 22, 215.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  setTextColor(doc, pdfColors.slate);
  doc.text("This report is based on the photos and information provided and is intended for marketing preparation guidance only.", 34, 212.5);
  doc.setFont("helvetica", "bold");
  setTextColor(doc, pdfColors.navy);
  doc.text("It is not a home inspection, appraisal, or guarantee of sale price or market performance.", 161, 212.5);
}

export function PdfCover(ctx: PdfContext, property: PropertyDetails, summary: ReadinessSummary) {
  const { doc } = ctx;
  addReportPage(ctx);
  const heroHeight = 119;
  const panelY = 120.3;
  const footerY = 204.6;
  const opportunity = Math.max(0, summary.potentialScore - summary.currentScore);

  if (summary.coverPhoto) {
    drawPhotoFrame(
      doc,
      summary.coverPhoto,
      { x: 0, y: 0, w: pdfPage.width, h: heroHeight },
      { placeholder: "none" },
    );
  } else {
    setFillColor(doc, pdfColors.navy);
    doc.rect(0, 0, pdfPage.width, heroHeight, "F");
    setFillColor(doc, pdfColors.navyDark);
    doc.rect(0, 0, pdfPage.width, 49, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setTextColor(doc, pdfColors.goldSoft);
    doc.text("Property photography will appear here once uploaded.", 16, 80);
  }

  drawHeroBrand(ctx);
  setFillColor(doc, pdfColors.gold);
  doc.rect(0, heroHeight, pdfPage.width, 1.3, "F");
  setFillColor(doc, pdfColors.navyDark);
  doc.rect(0, panelY, pdfPage.width, footerY - panelY, "F");

  drawKicker(doc, "Listing Readiness", 13, 132, pdfColors.gold);
  doc.setFont("times", "bold");
  doc.setFontSize(42);
  setTextColor(doc, pdfColors.white);
  doc.text("REPORT", 13, 149);
  setDrawColor(doc, pdfColors.gold);
  doc.setLineWidth(0.5);
  doc.line(13, 155, 31, 155);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.2);
  doc.setFont("helvetica", "bold");
  setTextColor(doc, pdfColors.white);
  doc.text(textLines(doc, property.address, 75), 13, 166);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  setTextColor(doc, [178, 193, 211]);
  doc.text(property.cityStateZip, 13, 173);
  drawFact(ctx, "beds", property.beds, "Beds", 13, 185);
  setDrawColor(doc, [99, 113, 132]);
  doc.line(34, 180, 34, 190);
  drawFact(ctx, "baths", property.baths, "Baths", 40, 185);
  doc.line(61, 180, 61, 190);
  drawFact(ctx, "sqft", property.sqft, "Sq Ft", 67, 185);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  setTextColor(doc, pdfColors.gold);
  doc.text("DATE PREPARED:", 13, 198);
  doc.setFontSize(6.7);
  setTextColor(doc, [220, 228, 238]);
  doc.text(ctx.preparedDate.toUpperCase(), 39, 198);

  drawCoverScore(ctx, summary.currentScore, 126, 154);
  setDrawColor(doc, [118, 132, 149]);
  doc.setLineWidth(0.28);
  doc.line(151, 130, 151, 197);
  doc.line(199, 130, 199, 199);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  setTextColor(doc, pdfColors.gold);
  doc.text(`${summary.potentialScore}`, 162, 141, { align: "left" });
  doc.setFontSize(9);
  setTextColor(doc, pdfColors.white);
  doc.text("/100", 166, 152, { align: "left" });
  doc.setFontSize(6);
  setTextColor(doc, pdfColors.white);
  doc.text("POTENTIAL SCORE", 162, 160);
  setDrawColor(doc, pdfColors.gold);
  doc.setLineWidth(0.45);
  doc.line(162, 165, 173, 165);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setTextColor(doc, opportunity > 0 ? pdfColors.positive : [86, 187, 128]);
  doc.text(`+${opportunity}`, 162, 178);
  doc.setFontSize(6.5);
  setTextColor(doc, pdfColors.white);
  doc.text("POINTS OF", 162, 186);
  doc.text("OPPORTUNITY", 162, 192);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  setTextColor(doc, pdfColors.gold);
  doc.text("PREPARED FOR", 209, 132);
  doc.setFontSize(10.2);
  setTextColor(doc, pdfColors.white);
  doc.text(textLines(doc, homeownerName(property), 58), 209, 141);
  setDrawColor(doc, [45, 65, 89]);
  doc.setLineWidth(0.3);
  doc.line(209, 147, 237, 147);
  doc.setFontSize(5.8);
  setTextColor(doc, pdfColors.gold);
  doc.text("PREPARED BY", 209, 156);
  drawAgentAvatar(ctx, property, 209, 161);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  setTextColor(doc, pdfColors.white);
  doc.text(textLines(doc, property.agentName, 45), 231, 166);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.3);
  setTextColor(doc, pdfColors.gold);
  doc.text("Real Estate Professional", 231, 174);
  doc.text(textLines(doc, property.brokerage, 45), 231, 181);
  setTextColor(doc, pdfColors.white);
  doc.text(property.agentPhone, 231, 188);
  doc.text(textLines(doc, property.agentEmail, 43), 231, 194);
  if (property.agentWebsite.trim()) {
    doc.text(textLines(doc, property.agentWebsite.trim(), 43), 231, 200);
  }
  drawFooterBrand(ctx, 209, 202);
  drawCoverDisclaimer(ctx);
}

export function PdfExecutiveSummary(ctx: PdfContext, property: PropertyDetails, summary: ReadinessSummary) {
  const { doc } = ctx;
  addReportPage(ctx);
  const opportunity = Math.max(0, summary.potentialScore - summary.currentScore);

  setFillColor(doc, pdfColors.navyDark);
  doc.rect(0, 0, pdfPage.width, pdfPage.height, "F");
  drawPhotoFrame(
    doc,
    summary.executivePhoto,
    { x: 0, y: 0, w: 158, h: 204 },
    { label: "Interior photo not provided", placeholder: "compact" },
  );
  setFillColor(doc, [253, 250, 241]);
  doc.rect(0, 204, pdfPage.width, 11.9, "F");
  setFillColor(doc, pdfColors.gold);
  doc.rect(158, 0, 1.4, 204, "F");
  setFillColor(doc, pdfColors.navyDark);
  doc.rect(159.4, 0, pdfPage.width - 159.4, 204, "F");
  setDrawColor(doc, [49, 69, 93]);
  doc.setLineWidth(0.35);
  doc.line(179, 122, 260, 122);

  drawKicker(doc, "Executive Summary", 179, 31, pdfColors.gold);
  doc.setFont("times", "bold");
  doc.setFontSize(29);
  setTextColor(doc, pdfColors.white);
  doc.text(textLines(doc, "A Clear Path to a Stronger Listing", 82), 179, 48);
  drawGoldRule(ctx, 179, 71, 20);
  const y = drawBody(
    doc,
    `${property.address} is being evaluated through the lens of buyer presentation, photography readiness, and first-impression quality. The recommendations focus on visible preparation choices that can help the home feel more polished before it reaches the market.`,
    174,
    85,
    84,
    8.2,
    4.8,
    [218, 226, 237],
  );
  drawBody(
    doc,
    "The score is a marketing-readiness signal based on the photos and information provided. It is not an appraisal, inspection, or promise of market performance.",
    179,
    y + 5,
    82,
    8.2,
    4.8,
    [218, 226, 237],
  );

  setFillColor(doc, [8, 32, 59]);
  doc.roundedRect(179, 135, 80, 44, 2, 2, "F");
  setDrawColor(doc, [58, 78, 103]);
  doc.setLineWidth(0.25);
  doc.line(205, 143, 205, 170);
  doc.line(232, 143, 232, 170);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setTextColor(doc, pdfColors.white);
  doc.text(`${summary.currentScore}`, 192, 153, { align: "center" });
  setTextColor(doc, pdfColors.gold);
  doc.text(`${summary.potentialScore}`, 219, 153, { align: "center" });
  setTextColor(doc, opportunity > 0 ? pdfColors.positive : [86, 187, 128]);
  doc.text(`+${opportunity}`, 246, 153, { align: "center" });
  doc.setFontSize(5.8);
  setTextColor(doc, [205, 216, 229]);
  doc.text("CURRENT", 192, 163, { align: "center" });
  doc.text("POTENTIAL", 219, 163, { align: "center" });
  doc.text("OPPORTUNITY", 246, 163, { align: "center" });
  drawReportBadge(doc, "Marketing preparation guidance", 194, 171, 50, "gold");

  drawFooterBrand(ctx, 179, 194);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  setTextColor(doc, pdfColors.slate);
  doc.text("Listing Readiness Report", 16, 211);
  doc.text("Page 2 of 8", pdfPage.width - 16, 211, { align: "right" });
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
