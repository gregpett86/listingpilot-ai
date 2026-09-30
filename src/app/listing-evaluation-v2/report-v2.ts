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
const NAVY = [8, 23, 54] as const;
const GOLD = [230, 145, 0] as const;
const MUTED = [83, 103, 134] as const;
const LIGHT = [247, 249, 252] as const;
const BORDER = [205, 214, 226] as const;

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
  const preferred = ["exterior", "landscaping", "pool"];
  for (const category of preferred) {
    const space = evaluation.spaces.find((item) => item.category === category);
    const photo = space ? photoForSpace(evaluation, space.id) : undefined;
    if (photo?.dataUrl) return photo;
  }
  return evaluation.photos.find((photo) => photo.dataUrl);
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

function drawCover(doc: jsPDF, input: ReportInput) {
  const { evaluation, agent } = input;
  const hero = coverPhoto(evaluation);

  doc.setFillColor(250, 249, 246);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text("REALTY EDGE PRO", M, 16);

  doc.setFontSize(26);
  doc.setTextColor(...NAVY);
  doc.text("Listing Readiness Evaluation", M, 30);

  if (hero?.dataUrl) {
    addImageCover(doc, hero.dataUrl, M, 39, PAGE_W - M * 2, 91);
  } else {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(M, 39, PAGE_W - M * 2, 91, 3, 3, "F");
  }

  const property = evaluation.property;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...NAVY);
  doc.text(property.address || "Property Address", M, 146);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(property.cityStateZip || "", M, 154);

  const facts = [
    property.beds ? `${property.beds} Beds` : "",
    property.baths ? `${property.baths} Baths` : "",
    property.sqft ? `${property.sqft.toLocaleString()} Sq Ft` : "",
    property.yearBuilt ? `Built ${property.yearBuilt}` : "",
  ].filter(Boolean);
  doc.text(facts.join("  •  "), M, 163);

  scoreCard(doc, M, 177, 52, "Current readiness", evaluation.currentScore ?? "—");
  scoreCard(doc, M + 58, 177, 52, "Potential", evaluation.potentialScore ?? "—");
  scoreCard(doc, M + 116, 177, 52, "Confidence", evaluation.confidence ?? "—");

  doc.setDrawColor(...BORDER);
  doc.line(M, 215, PAGE_W - M, 215);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Prepared by", M, 228);

  if (agent.headshotDataUrl) {
    addImageCover(doc, agent.headshotDataUrl, M, 234, 24, 24);
  }

  const agentX = agent.headshotDataUrl ? M + 31 : M;
  doc.setFontSize(13);
  doc.text(agent.name || "Real Estate Professional", agentX, 239);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(agent.brokerage || "Realty Edge Pro", agentX, 246);
  if (agent.phone) doc.text(agent.phone, agentX, 252);
  if (agent.email) doc.text(agent.email, agentX, 258);

  drawFooter(doc, 1);
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

  const analyses = evaluation.analyses
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

function drawRoomPage(
  doc: jsPDF,
  input: ReportInput,
  analysis: SpaceAnalysis,
  page: number,
) {
  const { evaluation } = input;
  const space = evaluation.spaces.find((item) => item.id === analysis.spaceId);
  if (!space) return;

  const roomName = displaySpaceName(space);
  const photo = photoForSpace(evaluation, space.id);
  const roomRecommendations = evaluation.recommendations.filter(
    (recommendation) =>
      recommendation.spaceId === space.id && recommendation.selected,
  );

  heading(doc, roomName, 22, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("INDIVIDUAL SPACE EVALUATION", M, 30);

  if (photo?.dataUrl) {
    addImageCover(doc, photo.dataUrl, M, 38, 73, 55);
  } else {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(M, 38, 73, 55, 3, 3, "F");
  }

  scoreCard(doc, 96, 38, 32, "Current", analysis.currentScore);
  scoreCard(doc, 133, 38, 32, "Potential", analysis.potentialScore);
  scoreCard(doc, 170, 38, 29, "Confidence", analysis.confidence);

  heading(doc, "Visible Findings", 108, 13);
  let y = 117;
  for (const finding of analysis.visibleFindings.slice(0, 6)) {
    doc.setDrawColor(...BORDER);
    doc.roundedRect(M, y, PAGE_W - M * 2, 23, 3, 3, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...(finding.kind === "positive" ? GOLD : MUTED));
    doc.text(finding.kind === "positive" ? "POSITIVE" : "OPPORTUNITY", M + 4, y + 6);
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(finding.label, M + 4, y + 12);
    subtext(doc, finding.evidence, M + 4, y + 17, PAGE_W - M * 2 - 8, 7.5);
    y += 27;
  }

  if (roomRecommendations.length) {
    if (y > 226) {
      drawFooter(doc, page);
      doc.addPage();
      page += 1;
      heading(doc, `${roomName} • Preparation Plan`, 22, 16);
      y = 34;
    } else {
      heading(doc, "What Can Raise This Score", y + 5, 13);
      y += 14;
    }

    for (const rec of roomRecommendations.slice(0, 6)) {
      if (y > 244) {
        drawFooter(doc, page);
        doc.addPage();
        page += 1;
        heading(doc, `${roomName} • Preparation Plan`, 22, 16);
        y = 34;
      }

      doc.setDrawColor(...BORDER);
      doc.roundedRect(M, y, PAGE_W - M * 2, 25, 3, 3, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(rec.title, M + 4, y + 8);

      doc.setFillColor(255, 244, 205);
      doc.roundedRect(PAGE_W - M - 30, y + 4, 25, 8, 4, 4, "F");
      doc.setFontSize(7);
      doc.setTextColor(159, 91, 0);
      doc.text(`+${rec.scoreImpact} potential`, PAGE_W - M - 17.5, y + 9.5, {
        align: "center",
      });

      subtext(doc, rec.reason, M + 4, y + 14, PAGE_W - M * 2 - 42, 7.5);
      y += 29;
    }
  }

  drawFooter(doc, page);
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

  for (const analysis of input.evaluation.analyses) {
    doc.addPage();
    page += 1;
    drawRoomPage(doc, input, analysis, page);
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
