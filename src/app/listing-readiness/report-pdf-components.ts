import { jsPDF } from "jspdf";
import type { UploadedPhoto } from "./report-data";
import { disclaimerText, pdfColors, type PdfColor, pdfPage } from "./report-pdf-styles";

export type ImageBox = {
  h: number;
  w: number;
  x: number;
  y: number;
};

export type PdfContext = {
  doc: jsPDF;
  pageNumber: number;
  preparedDate: string;
};

export function setTextColor(doc: jsPDF, color: PdfColor) {
  doc.setTextColor(color[0], color[1], color[2]);
}

export function setFillColor(doc: jsPDF, color: PdfColor) {
  doc.setFillColor(color[0], color[1], color[2]);
}

export function setDrawColor(doc: jsPDF, color: PdfColor) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

export function textLines(doc: jsPDF, text: string, width: number) {
  return doc.splitTextToSize(text, width) as string[];
}

export function addReportPage(ctx: PdfContext) {
  if (ctx.pageNumber > 1) {
    ctx.doc.addPage();
  }

  setFillColor(ctx.doc, pdfColors.paper);
  ctx.doc.rect(0, 0, pdfPage.width, pdfPage.height, "F");
}

export function drawFooter(ctx: PdfContext) {
  const { doc, pageNumber } = ctx;
  setDrawColor(doc, pdfColors.line);
  doc.setLineWidth(0.25);
  doc.line(pdfPage.margin, 199, pdfPage.width - pdfPage.margin, 199);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setTextColor(doc, pdfColors.gold);
  doc.text("REALTY EDGE PRO", pdfPage.margin, 207);
  doc.setFont("helvetica", "normal");
  setTextColor(doc, pdfColors.slate);
  doc.text(`Listing Readiness Report | Page ${pageNumber} of 8`, pdfPage.width - pdfPage.margin, 207, {
    align: "right",
  });
}

export function drawKicker(doc: jsPDF, text: string, x: number, y: number, color: PdfColor = pdfColors.gold) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setTextColor(doc, color);
  doc.text(text.toUpperCase(), x, y);
}

export function drawTitle(doc: jsPDF, text: string, x: number, y: number, size = 24, color: PdfColor = pdfColors.navy) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  setTextColor(doc, color);
  doc.text(text, x, y);
}

export function drawBody(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  size = 9.2,
  lineHeight = 5,
  color: PdfColor = pdfColors.slate,
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  setTextColor(doc, color);
  const lines = textLines(doc, text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function imageFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

export function drawPhotoFrame(
  doc: jsPDF,
  photo: UploadedPhoto | undefined,
  box: ImageBox,
  options: { label?: string; placeholder?: "compact" | "none"; radius?: number } = {},
) {
  if (!photo?.dataUrl) {
    if (options.placeholder === "none") return;
    setFillColor(doc, [238, 243, 248]);
    setDrawColor(doc, pdfColors.line);
    doc.roundedRect(box.x, box.y, box.w, box.h, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(options.placeholder === "compact" ? 7 : 9);
    setTextColor(doc, pdfColors.slate);
    doc.text(options.label ?? "Photo not provided", box.x + box.w / 2, box.y + box.h / 2, {
      align: "center",
    });
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
    doc.roundedRect(box.x, box.y, box.w, box.h, options.radius ?? 0.5, options.radius ?? 0.5, undefined);
    doc.clip();
    doc.addImage(photo.dataUrl, imageFormat(photo.dataUrl), x, y, width, height);
    doc.restoreGraphicsState();
  } catch {
    drawPhotoFrame(doc, undefined, box, {
      label: "Photo could not be embedded",
      placeholder: options.placeholder,
    });
  }
}

export function drawMetric(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  options: { align?: "center" | "left" | "right"; color?: PdfColor } = {},
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setTextColor(doc, options.color ?? pdfColors.navy);
  doc.text(value, x, y, { align: options.align });
  doc.setFontSize(6.8);
  setTextColor(doc, pdfColors.slate);
  doc.text(label.toUpperCase(), x, y + 6, { align: options.align });
}

export function drawScoreGauge(doc: jsPDF, score: number, x: number, y: number) {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 17;
  setDrawColor(doc, pdfColors.goldSoft);
  doc.setLineWidth(3);
  doc.circle(x, y, radius, "S");
  setDrawColor(doc, pdfColors.gold);
  doc.setLineWidth(4);
  const arcEnd = -90 + normalized * 3.6;
  let prev: [number, number] | null = null;
  for (let angle = -90; angle <= arcEnd; angle += 8) {
    const radians = (angle * Math.PI) / 180;
    const point: [number, number] = [
      x + Math.cos(radians) * radius,
      y + Math.sin(radians) * radius,
    ];
    if (prev) doc.line(prev[0], prev[1], point[0], point[1]);
    prev = point;
  }
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  setTextColor(doc, pdfColors.white);
  doc.text(String(normalized), x, y + 2, { align: "center" });
  doc.setFontSize(6.5);
  setTextColor(doc, pdfColors.goldSoft);
  doc.text("CURRENT SCORE", x, y + 24, { align: "center" });
}

export function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  current: number,
  potential: number,
) {
  setFillColor(doc, [226, 232, 240]);
  doc.roundedRect(x, y, width, 2.8, 1.4, 1.4, "F");
  setFillColor(doc, pdfColors.goldSoft);
  doc.roundedRect(x, y, Math.max(2, (width * potential) / 100), 2.8, 1.4, 1.4, "F");
  setFillColor(doc, pdfColors.gold);
  doc.roundedRect(x, y, Math.max(2, (width * current) / 100), 2.8, 1.4, 1.4, "F");
}

export function drawReportBadge(doc: jsPDF, text: string, x: number, y: number, width: number, tone: "gold" | "positive" | "muted" = "muted") {
  const colors = {
    gold: { fill: pdfColors.goldSoft, text: [138, 97, 7] as PdfColor },
    positive: { fill: [226, 246, 236] as PdfColor, text: pdfColors.positive },
    muted: { fill: [239, 243, 248] as PdfColor, text: pdfColors.slate },
  };
  setFillColor(doc, colors[tone].fill);
  doc.roundedRect(x, y, width, 7, 3.5, 3.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  setTextColor(doc, colors[tone].text);
  doc.text(text.toUpperCase(), x + width / 2, y + 4.7, { align: "center" });
}

export function drawDisclaimer(doc: jsPDF, x: number, y: number, width: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  setTextColor(doc, [103, 116, 138]);
  doc.text(textLines(doc, disclaimerText, width), x, y);
}
