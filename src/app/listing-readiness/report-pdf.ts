import { jsPDF } from "jspdf";
import {
  type Improvement,
  marketingHighlights,
  type PropertyDetails,
  type ReadinessSummary,
  safeFilename,
  type UploadedPhoto,
} from "./report-data";

const navy: [number, number, number] = [8, 36, 66];
const deepNavy: [number, number, number] = [4, 18, 36];
const gold: [number, number, number] = [214, 160, 39];
const lightGold: [number, number, number] = [245, 232, 199];
const gray: [number, number, number] = [82, 96, 116];
const lightGray: [number, number, number] = [244, 246, 249];
const green: [number, number, number] = [18, 139, 83];
const white: [number, number, number] = [255, 255, 255];

const pageWidth = 216;
const pageHeight = 279;
const margin = 16;

type ImageBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function setColor(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function fill(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function stroke(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function textLines(doc: jsPDF, text: string, width: number) {
  return doc.splitTextToSize(text, width) as string[];
}

function drawFooter(doc: jsPDF, page: number) {
  stroke(doc, [224, 228, 235]);
  doc.line(margin, 264, pageWidth - margin, 264);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(doc, gray);
  doc.text("REALTY EDGE PRO", margin, 271);
  doc.setFont("helvetica", "normal");
  doc.text(`Listing Readiness Report | Page ${page}`, pageWidth - margin, 271, {
    align: "right",
  });
}

function drawHeader(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, gold);
  doc.text("REALTY EDGE PRO", margin, 16);
  doc.setFontSize(15);
  setColor(doc, navy);
  doc.text(title, margin, 26);
  stroke(doc, lightGold);
  doc.line(margin, 31, pageWidth - margin, 31);
}

function addPage(doc: jsPDF, title: string, page: number) {
  if (page > 1) {
    doc.addPage();
  }
  fill(doc, white);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  drawHeader(doc, title);
  drawFooter(doc, page);
}

function drawPlaceholder(doc: jsPDF, box: ImageBox, label = "Photo not provided") {
  fill(doc, lightGray);
  stroke(doc, [219, 225, 233]);
  doc.roundedRect(box.x, box.y, box.w, box.h, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(doc, gray);
  doc.text(label, box.x + box.w / 2, box.y + box.h / 2, { align: "center" });
}

function getImageFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function drawPhoto(
  doc: jsPDF,
  photo: UploadedPhoto | undefined,
  box: ImageBox,
  label?: string,
) {
  if (!photo?.dataUrl) {
    drawPlaceholder(doc, box, label);
    return;
  }

  try {
    const props = doc.getImageProperties(photo.dataUrl);
    const imageRatio = props.width / props.height;
    const boxRatio = box.w / box.h;
    let width = box.w;
    let height = box.h;
    let x = box.x;
    let y = box.y;

    if (imageRatio > boxRatio) {
      height = box.h;
      width = height * imageRatio;
      x = box.x - (width - box.w) / 2;
    } else {
      width = box.w;
      height = width / imageRatio;
      y = box.y - (height - box.h) / 2;
    }

    doc.saveGraphicsState();
    doc.roundedRect(box.x, box.y, box.w, box.h, 2, 2, undefined);
    doc.clip();
    doc.addImage(photo.dataUrl, getImageFormat(photo.dataUrl), x, y, width, height);
    doc.restoreGraphicsState();
  } catch {
    drawPlaceholder(doc, box, "Photo could not be embedded");
  }
}

function drawScoreCircle(
  doc: jsPDF,
  score: number,
  x: number,
  y: number,
  radius: number,
  label: string,
) {
  fill(doc, white);
  stroke(doc, lightGold);
  doc.setLineWidth(2.2);
  doc.circle(x, y, radius, "FD");
  stroke(doc, gold);
  doc.setLineWidth(4);
  const start = -90;
  const end = start + (score / 100) * 360;
  const points: Array<[number, number]> = [];
  for (let angle = start; angle <= end; angle += 8) {
    const radians = (angle * Math.PI) / 180;
    points.push([x + Math.cos(radians) * radius, y + Math.sin(radians) * radius]);
  }
  for (let index = 1; index < points.length; index += 1) {
    doc.line(points[index - 1][0], points[index - 1][1], points[index][0], points[index][1]);
  }
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(radius > 16 ? 24 : 15);
  setColor(doc, navy);
  doc.text(String(score), x, y + 1, { align: "center" });
  doc.setFontSize(7);
  setColor(doc, gray);
  doc.text(label.toUpperCase(), x, y + radius + 8, { align: "center" });
}

function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  current: number,
  potential: number,
) {
  fill(doc, [232, 236, 242]);
  doc.roundedRect(x, y, width, 4, 2, 2, "F");
  fill(doc, gold);
  doc.roundedRect(x, y, Math.max(2, (width * current) / 100), 4, 2, 2, "F");
  fill(doc, green);
  doc.roundedRect(x, y, Math.max(2, (width * potential) / 100), 4, 2, 2, "F");
  fill(doc, gold);
  doc.roundedRect(x, y, Math.max(2, (width * current) / 100), 4, 2, 2, "F");
}

function drawParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  size = 10,
  lineHeight = 5,
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  setColor(doc, gray);
  const lines = textLines(doc, text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setColor(doc, navy);
  doc.text(title, x, y);
  stroke(doc, gold);
  doc.line(x, y + 3, x + 34, y + 3);
}

function detailRoomFor(summary: ReadinessSummary, room: string) {
  return (
    summary.roomOverviews.find((item) => item.room === room) ??
    summary.roomOverviews.find((item) => item.recommendations.length > 0) ??
    summary.roomOverviews[0]
  );
}

function recommendationForRoom(
  room: string,
  selectedRecommendations: Improvement[],
) {
  return (
    selectedRecommendations.find((item) => item.room === room) ??
    selectedRecommendations.find((item) => item.room === "Whole Home") ??
    selectedRecommendations[0]
  );
}

export function createListingReadinessPdf(
  property: PropertyDetails,
  summary: ReadinessSummary,
) {
  const doc = new jsPDF({ unit: "mm", format: "letter", compress: true });
  const preparedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const homeowner = property.homeownerName.trim() || "Homeowner";
  const selected = summary.selectedRecommendations;

  fill(doc, deepNavy);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  drawPhoto(doc, summary.coverPhoto, { x: 0, y: 0, w: pageWidth, h: 158 });
  fill(doc, deepNavy);
  doc.rect(0, 145, pageWidth, 134, "F");
  fill(doc, gold);
  doc.rect(0, 145, pageWidth, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(doc, gold);
  doc.text("REALTY EDGE PRO", margin, 162);
  doc.setFontSize(30);
  setColor(doc, white);
  doc.text("Listing Readiness", margin, 180);
  doc.text("Report", margin, 193);
  doc.setFontSize(15);
  doc.text(property.address, margin, 209);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(property.cityStateZip, margin, 216);
  doc.text(`${property.beds} Beds | ${property.baths} Baths | ${property.sqft} Sq Ft`, margin, 224);
  drawScoreCircle(doc, summary.currentScore, 154, 186, 17, "Current");
  drawScoreCircle(doc, summary.potentialScore, 188, 186, 17, "Potential");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, [214, 221, 232]);
  doc.text(`Prepared for ${homeowner}`, margin, 240);
  doc.text(`Prepared by ${property.agentName}, ${property.brokerage}`, margin, 247);
  doc.text(`${property.agentPhone} | ${property.agentEmail}`, margin, 254);
  doc.text(`Date prepared: ${preparedDate}`, margin, 261);
  drawFooter(doc, 1);

  addPage(doc, "Executive Summary", 2);
  drawPhoto(doc, summary.executivePhoto, { x: margin, y: 42, w: 82, h: 88 }, "Interior photo not provided");
  drawSectionTitle(doc, "Market-Ready Positioning", 112, 48);
  let y = drawParagraph(
    doc,
    `${property.address} has a strong foundation for a polished listing launch. This report focuses on the visible preparation choices that can improve buyer perception, photography readiness, and confidence before the home is presented publicly.`,
    112,
    60,
    76,
    10,
  );
  y += 6;
  drawScoreCircle(doc, summary.currentScore, 130, y + 19, 16, "Current");
  drawScoreCircle(doc, summary.potentialScore, 172, y + 19, 16, "Potential");
  drawSectionTitle(doc, "What the Score Means", margin, 154);
  drawParagraph(
    doc,
    `The Listing Readiness Score summarizes visible marketing-preparation factors from the photos and information provided. A higher score means the home is more prepared for professional photography, buyer walkthroughs, and premium marketing presentation. It does not predict or guarantee price, speed, appraisal outcome, or inspection results.`,
    margin,
    166,
    178,
  );
  fill(doc, lightGray);
  doc.roundedRect(margin, 205, 178, 34, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, navy);
  doc.text("Points of Opportunity", margin + 7, 218);
  setColor(doc, green);
  doc.setFontSize(22);
  doc.text(`+${summary.totalPossibleIncrease}`, 164, 221, { align: "right" });
  doc.setFontSize(8);
  setColor(doc, gray);
  doc.text("possible readiness points", 164, 228, { align: "right" });

  addPage(doc, "Category Scores", 3);
  let categoryY = 44;
  summary.categoryScores.forEach((category) => {
    fill(doc, white);
    stroke(doc, [226, 231, 238]);
    doc.roundedRect(margin, categoryY, 178, 27, 3, 3, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(doc, gold);
    doc.text(category.icon, margin + 7, categoryY + 11);
    doc.setFontSize(11);
    setColor(doc, navy);
    doc.text(category.name, margin + 28, categoryY + 11);
    doc.setFontSize(9);
    setColor(doc, gray);
    doc.text(`${category.current}/100 current`, margin + 28, categoryY + 20);
    setColor(doc, green);
    doc.text(`${category.potential}/100 potential`, margin + 82, categoryY + 20);
    drawProgressBar(doc, margin + 118, categoryY + 11, 54, category.current, category.potential);
    categoryY += 35;
  });
  drawSectionTitle(doc, "Top Strengths", margin, 228);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, gray);
  marketingHighlights.slice(0, 3).forEach((highlight, index) => {
    doc.text(`- ${highlight}`, margin, 240 + index * 7);
  });

  addPage(doc, "Room-by-Room Overview", 4);
  let roomY = 42;
  summary.roomOverviews.slice(0, 7).forEach((room) => {
    drawPhoto(doc, room.photo, { x: margin, y: roomY, w: 36, h: 24 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(doc, navy);
    doc.text(room.room, 60, roomY + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(doc, gray);
    doc.text(textLines(doc, room.status, 72), 60, roomY + 16);
    drawProgressBar(doc, 139, roomY + 6, 43, room.current, room.potential);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor(doc, navy);
    doc.text(`${room.current}`, 139, roomY + 18);
    setColor(doc, green);
    doc.text(`${room.potential}`, 174, roomY + 18);
    roomY += 31;
  });

  const detailRooms = [detailRoomFor(summary, "Kitchen"), detailRoomFor(summary, "Primary Bathroom")];
  detailRooms.forEach((room, index) => {
    const page = index === 0 ? 5 : 6;
    const recommendation = recommendationForRoom(room.room, selected);
    addPage(doc, `${room.room} Analysis`, page);
    drawPhoto(doc, room.photo, { x: margin, y: 42, w: 178, h: 92 }, `${room.room} photo not provided`);
    drawScoreCircle(doc, room.current, 38, 164, 15, "Current");
    drawScoreCircle(doc, room.potential, 76, 164, 15, "Potential");
    drawSectionTitle(doc, "What Is Working Well", 104, 154);
    drawParagraph(
      doc,
      `${room.room} has enough visual importance to shape buyer perception. Clean presentation, balanced lighting, and a simple composition will help this space carry more of the listing story.`,
      104,
      166,
      80,
      9,
    );
    drawSectionTitle(doc, "Recommended Improvement", margin, 207);
    if (recommendation) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setColor(doc, navy);
      doc.text(recommendation.title, margin, 220);
      const textY = drawParagraph(doc, recommendation.description, margin, 229, 178, 9);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setColor(doc, green);
      doc.text(`Score impact: +${recommendation.points} points`, margin, textY + 5);
      setColor(doc, gray);
      doc.text(`Difficulty: ${recommendation.difficulty}`, margin + 56, textY + 5);
      doc.text(`Estimated time: ${recommendation.time}`, margin + 110, textY + 5);
    } else {
      drawParagraph(doc, "No selected recommendation is assigned to this room.", margin, 220, 178, 9);
    }
  });

  addPage(doc, "Improvement Plan", 7);
  drawParagraph(
    doc,
    "This plan shows the fastest path toward the potential Listing Readiness Score using only recommendations selected by the agent.",
    margin,
    44,
    178,
  );
  fill(doc, navy);
  doc.roundedRect(margin, 62, 178, 11, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(doc, white);
  ["Priority", "Room", "Improvement", "Points", "Difficulty", "Time"].forEach((heading, index) => {
    const x = [20, 42, 75, 139, 158, 178][index];
    doc.text(heading, x, 69);
  });
  let planY = 82;
  selected
    .slice()
    .sort((a, b) => b.points - a.points)
    .forEach((item, index) => {
      if (planY > 242) return;
      if (index % 2 === 0) {
        fill(doc, [249, 250, 252]);
        doc.rect(margin, planY - 7, 178, 15, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setColor(doc, gray);
      doc.text(item.priority, 20, planY);
      doc.text(item.room, 42, planY);
      doc.text(textLines(doc, item.title, 50), 75, planY);
      doc.text(`+${item.points}`, 141, planY);
      doc.text(item.difficulty, 158, planY);
      doc.text(item.time, 178, planY);
      planY += 16;
    });
  fill(doc, lightGold);
  doc.roundedRect(margin, 236, 178, 16, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(doc, navy);
  doc.text(`Total possible selected score increase: +${summary.selectedPoints} points`, margin + 7, 246);

  addPage(doc, "Marketing Highlights and Next Steps", 8);
  drawPhoto(doc, summary.strongestPhoto, { x: margin, y: 42, w: 178, h: 78 }, "Strongest property photo not provided");
  drawSectionTitle(doc, "Marketing Highlights", margin, 138);
  let highlightY = 151;
  marketingHighlights.slice(0, 5).forEach((highlight) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, gray);
    doc.text(`- ${highlight}`, margin, highlightY);
    highlightY += 7;
  });
  drawSectionTitle(doc, "Photo Recommendations", 112, 138);
  drawParagraph(
    doc,
    "Use a clean exterior image first, lead with the kitchen and main living area, avoid redundant angles, and retake any dark or cluttered photos after the selected preparation items are complete.",
    112,
    151,
    80,
    9,
  );
  drawSectionTitle(doc, "Homeowner Plan", margin, 207);
  [
    "Choose the selected preparation items to complete.",
    "Prepare each room before professional photography.",
    "Review the final marketing photos with your agent.",
    "Launch with the strongest exterior, kitchen, and lifestyle imagery.",
  ].forEach((step, index) => {
    fill(doc, gold);
    doc.circle(margin + 4, 220 + index * 9 - 2, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(doc, white);
    doc.text(String(index + 1), margin + 4, 220 + index * 9, { align: "center" });
    drawParagraph(doc, step, margin + 12, 220 + index * 9, 90, 8, 4);
  });
  fill(doc, navy);
  doc.roundedRect(126, 210, 66, 35, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(doc, gold);
  doc.text(property.agentName, 132, 222);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, white);
  doc.text(property.brokerage, 132, 229);
  doc.text(property.agentPhone, 132, 236);
  doc.text(property.agentEmail, 132, 243);
  doc.setFontSize(6.8);
  setColor(doc, gray);
  const disclaimer =
    "This report is based on the photos and information provided and is intended for marketing preparation guidance only. It is not a home inspection, appraisal, or guarantee of sale price or market performance.";
  doc.text(textLines(doc, disclaimer, 178), margin, 256);

  return doc;
}

export function downloadListingReadinessPdf(
  property: PropertyDetails,
  summary: ReadinessSummary,
) {
  const doc = createListingReadinessPdf(property, summary);
  doc.save(`${safeFilename(property.address)}-listing-readiness-report.pdf`);
}
