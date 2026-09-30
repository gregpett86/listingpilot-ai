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

type RoomFlowState = {
  page: number;
  y: number;
};

function nextRoomPage(doc: jsPDF, state: RoomFlowState) {
  drawFooter(doc, state.page);
  doc.addPage();
  return { page: state.page + 1, y: 22 };
}

function ensureRoomSpace(
  doc: jsPDF,
  state: RoomFlowState,
  requiredHeight: number,
) {
  if (state.y + requiredHeight <= PAGE_H - 20) return state;
  return nextRoomPage(doc, state);
}

function drawRoomFlow(
  doc: jsPDF,
  input: ReportInput,
  analysis: SpaceAnalysis,
  state: RoomFlowState,
): RoomFlowState {
  const { evaluation } = input;
  const space = evaluation.spaces.find((item) => item.id === analysis.spaceId);
  if (!space) return state;

  const roomName = displaySpaceName(space);
  const photo = photoForSpace(evaluation, space.id);
  const roomRecommendations = evaluation.recommendations.filter(
    (recommendation) =>
      recommendation.spaceId === space.id && recommendation.selected,
  );

  state = ensureRoomSpace(doc, state, 72);

  if (state.y > 26) {
    doc.setDrawColor(...BORDER);
    doc.line(M, state.y - 6, PAGE_W - M, state.y - 6);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(roomName, M, state.y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("INDIVIDUAL SPACE EVALUATION", M, state.y + 7);

  const topY = state.y + 13;
  if (photo?.dataUrl) {
    addImageCover(doc, photo.dataUrl, M, topY, 58, 42);
  } else {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(M, topY, 58, 42, 3, 3, "F");
  }

  scoreCard(doc, 79, topY, 34, "Current", analysis.currentScore);
  scoreCard(doc, 118, topY, 34, "Potential", analysis.potentialScore);
  scoreCard(doc, 157, topY, 42, "Confidence", analysis.confidence);

  state.y = topY + 51;

  if (analysis.visibleFindings.length) {
    state = ensureRoomSpace(doc, state, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("Visible Findings", M, state.y);
    state.y += 7;

    for (const finding of analysis.visibleFindings.slice(0, 6)) {
      state = ensureRoomSpace(doc, state, 22);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(M, state.y, PAGE_W - M * 2, 19, 3, 3, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      const findingColor = finding.kind === "positive" ? GOLD : MUTED;
      doc.setTextColor(findingColor[0], findingColor[1], findingColor[2]);
      doc.text(
        finding.kind === "positive" ? "POSITIVE" : "OPPORTUNITY",
        M + 4,
        state.y + 5,
      );

      doc.setFontSize(8.3);
      doc.setTextColor(...NAVY);
      doc.text(finding.label, M + 4, state.y + 10.5);
      subtext(
        doc,
        finding.evidence,
        M + 4,
        state.y + 15,
        PAGE_W - M * 2 - 8,
        6.8,
      );

      state.y += 22;
    }
  }

  if (roomRecommendations.length) {
    state = ensureRoomSpace(doc, state, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("What Can Raise This Score", M, state.y);
    state.y += 7;

    for (const rec of roomRecommendations.slice(0, 6)) {
      state = ensureRoomSpace(doc, state, 24);

      doc.setDrawColor(...BORDER);
      doc.roundedRect(M, state.y, PAGE_W - M * 2, 21, 3, 3, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.setTextColor(...NAVY);
      doc.text(rec.title, M + 4, state.y + 7);

      doc.setFillColor(255, 244, 205);
      doc.roundedRect(PAGE_W - M - 30, state.y + 3.5, 25, 7.5, 4, 4, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(159, 91, 0);
      doc.text(
        `+${rec.scoreImpact} potential`,
        PAGE_W - M - 17.5,
        state.y + 8.7,
        { align: "center" },
      );

      subtext(
        doc,
        rec.reason,
        M + 4,
        state.y + 13,
        PAGE_W - M * 2 - 42,
        6.8,
      );

      state.y += 24;
    }
  }

  state.y += 10;
  return state;
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

  if (input.evaluation.analyses.length) {
    doc.addPage();
    page += 1;
    let roomState: RoomFlowState = { page, y: 22 };

    for (const analysis of input.evaluation.analyses) {
      roomState = drawRoomFlow(doc, input, analysis, roomState);
    }

    drawFooter(doc, roomState.page);
    page = roomState.page;
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
