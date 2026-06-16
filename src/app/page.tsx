"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  RealtyEdgePageHeader,
  RealtyEdgeShell,
} from "@/components/realty-edge-shell";

type PropertyArea =
  | "Kitchen"
  | "Bathrooms"
  | "Living Areas"
  | "Bedrooms"
  | "Exterior"
  | "Landscaping";

type Confidence = "High" | "Medium" | "Low";

type PhotoItem = {
  id: string;
  name: string;
  url: string;
  size: number;
  area: PropertyArea;
};

type AreaFinding = {
  area: PropertyArea;
  condition: string;
  recommendations: string[];
  sellerTalkingPoints: string[];
  confidence: Confidence;
};

type ImprovementPlan = {
  area: PropertyArea;
  priority: "High" | "Medium";
  recommendation: string;
  estimatedCost: string;
  potentialAddedValue: string;
};

type OptimizationReport = {
  propertySummary: string;
  marketValue: string;
  findings: AreaFinding[];
  improvements: ImprovementPlan[];
  asIsSummary: string;
  improveSummary: string;
  marketingStrategy: string[];
  nextSteps: string[];
};

const propertyAreas: PropertyArea[] = [
  "Kitchen",
  "Bathrooms",
  "Living Areas",
  "Bedrooms",
  "Exterior",
  "Landscaping",
];

const confidenceStyles: Record<Confidence, string> = {
  High: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-slate-200 bg-slate-50 text-slate-700",
};

const improvementRanges: Record<
  PropertyArea,
  Pick<ImprovementPlan, "estimatedCost" | "potentialAddedValue">
> = {
  Kitchen: {
    estimatedCost: "$750 - $4,500",
    potentialAddedValue: "$3,000 - $12,000",
  },
  Bathrooms: {
    estimatedCost: "$500 - $3,500",
    potentialAddedValue: "$2,000 - $9,000",
  },
  "Living Areas": {
    estimatedCost: "$300 - $2,500",
    potentialAddedValue: "$1,500 - $6,500",
  },
  Bedrooms: {
    estimatedCost: "$250 - $1,800",
    potentialAddedValue: "$1,000 - $4,000",
  },
  Exterior: {
    estimatedCost: "$600 - $5,000",
    potentialAddedValue: "$3,000 - $14,000",
  },
  Landscaping: {
    estimatedCost: "$350 - $3,000",
    potentialAddedValue: "$2,000 - $8,000",
  },
};

const analysisCopy: Record<PropertyArea, Omit<AreaFinding, "area" | "confidence">> = {
  Kitchen: {
    condition:
      "Core buyer-facing surfaces look serviceable, but cabinet tone, counters, hardware, and lighting should be reviewed closely before photography.",
    recommendations: [
      "Refresh cabinet pulls and visible fixtures for a low-cost modernization pass.",
      "Clear counters and add warm task lighting before listing photos.",
      "Consider painting dated cabinetry if the finish reads heavy in photos.",
    ],
    sellerTalkingPoints: [
      "Small kitchen updates can improve first impressions without a full remodel.",
      "Staging the kitchen around light, clean surfaces helps buyers picture daily use.",
    ],
  },
  Bathrooms: {
    condition:
      "Bathrooms appear to be functional spaces where cleanliness, caulk lines, mirrors, and fixture finish will drive perceived condition.",
    recommendations: [
      "Replace worn caulk, grout discoloration, and mismatched towel hardware.",
      "Use brighter bulbs and simple neutral linens for showing day consistency.",
      "Prioritize vanity hardware or faucet swaps over larger construction.",
    ],
    sellerTalkingPoints: [
      "Buyers often price bathroom wear emotionally, so small polish matters.",
      "A crisp bathroom presentation can reduce inspection anxiety.",
    ],
  },
  "Living Areas": {
    condition:
      "Shared spaces should be positioned around openness, natural light, and traffic flow. Furniture density will shape buyer perception.",
    recommendations: [
      "Remove oversized furniture to widen walking paths and sight lines.",
      "Patch wall scuffs and use one neutral accent texture to add warmth.",
      "Stage the main seating area to point toward the strongest focal feature.",
    ],
    sellerTalkingPoints: [
      "The goal is to make the home feel larger in listing photos and walkthroughs.",
      "Neutral, open living spaces help buyers project their own furniture into the room.",
    ],
  },
  Bedrooms: {
    condition:
      "Bedrooms should read calm, uncluttered, and proportional. Closet presentation and textile choices will influence perceived storage.",
    recommendations: [
      "Use simple bedding, matching lamps, and minimal surface decor.",
      "Reduce closet contents before photography to suggest stronger storage.",
      "Touch up baseboards and high-contact wall areas near beds and doors.",
    ],
    sellerTalkingPoints: [
      "A calmer bedroom presentation supports the home's lifestyle story.",
      "Organized closets quietly reinforce that the home has enough storage.",
    ],
  },
  Exterior: {
    condition:
      "The exterior is the first trust signal. Entry condition, paint touch-ups, lighting, and walkway clarity should be reviewed before launch.",
    recommendations: [
      "Power wash walkways, siding touchpoints, and the entry approach.",
      "Repaint or polish the front door hardware and house numbers.",
      "Check exterior bulbs and remove visible storage from porches or side yards.",
    ],
    sellerTalkingPoints: [
      "Curb appeal sets the emotional anchor before buyers enter the home.",
      "A tidy entry can make the property feel better maintained overall.",
    ],
  },
  Landscaping: {
    condition:
      "Landscaping should frame the home rather than distract from it. Edging, mulch, and seasonal color will deliver quick visual lift.",
    recommendations: [
      "Add fresh mulch and sharpen bed edges before photos.",
      "Trim overgrowth around windows, paths, and the front elevation.",
      "Use a few seasonal planters near the entry instead of broad planting work.",
    ],
    sellerTalkingPoints: [
      "Simple landscaping cleanup can make online thumbnails more competitive.",
      "A maintained yard suggests lower effort for the next owner.",
    ],
  },
};

function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

function inferArea(fileName: string, index: number): PropertyArea {
  const normalized = fileName.toLowerCase();
  const keywordMatch = propertyAreas.find((area) => {
    const areaWords = area.toLowerCase().split(" ");
    return areaWords.some((word) => normalized.includes(word.replace(/s$/, "")));
  });

  return keywordMatch ?? propertyAreas[index % propertyAreas.length];
}

function buildFindings(photos: PhotoItem[]): AreaFinding[] {
  const coveredAreas = propertyAreas.filter((area) =>
    photos.some((photo) => photo.area === area),
  );

  return coveredAreas.map((area) => {
    const photoCount = photos.filter((photo) => photo.area === area).length;
    const confidence: Confidence =
      photoCount >= 4 ? "High" : photoCount >= 2 ? "Medium" : "Low";

    return {
      area,
      confidence,
      ...analysisCopy[area],
    };
  });
}

function buildReport(findings: AreaFinding[], photos: PhotoItem[]): OptimizationReport {
  const strongestAreas = findings
    .filter((finding) => finding.confidence !== "Low")
    .map((finding) => finding.area);

  const improvements: ImprovementPlan[] = findings.flatMap((finding, index) => {
    const primaryRecommendation = finding.recommendations[0];
    const priority: ImprovementPlan["priority"] =
      index < 3 ? "High" : "Medium";

    return primaryRecommendation
      ? [
          {
            area: finding.area,
            priority,
            recommendation: primaryRecommendation,
            ...improvementRanges[finding.area],
          },
        ]
      : [];
  });

  return {
    propertySummary: `Analysis based on ${photos.length} uploaded photos across ${findings.length} property areas. ${
      strongestAreas.length
        ? `The strongest coverage is in ${strongestAreas.join(", ")}.`
        : "Additional photos would improve confidence before a final seller presentation."
    }`,
    marketValue:
      "Current Market Value: Placeholder pending CMA, recent comparable sales, and agent pricing strategy.",
    findings,
    improvements,
    asIsSummary:
      "Selling as-is may reduce prep time and upfront spend, but visible cosmetic friction can weaken online conversion and give buyers more negotiation room.",
    improveSummary:
      "Completing targeted, photo-visible improvements can strengthen launch presentation, support pricing confidence, and create cleaner seller talking points.",
    marketingStrategy: [
      "Lead with the home's strongest lifestyle spaces in listing photos and social previews.",
      "Use improvement notes to frame seller preparation as strategic, not cosmetic overreach.",
      "Highlight fresh exterior, clean kitchen surfaces, and bright shared spaces in remarks.",
      "Position completed work as buyer confidence signals during showings and follow-up.",
    ],
    nextSteps: [
      "Collect any missing room or exterior photos before finalizing recommendations.",
      "Review cost ranges with preferred vendors for local pricing accuracy.",
      "Choose which high-priority improvements the seller can complete before photography.",
      "Pair the final report with CMA pricing guidance and launch timeline.",
    ],
  };
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function ensurePdfSpace(doc: jsPDF, y: number, neededSpace = 28) {
  if (y + neededSpace < 280) {
    return y;
  }

  doc.addPage();
  return 20;
}

function exportReportPdf(report: OptimizationReport) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const margin = 18;
  const contentWidth = 180;
  let y = 20;

  const addSectionTitle = (title: string) => {
    y = ensurePdfSpace(doc, y, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 7;
  };

  const addParagraph = (text: string) => {
    y = ensurePdfSpace(doc, y, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    y = addWrappedText(doc, text, margin, y, contentWidth, 5) + 3;
  };

  const addBulletList = (items: string[]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);

    items.forEach((item) => {
      y = ensurePdfSpace(doc, y, 14);
      const lines = doc.splitTextToSize(item, contentWidth - 6) as string[];
      doc.text("-", margin, y);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("ListingPilot AI", margin, y);
  y += 9;
  doc.setFontSize(16);
  doc.text("Home Sale Optimization Report", margin, y);
  y += 10;
  doc.setDrawColor(13, 148, 136);
  doc.line(margin, y, margin + contentWidth, y);
  y += 10;

  addSectionTitle("Property Summary");
  addParagraph(report.propertySummary);

  addSectionTitle("Current Market Value");
  addParagraph(report.marketValue);

  addSectionTitle("AI Findings");
  report.findings.forEach((finding) => {
    y = ensurePdfSpace(doc, y, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${finding.area} (${finding.confidence} confidence)`, margin, y);
    y += 6;
    addParagraph(finding.condition);
    addBulletList(finding.sellerTalkingPoints);
  });

  addSectionTitle("Recommended Improvements");
  report.improvements.forEach((improvement) => {
    y = ensurePdfSpace(doc, y, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${improvement.area} - ${improvement.priority} Priority`, margin, y);
    y += 6;
    addParagraph(improvement.recommendation);
    addParagraph(
      `Estimated Cost Range: ${improvement.estimatedCost} | Potential Added Sale Value Range: ${improvement.potentialAddedValue}`,
    );
  });

  addSectionTitle("Sell As-Is vs Improve Comparison");
  addParagraph(`Sell As-Is: ${report.asIsSummary}`);
  addParagraph(`Improve Before Launch: ${report.improveSummary}`);

  addSectionTitle("Marketing Strategy");
  addBulletList(report.marketingStrategy);

  addSectionTitle("Next Steps");
  addBulletList(report.nextSteps);

  doc.save("listingpilot-home-sale-optimization-report.pdf");
}

export default function Home() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [findings, setFindings] = useState<AreaFinding[]>([]);
  const [report, setReport] = useState<OptimizationReport | null>(null);

  const photoCounts = useMemo(
    () =>
      propertyAreas.map((area) => ({
        area,
        count: photos.filter((photo) => photo.area === area).length,
      })),
    [photos],
  );

  const totalSize = useMemo(
    () => photos.reduce((sum, photo) => sum + photo.size, 0),
    [photos],
  );

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []).slice(0, 30);
    const nextPhotos = selectedFiles.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      area: inferArea(file.name, index),
    }));

    setPhotos(nextPhotos);
    setFindings([]);
    setReport(null);
    event.target.value = "";
  }

  function updatePhotoArea(photoId: string, area: PropertyArea) {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, area } : photo,
      ),
    );
    setFindings([]);
    setReport(null);
  }

  function analyzePhotos() {
    setIsAnalyzing(true);
    window.setTimeout(() => {
      setFindings(buildFindings(photos));
      setReport(null);
      setIsAnalyzing(false);
    }, 900);
  }

  function createReport() {
    setReport(buildReport(findings, photos));
  }

  const readyForAnalysis = photos.length >= 6;
  const recommendedCountMet = photos.length >= 20 && photos.length <= 30;

  return (
    <RealtyEdgeShell>
      <div className="flex h-full flex-col bg-[#F0F2F8] text-[#111827]">
        <RealtyEdgePageHeader />
        <div className="flex-1 overflow-y-auto">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                ListingPilot AI
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
                Home Sale Optimization Report
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Upload property photos, review AI-assisted condition findings,
                and prepare seller-ready recommendations for the listing plan.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
              <div>
                <p className="text-2xl font-semibold">{photos.length}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Photos
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{findings.length}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Findings
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {photos.length ? formatBytes(totalSize) : "0 MB"}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Uploaded
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[360px_1fr] lg:px-10">
        <aside className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Photo Upload</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Upload 20-30 property photos for best coverage. A smaller sample
              can still generate a draft analysis.
            </p>
            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-teal-500 hover:bg-teal-50">
              <span className="text-sm font-semibold text-slate-900">
                Select property photos
              </span>
              <span className="mt-1 text-xs text-slate-500">
                JPG, PNG, or WebP. Up to 30 images.
              </span>
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
              />
            </label>

            <div className="mt-5 rounded-md bg-slate-100 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">
                  Recommended range
                </span>
                <span
                  className={
                    recommendedCountMet ? "text-emerald-700" : "text-amber-700"
                  }
                >
                  {recommendedCountMet ? "Met" : "20-30 photos"}
                </span>
              </div>
            </div>

            <button
              className="mt-4 w-full rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!readyForAnalysis || isAnalyzing}
              onClick={analyzePhotos}
            >
              {isAnalyzing ? "Analyzing photos..." : "Run AI Analysis"}
            </button>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Coverage</h2>
            <div className="mt-4 space-y-3">
              {photoCounts.map(({ area, count }) => (
                <div key={area}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{area}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-teal-600"
                      style={{ width: `${Math.min(count * 25, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Uploaded Photos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Confirm or adjust room categories before analysis.
                </p>
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="mt-5 flex min-h-80 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-center">
                <div className="max-w-sm px-6">
                  <p className="text-lg font-semibold text-slate-800">
                    No photos uploaded yet
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Start with exterior, kitchen, bathroom, living area, and
                    bedroom photos to produce a balanced report.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {photos.map((photo) => (
                  <article
                    key={photo.id}
                    className="overflow-hidden rounded-md border border-slate-200 bg-white"
                  >
                    <div className="aspect-[4/3] bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={photo.name}
                        className="h-full w-full object-cover"
                        src={photo.url}
                      />
                    </div>
                    <div className="space-y-3 p-3">
                      <div>
                        <p className="truncate text-sm font-semibold">
                          {photo.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(photo.size)}
                        </p>
                      </div>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={photo.area}
                        onChange={(event) =>
                          updatePhotoArea(
                            photo.id,
                            event.target.value as PropertyArea,
                          )
                        }
                      >
                        {propertyAreas.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {findings.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">AI Findings Preview</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review the analysis, then generate the seller-facing report.
                  </p>
                </div>
                <button
                  className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  onClick={createReport}
                >
                  Create Report
                </button>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {findings.map((finding) => (
                  <article
                    key={finding.area}
                    className="rounded-md border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">{finding.area}</h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${confidenceStyles[finding.confidence]}`}
                      >
                        {finding.confidence}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {finding.condition}
                    </p>
                    <div className="mt-4">
                      <p className="text-sm font-semibold">Recommendations</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                        {finding.recommendations.map((recommendation) => (
                          <li key={recommendation}>{recommendation}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {report && (
            <div className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                    Generated Report
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Home Sale Optimization Report
                  </h2>
                </div>
                <button
                  className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                  onClick={() => exportReportPdf(report)}
                >
                  Download PDF
                </button>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
                <div className="space-y-6 p-5">
                  <section>
                    <h3 className="text-base font-semibold">
                      Property Summary
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {report.propertySummary}
                    </p>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold">
                      Current Market Value
                    </h3>
                    <p className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      {report.marketValue}
                    </p>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold">AI Findings</h3>
                    <div className="mt-3 space-y-3">
                      {report.findings.map((finding) => (
                        <div
                          key={finding.area}
                          className="rounded-md border border-slate-200 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{finding.area}</p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${confidenceStyles[finding.confidence]}`}
                            >
                              {finding.confidence}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {finding.condition}
                          </p>
                          <p className="mt-3 text-sm font-semibold">
                            Seller Talking Points
                          </p>
                          <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                            {finding.sellerTalkingPoints.map((point) => (
                              <li key={point}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold">
                      Recommended Improvements
                    </h3>
                    <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
                      <div className="grid grid-cols-[1fr_120px_140px] bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>Recommendation</span>
                        <span>Cost</span>
                        <span>Added Value</span>
                      </div>
                      {report.improvements.map((improvement) => (
                        <div
                          key={`${improvement.area}-${improvement.recommendation}`}
                          className="grid grid-cols-[1fr_120px_140px] gap-3 border-t border-slate-200 px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold">
                              {improvement.area} · {improvement.priority}
                            </p>
                            <p className="mt-1 leading-6 text-slate-600">
                              {improvement.recommendation}
                            </p>
                          </div>
                          <span className="text-slate-700">
                            {improvement.estimatedCost}
                          </span>
                          <span className="text-slate-700">
                            {improvement.potentialAddedValue}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold">
                      Sell As-Is vs Improve Comparison
                    </h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                        <p className="font-semibold">Sell As-Is</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {report.asIsSummary}
                        </p>
                      </div>
                      <div className="rounded-md border border-teal-200 bg-teal-50 p-4">
                        <p className="font-semibold text-teal-900">
                          Improve Before Launch
                        </p>
                        <p className="mt-2 text-sm leading-6 text-teal-900">
                          {report.improveSummary}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
                  <section>
                    <h3 className="text-base font-semibold">
                      Marketing Strategy
                    </h3>
                    <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                      {report.marketingStrategy.map((strategy) => (
                        <li key={strategy}>{strategy}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="mt-8">
                    <h3 className="text-base font-semibold">Next Steps</h3>
                    <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                      {report.nextSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </section>
                </aside>
              </div>
            </div>
          )}
        </div>
      </section>
        </div>
      </div>
    </RealtyEdgeShell>
  );
}
