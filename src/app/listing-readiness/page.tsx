"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useState } from "react";
import type { AnalyzePhotosResponse } from "@/lib/analysis-schema";
import {
  LuxuryCard,
  ProgressBar,
  ReportBadge,
  SectionHeader,
} from "@/components/realty-edge-design-system";
import {
  buildReadinessSummary,
  buildPhotoBackedRecommendations,
  defaultProperty,
  formatFieldLabel,
  marketingHighlights,
  applyVisionFindingToPhoto,
  roomTypeFromRoomLabel,
  type PropertyDetails,
  reviewRoomLabels,
  type RoomLabel,
  type UploadedPhoto,
} from "./report-data";
import { downloadListingReadinessPdf } from "./report-pdf";

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

async function readFileAsPdfImage(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image could not be prepared for PDF.");
  }

  context.fillStyle = "#082442";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pdfDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const base64 = pdfDataUrl.split(",")[1] ?? "";
  return {
    dataUrl: pdfDataUrl,
    height,
    preparedByteLength: Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0),
    width,
  };
}

function CheckIcon() {
  return <span aria-hidden="true">✓</span>;
}

const workflowSteps = [
  "Property Details",
  "Upload Photos",
  "Review & Generate Report",
] as const;

type WorkflowStep = (typeof workflowSteps)[number];

function formatRoomLabel(room: string) {
  return room.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ListingReadinessPage() {
  const [excludedRecommendationIds, setExcludedRecommendationIds] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);
  const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [activeStep, setActiveStep] = useState<WorkflowStep>("Property Details");
  const [mainExteriorPhoto, setMainExteriorPhoto] = useState<UploadedPhoto | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [property, setProperty] = useState<PropertyDetails>(defaultProperty);

  const reportPhotos = useMemo(
    () => (mainExteriorPhoto ? [mainExteriorPhoto, ...photos] : photos),
    [mainExteriorPhoto, photos],
  );
  const photoBackedRecommendations = useMemo(
    () => buildPhotoBackedRecommendations(reportPhotos),
    [reportPhotos],
  );
  const selected = useMemo(
    () =>
      photoBackedRecommendations
        .map((item) => item.id)
        .filter((id) => !excludedRecommendationIds.includes(id)),
    [excludedRecommendationIds, photoBackedRecommendations],
  );
  const summary = useMemo(
    () =>
      buildReadinessSummary(selected, reportPhotos, property, {
        recommendations: photoBackedRecommendations,
      }),
    [photoBackedRecommendations, property, reportPhotos, selected],
  );

  function showMessage(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  }

  function toggleRecommendation(id: number) {
    setExcludedRecommendationIds((excludedIds) =>
      excludedIds.includes(id)
        ? excludedIds.filter((excludedId) => excludedId !== id)
        : [...excludedIds, id],
    );
  }

  function updatePropertyField(key: keyof PropertyDetails, value: string) {
    setProperty((currentProperty) => {
      const nextProperty = {
        ...currentProperty,
        [key]: value,
      };
      return {
        ...nextProperty,
        cityStateZip: `${nextProperty.city}, ${nextProperty.state} ${nextProperty.zip}`.trim(),
      };
    });
  }

  function updatePhotoRoom(photoId: string, roomLabel: RoomLabel) {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) => {
        return photo.id === photoId
            ? {
                ...photo,
                agentCorrectedClassification: true,
                analysisFailure: undefined,
                analysisStatus: roomLabel === "Unknown" ? "needs_review" : "complete",
                classificationMode: "agent",
                confidence: 1,
                detectedRoomLabel: roomLabel,
              roomLabel,
            }
          : photo;
      }),
    );
  }

  async function prepareUploadedPhoto(file: File, overrides: Partial<UploadedPhoto> = {}) {
    const preparedPhoto = await readFileAsPdfImage(file);
    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      analysisStatus: "pending",
      fileMimeType: "image/jpeg",
      fileSize: preparedPhoto.preparedByteLength,
      includedInReport: true,
      isCoverPreferred: false,
      name: file.name,
      ...preparedPhoto,
      confidence: 0,
      detectedRoomLabel: "Unknown",
      roomLabel: "Unknown",
      ...overrides,
    } satisfies UploadedPhoto;
  }

  function updatePhotosById(updatedPhotos: UploadedPhoto[]) {
    const updatedById = new Map(updatedPhotos.map((photo) => [photo.id, photo]));

    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) => updatedById.get(photo.id) ?? photo),
    );
    setMainExteriorPhoto((currentPhoto) =>
      currentPhoto ? updatedById.get(currentPhoto.id) ?? currentPhoto : currentPhoto,
    );
  }

  async function analyzeUploadedPhotos(targetPhotos: UploadedPhoto[]) {
    const photosForAnalysis = targetPhotos.filter(
      (photo) => photo.roomLabel !== "Cover" && photo.dataUrl,
    );

    if (photosForAnalysis.length === 0) {
      return;
    }

    setIsAnalyzingPhotos(true);
    setAnalysisError("");
    updatePhotosById(
      photosForAnalysis.map((photo) => ({
        ...photo,
        analysisFailure: undefined,
        analysisStatus: "analyzing",
      })),
    );

    try {
      const response = await fetch("/api/analyze-photos", {
        body: JSON.stringify({
          photos: photosForAnalysis.map((photo) => ({
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

      if (!response.ok) {
        throw new Error(result.error ?? "Listing AI photo analysis failed.");
      }

      const findingsByPhotoId = new Map(
        result.findings.map((finding) => [finding.photoId, finding]),
      );
      const failuresByPhotoId = new Map(
        result.failedPhotos.map((failure) => [failure.photoId, failure]),
      );

      updatePhotosById(
        photosForAnalysis.map((photo) => {
          const finding = findingsByPhotoId.get(photo.id);
          if (finding) {
            return applyVisionFindingToPhoto(photo, finding);
          }

          const failure = failuresByPhotoId.get(photo.id);
          return {
            ...photo,
            analysisFailure: failure?.message ?? "Listing AI did not return a room classification for this photo.",
            analysisStatus: "needs_review",
            confidence: 0,
            detectedRoomLabel: "Unknown" as const,
            roomLabel: "Unknown" as const,
          };
        }),
      );

      if (result.failedPhotos.length > 0) {
        setAnalysisError(
          `${result.failedPhotos.length} photo${result.failedPhotos.length === 1 ? "" : "s"} need manual review before room-specific recommendations can be created.`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Listing AI photo analysis failed.";
      setAnalysisError(message);
      updatePhotosById(
        photosForAnalysis.map((photo) => ({
          ...photo,
          analysisFailure: message,
          analysisStatus: "needs_review",
          confidence: 0,
          detectedRoomLabel: "Unknown",
          roomLabel: "Unknown",
        })),
      );
    } finally {
      setIsAnalyzingPhotos(false);
    }
  }

  async function handleMainExteriorUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsPreparingPhotos(true);
    try {
      const uploadedPhoto = await prepareUploadedPhoto(file, {
        agentCorrectedClassification: true,
        analysisStatus: "complete",
        classificationMode: "agent",
        confidence: 1,
        detectedRoomLabel: "Front Exterior",
        isCoverPreferred: true,
        roomLabel: "Cover",
      });
      setMainExteriorPhoto(uploadedPhoto);
    } catch {
      showMessage("The main exterior photo could not be prepared.");
    } finally {
      setIsPreparingPhotos(false);
      event.target.value = "";
    }
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setIsPreparingPhotos(true);

    try {
      const uploadedPhotos: UploadedPhoto[] = await Promise.all(
        files.map((file) => prepareUploadedPhoto(file)),
      );

      setPhotos((currentPhotos) => [...currentPhotos, ...uploadedPhotos]);
      void analyzeUploadedPhotos(uploadedPhotos);
    } catch {
      showMessage("One or more photos could not be prepared for the PDF.");
    } finally {
      setIsPreparingPhotos(false);
      event.target.value = "";
    }
  }

  async function handleAgentHeadshotUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    updatePropertyField("agentHeadshotDataUrl", file ? await readFileAsDataUrl(file) : "");
    event.target.value = "";
  }

  function markCoverPhoto(photoId: string) {
    const targetPhoto = reportPhotos.find((photo) => photo.id === photoId);
    if (!targetPhoto) return;
    const coverPhoto = {
      ...targetPhoto,
      agentCorrectedClassification: true,
      classificationMode: "agent" as const,
      confidence: 1,
      detectedRoomLabel: "Front Exterior" as const,
      isCoverPreferred: true,
      roomLabel: "Cover" as const,
    };
    setMainExteriorPhoto(coverPhoto);
    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.id !== photoId),
    );
  }

  function removePhoto(photoId: string) {
    setPhotos((currentPhotos) => currentPhotos.filter((photo) => photo.id !== photoId));
    setMainExteriorPhoto((currentPhoto) => (currentPhoto?.id === photoId ? null : currentPhoto));
  }

  function setPhotoIncluded(photoId: string, includedInReport: boolean) {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, includedInReport } : photo,
      ),
    );
    setMainExteriorPhoto((currentPhoto) =>
      currentPhoto?.id === photoId ? { ...currentPhoto, includedInReport } : currentPhoto,
    );
  }

  function markBestRoomPhoto(photoId: string) {
    const targetPhoto = reportPhotos.find((photo) => photo.id === photoId);
    if (!targetPhoto) return;
    const targetRoom = targetPhoto.roomLabel === "Cover" ? "Front Exterior" : targetPhoto.roomLabel;
    const updateBest = (photo: UploadedPhoto) => ({
      ...photo,
      isBestRoomPhoto:
        photo.id === photoId ||
        (photo.roomLabel !== targetRoom && photo.isBestRoomPhoto),
    });
    setPhotos((currentPhotos) => currentPhotos.map(updateBest));
    setMainExteriorPhoto((currentPhoto) => (currentPhoto ? updateBest(currentPhoto) : currentPhoto));
  }

  function downloadReport() {
    if (isPreparingPhotos || isAnalyzingPhotos) {
      showMessage("Photos are still preparing for the PDF.");
      return;
    }

    downloadListingReadinessPdf(property, summary);
    showMessage("Luxury homeowner PDF downloaded.");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#15213b]">
      {notice && (
        <div className="fixed right-6 top-6 z-50 rounded-xl bg-[#082442] px-5 py-4 text-sm font-semibold text-white shadow-2xl">
          {notice}
        </div>
      )}

      {showSetup && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Test Another Property</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter homeowner-facing details, upload property photos, and
                  label each room for the luxury PDF report.
                </p>
              </div>
              <button
                className="rounded-lg bg-slate-100 px-3 py-2 font-bold"
                onClick={() => setShowSetup(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              <ProgressBar
                label={activeStep}
                max={workflowSteps.length}
                value={workflowSteps.indexOf(activeStep) + 1}
              />
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {workflowSteps.map((step) => (
                  <button
                    className={`rounded-lg border px-3 py-2 text-xs font-black ${
                      activeStep === step
                        ? "border-[#d4a017] bg-[#fffaf0] text-[#9a7100]"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                    key={step}
                    onClick={() => setActiveStep(step)}
                    type="button"
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>

            {activeStep === "Property Details" && (
              <LuxuryCard className="mt-6">
                <SectionHeader
                  eyebrow="Step 1"
                  title="Property Details"
                  subtitle="Enter the facts used for the report, coverage checks, and homeowner-facing PDF."
                />
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {([
                    "address",
                    "city",
                    "state",
                    "zip",
                    "beds",
                    "baths",
                    "sqft",
                    "propertyType",
                    "garageCount",
                    "pool",
                    "basement",
                    "homeownerName",
                    "agentName",
                    "brokerage",
                    "agentPhone",
                    "agentEmail",
                    "agentWebsite",
                  ] as Array<keyof PropertyDetails>).map((key) => (
                    <label
                      className={key === "address" ? "md:col-span-3" : ""}
                      key={key}
                    >
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        {formatFieldLabel(key)}
                      </span>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#d4a017]"
                        onChange={(event) => updatePropertyField(key, event.target.value)}
                        value={property[key]}
                      />
                    </label>
                  ))}
                </div>
                <label className="mt-5 block rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <span className="font-bold">Optional agent headshot</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Used on the PDF cover. If skipped, the cover uses an initials avatar.
                  </span>
                  <input
                    accept="image/*"
                    className="mt-3 block w-full text-sm"
                    onChange={handleAgentHeadshotUpload}
                    type="file"
                  />
                  {property.agentHeadshotDataUrl && (
                    <span className="mt-2 block text-sm font-bold text-emerald-700">
                      Headshot selected
                    </span>
                  )}
                </label>
              </LuxuryCard>
            )}

            {activeStep === "Upload Photos" && (
              <div className="mt-6 space-y-5">
                <LuxuryCard tone="gold">
                  <SectionHeader
                    eyebrow="Main Home Photo"
                    title="Upload the front exterior cover photo"
                    subtitle="Use the actual front elevation of the home. Interior photos will not silently become the report cover."
                  />
                  <div className="mt-6 grid gap-5 md:grid-cols-[1fr_280px]">
                    <label className="block rounded-xl border-2 border-dashed border-[#d4a017]/50 bg-white p-6">
                      <span className="font-black text-[#082442]">Upload one front exterior photo</span>
                      <span className="mt-2 block text-sm text-slate-600">
                        Full home visible, straight perspective, good light, and landscape orientation are preferred.
                      </span>
                      <input
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="mt-4 block w-full text-sm"
                        disabled={isPreparingPhotos}
                        onChange={handleMainExteriorUpload}
                        type="file"
                      />
                    </label>
                    <div className="rounded-xl bg-[#082442] p-5 text-white">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d4a017]">
                        Expected image
                      </p>
                      <ul className="mt-4 space-y-2 text-sm">
                        <li>Front elevation of the subject property</li>
                        <li>Most or all of the house visible</li>
                        <li>Driveway or front yard is acceptable</li>
                        <li>No interior room as automatic cover</li>
                      </ul>
                    </div>
                  </div>
                  {mainExteriorPhoto && (
                    <div className="mt-5 flex flex-col gap-4 sm:flex-row">
                      <div
                        aria-label={mainExteriorPhoto.name}
                        className="h-40 rounded-xl bg-cover bg-center sm:w-64"
                        role="img"
                        style={{ backgroundImage: `url(${mainExteriorPhoto.dataUrl})` }}
                      />
                      <div className="self-center">
                        <ReportBadge tone="positive">Cover photo selected</ReportBadge>
                        <p className="mt-3 font-black text-[#082442]">{mainExteriorPhoto.name}</p>
                        <button
                          className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700"
                          onClick={() => setMainExteriorPhoto(null)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </LuxuryCard>

                <LuxuryCard>
                  <SectionHeader
                    eyebrow="All Other Property Photos"
                    title="Bulk upload room and property photos"
                    subtitle="Upload the remaining JPG, JPEG, PNG, or WebP photos in any order. Listing AI analysis starts automatically after upload."
                  />
                  <label className="mt-6 block rounded-xl border-2 border-dashed border-slate-300 p-6 text-center">
                    <span className="font-black text-[#082442]">Upload Property Photos</span>
                    <input
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="mt-4 block w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm"
                      disabled={isPreparingPhotos || isAnalyzingPhotos}
                      multiple
                      onChange={handlePhotoUpload}
                      type="file"
                    />
                    {isPreparingPhotos && (
                      <span className="mt-2 block text-sm font-bold text-[#9a7100]">
                        Preparing uploaded photos...
                      </span>
                    )}
                    {isAnalyzingPhotos && (
                      <span className="mt-2 block text-sm font-bold text-[#9a7100]">
                        Analyzing {photos.filter((photo) => photo.analysisStatus === "analyzing").length || photos.length} property photos...
                      </span>
                    )}
                  </label>
                  {analysisError && (
                    <p className="mt-4 rounded-xl bg-[#fffaf0] p-4 text-sm font-semibold text-[#9a7100]">
                      {analysisError}
                    </p>
                  )}
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                    {photos.map((photo) => (
                      <div className="rounded-xl border bg-slate-50 p-3" key={photo.id}>
                        <div
                          aria-label={photo.name}
                          className="aspect-[4/3] rounded-lg bg-cover bg-center"
                          role="img"
                          style={{ backgroundImage: `url(${photo.dataUrl})` }}
                        />
                        <p className="mt-3 truncate text-sm font-black text-[#082442]">
                          {photo.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <ReportBadge
                            tone={
                              photo.analysisStatus === "complete"
                                ? "positive"
                                : photo.analysisStatus === "needs_review"
                                  ? "gold"
                                  : "muted"
                            }
                          >
                            {photo.analysisStatus === "complete"
                              ? photo.roomLabel
                              : photo.analysisStatus === "needs_review"
                                ? "Needs Review"
                                : photo.analysisStatus === "analyzing"
                                  ? "Analyzing"
                                  : "Pending"}
                          </ReportBadge>
                          {photo.confidence ? (
                            <ReportBadge>{Math.round(photo.confidence * 100)}%</ReportBadge>
                          ) : null}
                        </div>
                        <button
                          className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-black text-red-700"
                          onClick={() => removePhoto(photo.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </LuxuryCard>
              </div>
            )}

            {activeStep === "Review & Generate Report" && (
              <LuxuryCard className="mt-6">
                <SectionHeader
                  action={
                    <button
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-black text-slate-600"
                      onClick={() => showMessage("Custom rooms can be created by correcting a photo to Other for this test build.")}
                      type="button"
                    >
                      Add Room
                    </button>
                  }
                  eyebrow="Photo Review"
                  title="Review room analysis and recommendations"
                  subtitle="Each recommendation is connected to the analyzed room photo that caused it. Unknown photos stay in Needs Review until corrected."
                />
                {isAnalyzingPhotos && (
                  <p className="mt-4 rounded-xl bg-[#fffaf0] p-4 text-sm font-semibold text-[#9a7100]">
                    Analyzing {photos.filter((photo) => photo.analysisStatus === "analyzing").length || photos.length} property photos...
                  </p>
                )}
                {analysisError && (
                  <p className="mt-4 rounded-xl bg-[#fffaf0] p-4 text-sm font-semibold text-[#9a7100]">
                    {analysisError}
                  </p>
                )}
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  {summary.coverageSummary.map((item) => (
                    <div className="rounded-xl border bg-slate-50 p-3" key={item.label}>
                      <p className="text-xs font-black uppercase text-slate-500">{item.label}</p>
                      <p className="mt-2 text-xl font-black text-[#082442]">
                        {item.status === "Not Applicable"
                          ? "N/A"
                          : `${item.actual} of ${item.expected}`}
                      </p>
                      <ReportBadge
                        tone={
                          item.status === "Complete"
                            ? "positive"
                            : item.status === "Missing"
                              ? "muted"
                              : "gold"
                        }
                      >
                        {item.status}
                      </ReportBadge>
                    </div>
                  ))}
                </div>
                {summary.missingRooms.length > 0 && (
                  <p className="mt-4 rounded-xl bg-[#fffaf0] p-4 text-sm font-semibold text-[#9a7100]">
                    Some rooms may be missing. You can add photos or continue with limited coverage.
                  </p>
                )}
                <div className="mt-6 space-y-6">
                  {photos.filter((photo) => photo.analysisStatus === "needs_review" || photo.roomLabel === "Unknown").length > 0 && (
                    <div>
                      <h3 className="mb-3 text-lg font-black text-[#082442]">Needs Review</h3>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        {photos
                          .filter((photo) => photo.analysisStatus === "needs_review" || photo.roomLabel === "Unknown")
                          .map((photo) => (
                            <div className="rounded-xl border border-[#d4a017]/40 bg-[#fffaf0] p-3" key={photo.id}>
                              <div
                                aria-label={photo.name}
                                className="aspect-[4/3] rounded-lg bg-cover bg-center"
                                role="img"
                                style={{ backgroundImage: `url(${photo.dataUrl})` }}
                              />
                              <p className="mt-3 truncate text-sm font-black text-[#082442]">{photo.name}</p>
                              <p className="mt-2 text-xs font-semibold text-[#9a7100]">
                                {photo.analysisFailure ?? "Assign a room before room-specific recommendations can be created."}
                              </p>
                              <label className="mt-3 block">
                                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                  Room / Category
                                </span>
                                <select
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                  onChange={(event) =>
                                    updatePhotoRoom(photo.id, event.target.value as RoomLabel)
                                  }
                                  value={photo.roomLabel}
                                >
                                  {reviewRoomLabels.map((room) => (
                                    <option key={room} value={room}>
                                      {room}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {summary.groupedRoomPhotos.map((group) => (
                    <div key={group.room}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-black text-[#082442]">
                          {formatRoomLabel(String(group.room))}
                        </h3>
                        <ReportBadge>{group.photos.length} photo{group.photos.length === 1 ? "" : "s"}</ReportBadge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        {group.photos.map((photo) => (
                          <div className="rounded-xl border bg-slate-50 p-3" key={photo.id}>
                            <div
                              aria-label={photo.name}
                              className="aspect-[4/3] rounded-lg bg-cover bg-center"
                              role="img"
                              style={{ backgroundImage: `url(${photo.dataUrl})` }}
                            />
                            <p className="mt-3 truncate text-sm font-black text-[#082442]">
                              {photo.name}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <ReportBadge tone={photo.classificationMode === "manual_fallback" ? "gold" : "positive"}>
                                {photo.classificationMode === "ai"
                                  ? "AI classified"
                                  : photo.classificationMode === "agent"
                                    ? "Agent corrected"
                                    : "Needs Review"}
                              </ReportBadge>
                              <ReportBadge>{Math.round((photo.confidence ?? 0) * 100)}%</ReportBadge>
                            </div>
                            <label className="mt-3 block">
                              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                Room / Category
                              </span>
                              <select
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                onChange={(event) =>
                                  updatePhotoRoom(photo.id, event.target.value as RoomLabel)
                                }
                                value={photo.roomLabel}
                              >
                                {reviewRoomLabels.map((room) => (
                                  <option key={room} value={room}>
                                    {room}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="mt-3 grid gap-2">
                              <button
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-600"
                                onClick={() => markBestRoomPhoto(photo.id)}
                                type="button"
                              >
                                {photo.isBestRoomPhoto ? "Best room photo" : "Mark best for room"}
                              </button>
                              <button
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-600"
                                onClick={() => setPhotoIncluded(photo.id, photo.includedInReport === false)}
                                type="button"
                              >
                                {photo.includedInReport === false ? "Include in report" : "Exclude from report"}
                              </button>
                              <button
                                className="rounded-lg border border-[#d4a017] bg-white px-3 py-2 text-sm font-black text-[#9a7100]"
                                onClick={() => markCoverPhoto(photo.id)}
                                type="button"
                              >
                                Use as main exterior
                              </button>
                              <button
                                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-black text-red-700"
                                onClick={() => removePhoto(photo.id)}
                                type="button"
                              >
                                Remove photo
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-black text-[#082442]">Photo-backed recommendations</h3>
                  <div className="mt-4 space-y-4">
                    {photoBackedRecommendations.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                        No room-specific recommendations are ready yet. Upload room photos and complete analysis, or correct Needs Review photos with visible issues.
                      </p>
                    ) : (
                      photoBackedRecommendations.map((item) => {
                        const active = selected.includes(item.id);
                        return (
                          <div
                            className="grid gap-4 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-[160px_1fr_130px]"
                            key={item.id}
                          >
                            {item.sourcePhoto && (
                              <div
                                aria-label={item.sourcePhoto.name}
                                className="aspect-[4/3] rounded-lg bg-cover bg-center"
                                role="img"
                                style={{ backgroundImage: `url(${item.sourcePhoto.dataUrl})` }}
                              />
                            )}
                            <div>
                              <div className="flex flex-wrap gap-2">
                                <ReportBadge>{item.room}</ReportBadge>
                                <ReportBadge>{item.detectedCategory ?? item.room}</ReportBadge>
                                {item.confidence ? (
                                  <ReportBadge>{Math.round(item.confidence * 100)}% confidence</ReportBadge>
                                ) : null}
                              </div>
                              <h4 className="mt-3 text-lg font-black text-[#082442]">{item.title}</h4>
                              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                              <p className="mt-3 text-sm text-slate-600">
                                <strong>Why it matters:</strong> {item.whyItMatters}
                              </p>
                            </div>
                            <div className="flex flex-col justify-between gap-3">
                              <div className="space-y-2 text-sm font-bold">
                                <div className="text-emerald-700">+{item.points} points</div>
                                <div>{item.difficulty}</div>
                                <div>{item.time}</div>
                              </div>
                              <label className="flex items-center gap-2 text-sm font-black">
                                <input
                                  checked={active}
                                  onChange={() => toggleRecommendation(item.id)}
                                  type="checkbox"
                                />
                                Include
                              </label>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </LuxuryCard>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-lg border border-slate-300 px-5 py-3 font-bold"
                disabled={workflowSteps.indexOf(activeStep) === 0}
                onClick={() =>
                  setActiveStep(workflowSteps[Math.max(0, workflowSteps.indexOf(activeStep) - 1)])
                }
                type="button"
              >
                Back
              </button>
              <button
                className="rounded-lg border border-[#d4a017] bg-white px-5 py-3 font-bold text-[#9a7100]"
                disabled={workflowSteps.indexOf(activeStep) === workflowSteps.length - 1}
                onClick={() =>
                  setActiveStep(
                    workflowSteps[
                      Math.min(workflowSteps.length - 1, workflowSteps.indexOf(activeStep) + 1)
                    ],
                  )
                }
                type="button"
              >
                Continue
              </button>
              <button
                className="rounded-lg border border-slate-300 px-5 py-3 font-bold"
                onClick={() => setShowSetup(false)}
                type="button"
              >
                Use These Details
              </button>
              <button
                className="rounded-lg bg-[#082442] px-5 py-3 font-bold text-white"
                disabled={isPreparingPhotos || isAnalyzingPhotos}
                onClick={downloadReport}
                type="button"
              >
                {isPreparingPhotos || isAnalyzingPhotos ? "Preparing Photos..." : "Download Test PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1550px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-[#082442] to-[#04182d] p-6 text-white xl:flex">
          <div className="mb-10 flex items-center gap-3">
            <Image
              alt="Realty Edge Pro"
              className="h-10 w-10 object-contain"
              height={40}
              src="/logo_gold.png"
              width={40}
            />
            <div className="text-lg font-extrabold leading-5">
              REALTY
              <br />
              EDGE PRO
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            {[
              "Dashboard",
              "Properties",
              "Contacts",
              "Marketing",
              "Transactions",
              "Listing AI",
              "Resources",
              "Reports",
              "Help Center",
            ].map((item) => (
              <div
                className={`rounded-xl px-4 py-3 ${
                  item === "Listing AI"
                    ? "bg-white/10 font-bold"
                    : "text-slate-300"
                }`}
                key={item}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1 p-4 md:p-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-black">
              Listing AI{" "}
              <span className="text-base font-normal text-slate-500">
                Homeowner Report Test
              </span>
            </h1>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-lg border border-[#d4a017] bg-white px-5 py-3 font-bold text-[#9a7100]"
                onClick={() => setShowSetup(true)}
                type="button"
              >
                Test Another Property
              </button>
              <button
                className="rounded-lg bg-[#082442] px-5 py-3 font-bold text-white"
                disabled={isPreparingPhotos || isAnalyzingPhotos}
                onClick={downloadReport}
                type="button"
              >
                {isPreparingPhotos || isAnalyzingPhotos ? "Preparing Photos..." : "Download Homeowner Report"}
              </button>
            </div>
          </header>

          <div className="mb-5 grid overflow-hidden rounded-2xl border bg-white shadow-sm lg:grid-cols-2">
            <div className="flex flex-col gap-5 p-5 sm:flex-row">
              {summary.coverPhoto ? (
                <div
                  aria-label={property.address}
                  className="h-40 w-full rounded-xl bg-cover bg-center sm:w-60"
                  role="img"
                  style={{ backgroundImage: `url(${summary.coverPhoto.dataUrl})` }}
                />
              ) : (
                <div className="grid h-40 w-full place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500 sm:w-60">
                  Photo not provided
                </div>
              )}
              <div className="self-center">
                <h2 className="text-xl font-black">{property.address}</h2>
                <p className="mt-1 text-slate-500">{property.cityStateZip}</p>
                <p className="mt-5 font-medium">
                  {property.beds} Bed | {property.baths} Bath | {property.sqft}{" "}
                  Sq Ft
                </p>
              </div>
            </div>
            <div className="flex items-center gap-7 border-t p-6 lg:border-l lg:border-t-0">
              <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full border-[10px] border-[#e4aa24]">
                <div className="text-center">
                  <div className="text-4xl font-black">{summary.currentScore}</div>
                  <div className="text-xs text-slate-500">/100</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-black uppercase text-slate-500">
                  Listing Readiness Score
                </div>
                <p className="mt-3 leading-6 text-slate-600">
                  The score updates as recommendations are selected or removed.
                  Potential score:{" "}
                  <span className="font-black text-emerald-700">
                    {summary.potentialScore}/100
                  </span>
                  .
                </p>
                <button
                  className="mt-4 rounded-lg border border-slate-400 px-4 py-2 text-sm font-bold"
                  disabled={isPreparingPhotos}
                  onClick={downloadReport}
                  type="button"
                >
                  {isPreparingPhotos || isAnalyzingPhotos ? "Preparing Photos..." : "Download Full Report"}
                </button>
              </div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {summary.categoryScores.map((category) => (
              <div
                className="rounded-2xl border bg-white p-4 text-center shadow-sm"
                key={category.name}
              >
                <div className="text-sm font-bold">{category.name}</div>
                <div className="mt-3 text-3xl font-black">
                  {category.current}
                  <span className="text-xs font-normal">/100</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#e4aa24]"
                    style={{ width: `${category.current}%` }}
                  />
                </div>
                <div className="mt-2 text-xs font-bold text-emerald-600">
                  Potential {category.potential}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black">Recommended Improvements</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose what the homeowner plans to complete. The score and PDF
                update automatically.
              </p>
              <div className="mt-5 divide-y">
                {photoBackedRecommendations.length === 0 && (
                  <div className="rounded-xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">
                    Upload and analyze property photos to create room-specific,
                    photo-backed recommendations. Photos marked Needs Review do
                    not create detailed recommendations until a room is identified.
                  </div>
                )}
                {photoBackedRecommendations.map((item, index) => {
                  const active = selected.includes(item.id);

                  return (
                    <div key={item.id}>
                      <div className="grid gap-3 py-4 md:grid-cols-[92px_48px_1fr_110px_95px] md:items-center">
                        {item.sourcePhoto ? (
                          <div
                            aria-label={item.sourcePhoto.name}
                            className="aspect-[4/3] rounded-lg bg-cover bg-center"
                            role="img"
                            style={{ backgroundImage: `url(${item.sourcePhoto.dataUrl})` }}
                          />
                        ) : (
                          <div className="aspect-[4/3] rounded-lg bg-slate-100" />
                        )}
                        <button
                          aria-label={`${active ? "Remove" : "Select"} ${item.title}`}
                          className={`grid h-9 w-9 place-items-center rounded-full font-black text-white ${
                            active ? "bg-emerald-600" : "bg-slate-400"
                          }`}
                          onClick={() => toggleRecommendation(item.id)}
                          type="button"
                        >
                          {active ? <CheckIcon /> : index + 1}
                        </button>
                        <button
                          className="text-left"
                          onClick={() =>
                            setExpanded(expanded === item.id ? null : item.id)
                          }
                          type="button"
                        >
                          <span className="block font-black">{item.title}</span>
                          <span className="text-sm text-slate-500">
                            {item.room} | {item.description}
                          </span>
                          <span className="mt-1 block text-xs font-bold uppercase text-slate-400">
                            {item.detectedCategory ?? item.room}
                            {item.confidence ? ` | ${Math.round(item.confidence * 100)}% confidence` : ""}
                          </span>
                        </button>
                        <div className="font-black text-emerald-600">
                          +{item.points} points
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-2 text-center text-xs font-bold text-emerald-700">
                          {item.difficulty}
                        </span>
                      </div>
                      {expanded === item.id && (
                        <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                          <strong>Why recommended:</strong>
                          <ul className="mt-2 space-y-1">
                            {item.reasons.map((reason) => (
                              <li key={reason}>
                                <CheckIcon /> {reason}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-3">
                            <strong>Estimated time:</strong> {item.time}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-5">
                <div>
                  <div className="text-sm text-slate-500">
                    Selected readiness
                  </div>
                  <div className="text-3xl font-black">
                    {summary.baseScore} -&gt;{" "}
                    <span className="text-emerald-600">
                      {summary.currentScore}
                    </span>
                  </div>
                </div>
                <button
                  className="rounded-lg bg-[#082442] px-5 py-3 font-bold text-white"
                  disabled={isPreparingPhotos || isAnalyzingPhotos}
                  onClick={downloadReport}
                  type="button"
                >
                  {isPreparingPhotos || isAnalyzingPhotos ? "Preparing Photos..." : "Create PDF Report"}
                </button>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="font-black">Photo Labels</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Uploaded photos are assigned to rooms and used directly in
                  the PDF. Missing rooms are clearly marked as photo not
                  provided.
                </p>
                <div className="mt-4 text-sm font-bold text-[#9a7100]">
                  {reportPhotos.length} report photo{reportPhotos.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="font-black">Report Includes</h3>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {[
                    "Eight-page luxury PDF",
                    "Photo-rich cover and room pages",
                    "Current and potential score",
                    "Category and room scores",
                    "Selected recommendations only",
                    "Next steps and disclaimer",
                  ].map((item) => (
                    <li key={item}>
                      <CheckIcon /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>

          <div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="font-black">
              Marketing Highlights{" "}
              <span className="font-normal text-slate-400">
                Detected by AI
              </span>
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {marketingHighlights.map((item) => (
                <span
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm"
                  key={item}
                >
                  <CheckIcon /> {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
