"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
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
  recommendImprovements,
  type ConfidenceLevel,
  type CostRange,
  type ImprovementRecommendation,
  type PropertyConditionObservation,
  type PropertyReadinessScore,
  type RecommendationPriority,
  type RoomType,
} from "@/lib/property-intelligence";
import {
  buildRealPhotoValidationRows,
  buildRoomObservations,
} from "@/lib/listing-analysis";
import {
  PHOTO_UPLOAD_LIMITS,
  SUPPORTED_IMAGE_MIME_TYPES,
  type AnalysisValidationIssue,
  type AnalyzePhotosResponse,
  type PhotoAnalysisFailure,
  type VisionFinding,
  formatBytes,
  safeErrorMessage,
  validateClientPhotoFiles,
} from "@/lib/analysis-schema";

type PhotoItem = {
  id: string;
  name: string;
  url: string;
  size: number;
  area: RoomType;
  classificationConfidence: number;
  matchedKeywords: string[];
  file: File;
  analysisFailure?: PhotoAnalysisFailure;
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
const recommendedCoverageCategories = [
  "Kitchen",
  "Bathroom",
  "Living Room",
  "Bedroom",
  "Exterior",
] as const;
const optionalCoverageCategories = ["Landscaping", "Garage", "Basement", "Pool"] as const;
const coverageCategories = [
  ...recommendedCoverageCategories,
  ...optionalCoverageCategories,
] as const;

type CoverageCategory = (typeof coverageCategories)[number];
type CoverageStatus = "Complete" | "Partial" | "Missing";
type CoverageScore = "Excellent" | "Good" | "Limited";

type VisionAnalysisResponse = AnalyzePhotosResponse;

type PipelineTraceEntry = {
  stage:
    | "button_click"
    | "frontend_request"
    | "api_route"
    | "openai_request"
    | "openai_response"
    | "json_parser"
    | "database_save"
    | "ui_render";
  status: "started" | "success" | "failure" | "skipped";
  message: string;
  data?: Record<string, unknown>;
};

const confidenceScores: Record<ConfidenceLevel, number> = {
  High: 0.85,
  Medium: 0.6,
  Low: 0.3,
};

const enableVisionDebug =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_VISION_DEBUG === "true";

function isRoomCoverageCategory(
  category: CoverageCategory,
): category is RoomType {
  return ROOM_TYPES.includes(category as RoomType);
}

function countCoveragePhotos(photos: PhotoItem[], category: CoverageCategory) {
  return isRoomCoverageCategory(category)
    ? photos.filter((photo) => photo.area === category).length
    : 0;
}

function coverageStatus(count: number): CoverageStatus {
  if (count >= 2) return "Complete";
  if (count === 1) return "Partial";
  return "Missing";
}

function calculateCoverageScore({
  photoCount,
  recommendedMissingCount,
  recommendedPartialOrCompleteCount,
}: {
  photoCount: number;
  recommendedMissingCount: number;
  recommendedPartialOrCompleteCount: number;
}): CoverageScore {
  if (photoCount >= 20 && recommendedMissingCount === 0) return "Excellent";
  if (photoCount >= 6 || recommendedPartialOrCompleteCount >= 3) return "Good";
  return "Limited";
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
  const [uploadIssues, setUploadIssues] = useState<AnalysisValidationIssue[]>(
    [],
  );
  const [visionDebugResponse, setVisionDebugResponse] =
    useState<VisionAnalysisResponse | null>(null);
  const [pipelineTrace, setPipelineTrace] = useState<PipelineTraceEntry[]>([]);
  const [report, setReport] = useState<OptimizationReport | null>(null);
  const objectUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  const photoCounts = useMemo(
    () =>
      coverageCategories.map((category) => ({
        category,
        count: countCoveragePhotos(photos, category),
        isRecommended: recommendedCoverageCategories.includes(
          category as (typeof recommendedCoverageCategories)[number],
        ),
      })),
    [photos],
  );
  const coverageItems = useMemo(
    () =>
      photoCounts.map((item) => ({
        ...item,
        status: coverageStatus(item.count),
      })),
    [photoCounts],
  );
  const recommendedMissingCount = useMemo(
    () =>
      coverageItems.filter(
        (item) => item.isRecommended && item.status === "Missing",
      ).length,
    [coverageItems],
  );
  const recommendedCoveredCount = useMemo(
    () =>
      coverageItems.filter(
        (item) => item.isRecommended && item.status !== "Missing",
      ).length,
    [coverageItems],
  );
  const photoCoverageScore = useMemo(
    () =>
      calculateCoverageScore({
        photoCount: photos.length,
        recommendedMissingCount,
        recommendedPartialOrCompleteCount: recommendedCoveredCount,
      }),
    [photos.length, recommendedCoveredCount, recommendedMissingCount],
  );
  const hasPartialCoverage = photos.length > 0 && recommendedMissingCount > 0;
  const visionFindingsByPhotoId = useMemo(
    () =>
      new Map(
        visionDebugResponse?.findings?.map((finding) => [
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

      if (finding.categoryMismatch) {
        flags.push(`${photo.name}: category mismatch - review required.`);
      }

      if (finding.visibleFindings.length === 0) {
        flags.push(`${photo.name}: no visible findings returned.`);
      }

      return flags;
    });
  }, [photos, visionDebugResponse, visionFindingsByPhotoId]);
  const failedAnalysisPhotos = useMemo(
    () => photos.filter((photo) => photo.analysisFailure),
    [photos],
  );
  const realPhotoValidationRows = useMemo(
    () =>
      buildRealPhotoValidationRows({
        observations: buildRoomObservations(visionDebugResponse?.findings ?? []),
        photos,
        recommendations,
        visionFindings: visionDebugResponse?.findings ?? [],
      }),
    [photos, recommendations, visionDebugResponse],
  );

  function resetAnalysisState() {
    setFindings([]);
    setRecommendations([]);
    setReadinessScore(null);
    setAnalysisConfidence("Low");
    setAnalysisError("");
    setVisionDebugResponse(null);
    setPipelineTrace([]);
    setReport(null);
  }

  function appendPhotoFiles(files: File[]) {
    const existingKeys = new Set(
      photos.map((photo) => `${photo.name}:${photo.size}:${photo.file.type}`),
    );
    const currentTotalBytes = photos.reduce((sum, photo) => sum + photo.size, 0);
    const { accepted, issues } = validateClientPhotoFiles({
      currentPhotoCount: photos.length,
      currentTotalBytes,
      existingKeys,
      files,
    });

    setUploadIssues(issues);

    if (accepted.length === 0) {
      return;
    }

    setPhotos((currentPhotos) => {
      const uploadBatchId = Date.now();
      const nextPhotos = accepted.map((file, index) => {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.add(url);

        return {
          id: `${file.name}-${file.lastModified}-${index}`,
          name: file.name,
          url,
          size: file.size,
          area:
            propertyAreas[
              (currentPhotos.length + index) % propertyAreas.length
            ],
          classificationConfidence: 0.2,
          matchedKeywords: [],
          file,
        };
      });
      const appendedPhotos = nextPhotos.map((photo, index) => ({
        ...photo,
        id: `${photo.id}-${uploadBatchId}-${currentPhotos.length + index}`,
      }));

      return [...currentPhotos, ...appendedPhotos];
    });
    resetAnalysisState();
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    appendPhotoFiles(selectedFiles);
    event.target.value = "";
  }

  function handlePhotoDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);

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

  async function validateReadableImage(file: File) {
    if (typeof createImageBitmap !== "function") {
      return true;
    }

    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      return true;
    } catch {
      return false;
    }
  }

  function mergeFindings(
    existingFindings: VisionFinding[],
    nextFindings: VisionFinding[],
    retriedPhotoIds: Set<string>,
  ) {
    const merged = new Map(
      existingFindings
        .filter((finding) => !retriedPhotoIds.has(finding.photoId))
        .map((finding) => [finding.photoId, finding]),
    );

    nextFindings.forEach((finding) => {
      merged.set(finding.photoId, finding);
    });

    return Array.from(merged.values());
  }

  async function analyzePhotos(targetPhotoIds?: Set<string>) {
    const photosToAnalyze = targetPhotoIds
      ? photos.filter((photo) => targetPhotoIds.has(photo.id))
      : photos;

    if (photosToAnalyze.length === 0) {
      setAnalysisError("No failed photos are available to retry.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");
    if (!enableVisionDebug && !targetPhotoIds) {
      setVisionDebugResponse(null);
      setPipelineTrace([]);
    }
    let visionLogOpen = false;
    const localTrace: PipelineTraceEntry[] = [];
    const recordTrace = (entry: PipelineTraceEntry) => {
      localTrace.push(entry);
      if (enableVisionDebug) {
        console.log("[ListingPilot Pipeline Trace]", entry);
        setPipelineTrace([...localTrace]);
      }
    };

    try {
      recordTrace({
        stage: "button_click",
        status: "started",
        message: targetPhotoIds
          ? "Retry failed photo analysis clicked."
          : "Run AI Analysis button clicked.",
        data: {
          photoCount: photosToAnalyze.length,
          photoNames: photosToAnalyze.map((photo) => photo.name),
        },
      });

      const unreadablePhotos: PhotoAnalysisFailure[] = [];
      const readablePhotos: PhotoItem[] = [];

      for (const photo of photosToAnalyze) {
        if (await validateReadableImage(photo.file)) {
          readablePhotos.push(photo);
        } else {
          unreadablePhotos.push({
            photoId: photo.id,
            name: photo.name,
            status: "failed",
            errorType: "image_decode_failed",
            message: safeErrorMessage("image_decode_failed"),
          });
        }
      }

      if (readablePhotos.length === 0) {
        setPhotos((currentPhotos) =>
          currentPhotos.map((photo) => ({
            ...photo,
            analysisFailure:
              unreadablePhotos.find((failure) => failure.photoId === photo.id) ??
              photo.analysisFailure,
          })),
        );
        throw new Error("No readable photos were available for analysis.");
      }

      const payloadPhotos = await Promise.all(
        readablePhotos.map(async (photo) => {
          const dataUrl = await fileToDataUrl(photo.file);

          return {
            id: photo.id,
            name: photo.name,
            assignedCategory: photo.area,
            fileMimeType: photo.file.type,
            fileSize: photo.file.size,
            dataUrl,
          };
        }),
      );
      recordTrace({
        stage: "frontend_request",
        status: "started",
        message: "Frontend prepared Vision request payload.",
        data: {
          requestSent: true,
          photoCount: payloadPhotos.length,
          photoIds: payloadPhotos.map((photo) => photo.id),
          photoNames: payloadPhotos.map((photo) => photo.name),
        },
      });

      if (enableVisionDebug) {
        console.groupCollapsed("[ListingPilot Vision] analyzePhotos");
        console.log("calling /api/analyze-photos", {
          photoCount: payloadPhotos.length,
          photoIds: payloadPhotos.map((photo) => photo.id),
          photoNames: payloadPhotos.map((photo) => photo.name),
        });
        visionLogOpen = true;
      }

      const response = await fetch("/api/analyze-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: payloadPhotos }),
      });

      recordTrace({
        stage: "frontend_request",
        status: response.ok ? "success" : "failure",
        message: "Frontend received response from Vision API route.",
        data: {
          responseReceived: true,
          status: response.status,
          ok: response.ok,
        },
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | VisionAnalysisResponse
          | null;

        if (enableVisionDebug) {
          console.error("Vision route error", errorBody);
          setVisionDebugResponse(errorBody);
          setPipelineTrace([
            ...localTrace,
            {
              stage: "ui_render",
              status: "failure",
              message: "UI received Vision error response.",
              data: { error: errorBody?.error },
            },
          ]);
        }

        throw new Error(errorBody?.error ?? "AI Vision analysis failed.");
      }

      const result = (await response.json()) as VisionAnalysisResponse;
      if (enableVisionDebug) {
        console.log("Vision route JSON", result);
        console.groupEnd();
        visionLogOpen = false;
        setVisionDebugResponse(result);
        setPipelineTrace([
          ...localTrace,
          {
            stage: "ui_render",
            status: "started",
            message: "Frontend received parsed Vision JSON and is preparing UI state.",
            data: {
              findingCount: result.findings?.length ?? 0,
              failedPhotoCount: result.failedPhotos?.length ?? 0,
            },
          },
        ]);
      }

      const retriedPhotoIds = new Set(photosToAnalyze.map((photo) => photo.id));
      const previousFindings = targetPhotoIds
        ? visionDebugResponse?.findings ?? []
        : [];
      const visionFindings = mergeFindings(
        previousFindings,
        result.findings ?? [],
        retriedPhotoIds,
      );
      const failedPhotos = [...unreadablePhotos, ...(result.failedPhotos ?? [])];
      const failedByPhotoId = new Map(
        failedPhotos.map((failure) => [failure.photoId, failure]),
      );
      const confidenceByPhotoId = new Map(
        visionFindings.map((finding) => [
          finding.photoId,
          confidenceScores[finding.confidence],
        ]),
      );
      const visibleFindingsByPhotoId = new Map(
        visionFindings.map((finding) => [
          finding.photoId,
          finding.visibleFindings,
        ]),
      );

      setPhotos((currentPhotos) =>
        currentPhotos.map((photo) => {
          const finding = visionFindings.find(
            (visionFinding) => visionFinding.photoId === photo.id,
          );
          const failure = failedByPhotoId.get(photo.id);

          if (finding) {
            return {
              ...photo,
              classificationConfidence:
                confidenceByPhotoId.get(photo.id) ??
                photo.classificationConfidence,
              matchedKeywords:
                visibleFindingsByPhotoId.get(photo.id) ??
                photo.matchedKeywords,
              analysisFailure: undefined,
            };
          }

          if (failure) {
            return {
              ...photo,
              analysisFailure: failure,
            };
          }

          return photo;
        }),
      );

      const nextObservations = buildRoomObservations(visionFindings);
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
      if (failedPhotos.length > 0) {
        setAnalysisError(
          `${failedPhotos.length} photo${failedPhotos.length === 1 ? "" : "s"} could not be analyzed. Successful findings were preserved.`,
        );
      }
      setVisionDebugResponse({
        ...result,
        findings: visionFindings,
        failedPhotos,
      });
      if (enableVisionDebug) {
        setPipelineTrace([
          ...localTrace,
          {
            stage: "ui_render",
            status: "success",
            message:
              "UI state updated with Vision findings, recommendations, and readiness score.",
            data: {
              findingsRendered: visionFindings.length,
              observationsCreated: nextObservations.length,
              recommendationsCreated: nextRecommendations.length,
            },
          },
        ]);
      }
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "AI Vision analysis could not be completed.",
      );
      if (enableVisionDebug && localTrace.length > 0) {
        setPipelineTrace((currentTrace) => [
          ...currentTrace,
          {
            stage: "ui_render",
            status: "failure",
            message: "Analysis pipeline stopped with an error.",
            data: {
              error: error instanceof Error ? error.message : String(error),
            },
          },
        ]);
      }
      if (enableVisionDebug && visionLogOpen) {
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

  const uploadedPhotoCount = photos.length;
  const categorizedPhotoCount = coverageItems.filter(
    ({ count }) => count > 0,
  ).length;
  const missingCategories = coverageItems
    .filter(({ isRecommended, status }) => isRecommended && status === "Missing")
    .map(({ category }) => category);
  const analysisInProgress = isAnalyzing;
  const buttonDisabledReason =
    uploadedPhotoCount <= 0
      ? "no_uploaded_photos"
      : analysisInProgress
        ? "analysis_in_progress"
        : "none";
  const runAnalysisButtonEnabled = buttonDisabledReason === "none";
  const recommendedCountMet =
    photos.length >= 12 && photos.length <= PHOTO_UPLOAD_LIMITS.maxPhotos;

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
                    value: categorizedPhotoCount,
                  },
                  {
                    label: "Coverage",
                    value: photoCoverageScore,
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
                description="For best results, upload 12-20 photos covering all major rooms and the exterior."
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
                    JPEG, PNG, or WebP. Up to {PHOTO_UPLOAD_LIMITS.maxPhotos} images, {formatBytes(PHOTO_UPLOAD_LIMITS.maxBytesPerPhoto)} each.
                  </span>
                  <input
                    accept={SUPPORTED_IMAGE_MIME_TYPES.join(",")}
                    className="sr-only"
                    multiple
                    onChange={handlePhotoUpload}
                    type="file"
                  />
                </label>
                {uploadIssues.length > 0 && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {uploadIssues.map((issue) => (
                      <p key={`${issue.code}-${issue.photoName ?? "request"}`}>
                        {issue.photoName ? `${issue.photoName}: ` : ""}
                        {issue.message}
                      </p>
                    ))}
                  </div>
                )}

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
                      {recommendedCountMet
                        ? "Met"
                        : `12-${PHOTO_UPLOAD_LIMITS.maxPhotos} photos`}
                    </span>
                  </div>
                </div>
              </StepCard>

              <StepCard
                description="Review photo coverage guidance and run the AI assessment."
                isComplete={findings.length > 0}
                step={2}
                title="Review Analysis"
              >
                <div className="mb-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#6B7280]">
                      Photo coverage score
                    </span>
                    <span
                      className={
                        photoCoverageScore === "Excellent"
                          ? "font-bold text-[#16a34a]"
                          : photoCoverageScore === "Good"
                            ? "font-bold text-[#92640a]"
                            : "font-bold text-[#B45309]"
                      }
                    >
                      {photoCoverageScore}
                    </span>
                  </div>
                </div>
                {hasPartialCoverage && (
                  <p className="mb-4 rounded-lg border border-[rgba(212,160,23,0.28)] bg-[rgba(212,160,23,0.08)] px-3 py-2 text-sm font-semibold text-[#92640a]">
                    Analysis can run with partial photo coverage. Results may
                    be limited.
                  </p>
                )}
                <div className="space-y-3">
                  {coverageItems.map(
                    ({ category, count, isRecommended, status }) => (
                    <div key={category}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-[#374151]">
                          {category}
                          {!isRecommended && (
                            <span className="ml-2 text-xs font-bold text-[#9CA3AF]">
                              Optional
                            </span>
                          )}
                        </span>
                        <span
                          className={
                            status === "Complete"
                              ? "font-bold text-[#16a34a]"
                              : status === "Partial"
                                ? "font-bold text-[#92640a]"
                                : "font-bold text-[#9CA3AF]"
                          }
                        >
                          {status}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[#F3F4F6]">
                        <div
                          className="h-2 rounded-full bg-[#D4A017]"
                          style={{ width: `${Math.min(count * 25, 100)}%` }}
                        />
                      </div>
                    </div>
                    ),
                  )}
                </div>

                {enableVisionDebug && (
                <div className="mt-5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#6B7280]">
                        Button Enabled
                      </span>
                      <span className="font-bold text-[#111827]">
                        {String(runAnalysisButtonEnabled)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#6B7280]">
                        Disable Reason
                      </span>
                      <span className="font-bold text-[#111827]">
                        {buttonDisabledReason}
                      </span>
                    </div>
                    <div className="grid gap-2 border-t border-[#E5E7EB] pt-2 text-xs text-[#6B7280] sm:grid-cols-2">
                      <span>uploadedPhotoCount: {uploadedPhotoCount}</span>
                      <span>photos.length: {photos.length}</span>
                      <span>categorizedPhotoCount: {categorizedPhotoCount}</span>
                      <span>coverageScore: {photoCoverageScore}</span>
                      <span>analysisInProgress: {String(analysisInProgress)}</span>
                      <span>
                        button.disabled: {String(!runAnalysisButtonEnabled)}
                      </span>
                      <span className="sm:col-span-2">
                        missingCategories:{" "}
                        {missingCategories.length
                          ? missingCategories.join(", ")
                          : "none"}
                      </span>
                    </div>
                  </div>
                </div>
                )}

                <button
                  className="btn-press mt-5 flex w-full items-center justify-center rounded-xl bg-[#D4A017] px-5 py-3 text-sm font-extrabold text-[#111827] shadow-[0_2px_8px_rgba(212,160,23,0.3)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!runAnalysisButtonEnabled}
                  onClick={() => analyzePhotos()}
                  type="button"
                >
                  {isAnalyzing ? "Analyzing photos..." : "Run AI Analysis"}
                </button>
                {failedAnalysisPhotos.length > 0 && (
                  <button
                    className="btn-press mt-3 flex w-full items-center justify-center rounded-xl border border-[#D4A017] bg-white px-5 py-3 text-sm font-extrabold text-[#92640a] transition hover:bg-[#FDF9EE] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isAnalyzing}
                    onClick={() =>
                      analyzePhotos(
                        new Set(
                          failedAnalysisPhotos.map((photo) => photo.id),
                        ),
                      )
                    }
                    type="button"
                  >
                    Retry Failed Photos
                  </button>
                )}
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
                          {photo.analysisFailure && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                              {photo.analysisFailure.message}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </SectionCard>

              {enableVisionDebug &&
                (visionDebugResponse || analysisError || pipelineTrace.length > 0) && (
                <SectionCard>
                  <div>
                    <p className="label-caps text-[#B45309]">
                      Real-Photo Validation
                    </p>
                    <h2 className="mt-2 text-base font-bold text-[#111827]">
                      Listing AI Output Review
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                      Development-only review surface for checking photo-level
                      classifications, visible findings, recommendations,
                      readiness contribution, and final report copy.
                    </p>
                  </div>

                  {pipelineTrace.length > 0 && (
                    <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <h3 className="text-sm font-bold text-[#111827]">
                        Pipeline Trace
                      </h3>
                      <div className="mt-3 space-y-3">
                        {pipelineTrace.map((entry, index) => (
                          <article
                            className="rounded-lg border border-[#E5E7EB] bg-white p-3"
                            key={`${entry.stage}-${index}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-[#111827]">
                                  {entry.stage
                                    .split("_")
                                    .map(
                                      (word) =>
                                        word.charAt(0).toUpperCase() +
                                        word.slice(1),
                                    )
                                    .join(" ")}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                                  {entry.message}
                                </p>
                              </div>
                              <span
                                className={
                                  entry.status === "success"
                                    ? "rounded-full bg-green-50 px-2.5 py-1 text-xs font-extrabold text-green-700"
                                    : entry.status === "failure"
                                      ? "rounded-full bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-700"
                                      : entry.status === "skipped"
                                        ? "rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-extrabold text-[#6B7280]"
                                        : "rounded-full border border-[rgba(212,160,23,0.35)] bg-[rgba(212,160,23,0.12)] px-2.5 py-1 text-xs font-extrabold text-[#92640a]"
                                }
                              >
                                {entry.status}
                              </span>
                            </div>
                            {entry.data && (
                              <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-[#111827] p-3 text-xs leading-5 text-white">
                                {JSON.stringify(entry.data, null, 2)}
                              </pre>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  {visionDebugResponse?.error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-extrabold text-red-700">
                        {visionDebugResponse.errorType ?? "vision_error"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-red-700">
                        {visionDebugResponse.error}
                      </p>
                    </div>
                  )}

                  {visionDebugResponse && !visionDebugResponse.error && (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <MetricCard
                          label="Route"
                          value={
                            (visionDebugResponse.findings?.length ?? 0) > 0
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
                        {realPhotoValidationRows.map((row) => (
                          <article
                            className="grid min-w-0 gap-4 rounded-xl border border-[#E5E7EB] p-4 md:grid-cols-[140px_minmax(0,1fr)]"
                            key={`real-photo-validation-${row.photoId}`}
                          >
                            <div className="overflow-hidden rounded-lg bg-[#F3F4F6]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt={row.photoName}
                                className="aspect-[4/3] h-full w-full object-cover"
                                src={row.previewUrl}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <p
                                  className="min-w-0 truncate text-sm font-bold text-[#111827]"
                                  title={row.photoName}
                                >
                                  {row.photoName}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                      row.categoryMatchStatus === "Match"
                                        ? "bg-green-50 text-green-700"
                                        : row.categoryMatchStatus === "Mismatch"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-[#F3F4F6] text-[#6B7280]"
                                    }`}
                                  >
                                    {row.categoryMatchStatus}
                                  </span>
                                  {row.confidence && (
                                    <ConfidenceBadge
                                      confidence={row.confidence}
                                    />
                                  )}
                                </div>
                              </div>

                              <dl className="mt-3 grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                                <div className="min-w-0">
                                  <dt className="label-caps">
                                    Assigned Category
                                  </dt>
                                  <dd className="mt-1 break-words font-bold text-[#111827]">
                                    {row.assignedRoom}
                                  </dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="label-caps">
                                    Vision Suggested Category
                                  </dt>
                                  <dd className="mt-1 break-words font-bold text-[#111827]">
                                    {row.visionRoom ?? "No result"}
                                  </dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="label-caps">Condition</dt>
                                  <dd className="mt-1 break-words font-bold text-[#111827]">
                                    {row.condition ?? "No result"}
                                  </dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="label-caps">
                                    Readiness Contribution
                                  </dt>
                                  <dd className="mt-1 break-words font-bold text-[#111827]">
                                    {row.readinessContribution != null
                                      ? `${row.readinessContribution}/100 room score`
                                      : "Not scored"}
                                  </dd>
                                </div>
                                <div className="min-w-0 sm:col-span-2">
                                  <dt className="label-caps">
                                    Visible Findings
                                  </dt>
                                  <dd className="mt-1 break-words text-[#6B7280]">
                                    {row.visibleFindings.length
                                      ? row.visibleFindings.join(", ")
                                      : "None returned"}
                                  </dd>
                                </div>
                                <div className="min-w-0 sm:col-span-2">
                                  <dt className="label-caps">
                                    Supported Recommendations
                                  </dt>
                                  <dd className="mt-1 break-words text-[#6B7280]">
                                    {row.supportedRecommendations.length
                                      ? row.supportedRecommendations.join(", ")
                                      : "None returned"}
                                  </dd>
                                </div>
                                <div className="min-w-0 sm:col-span-2">
                                  <dt className="label-caps">
                                    Selected Recommendation
                                  </dt>
                                  <dd className="mt-1 break-words text-[#6B7280]">
                                    {row.selectedRecommendation ??
                                      "No recommendation selected"}
                                  </dd>
                                </div>
                              </dl>

                              {row.failure && (
                                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                                  {row.failure}
                                </p>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <h3 className="text-sm font-bold text-[#111827]">
                          Validation Checklist
                        </h3>
                        <div className="mt-3 space-y-3 text-sm leading-6 text-[#6B7280]">
                          <p>
                            Collect expected category, whether visible findings
                            are supported, unsupported recommendations,
                            duplicate findings, readiness-score impact, report
                            issues, and PDF issues for each real-photo run.
                          </p>
                          <p>
                            Confidence issues:{" "}
                            {visionValidationFlags.length
                              ? visionValidationFlags.join(" ")
                              : "No low-confidence or missing-result flags were detected in the returned JSON."}
                          </p>
                          <p>
                            Truthfulness guardrail: do not treat hidden defects,
                            age, value, ROI, code compliance, structure, or
                            system condition as known unless they are clearly
                            visible in the photo.
                          </p>
                        </div>
                      </div>

                      {report && (
                        <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-white p-4">
                          <h3 className="text-sm font-bold text-[#111827]">
                            Final Report Output
                          </h3>
                          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="label-caps">Readiness</dt>
                              <dd className="mt-1 text-[#6B7280]">
                                {report.readinessScore.status} (
                                {report.readinessScore.score}/100)
                              </dd>
                            </div>
                            <div>
                              <dt className="label-caps">Confidence</dt>
                              <dd className="mt-1 text-[#6B7280]">
                                {report.confidenceLevel}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="label-caps">Summary</dt>
                              <dd className="mt-1 text-[#6B7280]">
                                {report.propertySummary}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="label-caps">
                                Top Opportunities
                              </dt>
                              <dd className="mt-1 text-[#6B7280]">
                                {report.topOpportunities
                                  .map(
                                    (recommendation) =>
                                      `${recommendation.improvement.category}: ${recommendation.improvement.improvementName}`,
                                  )
                                  .join("; ")}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      )}
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
