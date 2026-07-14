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
  validateClientPhotoFiles,
} from "@/lib/analysis-schema";

type PhotoItem = {
  id: string;
  name: string;
  displayLabel: string;
  url: string;
  size: number;
  area: RoomType | null;
  categoryStatus:
    | "pending_analysis"
    | "analyzing"
    | "ai_suggested"
    | "agent_corrected"
    | "analysis_failed";
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
  const [report, setReport] = useState<OptimizationReport | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const analysisQueueRef = useRef(new Set<string>());
  const isAnalyzingRef = useRef(false);
  const latestPhotosRef = useRef<PhotoItem[]>([]);
  const latestFindingsRef = useRef<VisionFinding[]>([]);
  const uploadSequenceRef = useRef(0);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    latestPhotosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    latestFindingsRef.current = visionDebugResponse?.findings ?? [];
  }, [visionDebugResponse]);

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

  function resetReportState() {
    setFindings([]);
    setRecommendations([]);
    setReadinessScore(null);
    setReport(null);
  }

  function appendPhotoFiles(files: File[]) {
    const remainingSlots = PHOTO_UPLOAD_LIMITS.maxPhotos - photos.length;

    if (remainingSlots <= 0) {
      setUploadIssues([
        {
          code: "too_many_photos",
          message:
            "You have reached the 20-photo limit. Remove a photo before adding another.",
        },
      ]);
      return;
    }

    const filesToValidate = files.slice(0, remainingSlots);
    const skippedForLimit = files.length > remainingSlots;
    const existingKeys = new Set(
      photos.map((photo) => `${photo.name}:${photo.size}:${photo.file.type}`),
    );
    const currentTotalBytes = photos.reduce((sum, photo) => sum + photo.size, 0);
    const { accepted, issues } = validateClientPhotoFiles({
      currentPhotoCount: photos.length,
      currentTotalBytes,
      existingKeys,
      files: filesToValidate,
    });

    setUploadIssues([
      ...(skippedForLimit
        ? [
            {
              code: "too_many_photos" as const,
              message:
                "You can upload up to 20 photos per report. We added the first available photos and skipped the rest.",
            },
          ]
        : []),
      ...issues.map((issue) => ({
        ...issue,
        photoName: undefined,
      })),
    ]);

    if (accepted.length === 0) {
      return;
    }

    uploadSequenceRef.current += 1;
    const uploadBatchId = uploadSequenceRef.current;
    const appendedPhotos = accepted.map((file, index) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);

      return {
        id: `${file.name}-${file.lastModified}-${index}-${uploadBatchId}-${photos.length + index}`,
        name: file.name,
        displayLabel: `Photo ${photos.length + index + 1}`,
        url,
        size: file.size,
        area: null,
        categoryStatus: "pending_analysis" as const,
        classificationConfidence: 0.2,
        matchedKeywords: [],
        file,
      };
    });

    setPhotos((currentPhotos) => [...currentPhotos, ...appendedPhotos]);
    resetReportState();
    appendedPhotos.forEach((photo) => analysisQueueRef.current.add(photo.id));
    window.setTimeout(() => {
      void processAnalysisQueue();
    }, 0);
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
              categoryStatus: "agent_corrected",
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
    setReport(null);
  }

  function removePhoto(photoId: string) {
    analysisQueueRef.current.delete(photoId);
    setPhotos((currentPhotos) => {
      const photoToRemove = currentPhotos.find((photo) => photo.id === photoId);

      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.url);
        objectUrlsRef.current.delete(photoToRemove.url);
      }

      return currentPhotos.filter((photo) => photo.id !== photoId);
    });
    setVisionDebugResponse((currentResponse) =>
      currentResponse
        ? {
            ...currentResponse,
            findings: currentResponse.findings.filter(
              (finding) => finding.photoId !== photoId,
            ),
            failedPhotos: currentResponse.failedPhotos.filter(
              (failure) => failure.photoId !== photoId,
            ),
          }
        : currentResponse,
    );
    resetReportState();
  }

  async function processAnalysisQueue() {
    if (isAnalyzingRef.current || analysisQueueRef.current.size === 0) {
      return;
    }

    const queuedPhotoIds = Array.from(analysisQueueRef.current);
    analysisQueueRef.current.clear();
    await analyzePhotos(new Set(queuedPhotoIds));

    if (analysisQueueRef.current.size > 0) {
      void processAnalysisQueue();
    }
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
    if (isAnalyzingRef.current) {
      if (targetPhotoIds) {
        targetPhotoIds.forEach((photoId) =>
          analysisQueueRef.current.add(photoId),
        );
      }
      return;
    }

    const photosToAnalyze = targetPhotoIds
      ? latestPhotosRef.current.filter((photo) => targetPhotoIds.has(photo.id))
      : latestPhotosRef.current.filter(
          (photo) =>
            !latestFindingsRef.current.some(
              (finding) => finding.photoId === photo.id,
            ) || photo.analysisFailure,
        );

    if (photosToAnalyze.length === 0) {
      setAnalysisError("No failed photos are available to retry.");
      return;
    }

    const activePhotoIds = new Set(photosToAnalyze.map((photo) => photo.id));
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    setAnalysisError("");
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        activePhotoIds.has(photo.id)
          ? {
              ...photo,
              categoryStatus:
                photo.categoryStatus === "agent_corrected"
                  ? photo.categoryStatus
                  : "analyzing",
              analysisFailure: undefined,
            }
          : photo,
      ),
    );
    let visionLogOpen = false;

    try {
      const unreadablePhotos: PhotoAnalysisFailure[] = [];
      const readablePhotos: PhotoItem[] = [];

      for (const photo of photosToAnalyze) {
        if (await validateReadableImage(photo.file)) {
          readablePhotos.push(photo);
        } else {
          unreadablePhotos.push({
            photoId: photo.id,
            name: photo.displayLabel,
            status: "failed",
            errorType: "image_decode_failed",
            message: "Analysis unavailable",
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
            assignedCategory:
              photo.categoryStatus === "agent_corrected" && photo.area
                ? photo.area
                : undefined,
            fileMimeType: photo.file.type,
            fileSize: photo.file.size,
            dataUrl,
          };
        }),
      );

      if (enableVisionDebug) {
        console.groupCollapsed("[ListingPilot Vision] analyzePhotos");
        console.log("calling /api/analyze-photos", {
          photoCount: payloadPhotos.length,
        });
        visionLogOpen = true;
      }

      const response = await fetch("/api/analyze-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: payloadPhotos }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | VisionAnalysisResponse
          | null;

        if (enableVisionDebug) {
          console.error("Vision route error", errorBody);
          setVisionDebugResponse(errorBody);
        }

        throw new Error(errorBody?.error ?? "AI Vision analysis failed.");
      }

      const result = (await response.json()) as VisionAnalysisResponse;
      if (enableVisionDebug) {
        console.log("Vision route JSON", result);
        console.groupEnd();
        visionLogOpen = false;
        setVisionDebugResponse(result);
      }

      const retriedPhotoIds = new Set(photosToAnalyze.map((photo) => photo.id));
      const currentPhotoIds = new Set(
        latestPhotosRef.current.map((photo) => photo.id),
      );
      const freshFindings = (result.findings ?? []).filter((finding) =>
        currentPhotoIds.has(finding.photoId),
      );
      const visionFindings = mergeFindings(
        latestFindingsRef.current.filter((finding) =>
          currentPhotoIds.has(finding.photoId),
        ),
        freshFindings,
        retriedPhotoIds,
      );
      const failedPhotos = [
        ...unreadablePhotos,
        ...(result.failedPhotos ?? []).filter((failure) =>
          currentPhotoIds.has(failure.photoId),
        ),
      ];
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
              area:
                photo.categoryStatus === "agent_corrected"
                  ? photo.area
                  : finding.suggestedCategory,
              categoryStatus:
                photo.categoryStatus === "agent_corrected"
                  ? photo.categoryStatus
                  : "ai_suggested",
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
              analysisFailure: {
                ...failure,
                name: photo.displayLabel,
                message: "Analysis unavailable",
              },
              categoryStatus:
                photo.categoryStatus === "agent_corrected"
                  ? photo.categoryStatus
                  : "analysis_failed",
            };
          }

          return photo;
        }),
      );

      const nextAnalysisConfidence = confidenceFromVisionFindings(visionFindings);

      setFindings([]);
      setRecommendations([]);
      setReadinessScore(null);
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
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "AI Vision analysis could not be completed.",
      );
      if (enableVisionDebug && visionLogOpen) {
        console.groupEnd();
      }
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
      if (analysisQueueRef.current.size > 0) {
        window.setTimeout(() => {
          void processAnalysisQueue();
        }, 0);
      }
    }
  }

  function generateListingReport() {
    if (isAnalyzingRef.current) {
      setAnalysisError("AI is still identifying rooms. Please wait a moment.");
      return;
    }

    if (!visionDebugResponse?.findings?.length) {
      setAnalysisError("Upload photos and wait for AI room identification first.");
      return;
    }

    const photoById = new Map(photos.map((photo) => [photo.id, photo]));
    const successfulPhotos = photos.filter(
      (photo) => !photo.analysisFailure && visionFindingsByPhotoId.has(photo.id),
    );
    const missingCategory = successfulPhotos.find((photo) => !photo.area);

    if (missingCategory) {
      setAnalysisError(
        "Review all successful photo categories before creating the report.",
      );
      return;
    }

    const confirmedFindings = visionDebugResponse.findings.flatMap((finding) => {
      const photo = photoById.get(finding.photoId);

      if (!photo || photo.analysisFailure || !photo.area) {
        return [];
      }

      return [
        {
          ...finding,
          assignedCategory: photo.area,
          categoryMismatch: false,
        },
      ];
    });

    if (confirmedFindings.length === 0) {
      setAnalysisError(
        "No successfully analyzed photos are ready for scoring yet.",
      );
      return;
    }

    const nextObservations = buildRoomObservations(confirmedFindings);
    const nextRecommendations = recommendImprovements({
      observations: nextObservations,
      limit: 12,
    });
    const nextReadinessScore = calculatePropertyReadinessScore({
      observations: nextObservations,
      recommendations: nextRecommendations,
    });

    setFindings(
      buildFindings({
        observations: nextObservations,
        recommendations: nextRecommendations,
      }),
    );
    setRecommendations(nextRecommendations);
    setReadinessScore(nextReadinessScore);
    setAnalysisConfidence(confidenceFromVisionFindings(confirmedFindings));
    setAnalysisError("");
    setVisionDebugResponse({
      ...visionDebugResponse,
      findings: confirmedFindings,
    });
    setReport(
      buildReport({
        confidenceLevel: confidenceFromVisionFindings(confirmedFindings),
        findings: buildFindings({
          observations: nextObservations,
          recommendations: nextRecommendations,
        }),
        photos,
        readinessScore: nextReadinessScore,
        recommendations: nextRecommendations,
      }),
    );
  }

  const categorizedPhotoCount = coverageItems.filter(
    ({ count }) => count > 0,
  ).length;
  const analysisInProgress = isAnalyzing;
  const successfulClassifiedPhotoCount = photos.filter(
    (photo) =>
      !photo.analysisFailure &&
      photo.area != null &&
      visionFindingsByPhotoId.has(photo.id),
  ).length;
  const completedAnalysisCount = photos.filter(
    (photo) =>
      photo.categoryStatus === "ai_suggested" ||
      photo.categoryStatus === "agent_corrected" ||
      photo.categoryStatus === "analysis_failed",
  ).length;
  const categoriesReadyForReview = successfulClassifiedPhotoCount > 0;
  const canGenerateReport = categoriesReadyForReview && !analysisInProgress;
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
                  <span className="mt-2 max-w-sm text-xs leading-5 text-[#6B7280]">
                    AI will identify each room. You can review and correct the
                    categories before the report is created.
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
                      <p key={`${issue.code}-${issue.message}`}>
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
                description="AI identifies each room automatically. Review and correct any category before creating the report."
                isComplete={categoriesReadyForReview}
                step={2}
                title="Review Categories"
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
                {analysisInProgress && (
                  <p className="mb-4 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-bold text-[#374151]">
                    AI is identifying rooms: {completedAnalysisCount} of{" "}
                    {photos.length} complete
                  </p>
                )}
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

                {!categoriesReadyForReview && photos.length > 0 && (
                  <p className="mt-3 text-sm font-semibold text-[#6B7280]">
                    AI room identification starts automatically after upload.
                  </p>
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
                title="Generate Listing Report"
              >
                <button
                  className="btn-press flex w-full items-center justify-center rounded-xl bg-[#1B2238] px-5 py-3 text-sm font-extrabold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canGenerateReport}
                  onClick={generateListingReport}
                  type="button"
                >
                  Generate Listing Report
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
                    Review AI-suggested categories, then correct any photo that
                    needs a different room.
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
                            alt={photo.displayLabel}
                            className="h-full w-full object-cover"
                            src={photo.url}
                          />
                        </div>
                        <div className="space-y-3 p-3.5">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#111827]">
                                {photo.displayLabel}
                              </p>
                              <p className="text-xs text-[#9CA3AF]">
                                {formatBytes(photo.size)}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-extrabold ${
                                photo.categoryStatus === "agent_corrected"
                                  ? "bg-blue-50 text-blue-700"
                                : photo.categoryStatus === "ai_suggested"
                                    ? "bg-green-50 text-green-700"
                                    : photo.categoryStatus === "analysis_failed"
                                      ? "bg-red-50 text-red-700"
                                    : "bg-[#F3F4F6] text-[#6B7280]"
                              }`}
                            >
                              {photo.categoryStatus === "agent_corrected"
                                ? "Agent corrected"
                                : photo.categoryStatus === "ai_suggested"
                                  ? "AI identified"
                                  : photo.categoryStatus === "analysis_failed"
                                    ? "Analysis unavailable"
                                    : "Analyzing..."}
                            </span>
                          </div>
                          <button
                            className="text-xs font-bold text-[#6B7280] underline underline-offset-2 hover:text-[#111827]"
                            onClick={() => removePhoto(photo.id)}
                            type="button"
                          >
                            Remove
                          </button>
                          <select
                            className="rep-input py-2 text-sm"
                            onChange={(event) =>
                              updatePhotoArea(
                                photo.id,
                                event.target.value as RoomType,
                              )
                            }
                            value={photo.area ?? ""}
                          >
                            <option disabled value="">
                              Identifying room
                            </option>
                            {propertyAreas.map((area) => (
                              <option key={area} value={area}>
                                {area}
                              </option>
                            ))}
                          </select>
                          {photo.analysisFailure && (
                            <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                              <p>Analysis unavailable</p>
                              <button
                                className="text-xs font-extrabold text-red-800 underline underline-offset-2"
                                disabled={isAnalyzing}
                                onClick={() => analyzePhotos(new Set([photo.id]))}
                                type="button"
                              >
                                Retry photo
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </SectionCard>

              {enableVisionDebug &&
                visionDebugResponse &&
                !visionDebugResponse.error && (
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
