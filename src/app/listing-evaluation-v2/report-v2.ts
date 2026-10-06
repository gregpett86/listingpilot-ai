import { jsPDF } from "jspdf";
import type {
  ImprovementRecommendation,
  ListingEvaluationV2,
  PropertySpace,
  SpaceAnalysis,
} from "@/lib/listing-evaluation-v2/types";
import { displaySpaceName } from "@/lib/listing-evaluation-v2/types";
import { REP_REPORT_LOGO_DATA_URL } from "@/lib/rep-tools/report-logo-data";

type AgentDetails = {
  name: string;
  brokerage: string;
  phone?: string;
  email?: string;
  headshotDataUrl?: string;
};

type ReportInput = {
  evaluation: ListingEvaluationV2;
  agent: AgentDetails;
};

const PAGE_W = 215.9;
const PAGE_H = 279.4;
const M = 16;
type PdfColor = [number, number, number];

const NAVY: PdfColor = [8, 23, 54];
const GOLD: PdfColor = [230, 145, 0];
const MUTED: PdfColor = [83, 103, 134];
const LIGHT: PdfColor = [247, 249, 252];
const BORDER: PdfColor = [205, 214, 226];

function safeFilename(value: string) {
  return (value || "property")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function photoForSpace(evaluation: ListingEvaluationV2, spaceId: string) {
  const space = evaluation.spaces.find((item) => item.id === spaceId);
  if (!space) return undefined;
  return evaluation.photos.find(
    (photo) => space.photoIds.includes(photo.id) && photo.dataUrl,
  );
}

function coverPhoto(evaluation: ListingEvaluationV2) {
  // A dedicated front-of-home photo always wins. No bedroom should appear on the cover
  // while a properly identified exterior photograph is available.
  if (evaluation.coverFrontPhoto) return evaluation.coverFrontPhoto;

  const frontExterior = evaluation.spaces.find(
    (space) =>
      space.category === "exterior" &&
      /front|street|curb/i.test(space.customLabel || space.defaultLabel),
  );
  const frontPhoto = frontExterior
    ? photoForSpace(evaluation, frontExterior.id)?.dataUrl
    : undefined;
  if (frontPhoto) return frontPhoto;

  for (const category of ["exterior", "landscaping", "pool"] as const) {
    for (const space of evaluation.spaces.filter((item) => item.category === category)) {
      const photo = photoForSpace(evaluation, space.id);
      if (photo?.dataUrl) return photo.dataUrl;
    }
  }
  return evaluation.photos.find((photo) => photo.dataUrl)?.dataUrl;
}

/** Fit an image within a square frame without stretching or bleeding into page margins. */
function addSquareCoverImage(doc: jsPDF, dataUrl: string, x: number, y: number, size: number) {
  doc.setFillColor(232, 221, 212);
  doc.rect(x, y, size, size, "F");
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = props.width / props.height;
    const width = ratio >= 1 ? size : size * ratio;
    const height = ratio >= 1 ? size / ratio : size;
    doc.addImage(
      dataUrl,
      props.fileType || "JPEG",
      x + (size - width) / 2,
      y + (size - height) / 2,
      width,
      height,
      undefined,
      "FAST",
    );
  } catch {
    // Keep the neutral frame rather than distort or substitute an unrelated image.
  }
}

function addImageCover(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  try {
    doc.addImage(dataUrl, "JPEG", x, y, width, height, undefined, "FAST");
    return;
  } catch {}
  try {
    doc.addImage(dataUrl, "PNG", x, y, width, height, undefined, "FAST");
  } catch {}
}


function addCircularCoverImage(
  doc: jsPDF,
  dataUrl: string,
  cx: number,
  cy: number,
  radius: number,
) {
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = props.width / props.height;
    const diameter = radius * 2;

    let drawW = diameter;
    let drawH = diameter;
    let drawX = cx - radius;
    let drawY = cy - radius;

    if (ratio > 1) {
      drawW = diameter * ratio;
      drawX = cx - drawW / 2;
    } else if (ratio < 1) {
      drawH = diameter / ratio;
      drawY = cy - drawH * 0.34;
    }

    doc.saveGraphicsState();
    doc.circle(cx, cy, radius, "S");
    doc.clip();
    doc.discardPath();
    doc.addImage(
      dataUrl,
      props.fileType || "JPEG",
      drawX,
      drawY,
      drawW,
      drawH,
      undefined,
      "FAST",
    );
    doc.restoreGraphicsState();
  } catch {
    // Leave the neutral inner circle visible if the headshot cannot render.
  }
}

function heading(doc: jsPDF, text: string, y: number, size = 18) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(...NAVY);
  doc.text(text, M, y);
}

function subtext(doc: jsPDF, text: string, x: number, y: number, width: number, size = 9) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(...MUTED);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return lines.length * (size * 0.42);
}

function scoreCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string | number,
) {
  doc.setFillColor(...LIGHT);
  doc.roundedRect(x, y, width, 24, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), x + 4, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(String(value), x + 4, y + 18);
}

function priorityLabel(priority: ImprovementRecommendation["priority"]) {
  if (priority === "do_first") return "DO FIRST";
  if (priority === "next_if_possible") return "NEXT IF POSSIBLE";
  return "OPTIONAL POLISH";
}

function drawFooter(doc: jsPDF, page: number) {
  doc.setDrawColor(...BORDER);
  doc.line(M, PAGE_H - 13, PAGE_W - M, PAGE_H - 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("REALTY EDGE PRO • LISTING AI REPORT", M, PAGE_H - 8);
  doc.text(String(page), PAGE_W - M, PAGE_H - 8, { align: "right" });
}

function agentInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "AI";
}

function drawCover(doc: jsPDF, input: ReportInput) {
  const { evaluation, agent } = input;
  const hero = coverPhoto(evaluation);
  const property = evaluation.property;

  // Same CMA-family typography and agent strip, with a centered square photo
  // and generous cream margins instead of the previous edge-to-edge image.
  doc.setFillColor(245, 243, 239);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  const titleBoxX = 31.8;
  const titleBoxY = 10;
  const titleBoxW = PAGE_W - titleBoxX * 2;
  const titleBoxH = 85;
  const agentBarH = 42;
  const agentBarY = PAGE_H - agentBarH;
  const imageSize = 156;
  const imageX = (PAGE_W - imageSize) / 2;
  const imageY = 70;

  if (hero) {
    addSquareCoverImage(doc, hero, imageX, imageY, imageSize);
  } else {
    doc.setFillColor(232, 221, 212);
    doc.rect(imageX, imageY, imageSize, imageSize, "F");
  }

  // Title card overlays the hero image, like the CMA cover.
  doc.setFillColor(255, 255, 255);
  doc.rect(titleBoxX, titleBoxY, titleBoxW, titleBoxH, "F");
  doc.setDrawColor(26, 26, 26);
  doc.setLineWidth(0.7);
  doc.rect(titleBoxX, titleBoxY, titleBoxW, titleBoxH, "S");

  doc.setFont("times", "italic");
  doc.setFontSize(24);
  doc.setTextColor(26, 26, 26);

  const titleLines = [
    "Understanding",
    "Your Home's",
    "Listing Readiness",
  ];
  let titleY = titleBoxY + 19;
  for (const line of titleLines) {
    doc.text(line, PAGE_W / 2, titleY, { align: "center" });
    titleY += 12;
  }

  const dividerY = titleY + 1;
  doc.setDrawColor(26, 26, 26);
  doc.setLineWidth(0.35);
  doc.line(PAGE_W / 2 - 31, dividerY, PAGE_W / 2 + 31, dividerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(26, 26, 26);
  doc.text(
    "YOUR LISTING READINESS EVALUATION",
    titleBoxX + titleBoxW / 2,
    dividerY + 7,
    {
      align: "center",
      charSpace: 1.5,
    },
  );

  const address = property.address || "Property Address";
  const location = property.cityStateZip || "";
  doc.setFontSize(8.2);
  doc.text(address.toUpperCase(), titleBoxX + titleBoxW / 2, dividerY + 14, {
    align: "center",
    maxWidth: titleBoxW - 14,
  });
  if (location) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.text(location.toUpperCase(), titleBoxX + titleBoxW / 2, dividerY + 20, {
      align: "center",
      maxWidth: titleBoxW - 14,
    });
  }

  // Agent strip.
  doc.setFillColor(245, 243, 239);
  doc.rect(0, agentBarY, PAGE_W, agentBarH, "F");
  doc.setFillColor(212, 165, 116);
  doc.rect(0, agentBarY, PAGE_W, 0.8, "F");

  const avatarR = 14;
  const avatarCX = 23;
  const avatarCY = agentBarY + agentBarH / 2;

  doc.setFillColor(212, 165, 116);
  doc.circle(avatarCX, avatarCY, avatarR + 1.2, "F");
  doc.setFillColor(245, 243, 239);
  doc.circle(avatarCX, avatarCY, avatarR + 0.5, "F");

  if (agent.headshotDataUrl) {
    addCircularCoverImage(
      doc,
      agent.headshotDataUrl,
      avatarCX,
      avatarCY,
      avatarR,
    );
  } else {
    doc.setFillColor(27, 34, 56);
    doc.circle(avatarCX, avatarCY, avatarR, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(agentInitials(agent.name), avatarCX, avatarCY + 3.5, {
      align: "center",
    });
  }

  const nameX = 42;
  doc.setFont("times", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(26, 26, 26);
  doc.text(agent.name || "Your Real Estate Professional", nameX, avatarCY - 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(102, 102, 102);
  doc.text(
    agent.brokerage ? agent.brokerage.toUpperCase() : "REALTOR®",
    nameX,
    avatarCY + 5,
  );

  // Official Realty Edge Pro logo on the report's beige agent strip.
  // The source image is prepared on the same beige background so it blends cleanly.
  const logoW = 48;
  const logoH = 27.3;
  const logoX = PAGE_W - M - logoW;
  const logoY = agentBarY + (agentBarH - logoH) / 2;
  try {
    doc.addImage(
      REP_REPORT_LOGO_DATA_URL,
      "JPEG",
      logoX,
      logoY,
      logoW,
      logoH,
      undefined,
      "FAST",
    );
  } catch {
    // Keep the agent strip intact if the logo image cannot render.
  }
}

function sortedAnalysesByImpact(evaluation: ListingEvaluationV2) {
  return [...evaluation.analyses].sort((a, b) => {
    const aImpact = a.potentialScore - a.currentScore;
    const bImpact = b.potentialScore - b.currentScore;

    if (bImpact !== aImpact) return bImpact - aImpact;
    if (a.currentScore !== b.currentScore) return a.currentScore - b.currentScore;
    return b.potentialScore - a.potentialScore;
  });
}

function startFreshRoomPage(doc: jsPDF, page: number) {
  doc.addPage();
  return { page: page + 1, y: 22 };
}

function ensureRoomContinuation(
  doc: jsPDF,
  page: number,
  y: number,
  requiredHeight: number,
  roomName: string,
) {
  if (y + requiredHeight <= PAGE_H - 20) {
    return { page, y };
  }

  drawFooter(doc, page);
  doc.addPage();
  const nextPage = page + 1;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(`${roomName} • Continued`, M, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("INDIVIDUAL SPACE EVALUATION", M, 30);

  return { page: nextPage, y: 40 };
}

function drawRoomSection(
  doc: jsPDF,
  input: ReportInput,
  analysis: SpaceAnalysis,
  page: number,
) {
  const { evaluation } = input;
  const space = evaluation.spaces.find((item) => item.id === analysis.spaceId);
  if (!space) return page;

  const roomName = displaySpaceName(space);
  const photo = photoForSpace(evaluation, space.id);
  const positives = analysis.visibleFindings
    .filter((finding) => finding.kind === "positive")
    .slice(0, 4);
  const fixes = evaluation.recommendations
    .filter(
      (recommendation) =>
        recommendation.spaceId === analysis.spaceId && recommendation.selected,
    )
    .sort((a, b) => b.scoreImpact - a.scoreImpact)
    .slice(0, 3);

  // Match the Listing AI dashboard visual language exactly.
  doc.setFillColor(249, 247, 242);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  const pageX = 13;
  const contentW = PAGE_W - pageX * 2;

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...NAVY);
  doc.text(roomName, pageX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(123, 127, 134);
  doc.text("INDIVIDUAL SPACE EVALUATION", pageX, 25);

  const photoY = 31;
  const photoH = 60;
  doc.setFillColor(241, 236, 228);
  doc.roundedRect(pageX, photoY, contentW, photoH, 3, 3, "F");

  if (photo?.dataUrl) {
    try {
      const props = doc.getImageProperties(photo.dataUrl);
      const ratio = props.width / props.height;
      const frameRatio = contentW / photoH;
      let drawW = contentW;
      let drawH = photoH;
      let drawX = pageX;
      let drawY = photoY;

      if (ratio > frameRatio) {
        drawW = photoH * ratio;
        drawX = pageX - (drawW - contentW) / 2;
      } else {
        drawH = contentW / ratio;
        drawY = photoY - (drawH - photoH) / 2;
      }

      doc.saveGraphicsState();
      doc.roundedRect(pageX, photoY, contentW, photoH, 3, 3);
      doc.clip();
      doc.discardPath();
      doc.addImage(
        photo.dataUrl,
        props.fileType || "JPEG",
        drawX,
        drawY,
        drawW,
        drawH,
        undefined,
        "FAST",
      );
      doc.restoreGraphicsState();
    } catch {}
  }

  const scoreY = 96;
  const scoreGap = 4;
  const scoreW = (contentW - scoreGap * 2) / 3;

  function dashboardScoreCard(x: number, label: string, value: string | number) {
    doc.setFillColor(241, 236, 228);
    doc.roundedRect(x, scoreY, scoreW, 26, 3, 3, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(123, 127, 134);
    doc.text(label.toUpperCase(), x + 4, scoreY + 7);

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text(String(value), x + 4, scoreY + 19);
  }

  dashboardScoreCard(pageX, "Current score", analysis.currentScore);
  dashboardScoreCard(pageX + scoreW + scoreGap, "Potential score", analysis.potentialScore);
  dashboardScoreCard(
    pageX + (scoreW + scoreGap) * 2,
    "Confidence",
    analysis.confidence.charAt(0).toUpperCase() + analysis.confidence.slice(1),
  );

  let y = 135;

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("What Presents Well", pageX, y);
  y += 7;

  const positiveGap = 3;
  const positiveW = (contentW - positiveGap) / 2;
  const positiveH = 31;

  positives.forEach((finding, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = pageX + col * (positiveW + positiveGap);
    const cardY = y + row * (positiveH + 3);

    doc.setFillColor(249, 247, 242);
    doc.setDrawColor(8, 23, 54);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, cardY, positiveW, positiveH, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.setTextColor(154, 113, 0);
    doc.text("POSITIVE", x + 4, cardY + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...NAVY);
    const titleLines = doc.splitTextToSize(finding.label, positiveW - 8).slice(0, 2);
    doc.text(titleLines, x + 4, cardY + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.setTextColor(109, 112, 119);
    const titleHeight = titleLines.length * 3.6;
    const evidenceLines = doc
      .splitTextToSize(finding.evidence, positiveW - 8)
      .slice(0, 3);
    doc.text(evidenceLines, x + 4, cardY + 14 + titleHeight + 3);
  });

  const positiveRows = Math.ceil(positives.length / 2);
  y += positiveRows * (positiveH + 3) + 5;

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("Opportunities to Raise This Score", pageX, y);
  y += 7;

  const opportunityH = 24;

  fixes.forEach((rec) => {
    doc.setFillColor(249, 247, 242);
    doc.setDrawColor(8, 23, 54);
    doc.setLineWidth(0.25);
    doc.roundedRect(pageX, y, contentW, opportunityH, 3, 3, "FD");

    // Dashboard-style selected checkbox.
    doc.setFillColor(13, 110, 253);
    doc.roundedRect(pageX + 4, y + 8.2, 3.5, 3.5, 0.5, 0.5, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.45);
    doc.line(pageX + 4.7, y + 10, pageX + 5.5, y + 10.8);
    doc.line(pageX + 5.5, y + 10.8, pageX + 6.9, y + 9.1);

    const textX = pageX + 10;
    const pillW = 26;
    const pillX = pageX + contentW - pillW - 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...NAVY);
    const titleLines = doc.splitTextToSize(rec.title, contentW - 49).slice(0, 1);
    doc.text(titleLines, textX, y + 8);

    doc.setFillColor(245, 233, 197);
    doc.roundedRect(pillX, y + 4.5, pillW, 7, 3.5, 3.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.setTextColor(122, 88, 0);
    doc.text(`+${rec.scoreImpact} potential`, pillX + pillW / 2, y + 9.2, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.setTextColor(109, 112, 119);
    const reasonLines = doc.splitTextToSize(rec.reason, contentW - 20).slice(0, 2);
    doc.text(reasonLines, textX, y + 14);

    if (rec.evidence) {
      doc.setFontSize(5.9);
      doc.setTextColor(123, 127, 134);
      const evidenceLines = doc
        .splitTextToSize(`Visible evidence: ${rec.evidence}`, contentW - 20)
        .slice(0, 1);
      doc.text(evidenceLines, textX, y + 20.5);
    }

    y += opportunityH + 3;
  });

  drawFooter(doc, page);
  return page;
}

function drawPrioritySummary(doc: jsPDF, input: ReportInput, page: number) {
  const { evaluation } = input;
  heading(doc, "Highest-Impact Preparation Plan", 22, 20);
  subtext(
    doc,
    "The selected recommendations are ordered by priority and expected contribution to listing readiness.",
    M,
    30,
    PAGE_W - M * 2,
  );

  let y = 42;
  const groups: ImprovementRecommendation["priority"][] = [
    "do_first",
    "next_if_possible",
    "optional_polish",
  ];

  for (const priority of groups) {
    const items = evaluation.recommendations
      .filter((item) => item.selected && item.priority === priority)
      .sort((a, b) => b.scoreImpact - a.scoreImpact);

    if (!items.length) continue;

    if (y > 232) {
      drawFooter(doc, page);
      doc.addPage();
      page += 1;
      y = 24;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(priorityLabel(priority), M, y);
    y += 7;

    for (const item of items) {
      if (y > 242) {
        drawFooter(doc, page);
        doc.addPage();
        page += 1;
        y = 24;
      }

      const space = evaluation.spaces.find((candidate) => candidate.id === item.spaceId);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(M, y, PAGE_W - M * 2, 26, 3, 3, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(item.title, M + 4, y + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(
        space ? displaySpaceName(space).toUpperCase() : "PROPERTY",
        M + 4,
        y + 14,
      );

      subtext(doc, item.reason, M + 4, y + 20, PAGE_W - M * 2 - 28, 7.3);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...GOLD);
      doc.text(`+${item.scoreImpact}`, PAGE_W - M - 5, y + 8, {
        align: "right",
      });

      y += 30;
    }

    y += 4;
  }

  if (y < 228) {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(M, y + 2, PAGE_W - M * 2, 27, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text("Assessment limitations", M + 4, y + 10);
    subtext(
      doc,
      "This evaluation is based only on visible presentation in the submitted photographs. It is not a home inspection and does not assess hidden defects, mechanical systems, structural conditions, code compliance, or property value.",
      M + 4,
      y + 17,
      PAGE_W - M * 2 - 8,
      7.4,
    );
  }

  drawFooter(doc, page);
}

export function createListingEvaluationV2Pdf(input: ReportInput) {
  const doc = new jsPDF({
    format: "letter",
    orientation: "portrait",
    unit: "mm",
    compress: true,
  });

  drawCover(doc, input);

  let page = 1;

  for (const analysis of sortedAnalysesByImpact(input.evaluation)) {
    const fresh = startFreshRoomPage(doc, page);
    page = drawRoomSection(doc, input, analysis, fresh.page);
  }

  doc.addPage();
  page += 1;
  drawPrioritySummary(doc, input, page);

  return doc;
}

export function downloadListingEvaluationV2Pdf(input: ReportInput) {
  const doc = createListingEvaluationV2Pdf(input);
  const address = input.evaluation.property.address || "listing-evaluation";
  doc.save(`${safeFilename(address)}-listing-ai-dashboard-report.pdf`);
}
