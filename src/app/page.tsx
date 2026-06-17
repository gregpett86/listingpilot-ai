"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
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
import {
  ROOM_TYPES,
  calculatePropertyReadinessScore,
  createConditionObservation,
  recommendImprovements,
  type ConfidenceLevel,
  type CostRange,
  type ImprovementRecommendation,
  type PropertyCondition,
  type PropertyConditionObservation,
  type PropertyReadinessScore,
  type RecommendationPriority,
  type RoomType,
} from "@/lib/property-intelligence";

type PhotoItem = {
  id: string;
  name: string;
  url: string;
  size: number;
  area: RoomType;
  classificationConfidence: number;
  matchedKeywords: string[];
  file: File;
};

type AreaFinding = {
  area: RoomType;
  condition: string;
  recommendations: string[];
  sellerTalkingPoints: string[];
  confidence: ConfidenceLevel;
};

type ImprovementPlan = {
  area: RoomType;
  priority: RecommendationPriority;
  recommendation: string;
  estimatedCost: string;
  potentialAddedValue: string;
};

type OptimizationReport = {
  readinessScore: PropertyReadinessScore;
  confidenceLevel: ConfidenceLevel;
  recommendedInvestmentRange: string;
  potentialAddedSaleValueRange: string;
  topOpportunities: ImprovementRecommendation[];
  propertySummary: string;
  marketValue: string;
  findings: AreaFinding[];
  improvements: ImprovementPlan[];
  asIsSummary: string;
  improveSummary: string;
  marketingStrategy: string[];
  nextSteps: string[];
};

const propertyAreas = [...ROOM_TYPES];

type VisionFinding = {
  photoId: string;
  roomType: RoomType;
  condition: PropertyCondition;
  confidence: ConfidenceLevel;
  opportunities: string[];
};

type VisionAnalysisResponse = {
  findings: VisionFinding[];
  rawVisionJson?: unknown;
  rawOutputText?: string;
  model?: string;
  requestedPhotoCount?: number;
  error?: string;
  errorType?:
    | "missing_api_key"
    | "api_request_failure"
    | "image_processing_failure"
    | "json_parsing_failure"
    | "rate_limit_issue";
  detail?: string;
};

const conditionSeverity: Record<PropertyCondition, number> = {
  Excellent: 1,
  Good: 2,
  Average: 3,
  Dated: 4,
  "Needs Improvement": 5,
};

const confidenceScores: Record<ConfidenceLevel, number> = {
  High: 0.85,
  Medium: 0.6,
  Low: 0.3,
};

function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

function formatCurrencyRange(range: CostRange) {
  return `$${range.min.toLocaleString()} - $${range.max.toLocaleString()}`;
}

function summarizeCurrencyRanges(ranges: CostRange[]) {
  const totals = ranges.reduce(
    (sum, range) => ({
      min: sum.min + range.min,
      max: sum.max + range.max,
    }),
    { min: 0, max: 0 },
  );

  return formatCurrencyRange(totals);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(String(reader.result));
    });
    reader.addEventListener("error", () => {
      reject(reader.error);
    });
    reader.readAsDataURL(file);
  });
}

function strongestCondition(findings: VisionFinding[]): PropertyCondition {
  return findings.reduce<PropertyCondition>(
    (selectedCondition, finding) =>
      conditionSeverity[finding.condition] > conditionSeverity[selectedCondition]
        ? finding.condition
        : selectedCondition,
    "Excellent",
  );
}

function confidenceFromVisionFindings(findings: VisionFinding[]) {
  const averageConfidence =
    findings.reduce(
      (sum, finding) => sum + confidenceScores[finding.confidence],
      0,
    ) / Math.max(findings.length, 1);

  if (findings.length >= 20 && averageConfidence >= 0.7) return "High";
  if (findings.length >= 10 || averageConfidence >= 0.55) return "Medium";
  return "Low";
}

function buildObservations(
  photos: PhotoItem[],
  visionFindings: VisionFinding[],
): PropertyConditionObservation[] {
  return propertyAreas.flatMap((area) => {
    const areaFindings = visionFindings.filter(
      (finding) => finding.roomType === area,
    );

    if (areaFindings.length === 0) {
      return [];
    }

    const observedIssues = Array.from(
      new Set(areaFindings.flatMap((finding) => finding.opportunities)),
    );
    const condition = strongestCondition(areaFindings);

    return [
      createConditionObservation({
        roomType: area,
        condition,
        photoCount: areaFindings.length,
        observedIssues,
        notes: `${areaFindings.length} uploaded photo${
          areaFindings.length === 1 ? "" : "s"
        } analyzed with OpenAI Vision. ${
          observedIssues.length
            ? `Visible opportunities: ${observedIssues.join(", ")}.`
            : "No specific visible opportunities were returned."
        }`,
      }),
    ];
  });
}

function buildFindings({
  observations,
  recommendations,
}: {
  observations: PropertyConditionObservation[];
  recommendations: ImprovementRecommendation[];
}): AreaFinding[] {
  return observations.map((observation) => {
    const roomRecommendations = recommendations.filter(
      (recommendation) =>
        recommendation.improvement.category === observation.roomType,
    );
    const photoCount = observation.photoCount ?? 0;
    const confidence: ConfidenceLevel =
      photoCount >= 4 ? "High" : photoCount >= 2 ? "Medium" : "Low";

    return {
      area: observation.roomType,
      confidence,
      condition: `${observation.roomType} is assessed as ${observation.condition.toLowerCase()} based on the current photo set. ${observation.notes}`,
      recommendations: roomRecommendations
        .slice(0, 3)
        .map(
          (recommendation) =>
            recommendation.improvement.improvementName,
        ),
      sellerTalkingPoints:
        roomRecommendations[0]?.sellerTalkingPoints.slice(0, 2) ??
        [
          `${observation.roomType} should be reviewed with the seller before photography.`,
          "The recommendation plan should stay focused on visible buyer confidence signals.",
        ],
    };
  });
}

function buildReport({
  confidenceLevel,
  findings,
  photos,
  readinessScore,
  recommendations,
}: {
  confidenceLevel: ConfidenceLevel;
  findings: AreaFinding[];
  photos: PhotoItem[];
  readinessScore: PropertyReadinessScore;
  recommendations: ImprovementRecommendation[];
}): OptimizationReport {
  const strongestAreas = findings
    .filter((finding) => finding.confidence !== "Low")
    .map((finding) => finding.area);
  const topOpportunities = recommendations.slice(0, 3);
  const recommendedInvestmentRange = summarizeCurrencyRanges(
    topOpportunities.map(
      (recommendation) => recommendation.improvement.typicalCostRange,
    ),
  );
  const potentialAddedSaleValueRange = summarizeCurrencyRanges(
    topOpportunities.map(
      (recommendation) =>
        recommendation.improvement.potentialAddedSaleValueRange,
    ),
  );

  const improvements: ImprovementPlan[] = recommendations
    .slice(0, 8)
    .map((recommendation) => ({
      area: recommendation.improvement.category,
      priority: recommendation.priority,
      recommendation: recommendation.improvement.improvementName,
      estimatedCost: formatCurrencyRange(
        recommendation.improvement.typicalCostRange,
      ),
      potentialAddedValue: formatCurrencyRange(
        recommendation.improvement.potentialAddedSaleValueRange,
      ),
    }));

  return {
    readinessScore,
    confidenceLevel,
    recommendedInvestmentRange,
    potentialAddedSaleValueRange,
    topOpportunities,
    propertySummary: `Analysis based on ${photos.length} uploaded photos across ${findings.length} property areas. Readiness status: ${readinessScore.status} (${readinessScore.score}/100) with ${confidenceLevel.toLowerCase()} confidence. ${
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

  addSectionTitle("Property Readiness");
  addParagraph(
    `${report.readinessScore.status}: ${report.readinessScore.summary}`,
  );
  addParagraph(
    `Readiness Score: ${report.readinessScore.score}/100 | Confidence Level: ${report.confidenceLevel} | Recommended Investment Range: ${report.recommendedInvestmentRange} | Potential Added Sale Value Range: ${report.potentialAddedSaleValueRange}`,
  );
  addBulletList(
    report.topOpportunities.map(
      (recommendation) =>
        `${recommendation.improvement.category}: ${recommendation.improvement.improvementName}`,
    ),
  );

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
  const [recommendations, setRecommendations] = useState<
    ImprovementRecommendation[]
  >([]);
  const [readinessScore, setReadinessScore] =
    useState<PropertyReadinessScore | null>(null);
  const [analysisConfidence, setAnalysisConfidence] =
    useState<ConfidenceLevel>("Low");
  const [analysisError, setAnalysisError] = useState("");
  const [visionDebugResponse, setVisionDebugResponse] =
    useState<VisionAnalysisResponse | null>(null);
  const [report, setReport] = useState<OptimizationReport | null>(null);

  const photoCounts = useMemo(
    () =>
      propertyAreas.map((area) => ({
        area,
        count: photos.filter((photo) => photo.area === area).length,
      })),
    [photos],
  );
  const visionFindingsByPhotoId = useMemo(
    () =>
      new Map(
        visionDebugResponse?.findings.map((finding) => [
          finding.photoId,
          finding,
        ]) ?? [],
      ),
    [visionDebugResponse],
  );
  const visionValidationFlags = useMemo(() => {
    if (!visionDebugResponse) {
      return [];
    }

    return photos.flatMap((photo) => {
      const finding = visionFindingsByPhotoId.get(photo.id);

      if (!finding) {
        return [`${photo.name}: no Vision finding was returned.`];
      }

      const flags = [];

      if (finding.confidence === "Low") {
        flags.push(`${photo.name}: low-confidence classification.`);
      }

      if (finding.opportunities.length === 0) {
        flags.push(`${photo.name}: no visible opportunities returned.`);
      }

      return flags;
    });
  }, [photos, visionDebugResponse, visionFindingsByPhotoId]);

  function resetAnalysisState() {
    setFindings([]);
    setRecommendations([]);
    setReadinessScore(null);
    setAnalysisConfidence("Low");
    setAnalysisError("");
    setVisionDebugResponse(null);
    setReport(null);
  }

  function appendPhotoFiles(files: File[]) {
    console.groupCollapsed("[ListingPilot upload] appendPhotoFiles");
    console.log("incoming files", files.length, files.map((file) => file.name));
    console.log("photos before append", photos.length);

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    console.log(
      "image files",
      imageFiles.length,
      imageFiles.map((file) => file.name),
    );

    if (imageFiles.length === 0) {
      console.log("no image files found; upload queue unchanged");
      console.groupEnd();
      return;
    }

    if (photos.length >= 30) {
      console.log("photo queue already at 30; upload queue unchanged");
      console.groupEnd();
      return;
    }

    setPhotos((currentPhotos) => {
      const remainingSlots = Math.max(30 - currentPhotos.length, 0);
      const uploadBatchId = Date.now();
      const nextPhotos = imageFiles
        .slice(0, remainingSlots)
        .map((file, index) => ({
          id: `${file.name}-${file.lastModified}-${index}`,
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          area:
            propertyAreas[
              (currentPhotos.length + index) % propertyAreas.length
            ],
          classificationConfidence: 0.2,
          matchedKeywords: [],
          file,
        }));
      const appendedPhotos = nextPhotos.map((photo, index) => ({
        ...photo,
        id: `${photo.id}-${uploadBatchId}-${currentPhotos.length + index}`,
      }));

      console.log("current photos in updater", currentPhotos.length);
      console.log("remaining slots", remainingSlots);
      console.log("appending photos", appendedPhotos.length);
      console.log("next queue size", currentPhotos.length + appendedPhotos.length);

      return [...currentPhotos, ...appendedPhotos];
    });
    resetAnalysisState();
    console.groupEnd();
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    console.log(
      "[ListingPilot upload] file input change",
      selectedFiles.length,
      selectedFiles.map((file) => file.name),
    );
    appendPhotoFiles(selectedFiles);
    event.target.value = "";
  }

  function handlePhotoDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);

    console.log(
      "[ListingPilot upload] drop",
      droppedFiles.length,
      droppedFiles.map((file) => file.name),
    );
    appendPhotoFiles(droppedFiles);
  }

  function updatePhotoArea(photoId: string, area: RoomType) {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              area,
              classificationConfidence: Math.max(
                photo.classificationConfidence,
                0.75,
              ),
            }
          : photo,
      ),
    );
    setFindings([]);
    setRecommendations([]);
    setReadinessScore(null);
    setAnalysisConfidence("Low");
    setAnalysisError("");
    setVisionDebugResponse(null);
    setReport(null);
  }

  async function analyzePhotos() {
    setIsAnalyzing(true);
    setAnalysisError("");
    setVisionDebugResponse(null);
    let visionLogOpen = false;

    try {
      const payloadPhotos = await Promise.all(
        photos.map(async (photo) => ({
          id: photo.id,
          name: photo.name,
          dataUrl: await fileToDataUrl(photo.file),
        })),
      );

      console.groupCollapsed("[ListingPilot Vision] analyzePhotos");
      console.log("calling /api/analyze-photos", {
        photoCount: payloadPhotos.length,
        photoIds: payloadPhotos.map((photo) => photo.id),
        photoNames: payloadPhotos.map((photo) => photo.name),
      });
      visionLogOpen = true;

      const response = await fetch("/api/analyze-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: payloadPhotos }),
      });

      console.log("Vision route response status", response.status);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | VisionAnalysisResponse
          | null;

        console.error("Vision route error", errorBody);
        setVisionDebugResponse(errorBody);

        throw new Error(errorBody?.error ?? "AI Vision analysis failed.");
      }

      const result = (await response.json()) as VisionAnalysisResponse;
      console.log("Vision route JSON", result);
      console.groupEnd();
      visionLogOpen = false;
      setVisionDebugResponse(result);

      const visionFindings = result.findings;
      const confidenceByPhotoId = new Map(
        visionFindings.map((finding) => [
          finding.photoId,
          confidenceScores[finding.confidence],
        ]),
      );
      const opportunitiesByPhotoId = new Map(
        visionFindings.map((finding) => [
          finding.photoId,
          finding.opportunities,
        ]),
      );

      setPhotos((currentPhotos) =>
        currentPhotos.map((photo) => {
          const finding = visionFindings.find(
            (visionFinding) => visionFinding.photoId === photo.id,
          );

          return finding
            ? {
                ...photo,
                area: finding.roomType,
                classificationConfidence:
                  confidenceByPhotoId.get(photo.id) ??
                  photo.classificationConfidence,
                matchedKeywords:
                  opportunitiesByPhotoId.get(photo.id) ?? photo.matchedKeywords,
              }
            : photo;
        }),
      );

      const nextObservations = buildObservations(photos, visionFindings);
      const nextRecommendations = recommendImprovements({
        observations: nextObservations,
        limit: 12,
      });
      const nextReadinessScore = calculatePropertyReadinessScore({
        observations: nextObservations,
        recommendations: nextRecommendations,
      });
      const nextAnalysisConfidence = confidenceFromVisionFindings(visionFindings);

      setFindings(
        buildFindings({
          observations: nextObservations,
          recommendations: nextRecommendations,
        }),
      );
      setRecommendations(nextRecommendations);
      setReadinessScore(nextReadinessScore);
      setAnalysisConfidence(nextAnalysisConfidence);
      setReport(null);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "AI Vision analysis could not be completed.",
      );
      if (visionLogOpen) {
        console.groupEnd();
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  function createReport() {
    if (!readinessScore) return;

    setReport(
      buildReport({
        confidenceLevel: analysisConfidence,
        findings,
        photos,
        readinessScore,
        recommendations,
      }),
    );
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
                  {
                    label: "Rooms",
                    value: photoCounts.filter(({ count }) => count > 0).length,
                  },
                  {
                    label: "Recs",
                    value: recommendations.length,
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
                <label
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-8 text-center transition hover:border-[#D4A017] hover:bg-[#FDF9EE]"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handlePhotoDrop}
                >
                  <span className="text-sm font-bold text-[#111827]">
                    Select or drag property photos
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
                {analysisError && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {analysisError}
                  </p>
                )}
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
                                event.target.value as RoomType,
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

              {(visionDebugResponse || analysisError) && (
                <SectionCard>
                  <div>
                    <p className="label-caps text-[#B45309]">
                      Vision Validation Debug
                    </p>
                    <h2 className="mt-2 text-base font-bold text-[#111827]">
                      OpenAI Vision Response
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                      Temporary validation panel for comparing uploaded photos
                      against detected room type, condition, confidence, and
                      opportunities.
                    </p>
                  </div>

                  {visionDebugResponse?.error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-extrabold text-red-700">
                        {visionDebugResponse.errorType ?? "vision_error"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-red-700">
                        {visionDebugResponse.error}
                      </p>
                      {visionDebugResponse.detail && (
                        <pre className="mt-3 max-h-44 overflow-auto rounded-lg bg-white p-3 text-xs text-red-700">
                          {visionDebugResponse.detail}
                        </pre>
                      )}
                    </div>
                  )}

                  {visionDebugResponse && !visionDebugResponse.error && (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <MetricCard
                          label="Route"
                          value={
                            visionDebugResponse.findings.length > 0
                              ? "Called"
                              : "No Results"
                          }
                        />
                        <MetricCard
                          label="Model"
                          value={visionDebugResponse.model ?? "Unknown"}
                        />
                        <MetricCard
                          label="Photos"
                          value={
                            visionDebugResponse.requestedPhotoCount ??
                            photos.length
                          }
                        />
                      </div>

                      <div className="mt-5 space-y-4">
                        {photos.map((photo) => {
                          const finding = visionFindingsByPhotoId.get(photo.id);

                          return (
                            <article
                              className="grid gap-4 rounded-xl border border-[#E5E7EB] p-4 md:grid-cols-[120px_1fr]"
                              key={`vision-debug-${photo.id}`}
                            >
                              <div className="overflow-hidden rounded-lg bg-[#F3F4F6]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  alt={photo.name}
                                  className="aspect-[4/3] h-full w-full object-cover"
                                  src={photo.url}
                                />
                              </div>
                              <div>
                                <p className="truncate text-sm font-bold text-[#111827]">
                                  {photo.name}
                                </p>
                                {finding ? (
                                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                                    <div>
                                      <dt className="label-caps">Room Type</dt>
                                      <dd className="mt-1 font-bold text-[#111827]">
                                        {finding.roomType}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="label-caps">Condition</dt>
                                      <dd className="mt-1 font-bold text-[#111827]">
                                        {finding.condition}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="label-caps">Confidence</dt>
                                      <dd className="mt-1">
                                        <ConfidenceBadge
                                          confidence={finding.confidence}
                                        />
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="label-caps">
                                        Opportunities
                                      </dt>
                                      <dd className="mt-1 text-[#6B7280]">
                                        {finding.opportunities.length
                                          ? finding.opportunities.join(", ")
                                          : "None returned"}
                                      </dd>
                                    </div>
                                  </dl>
                                ) : (
                                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                                    No Vision result returned for this image.
                                  </p>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <h3 className="text-sm font-bold text-[#111827]">
                          Vision Validation Report
                        </h3>
                        <div className="mt-3 space-y-3 text-sm leading-6 text-[#6B7280]">
                          <p>
                            Accuracy observations: compare each uploaded photo
                            preview above against the detected room type and
                            condition. Automated correctness scoring requires a
                            human-labeled expected value for each image.
                          </p>
                          <p>
                            Confidence issues:{" "}
                            {visionValidationFlags.length
                              ? visionValidationFlags.join(" ")
                              : "No low-confidence or missing-result flags were detected in the returned JSON."}
                          </p>
                          <p>
                            Recommendation quality issues: opportunities should
                            be visible, photo-specific, and limited to property
                            presentation improvements. Generic or non-visible
                            opportunities should be treated as weak or
                            hallucinated.
                          </p>
                          <p>
                            Prompt weaknesses to watch: room ambiguity, overly
                            broad condition labels, opportunities not grounded
                            in the image, and confidence that does not decrease
                            for unclear photos.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="label-caps">Raw Vision JSON</p>
                        <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-[#E5E7EB] bg-[#111827] p-4 text-xs leading-5 text-white">
                          {JSON.stringify(visionDebugResponse, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </SectionCard>
              )}

              {readinessScore && (
                <SectionCard>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="label-caps text-[#B45309]">
                        Property Readiness
                      </p>
                      <h2 className="mt-2 text-base font-bold text-[#111827]">
                        {readinessScore.status}
                      </h2>
                    </div>
                    <ConfidenceBadge confidence={analysisConfidence} />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#6B7280]">
                    {readinessScore.summary}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MetricCard
                      label="Readiness"
                      value={`${readinessScore.score}/100`}
                    />
                    <MetricCard
                      label="Investment"
                      value={summarizeCurrencyRanges(
                        recommendations
                          .slice(0, 3)
                          .map(
                            (recommendation) =>
                              recommendation.improvement.typicalCostRange,
                          ),
                      )}
                    />
                    <MetricCard
                      label="Added Value"
                      value={summarizeCurrencyRanges(
                        recommendations
                          .slice(0, 3)
                          .map(
                            (recommendation) =>
                              recommendation.improvement
                                .potentialAddedSaleValueRange,
                          ),
                      )}
                    />
                  </div>

                  <div className="mt-5">
                    <p className="label-caps">Top 3 Opportunities</p>
                    <div className="mt-3 space-y-3">
                      {recommendations.slice(0, 3).map((recommendation) => (
                        <article
                          className="rounded-xl border border-[#E5E7EB] p-4"
                          key={recommendation.improvement.id}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-[#111827]">
                                {
                                  recommendation.improvement
                                    .improvementName
                                }
                              </p>
                              <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
                                {recommendation.improvement.category}
                              </p>
                            </div>
                            <span className="rounded-full border border-[rgba(212,160,23,0.35)] bg-[rgba(212,160,23,0.12)] px-2.5 py-1 text-xs font-extrabold text-[#92640a]">
                              {recommendation.priority}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[#6B7280]">
                            {recommendation.improvement.description}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              )}

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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-[#111827]">
                          Property Readiness
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                          {report.readinessScore.summary}
                        </p>
                      </div>
                      <ConfidenceBadge confidence={report.confidenceLevel} />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <p className="label-caps">Status</p>
                        <p className="mt-2 font-bold text-[#111827]">
                          {report.readinessScore.status}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <p className="label-caps">Investment</p>
                        <p className="mt-2 font-bold text-[#111827]">
                          {report.recommendedInvestmentRange}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <p className="label-caps">Added Value</p>
                        <p className="mt-2 font-bold text-[#111827]">
                          {report.potentialAddedSaleValueRange}
                        </p>
                      </div>
                    </div>
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
