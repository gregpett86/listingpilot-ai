"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  RealtyEdgePageHeader,
  RealtyEdgeShell,
} from "@/components/realty-edge-shell";
import {
  ConfidenceBadge,
  MetricCard,
  SectionCard,
  StepCard,
} from "@/components/listing-pilot-ui";

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
  const navy: [number, number, number] = [27, 34, 56];
  const gold: [number, number, number] = [212, 160, 23];
  const bodyText: [number, number, number] = [71, 85, 105];
  let y = 20;

  const addSectionTitle = (title: string) => {
    y = ensurePdfSpace(doc, y, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...navy);
    doc.text(title, margin, y);
    doc.setDrawColor(...gold);
    doc.line(margin, y + 2, margin + 28, y + 2);
    y += 7;
  };

  const addParagraph = (text: string) => {
    y = ensurePdfSpace(doc, y, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...bodyText);
    y = addWrappedText(doc, text, margin, y, contentWidth, 5) + 3;
  };

  const addBulletList = (items: string[]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);

    items.forEach((item) => {
      y = ensurePdfSpace(doc, y, 14);
      const lines = doc.splitTextToSize(item, contentWidth - 6) as string[];
      doc.setTextColor(...gold);
      doc.text("-", margin, y);
      doc.setTextColor(...bodyText);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  };

  doc.setFillColor(...navy);
  doc.rect(0, 0, 216, 18, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 18, 216, 1.5, "F");
  y = 31;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...gold);
  doc.text("REALTY EDGE PRO", margin, y);
  y += 7;
  doc.setFontSize(20);
  doc.setTextColor(...navy);
  doc.text("AI Listing Presentation", margin, y);
  y += 8;
  doc.setFontSize(15);
  doc.text("Home Sale Optimization Report", margin, y);
  y += 10;
  doc.setDrawColor(...gold);
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
    doc.setTextColor(...navy);
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
    doc.setTextColor(...navy);
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
          <section className="mx-auto grid w-full max-w-[1180px] gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[560px_1fr]">
            <div className="flex min-w-0 flex-col gap-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Photos", value: photos.length },
                  { label: "Findings", value: findings.length },
                  {
                    label: "Uploaded",
                    value: photos.length ? formatBytes(totalSize) : "0 MB",
                  },
                ].map((metric) => (
                  <MetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                  />
                ))}
              </div>

              <StepCard
                description="Upload 20-30 property photos for best coverage."
                isReady
                step={1}
                title="Upload Photos"
              >
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-8 text-center transition hover:border-[#D4A017] hover:bg-[#FDF9EE]">
                  <span className="text-sm font-bold text-[#111827]">
                    Select property photos
                  </span>
                  <span className="mt-1 text-xs font-medium text-[#6B7280]">
                    JPG, PNG, or WebP. Up to 30 images.
                  </span>
                  <input
                    accept="image/*"
                    className="sr-only"
                    multiple
                    onChange={handlePhotoUpload}
                    type="file"
                  />
                </label>

                <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#6B7280]">
                      Recommended range
                    </span>
                    <span
                      className={
                        recommendedCountMet
                          ? "font-bold text-[#16a34a]"
                          : "font-bold text-[#B45309]"
                      }
                    >
                      {recommendedCountMet ? "Met" : "20-30 photos"}
                    </span>
                  </div>
                </div>
              </StepCard>

              <StepCard
                description="Confirm photo coverage and run the AI assessment."
                isComplete={findings.length > 0}
                step={2}
                title="Review Analysis"
              >
                <div className="space-y-3">
                  {photoCounts.map(({ area, count }) => (
                    <div key={area}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-[#374151]">
                          {area}
                        </span>
                        <span className="font-bold tabular-nums text-[#9CA3AF]">
                          {count}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[#F3F4F6]">
                        <div
                          className="h-2 rounded-full bg-[#D4A017]"
                          style={{ width: `${Math.min(count * 25, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-press mt-5 flex w-full items-center justify-center rounded-xl bg-[#D4A017] px-5 py-3 text-sm font-extrabold text-[#111827] shadow-[0_2px_8px_rgba(212,160,23,0.3)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!readyForAnalysis || isAnalyzing}
                  onClick={analyzePhotos}
                  type="button"
                >
                  {isAnalyzing ? "Analyzing photos..." : "Run AI Analysis"}
                </button>
              </StepCard>

              <StepCard
                description="Create the seller-facing optimization report."
                isComplete={Boolean(report)}
                step={3}
                title="Generate Report"
              >
                <button
                  className="btn-press flex w-full items-center justify-center rounded-xl bg-[#1B2238] px-5 py-3 text-sm font-extrabold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={findings.length === 0}
                  onClick={createReport}
                  type="button"
                >
                  Create Report
                </button>
              </StepCard>

              <StepCard
                description="Download the completed Home Sale Optimization Report."
                isReady={Boolean(report)}
                step={4}
                title="Export PDF"
              >
                <button
                  className="btn-press flex w-full items-center justify-center rounded-xl bg-[#D4A017] px-5 py-3 text-sm font-extrabold text-[#111827] shadow-[0_2px_8px_rgba(212,160,23,0.3)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!report}
                  onClick={() => report && exportReportPdf(report)}
                  type="button"
                >
                  Download PDF
                </button>
              </StepCard>
            </div>

            <div className="min-w-0 space-y-5">
              <SectionCard>
                <div>
                  <h2 className="text-base font-bold text-[#111827]">
                    Uploaded Photos
                  </h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Confirm or adjust room categories before analysis.
                  </p>
                </div>

                {photos.length === 0 ? (
                  <div className="mt-5 flex min-h-72 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-center">
                    <div className="max-w-sm px-6">
                      <p className="text-[15px] font-bold text-[#111827]">
                        No photos uploaded yet
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                        Start with exterior, kitchen, bathroom, living area, and
                        bedroom photos to produce a balanced report.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {photos.map((photo) => (
                      <article
                        className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white card-shadow"
                        key={photo.id}
                      >
                        <div className="aspect-[4/3] bg-[#F3F4F6]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={photo.name}
                            className="h-full w-full object-cover"
                            src={photo.url}
                          />
                        </div>
                        <div className="space-y-3 p-3.5">
                          <div>
                            <p className="truncate text-sm font-bold text-[#111827]">
                              {photo.name}
                            </p>
                            <p className="text-xs text-[#9CA3AF]">
                              {formatBytes(photo.size)}
                            </p>
                          </div>
                          <select
                            className="rep-input py-2 text-sm"
                            onChange={(event) =>
                              updatePhotoArea(
                                photo.id,
                                event.target.value as PropertyArea,
                              )
                            }
                            value={photo.area}
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
              </SectionCard>

              {findings.length > 0 && (
                <SectionCard>
                  <h2 className="text-base font-bold text-[#111827]">
                    AI Findings Preview
                  </h2>
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {findings.map((finding) => (
                      <article
                        className="rounded-xl border border-[#E5E7EB] p-4"
                        key={finding.area}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-bold text-[#111827]">
                            {finding.area}
                          </h3>
                          <ConfidenceBadge confidence={finding.confidence} />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
                          {finding.condition}
                        </p>
                        <div className="mt-4">
                          <p className="label-caps">Recommendations</p>
                          <ul className="mt-2 space-y-2 text-sm leading-6 text-[#6B7280]">
                            {finding.recommendations.map((recommendation) => (
                              <li key={recommendation}>{recommendation}</li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>
                </SectionCard>
              )}

              {report && (
                <div className="rounded-2xl border border-[#E5E7EB] bg-white card-shadow">
                  <div className="border-b border-[#E5E7EB] p-5">
                    <p className="label-caps text-[#B45309]">
                      Generated Report
                    </p>
                    <h2 className="mt-2 text-xl font-extrabold text-[#111827]">
                      Home Sale Optimization Report
                    </h2>
                  </div>

                  <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6 p-5">
                  <section>
                    <h3 className="text-base font-bold text-[#111827]">
                      Property Summary
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                      {report.propertySummary}
                    </p>
                  </section>

                  <section>
                    <h3 className="text-base font-bold text-[#111827]">
                      Current Market Value
                    </h3>
                    <p className="mt-2 rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-3 text-sm leading-6 text-[#6B7280]">
                      {report.marketValue}
                    </p>
                  </section>

                  <section>
                    <h3 className="text-base font-bold text-[#111827]">AI Findings</h3>
                    <div className="mt-3 space-y-3">
                      {report.findings.map((finding) => (
                        <div
                          key={finding.area}
                          className="rounded-xl border border-[#E5E7EB] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-bold text-[#111827]">{finding.area}</p>
                                <ConfidenceBadge
                                  confidence={finding.confidence}
                                />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                            {finding.condition}
                          </p>
                          <p className="label-caps mt-3">
                            Seller Talking Points
                          </p>
                          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#6B7280]">
                            {finding.sellerTalkingPoints.map((point) => (
                              <li key={point}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-base font-bold text-[#111827]">
                      Recommended Improvements
                    </h3>
                    <div className="mt-3 overflow-hidden rounded-xl border border-[#E5E7EB]">
                      <div className="grid grid-cols-[1fr_120px_140px] bg-[#F9FAFB] px-4 py-3">
                        <span className="label-caps">Recommendation</span>
                        <span className="label-caps">Cost</span>
                        <span className="label-caps">Added Value</span>
                      </div>
                      {report.improvements.map((improvement) => (
                        <div
                          key={`${improvement.area}-${improvement.recommendation}`}
                          className="grid grid-cols-[1fr_120px_140px] gap-3 border-t border-[#F3F4F6] px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-bold text-[#111827]">
                              {improvement.area} - {improvement.priority}
                            </p>
                            <p className="mt-1 leading-6 text-[#6B7280]">
                              {improvement.recommendation}
                            </p>
                          </div>
                          <span className="font-semibold text-[#374151]">
                            {improvement.estimatedCost}
                          </span>
                          <span className="font-semibold text-[#374151]">
                            {improvement.potentialAddedValue}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-base font-bold text-[#111827]">
                      Sell As-Is vs Improve Comparison
                    </h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <p className="font-bold text-[#111827]">Sell As-Is</p>
                        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                          {report.asIsSummary}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[rgba(212,160,23,0.28)] bg-[rgba(212,160,23,0.08)] p-4">
                        <p className="font-bold text-[#92640a]">
                          Improve Before Launch
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                          {report.improveSummary}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="border-t border-[#E5E7EB] bg-[#F9FAFB] p-5 lg:border-l lg:border-t-0">
                  <section>
                    <h3 className="text-base font-bold text-[#111827]">
                      Marketing Strategy
                    </h3>
                    <ul className="mt-3 space-y-3 text-sm leading-6 text-[#6B7280]">
                      {report.marketingStrategy.map((strategy) => (
                        <li key={strategy}>{strategy}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="mt-8">
                    <h3 className="text-base font-bold text-[#111827]">Next Steps</h3>
                    <ol className="mt-3 space-y-3 text-sm leading-6 text-[#6B7280]">
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
