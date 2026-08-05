"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RealtyEdgePageHeader,
  RealtyEdgeShell,
} from "@/components/realty-edge-shell";
import {
  LuxuryCard,
  ReportBadge,
  SectionHeader,
} from "@/components/realty-edge-design-system";
import type { AnalyzePhotosResponse } from "@/lib/analysis-schema";
import {
  applyVisionFindingToPhoto,
  buildPhotoBackedRecommendations,
  defaultProperty,
  formatFieldLabel,
  marketingHighlights,
  resolveAddressHeroPhoto,
  roomTypeFromRoomLabel,
  type PropertyDetails,
  reviewRoomLabels,
  type RoomLabel,
  type UploadedPhoto,
} from "../listing-readiness/report-data";
import { downloadListingReadinessPdf } from "../listing-readiness/report-pdf";
import {
  latestListingEvaluationId,
  loadListingEvaluation,
  saveListingEvaluation,
} from "./evaluation-store";
import {
  createListingEvaluationReportData,
  updateListingEvaluationSelection,
  type ListingEvaluationReportData,
} from "./report-view-model";

const acceptedImageTypes = "image/jpeg,image/jpg,image/png,image/webp";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Image could not be loaded.")));
    image.src = dataUrl;
  });
}

function encodedByteLength(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return (
    Math.floor((base64.length * 3) / 4) -
    (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0)
  );
}

async function prepareUploadedPhoto(
  file: File,
  overrides: Partial<UploadedPhoto> = {},
) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image could not be prepared.");

  context.fillStyle = "#082442";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const pdfDataUrl = canvas.toDataURL("image/jpeg", 0.92);

  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    analysisStatus: "pending",
    confidence: 0,
    dataUrl: pdfDataUrl,
    detectedRoomLabel: "Unknown",
    fileMimeType: "image/jpeg",
    fileSize: encodedByteLength(pdfDataUrl),
    height,
    includedInReport: true,
    isCoverPreferred: false,
    name: file.name,
    roomLabel: "Unknown",
    width,
    ...overrides,
  } satisfies UploadedPhoto;
}

function updatePropertyField(
  property: PropertyDetails,
  key: keyof PropertyDetails,
  value: string,
): PropertyDetails {
  const nextProperty = { ...property, [key]: value };
  return {
    ...nextProperty,
    cityStateZip: `${nextProperty.city}, ${nextProperty.state} ${nextProperty.zip}`.trim(),
  };
}

function fieldValue(property: PropertyDetails, key: keyof PropertyDetails) {
  return property[key] ?? "";
}

function validProperty(property: PropertyDetails) {
  return (
    property.address.trim() &&
    property.beds.trim() &&
    property.baths.trim() &&
    property.sqft.trim()
  );
}

function evaluationDetails(property: PropertyDetails) {
  return `${property.beds} beds | ${property.baths} baths | ${property.sqft} sq ft`;
}

function SectionMarker({ children }: { children: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#D4A017] text-sm font-black text-[#111827]">
      {children}
    </span>
  );
}

function NativeCard({
  children,
  description,
  number,
  title,
}: {
  children: ReactNode;
  description: string;
  number: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex gap-4">
        <SectionMarker>{number}</SectionMarker>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold text-[#111827]">{title}</h2>
          <p className="mt-1 text-sm font-medium text-[#6B7280]">{description}</p>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function NewListingEvaluationPage() {
  const router = useRouter();
  const [property, setProperty] = useState<PropertyDetails>(defaultProperty);
  const [mainPhoto, setMainPhoto] = useState<UploadedPhoto | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const canCreate =
    Boolean(validProperty(property)) &&
    Boolean(mainPhoto || resolveAddressHeroPhoto(property)?.photo) &&
    photos.length > 0 &&
    !isPreparing &&
    !isAnalyzing;

  function updateField(key: keyof PropertyDetails, value: string) {
    setProperty((current) => updatePropertyField(current, key, value));
  }

  async function handleMainPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsPreparing(true);
    setError("");
    try {
      setMainPhoto(
        await prepareUploadedPhoto(file, {
          agentCorrectedClassification: true,
          analysisStatus: "complete",
          classificationMode: "agent",
          confidence: 1,
          detectedRoomLabel: "Front Exterior",
          isCoverPreferred: true,
          roomLabel: "Cover",
        }),
      );
    } catch {
      setError("The main home photo could not be prepared.");
    } finally {
      setIsPreparing(false);
      event.target.value = "";
    }
  }

  async function handleBulkPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setIsPreparing(true);
    setError("");
    try {
      const uploaded = await Promise.all(files.map((file) => prepareUploadedPhoto(file)));
      setPhotos((current) => [...current, ...uploaded]);
    } catch {
      setError("One or more property photos could not be prepared.");
    } finally {
      setIsPreparing(false);
      event.target.value = "";
    }
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  async function createEvaluation() {
    if (!canCreate || !mainPhoto) {
      setError("Enter required property details and upload a main home photo plus at least one property photo.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    let analyzedPhotos: UploadedPhoto[] = photos.map((photo) => ({
      ...photo,
      analysisFailure: undefined,
      analysisStatus: "analyzing" as const,
    }));
    setPhotos(analyzedPhotos);

    try {
      const response = await fetch("/api/analyze-photos", {
        body: JSON.stringify({
          photos: analyzedPhotos.map((photo) => ({
            assignedCategory:
              photo.agentCorrectedClassification && photo.roomLabel !== "Unknown"
                ? roomTypeFromRoomLabel(photo.roomLabel)
                : undefined,
            dataUrl: photo.dataUrl,
            fileMimeType: photo.fileMimeType,
            fileSize: photo.fileSize,
            id: photo.id,
            name: photo.name,
          })),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as AnalyzePhotosResponse;
      if (!response.ok) throw new Error(result.error ?? "Photo analysis failed.");

      const findingsByPhotoId = new Map(
        result.findings.map((finding) => [finding.photoId, finding]),
      );
      const failuresByPhotoId = new Map(
        result.failedPhotos.map((failure) => [failure.photoId, failure]),
      );

      analyzedPhotos = analyzedPhotos.map((photo) => {
        const finding = findingsByPhotoId.get(photo.id);
        if (finding) return applyVisionFindingToPhoto(photo, finding);
        const failure = failuresByPhotoId.get(photo.id);
        return {
          ...photo,
          analysisFailure:
            failure?.message ??
            "Listing Evaluation could not confidently identify this photo.",
          analysisStatus: "needs_review",
          confidence: 0,
          detectedRoomLabel: "Unknown",
          roomLabel: "Unknown",
        };
      });
    } catch (analysisError) {
      const message =
        analysisError instanceof Error
          ? analysisError.message
          : "Photo analysis failed.";
      analyzedPhotos = analyzedPhotos.map((photo) => ({
        ...photo,
        analysisFailure: message,
        analysisStatus: "needs_review",
        confidence: 0,
        detectedRoomLabel: "Unknown",
        roomLabel: "Unknown",
      }));
    }

    const reportPhotos = [mainPhoto, ...analyzedPhotos];
    const recommendations = buildPhotoBackedRecommendations(reportPhotos);
    const id = `local-${Date.now()}`;
    const reportData = createListingEvaluationReportData({
      id,
      photos: reportPhotos,
      property,
      recommendations,
    });

    saveListingEvaluation(reportData);
    router.push(`/listing-evaluation/${id}`);
  }

  return (
    <RealtyEdgeShell>
      <div className="flex h-full flex-col overflow-hidden">
        <RealtyEdgePageHeader
          breadcrumbCurrent="New Listing Evaluation"
          description="Create a polished homeowner presentation from property facts and photos."
          title="New Listing Evaluation"
        />
        <main className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8">
          <div className="mx-auto max-w-5xl space-y-5">
            <NativeCard
              description="Enter the subject property address. CMA address lookup integration can plug into this card when available."
              number="1"
              title="Property Address"
            >
              <div className="grid gap-4 md:grid-cols-4">
                {(["address", "city", "state", "zip"] as Array<keyof PropertyDetails>).map((key) => (
                  <label className={key === "address" ? "md:col-span-4" : ""} key={key}>
                    <span className="mb-1 block text-xs font-bold uppercase text-[#6B7280]">
                      {formatFieldLabel(key)}
                    </span>
                    <input
                      className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#D4A017]"
                      onChange={(event) => updateField(key, event.target.value)}
                      value={fieldValue(property, key)}
                    />
                  </label>
                ))}
              </div>
            </NativeCard>

            <NativeCard
              description="Confirm the facts used in the readiness score and report cover."
              number="2"
              title="Property Details"
            >
              <div className="grid gap-4 md:grid-cols-3">
                {([
                  "beds",
                  "baths",
                  "sqft",
                  "propertyType",
                  "garageCount",
                  "pool",
                  "basement",
                  "homeownerName",
                ] as Array<keyof PropertyDetails>).map((key) => (
                  <label key={key}>
                    <span className="mb-1 block text-xs font-bold uppercase text-[#6B7280]">
                      {formatFieldLabel(key)}
                    </span>
                    <input
                      className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#D4A017]"
                      onChange={(event) => updateField(key, event.target.value)}
                      value={fieldValue(property, key)}
                    />
                  </label>
                ))}
              </div>
            </NativeCard>

            <NativeCard
              description="Upload the clearest front exterior photo. This becomes the report cover."
              number="3"
              title="Main Home Photo"
            >
              <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                <label className="rounded-xl border-2 border-dashed border-[#D4A017]/50 bg-[#FFFAF0] p-5">
                  <span className="font-extrabold text-[#111827]">Upload main exterior image</span>
                  <input
                    accept={acceptedImageTypes}
                    className="mt-4 block w-full text-sm"
                    disabled={isPreparing || isAnalyzing}
                    onChange={handleMainPhoto}
                    type="file"
                  />
                </label>
                <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9A7100]">
                    Example
                  </p>
                  <div className="mt-3 grid aspect-[4/3] place-items-center rounded-lg bg-gradient-to-br from-[#0B1437] to-[#D4A017]/40 text-center text-xs font-bold text-white">
                    Front exterior, full home visible
                  </div>
                </div>
              </div>
              {mainPhoto && (
                <div className="mt-4 flex flex-col gap-4 rounded-xl border bg-white p-3 sm:flex-row">
                  <div
                    aria-label={mainPhoto.name}
                    className="h-36 rounded-lg bg-cover bg-center sm:w-56"
                    role="img"
                    style={{ backgroundImage: `url(${mainPhoto.dataUrl})` }}
                  />
                  <div className="self-center">
                    <ReportBadge tone="positive">Property hero photo</ReportBadge>
                    <p className="mt-2 font-extrabold text-[#111827]">{mainPhoto.name}</p>
                    <button
                      className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-black text-red-700"
                      onClick={() => setMainPhoto(null)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </NativeCard>

            <NativeCard
              description="Upload the rest of the property photos in any order. No manual room sorting is required before analysis."
              number="4"
              title="Property Photos"
            >
              <label className="block rounded-xl border-2 border-dashed border-[#D1D5DB] p-5 text-center">
                <span className="font-extrabold text-[#111827]">Upload property photos</span>
                <input
                  accept={acceptedImageTypes}
                  className="mt-4 block w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-3 text-sm"
                  disabled={isPreparing || isAnalyzing}
                  multiple
                  onChange={handleBulkPhotos}
                  type="file"
                />
              </label>
              <p className="mt-3 text-sm font-bold text-[#6B7280]">
                {photos.length} property photo{photos.length === 1 ? "" : "s"} uploaded
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {photos.map((photo) => (
                  <div className="rounded-xl border bg-[#F9FAFB] p-3" key={photo.id}>
                    <div
                      aria-label={photo.name}
                      className="aspect-[4/3] rounded-lg bg-cover bg-center"
                      role="img"
                      style={{ backgroundImage: `url(${photo.dataUrl})` }}
                    />
                    <p className="mt-2 truncate text-sm font-bold">{photo.name}</p>
                    <button
                      className="mt-2 rounded-md border border-red-200 px-2 py-1 text-xs font-black text-red-700"
                      onClick={() => removePhoto(photo.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </NativeCard>

            {error && (
              <p className="rounded-xl bg-[#FFFAF0] p-4 text-sm font-bold text-[#9A7100]">
                {error}
              </p>
            )}

            {isAnalyzing && (
              <div className="rounded-xl border border-[#D4A017]/40 bg-[#0B1437] p-5 text-white shadow-lg">
                <p className="text-lg font-black">Analyzing property photos...</p>
                <p className="mt-2 text-sm text-white/70">
                  Identifying rooms, evaluating presentation, building recommendations, and preparing report.
                </p>
              </div>
            )}

            <div className="sticky bottom-0 flex justify-end border-t bg-[#F5F7FA]/95 py-5">
              <button
                className="rounded-lg bg-[#D4A017] px-6 py-3 text-sm font-black text-[#111827] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canCreate}
                onClick={createEvaluation}
                type="button"
              >
                {isAnalyzing ? "Creating Listing Evaluation..." : "Create Listing Evaluation"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </RealtyEdgeShell>
  );
}

function ReportToolbar({
  onDownload,
  onEdit,
  onReanalyze,
}: {
  onDownload: () => void;
  onEdit: () => void;
  onReanalyze: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-[#071E38]/95 px-4 py-3 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#D4A017]">
          Listing Evaluation Report
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold" href="/listing-evaluation/new">
            Back to Listing Evaluations
          </Link>
          <button className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold" onClick={onEdit} type="button">
            Edit Property
          </button>
          <button className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold" onClick={onReanalyze} type="button">
            Reanalyze Photos
          </button>
          <button className="rounded-lg bg-[#D4A017] px-4 py-2 text-sm font-black text-[#111827]" onClick={onDownload} type="button">
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportCover({ data }: { data: ListingEvaluationReportData }) {
  const { property, summary } = data;
  const opportunity = Math.max(0, summary.potentialScore - summary.currentScore);

  return (
    <section className="overflow-hidden rounded-none bg-[#071E38] text-white shadow-2xl md:rounded-2xl">
      <div
        className="min-h-[360px] bg-cover bg-center"
        style={{
          backgroundImage: summary.propertyHeroPhoto.photo
            ? `url(${summary.propertyHeroPhoto.photo.dataUrl})`
            : undefined,
        }}
      >
        {!summary.propertyHeroPhoto.photo && (
          <div className="grid min-h-[360px] place-items-center bg-[#082442] text-[#D4A017]">
            Property hero photo unavailable
          </div>
        )}
      </div>
      <div className="h-2 bg-[#D4A017]" />
      <div className="grid gap-8 p-6 md:grid-cols-[1.1fr_0.8fr_0.9fr] md:p-10">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#D4A017]">
            Listing Evaluation
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold">REPORT</h1>
          <div className="mt-8 h-0.5 w-20 bg-[#D4A017]" />
          <h2 className="mt-7 text-2xl font-black">{property.address}</h2>
          <p className="mt-2 text-lg text-white/75">{property.cityStateZip}</p>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.12em]">
            {evaluationDetails(property)}
          </p>
        </div>
        <div className="grid place-items-center">
          <div className="grid h-44 w-44 place-items-center rounded-full border-[14px] border-[#D4A017]">
            <div className="text-center">
              <p className="text-6xl font-black">{summary.currentScore}</p>
              <p className="text-white/70">/100</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-black uppercase text-[#D4A017]">
            Current Score
          </p>
        </div>
        <div className="border-white/20 md:border-l md:pl-8">
          <p className="text-sm font-black uppercase text-[#D4A017]">Prepared For</p>
          <p className="mt-3 text-2xl font-black">
            {property.homeownerName.trim() || "Homeowner"}
          </p>
          <div className="mt-8">
            <p className="text-5xl font-black text-[#D4A017]">{summary.potentialScore}</p>
            <p className="font-black">Potential Score</p>
            <p className="mt-5 text-3xl font-black text-[#58C586]">+{opportunity}</p>
            <p className="text-sm font-black uppercase">Points of Opportunity</p>
          </div>
          <div className="mt-8 text-sm text-white/80">
            <p className="font-black text-white">{property.agentName}</p>
            <p>{property.brokerage}</p>
            <p>{property.agentPhone}</p>
            <p>{property.agentEmail}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportPageSection({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl bg-[#FFFCF6] p-6 shadow-sm md:p-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9A7100]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-black text-[#082442]">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function ListingEvaluationReportPage({ id }: { id: string }) {
  const router = useRouter();
  const [reportData, setReportData] = useState<ListingEvaluationReportData | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReportData(loadListingEvaluation(id) ?? null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);

  const selectedSet = useMemo(
    () => new Set(reportData?.selectedRecommendationIds ?? []),
    [reportData],
  );

  if (!reportData) {
    return (
      <RealtyEdgeShell>
        <div className="p-8">
          <LuxuryCard>
            <SectionHeader
              eyebrow="Listing Evaluation"
              title="No report found"
              subtitle="Create a new Listing Evaluation to generate an online report."
            />
            <Link className="mt-6 inline-block rounded-lg bg-[#D4A017] px-5 py-3 font-black text-[#111827]" href="/listing-evaluation/new">
              New Listing Evaluation
            </Link>
          </LuxuryCard>
        </div>
      </RealtyEdgeShell>
    );
  }

  function persist(nextData: ListingEvaluationReportData) {
    setReportData(nextData);
    saveListingEvaluation(nextData);
  }

  function toggleRecommendation(recommendationId: number) {
    if (!reportData) return;
    const nextSelected = selectedSet.has(recommendationId)
      ? reportData.selectedRecommendationIds.filter((id) => id !== recommendationId)
      : [...reportData.selectedRecommendationIds, recommendationId];
    persist(updateListingEvaluationSelection(reportData, nextSelected));
  }

  function updatePhotoRoom(photoId: string, roomLabel: RoomLabel) {
    if (!reportData) return;
    const photos = reportData.photos.map((photo) =>
      photo.id === photoId
        ? {
            ...photo,
            agentCorrectedClassification: true,
            analysisFailure: undefined,
            analysisStatus: roomLabel === "Unknown" ? "needs_review" as const : "complete" as const,
            classificationMode: "agent" as const,
            confidence: 1,
            detectedRoomLabel: roomLabel,
            roomLabel,
          }
        : photo,
    );
    const recommendations = buildPhotoBackedRecommendations(photos);
    persist(
      createListingEvaluationReportData({
        id: reportData.id,
        photos,
        property: reportData.property,
        recommendations,
      }),
    );
  }

  function markBestRoomPhoto(photoId: string) {
    if (!reportData) return;
    const target = reportData.photos.find((photo) => photo.id === photoId);
    if (!target) return;
    const photos = reportData.photos.map((photo) => ({
      ...photo,
      isBestRoomPhoto:
        photo.id === photoId ||
        (photo.roomLabel !== target.roomLabel && photo.isBestRoomPhoto),
    }));
    persist(
      createListingEvaluationReportData({
        id: reportData.id,
        photos,
        property: reportData.property,
        recommendations: buildPhotoBackedRecommendations(photos),
        selectedRecommendationIds: reportData.selectedRecommendationIds,
      }),
    );
  }

  return (
    <RealtyEdgeShell>
      <div className="h-full overflow-auto bg-[#E9EEF5]">
        <ReportToolbar
          onDownload={() => downloadListingReadinessPdf(reportData.property, reportData.summary)}
          onEdit={() => router.push("/listing-evaluation/new")}
          onReanalyze={() => {
            const refreshed = createListingEvaluationReportData({
              id: reportData.id,
              photos: reportData.photos,
              property: reportData.property,
              recommendations: buildPhotoBackedRecommendations(reportData.photos),
            });
            persist(refreshed);
          }}
        />
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
          <ReportCover data={reportData} />

          <ReportPageSection eyebrow="Executive Summary" title="A clear path to a stronger listing.">
            <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
              <div
                className="min-h-72 rounded-xl bg-cover bg-center"
                style={{
                  backgroundImage: reportData.summary.executivePhoto
                    ? `url(${reportData.summary.executivePhoto.dataUrl})`
                    : undefined,
                }}
              />
              <div>
                <p className="text-lg leading-8 text-[#374151]">
                  {reportData.property.address} is evaluated through buyer presentation,
                  photography readiness, and visible first-impression quality.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <ReportBadge tone="gold">Current {reportData.summary.currentScore}</ReportBadge>
                  <ReportBadge tone="positive">Potential {reportData.summary.potentialScore}</ReportBadge>
                  <ReportBadge>+{reportData.summary.selectedPoints} points</ReportBadge>
                </div>
              </div>
            </div>
          </ReportPageSection>

          <ReportPageSection eyebrow="Category Scores" title="Where preparation has the most visual leverage.">
            <div className="grid gap-4 md:grid-cols-5">
              {reportData.summary.categoryScores.map((category) => (
                <div className="rounded-xl border bg-white p-4" key={category.name}>
                  <p className="font-black text-[#082442]">{category.name}</p>
                  <p className="mt-4 text-3xl font-black">{category.current}</p>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#D4A017]" style={{ width: `${category.current}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-bold text-[#128B53]">Potential {category.potential}</p>
                </div>
              ))}
            </div>
          </ReportPageSection>

          <ReportPageSection eyebrow="Room Overview" title="Identified rooms with valid photos.">
            <div className="grid gap-4 md:grid-cols-3">
              {reportData.summary.roomOverviews.map((room) => (
                <div className="rounded-xl border bg-white p-3" key={`${room.room}-${room.photo?.id}`}>
                  <div
                    className="aspect-[4/3] rounded-lg bg-cover bg-center"
                    style={{ backgroundImage: room.photo ? `url(${room.photo.dataUrl})` : undefined }}
                  />
                  <p className="mt-3 font-black text-[#082442]">{room.room}</p>
                  <p className="text-sm text-[#6B7280]">{room.current} current | {room.potential} potential</p>
                </div>
              ))}
            </div>
          </ReportPageSection>

          <ReportPageSection eyebrow="Room Recommendations" title="Photo-backed preparation priorities.">
            <div className="space-y-5">
              {reportData.recommendations.length === 0 && (
                <p className="rounded-xl bg-white p-5 font-semibold text-[#6B7280]">
                  No room-specific recommendations are ready. Photos marked Needs Review are excluded from detailed recommendations.
                </p>
              )}
              {reportData.recommendations.map((recommendation) => (
                <div className="grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-[190px_1fr_160px]" key={recommendation.id}>
                  <div
                    className="aspect-[4/3] rounded-lg bg-cover bg-center"
                    style={{
                      backgroundImage: recommendation.sourcePhoto
                        ? `url(${recommendation.sourcePhoto.dataUrl})`
                        : undefined,
                    }}
                  />
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <ReportBadge>{recommendation.room}</ReportBadge>
                      <ReportBadge>{recommendation.detectedCategory ?? recommendation.room}</ReportBadge>
                      {recommendation.confidence ? (
                        <ReportBadge>{Math.round(recommendation.confidence * 100)}% confidence</ReportBadge>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-xl font-black text-[#082442]">{recommendation.title}</h3>
                    <p className="mt-2 text-[#374151]">{recommendation.description}</p>
                    <p className="mt-3 text-sm text-[#6B7280]">
                      <strong>Why it matters:</strong> {recommendation.whyItMatters}
                    </p>
                    {recommendation.sourcePhoto && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <select
                          className="rounded-lg border px-3 py-2 text-sm"
                          onChange={(event) => updatePhotoRoom(recommendation.sourcePhoto!.id, event.target.value as RoomLabel)}
                          value={recommendation.sourcePhoto.roomLabel}
                        >
                          {reviewRoomLabels.map((room) => (
                            <option key={room} value={room}>{room}</option>
                          ))}
                        </select>
                        <button className="rounded-lg border px-3 py-2 text-sm font-black" onClick={() => markBestRoomPhoto(recommendation.sourcePhoto!.id)} type="button">
                          Select best room photo
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between gap-3">
                    <div className="space-y-2 text-sm font-black">
                      <p className="text-[#128B53]">+{recommendation.points} points</p>
                      <p>{recommendation.difficulty}</p>
                      <p>{recommendation.time}</p>
                    </div>
                    <label className="flex items-center gap-2 font-black">
                      <input
                        checked={selectedSet.has(recommendation.id)}
                        onChange={() => toggleRecommendation(recommendation.id)}
                        type="checkbox"
                      />
                      Include
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </ReportPageSection>

          <ReportPageSection eyebrow="Improvement Plan" title={`Fastest path to ${reportData.summary.potentialScore}.`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-[#082442] text-white">
                  <tr>
                    {["Priority", "Room", "Improvement", "Points", "Difficulty", "Estimated Time"].map((heading) => (
                      <th className="px-4 py-3" key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.summary.selectedRecommendations.map((item) => (
                    <tr className="border-b bg-white" key={item.id}>
                      <td className="px-4 py-3">{item.priority}</td>
                      <td className="px-4 py-3">{item.room}</td>
                      <td className="px-4 py-3">{item.title}</td>
                      <td className="px-4 py-3">+{item.points}</td>
                      <td className="px-4 py-3">{item.difficulty}</td>
                      <td className="px-4 py-3">{item.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportPageSection>

          <ReportPageSection eyebrow="Marketing Highlights" title="Prepare the story before launch.">
            <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
              <div
                className="min-h-72 rounded-xl bg-cover bg-center"
                style={{
                  backgroundImage: reportData.summary.marketingPhoto
                    ? `url(${reportData.summary.marketingPhoto.dataUrl})`
                    : undefined,
                }}
              />
              <div>
                <div className="flex flex-wrap gap-2">
                  {marketingHighlights.slice(0, 6).map((highlight) => (
                    <ReportBadge key={highlight} tone="gold">{highlight}</ReportBadge>
                  ))}
                </div>
                <p className="mt-6 text-[#374151]">
                  Lead with the exterior, follow with the strongest interior photos,
                  complete selected preparation items, then schedule professional photography.
                </p>
              </div>
            </div>
          </ReportPageSection>
        </main>
      </div>
    </RealtyEdgeShell>
  );
}

export function ListingEvaluationIndexPage() {
  const router = useRouter();
  useEffect(() => {
    const latestId = latestListingEvaluationId();
    router.replace(latestId ? `/listing-evaluation/${latestId}` : "/listing-evaluation/new");
  }, [router]);

  return (
    <RealtyEdgeShell>
      <div className="p-8">
        <LuxuryCard>
          <SectionHeader
            eyebrow="Listing Evaluation"
            title="Opening Listing Evaluation"
            subtitle="Loading the latest report or starting a new evaluation."
          />
        </LuxuryCard>
      </div>
    </RealtyEdgeShell>
  );
}
