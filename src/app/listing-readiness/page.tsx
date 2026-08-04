"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useState } from "react";
import {
  buildReadinessSummary,
  defaultProperty,
  formatFieldLabel,
  improvements,
  inferRoomFromFilename,
  marketingHighlights,
  type PropertyDetails,
  roomLabels,
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

function CheckIcon() {
  return <span aria-hidden="true">✓</span>;
}

export default function ListingReadinessPage() {
  const [selected, setSelected] = useState<number[]>(
    improvements.map((item) => item.id),
  );
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [property, setProperty] = useState<PropertyDetails>(defaultProperty);

  const summary = useMemo(
    () => buildReadinessSummary(selected, photos),
    [photos, selected],
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
    setProperty((currentProperty) => ({
      ...currentProperty,
      [key]: value,
    }));
  }

  function updatePhotoRoom(photoId: string, roomLabel: RoomLabel) {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, roomLabel } : photo,
      ),
    );
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const uploadedPhotos = await Promise.all(
      files.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        isCoverPreferred: false,
        name: file.name,
        dataUrl: await readFileAsDataUrl(file),
        roomLabel: inferRoomFromFilename(file.name),
      })),
    );

    setPhotos((currentPhotos) => [...currentPhotos, ...uploadedPhotos]);
    event.target.value = "";
  }

  async function handleAgentHeadshotUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    updatePropertyField("agentHeadshotDataUrl", file ? await readFileAsDataUrl(file) : "");
    event.target.value = "";
  }

  function markCoverPhoto(photoId: string) {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) => ({
        ...photo,
        isCoverPreferred: photo.id === photoId,
      })),
    );
  }

  function downloadReport() {
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

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(Object.keys(property) as Array<keyof PropertyDetails>)
                .filter((key) => key !== "agentHeadshotDataUrl")
                .map((key) => (
                  <label
                    className={
                      key === "address" || key === "cityStateZip"
                        ? "md:col-span-2"
                        : ""
                    }
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
                Used on the PDF cover. If skipped, the cover uses an initials
                avatar.
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

            <label className="mt-5 block rounded-xl border-2 border-dashed border-slate-300 p-5 text-center">
              <span className="font-bold">Upload property photos</span>
              <span className="mt-1 block text-sm text-slate-500">
                Upload multiple photos, then assign each one to the correct
                room. Exterior photos are prioritized for the cover.
              </span>
              <input
                accept="image/*"
                className="mt-3 block w-full text-sm"
                multiple
                onChange={handlePhotoUpload}
                type="file"
              />
            </label>

            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                {photos.map((photo) => (
                  <div className="rounded-xl border bg-slate-50 p-3" key={photo.id}>
                    <div
                      aria-label={photo.name}
                      className="aspect-[4/3] rounded-lg bg-cover bg-center"
                      role="img"
                      style={{ backgroundImage: `url(${photo.dataUrl})` }}
                    />
                    <label className="mt-3 block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Room label
                      </span>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        onChange={(event) =>
                          updatePhotoRoom(photo.id, event.target.value as RoomLabel)
                        }
                        value={photo.roomLabel}
                      >
                        {roomLabels.map((room) => (
                          <option key={room} value={room}>
                            {room}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm font-black ${
                        photo.isCoverPreferred
                          ? "border-[#D4A017] bg-[#f7edd1] text-[#9a7100]"
                          : "border-slate-300 bg-white text-slate-600"
                      }`}
                      onClick={() => markCoverPhoto(photo.id)}
                      type="button"
                    >
                      {photo.isCoverPreferred ? "Cover photo selected" : "Use as cover photo"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-lg border border-slate-300 px-5 py-3 font-bold"
                onClick={() => setShowSetup(false)}
                type="button"
              >
                Use These Details
              </button>
              <button
                className="rounded-lg bg-[#082442] px-5 py-3 font-bold text-white"
                onClick={downloadReport}
                type="button"
              >
                Download Test PDF
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
                onClick={downloadReport}
                type="button"
              >
                Download Homeowner Report
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
                  onClick={downloadReport}
                  type="button"
                >
                  Download Full Report
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
                  onClick={downloadReport}
                  type="button"
                >
                  Create PDF Report
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
                  {photos.length} uploaded photo{photos.length === 1 ? "" : "s"}
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
