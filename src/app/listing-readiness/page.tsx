"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useState } from "react";
import {
  LuxuryCard,
  ProgressBar,
  ReportBadge,
  SectionHeader,
} from "@/components/realty-edge-design-system";
import {
  buildReadinessSummary,
  defaultProperty,
  formatFieldLabel,
  improvements,
  marketingHighlights,
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
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.92),
    height,
    width,
  };
}

function CheckIcon() {
  return <span aria-hidden="true">✓</span>;
}

const workflowSteps = [
  "Property Details",
  "Main Exterior Photo",
  "Upload Property Photos",
  "AI Organizes Photos",
  "Review & Correct",
  "Generate Report",
] as const;

type WorkflowStep = (typeof workflowSteps)[number];

function formatRoomLabel(room: string) {
  return room.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ListingReadinessPage() {
  const [selected, setSelected] = useState<number[]>(
    improvements.map((item) => item.id),
  );
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);
  const [activeStep, setActiveStep] = useState<WorkflowStep>("Property Details");
  const [mainExteriorPhoto, setMainExteriorPhoto] = useState<UploadedPhoto | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [property, setProperty] = useState<PropertyDetails>(defaultProperty);

  const reportPhotos = useMemo(
    () => (mainExteriorPhoto ? [mainExteriorPhoto, ...photos] : photos),
    [mainExteriorPhoto, photos],
  );
  const summary = useMemo(
    () => buildReadinessSummary(selected, reportPhotos, property),
    [property, reportPhotos, selected],
  );

  function showMessage(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  }

  function toggleRecommendation(id: number) {
    setSelected((selection) =>
      selection.includes(id)
        ? selection.filter((selectedId) => selectedId !== id)
        : [...selection, id],
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
      includedInReport: true,
      isCoverPreferred: false,
      name: file.name,
      ...preparedPhoto,
      classificationMode: "manual_fallback",
      confidence: 0.35,
      detectedRoomLabel: "Unknown",
      roomLabel: "Unknown",
      ...overrides,
    } satisfies UploadedPhoto;
  }

  async function handleMainExteriorUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsPreparingPhotos(true);
    try {
      const uploadedPhoto = await prepareUploadedPhoto(file, {
        agentCorrectedClassification: true,
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
    if (isPreparingPhotos) {
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
              <div className="mt-4 grid gap-2 md:grid-cols-6">
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

            {activeStep === "Main Exterior Photo" && (
              <LuxuryCard className="mt-6" tone="gold">
                <SectionHeader
                  eyebrow="Main Exterior Photo"
                  title="Upload the cover hero image"
                  subtitle="Upload the clearest front exterior photo of the home. This image will be used on the cover of the homeowner report."
                />
                <div className="mt-6 grid gap-5 md:grid-cols-[1fr_280px]">
                  <label className="block rounded-xl border-2 border-dashed border-[#d4a017]/50 bg-white p-6">
                    <span className="font-black text-[#082442]">Upload one main exterior photo</span>
                    <span className="mt-2 block text-sm text-slate-600">
                      Full front elevation, landscape orientation, minimal obstruction, and good lighting are preferred.
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
                      Example target
                    </p>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li>Full front elevation</li>
                      <li>Landscape orientation preferred</li>
                      <li>Driveway or front yard acceptable</li>
                      <li>Minimal obstruction</li>
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
                      <ReportBadge tone="positive">Agent-selected cover</ReportBadge>
                      <p className="mt-3 font-black text-[#082442]">{mainExteriorPhoto.name}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700"
                          onClick={() => setMainExteriorPhoto(null)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </LuxuryCard>
            )}

            {activeStep === "Upload Property Photos" && (
              <LuxuryCard className="mt-6">
                <SectionHeader
                  eyebrow="Property Photos"
                  title="Bulk upload remaining photos"
                  subtitle="Upload the remaining property photos in any order. Listing AI will organize them by room."
                />
                <label className="mt-6 block rounded-xl border-2 border-dashed border-slate-300 p-6 text-center">
                  <span className="font-black text-[#082442]">Upload Property Photos</span>
                  <input
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="mt-4 block w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm"
                    disabled={isPreparingPhotos}
                    multiple
                    onChange={handlePhotoUpload}
                    type="file"
                  />
                  {isPreparingPhotos && (
                    <span className="mt-2 block text-sm font-bold text-[#9a7100]">
                      Processing uploaded photos...
                    </span>
                  )}
                </label>
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  {photos.length} bulk photo{photos.length === 1 ? "" : "s"} uploaded.
                </p>
              </LuxuryCard>
            )}

            {activeStep === "AI Organizes Photos" && (
              <LuxuryCard className="mt-6" tone="navy">
                <SectionHeader
                  eyebrow="AI Organizes Photos"
                  title="Classification is ready for review"
                  subtitle="Live Listing AI analysis is not active in this test route yet. These local classifications are a clearly labeled manual fallback based on filenames and later agent corrections."
                />
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <ReportBadge tone="gold">Fallback/manual mode</ReportBadge>
                  <ReportBadge tone="positive">{summary.groupedRoomPhotos.length} room groups</ReportBadge>
                  <ReportBadge>{reportPhotos.length} total photos</ReportBadge>
                </div>
              </LuxuryCard>
            )}

            {activeStep === "Review & Correct" && (
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
                  title="Review and correct photo organization"
                  subtitle="Groups are generated by the current fallback classifier. Correct any room labels, choose preferred report photos, and exclude anything that should not appear in the report."
                />
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
                                {photo.classificationMode === "manual_fallback" ? "Fallback classification" : "Agent corrected"}
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
              </LuxuryCard>
            )}

            {activeStep === "Generate Report" && (
              <LuxuryCard className="mt-6" tone="gold">
                <SectionHeader
                  eyebrow="Generate Report"
                  title="Structured report data is ready"
                  subtitle="The PDF receives resolved photos, room groups, coverage, corrections, and confidence values. Missing photos do not block report generation."
                />
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <ReportBadge tone={summary.propertyHeroPhoto.photo ? "positive" : "muted"}>
                    {summary.propertyHeroPhoto.photo ? "Hero photo ready" : "Hero unavailable"}
                  </ReportBadge>
                  <ReportBadge>{summary.groupedRoomPhotos.length} grouped rooms</ReportBadge>
                  <ReportBadge>{summary.missingRooms.length} coverage notes</ReportBadge>
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
                disabled={isPreparingPhotos}
                onClick={downloadReport}
                type="button"
              >
                {isPreparingPhotos ? "Preparing Photos..." : "Download Test PDF"}
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
                disabled={isPreparingPhotos}
                onClick={downloadReport}
                type="button"
              >
                {isPreparingPhotos ? "Preparing Photos..." : "Download Homeowner Report"}
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
                  {isPreparingPhotos ? "Preparing Photos..." : "Download Full Report"}
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
                {improvements.map((item, index) => {
                  const active = selected.includes(item.id);

                  return (
                    <div key={item.id}>
                      <div className="grid gap-3 py-4 md:grid-cols-[48px_1fr_110px_95px] md:items-center">
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
                  disabled={isPreparingPhotos}
                  onClick={downloadReport}
                  type="button"
                >
                  {isPreparingPhotos ? "Preparing Photos..." : "Create PDF Report"}
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
