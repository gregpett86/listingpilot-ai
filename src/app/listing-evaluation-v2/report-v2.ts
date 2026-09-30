import { jsPDF } from "jspdf";
import type {
  ImprovementRecommendation,
  ListingEvaluationV2,
  PropertySpace,
  SpaceAnalysis,
} from "@/lib/listing-evaluation-v2/types";
import { displaySpaceName } from "@/lib/listing-evaluation-v2/types";

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
  doc.text("REALTY EDGE PRO • LISTING READINESS EVALUATION", M, PAGE_H - 8);
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
  doc.text("YOUR LISTING READINESS EVALUATION", PAGE_W / 2, dividerY + 7, {
    align: "center",
    charSpace: 1.5,
  });

  const address = property.address || "Property Address";
  const location = property.cityStateZip || "";
  doc.setFontSize(8.2);
  doc.text(address.toUpperCase(), PAGE_W / 2, dividerY + 14, {
    align: "center",
    maxWidth: titleBoxW - 14,
  });
  if (location) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.text(location.toUpperCase(), PAGE_W / 2, dividerY + 20, {
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
    addImageCover(
      doc,
      agent.headshotDataUrl,
      avatarCX - avatarR,
      avatarCY - avatarR,
      avatarR * 2,
      avatarR * 2,
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

  // REP brand mark on the right. This mirrors the CMA logo position and
  // can later be replaced by the agent/brokerage logo when REP profile data is connected.
  const brandX = PAGE_W - 47;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(27, 34, 56);
  doc.text("REALTY", brandX, avatarCY - 5, { align: "center" });
  doc.setFontSize(10);
  doc.text("EDGE", brandX, avatarCY + 1, { align: "center" });
  doc.setTextColor(212, 165, 116);
  doc.text("PRO", brandX + 12, avatarCY + 1, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.8);
  doc.setTextColor(102, 102, 102);
  doc.text("PREDICT • PREPARE • LIST", brandX, avatarCY + 7, {
    align: "center",
  });
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

function drawOverview(doc: jsPDF, input: ReportInput, page: number) {
  const { evaluation } = input;
  heading(doc, "Property Score Overview", 22);
  subtext(
    doc,
    "Each area is scored independently from the visible presentation in the uploaded photos. Potential reflects the selected preparation items.",
    M,
    30,
    PAGE_W - M * 2,
  );

  scoreCard(doc, M, 42, 54, "Overall current", evaluation.currentScore ?? "—");
  scoreCard(doc, M + 60, 42, 54, "Overall potential", evaluation.potentialScore ?? "—");
  scoreCard(doc, M + 120, 42, 54, "Confidence", evaluation.confidence ?? "—");

  const analyses = sortedAnalysesByImpact(evaluation)
    .map((analysis) => ({
      analysis,
      space: evaluation.spaces.find((space) => space.id === analysis.spaceId),
    }))
    .filter((item): item is { analysis: SpaceAnalysis; space: PropertySpace } => Boolean(item.space));

  let y = 76;
  for (const item of analyses) {
    if (y > 238) {
      drawFooter(doc, page);
      doc.addPage();
      page += 1;
      heading(doc, "Property Score Overview", 22);
      y = 34;
    }

    const photo = photoForSpace(evaluation, item.space.id);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(M, y, PAGE_W - M * 2, 31, 3, 3, "S");

    if (photo?.dataUrl) {
      addImageCover(doc, photo.dataUrl, M + 2, y + 2, 38, 27);
    } else {
      doc.setFillColor(...LIGHT);
      doc.roundedRect(M + 2, y + 2, 38, 27, 2, 2, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(displaySpaceName(item.space), M + 46, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Current ${item.analysis.currentScore}`, M + 46, y + 19);
    doc.text(`Potential ${item.analysis.potentialScore}`, M + 82, y + 19);
    doc.text(
      `${item.analysis.confidence.toUpperCase()} confidence`,
      M + 126,
      y + 19,
    );

    y += 36;
  }

  drawFooter(doc, page);
  return page;
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
  const positives = analysis.visibleFindings.filter(
    (finding) => finding.kind === "positive",
  );
  const fixes = evaluation.recommendations
    .filter(
      (recommendation) =>
        recommendation.spaceId === analysis.spaceId && recommendation.selected,
    )
    .sort((a, b) => b.scoreImpact - a.scoreImpact);

  let y = 22;

  heading(doc, roomName, y, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("INDIVIDUAL SPACE EVALUATION", M, y + 8);

  const topY = y + 16;
  if (photo?.dataUrl) {
    addImageCover(doc, photo.dataUrl, M, topY, 68, 48);
  } else {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(M, topY, 68, 48, 3, 3, "F");
  }

  scoreCard(doc, 91, topY, 32, "Current", analysis.currentScore);
  scoreCard(doc, 128, topY, 32, "Potential", analysis.potentialScore);
  scoreCard(doc, 165, topY, 34, "Confidence", analysis.confidence);

  y = topY + 60;

  if (positives.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("What Presents Well", M, y);
    y += 8;

    for (const finding of positives) {
      const continuation = ensureRoomContinuation(
        doc,
        page,
        y,
        24,
        roomName,
      );
      page = continuation.page;
      y = continuation.y;

      doc.setDrawColor(...BORDER);
      doc.roundedRect(M, y, PAGE_W - M * 2, 21, 3, 3, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...GOLD);
      doc.text("POSITIVE", M + 4, y + 5);

      doc.setFontSize(8.5);
      doc.setTextColor(...NAVY);
      doc.text(finding.label, M + 4, y + 10.5);

      subtext(
        doc,
        finding.evidence,
        M + 4,
        y + 15,
        PAGE_W - M * 2 - 8,
        6.8,
      );

      y += 24;
    }
  }

  if (fixes.length) {
    const continuation = ensureRoomContinuation(
      doc,
      page,
      y + 3,
      30,
      roomName,
    );
    page = continuation.page;
    y = continuation.y + 3;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("Opportunities to Raise This Score", M, y);
    y += 8;

    for (const rec of fixes) {
      const next = ensureRoomContinuation(
        doc,
        page,
        y,
        26,
        roomName,
      );
      page = next.page;
      y = next.y;

      doc.setDrawColor(...BORDER);
      doc.roundedRect(M, y, PAGE_W - M * 2, 23, 3, 3, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.3);
      doc.setTextColor(...NAVY);
      doc.text(rec.title, M + 4, y + 7);

      doc.setFillColor(255, 244, 205);
      doc.roundedRect(PAGE_W - M - 30, y + 3.5, 25, 7.5, 4, 4, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(159, 91, 0);
      doc.text(
        `+${rec.scoreImpact} potential`,
        PAGE_W - M - 17.5,
        y + 8.7,
        { align: "center" },
      );

      subtext(
        doc,
        rec.reason,
        M + 4,
        y + 13.5,
        PAGE_W - M * 2 - 42,
        6.8,
      );

      y += 26;
    }
  }

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

  doc.addPage();
  let page = 2;
  page = drawOverview(doc, input, page);

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
  doc.save(`${safeFilename(address)}-listing-readiness-evaluation.pdf`);
}
