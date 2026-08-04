"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useState } from "react";
import { jsPDF } from "jspdf";

type Difficulty = "Very Easy" | "Easy" | "Medium";

type Improvement = {
  id: number;
  room: string;
  title: string;
  description: string;
  points: number;
  difficulty: Difficulty;
  time: string;
  category: string;
  reasons: string[];
};

type PropertyDetails = {
  address: string;
  cityStateZip: string;
  beds: string;
  baths: string;
  sqft: string;
  agentName: string;
  brokerage: string;
};

type UploadedPhoto = {
  id: string;
  name: string;
  dataUrl: string;
};

const baseScore = 62;

const improvements: Improvement[] = [
  {
    id: 1,
    room: "Living Room",
    title: "Fresh Interior Paint",
    description:
      "Use a warm neutral paint color to brighten the room and create a cleaner first impression.",
    points: 8,
    difficulty: "Easy",
    time: "1-2 days",
    category: "Interior Appeal",
    reasons: [
      "Dark wall color absorbs natural light",
      "Neutral paint photographs better",
      "Creates broader buyer appeal",
    ],
  },
  {
    id: 2,
    room: "Dining Room",
    title: "Upgrade Light Fixtures",
    description:
      "Replace the dated fixture with a simple modern design that better matches the updated finishes.",
    points: 4,
    difficulty: "Easy",
    time: "2-3 hours",
    category: "Modernization",
    reasons: [
      "Existing fixture appears dated",
      "Modern lighting creates a stronger focal point",
      "Improves listing photography",
    ],
  },
  {
    id: 3,
    room: "Whole Home",
    title: "Declutter and Depersonalize",
    description:
      "Remove excess decor and personal items so buyers can focus on the space rather than the belongings.",
    points: 3,
    difficulty: "Very Easy",
    time: "3-4 hours",
    category: "Photo Readiness",
    reasons: [
      "Several surfaces appear visually busy",
      "Cleaner spaces feel larger",
      "Helps buyers picture themselves in the home",
    ],
  },
  {
    id: 4,
    room: "Exterior",
    title: "Power Wash Exterior",
    description:
      "Clean the front walk, driveway, and entry surfaces to sharpen curb appeal before photography.",
    points: 2,
    difficulty: "Easy",
    time: "2-4 hours",
    category: "Curb Appeal",
    reasons: [
      "Walkway shows visible discoloration",
      "Entry photos shape first impressions",
      "Low-effort curb appeal improvement",
    ],
  },
  {
    id: 5,
    room: "Primary Bedroom",
    title: "Stage Primary Bedroom",
    description:
      "Simplify furniture placement and use lighter bedding to make the room feel larger and more restful.",
    points: 4,
    difficulty: "Medium",
    time: "Half day",
    category: "Buyer Appeal",
    reasons: [
      "Furniture placement reduces visible floor area",
      "Lighter bedding improves photography",
      "A calm primary suite supports buyer emotion",
    ],
  },
];

const baseCategories = [
  { name: "Curb Appeal", score: 68, potential: 85 },
  { name: "Interior Appeal", score: 74, potential: 92 },
  { name: "Modernization", score: 63, potential: 81 },
  { name: "Buyer Appeal", score: 79, potential: 95 },
  { name: "Photo Readiness", score: 70, potential: 94 },
];

const marketingHighlights = [
  "Open floor plan",
  "Natural light",
  "Updated kitchen",
  "Hardwood floors",
  "Strong curb appeal",
  "Spacious primary suite",
];

const defaultProperty: PropertyDetails = {
  address: "1234 Oak Ridge Drive",
  cityStateZip: "Dallas, TX 75230",
  beds: "5",
  baths: "3",
  sqft: "2,842",
  agentName: "Your Real Estate Professional",
  brokerage: "Realty Edge Pro",
};

function formatKey(key: string) {
  if (key === "address") {
    return "Property Address";
  }

  if (key === "cityStateZip") {
    return "City/State/ZIP";
  }

  if (key === "sqft") {
    return "Square Feet";
  }

  return key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

function safeFilename(address: string) {
  return (
    address
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "property"
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function addWrappedText({
  doc,
  maxWidth,
  text,
  x,
  y,
}: {
  doc: jsPDF;
  maxWidth: number;
  text: string;
  x: number;
  y: number;
}) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];

  doc.text(lines, x, y);

  return y + lines.length * 5 + 3;
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

  const selectedRecommendations = useMemo(
    () => improvements.filter((item) => selected.includes(item.id)),
    [selected],
  );
  const selectedPoints = selectedRecommendations.reduce(
    (sum, item) => sum + item.points,
    0,
  );
  const allPoints = improvements.reduce((sum, item) => sum + item.points, 0);
  const currentScore = Math.min(100, baseScore + selectedPoints);
  const potentialScore = Math.min(100, baseScore + allPoints);
  const coverPhoto = photos[0];
  const categoryScores = baseCategories.map((category) => {
    const selectedCategoryPoints = selectedRecommendations
      .filter((item) => item.category === category.name)
      .reduce((sum, item) => sum + item.points, 0);

    return {
      ...category,
      current: Math.min(category.potential, category.score + selectedCategoryPoints),
    };
  });

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

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const uploadedPhotos = await Promise.all(
      files.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        dataUrl: await readFileAsDataUrl(file),
      })),
    );

    setPhotos((currentPhotos) => [...currentPhotos, ...uploadedPhotos]);
    event.target.value = "";
  }

  function downloadReport() {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const navy: [number, number, number] = [8, 36, 66];
    const gold: [number, number, number] = [228, 170, 36];
    const gray: [number, number, number] = [82, 96, 116];
    const margin = 18;
    const contentWidth = 180;
    let y = 22;

    const ensureSpace = (needed = 24) => {
      if (y + needed <= 260) {
        return;
      }

      doc.addPage();
      y = 22;
    };

    const addSectionTitle = (title: string) => {
      ensureSpace(18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...navy);
      doc.text(title, margin, y);
      doc.setDrawColor(...gold);
      doc.line(margin, y + 2, margin + 44, y + 2);
      y += 10;
    };

    const addParagraph = (text: string, size = 10) => {
      ensureSpace(18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      doc.setTextColor(...gray);
      y = addWrappedText({
        doc,
        maxWidth: contentWidth,
        text,
        x: margin,
        y,
      });
    };

    doc.setFillColor(...navy);
    doc.rect(0, 0, 216, 58, "F");
    doc.setFillColor(...gold);
    doc.rect(0, 58, 216, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Homeowner Listing Readiness Report", margin, 23);
    doc.setFontSize(11);
    doc.text("Marketing preparation guidance from ListingPilot AI", margin, 32);
    doc.setFontSize(16);
    doc.text(property.address, margin, 47);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(property.cityStateZip, margin, 53);

    if (coverPhoto?.dataUrl) {
      try {
        doc.addImage(coverPhoto.dataUrl, "JPEG", 122, 70, 70, 48);
      } catch {
        try {
          doc.addImage(coverPhoto.dataUrl, "PNG", 122, 70, 70, 48);
        } catch {
          // The PDF should still download if a browser-provided image cannot be embedded.
        }
      }
    }

    y = 74;
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Property Snapshot", margin, y);
    y += 8;
    addParagraph(
      `${property.beds} beds | ${property.baths} baths | ${property.sqft} square feet`,
    );
    addParagraph(`Prepared by ${property.agentName}, ${property.brokerage}.`);

    y = Math.max(y, 130);
    doc.setFillColor(247, 248, 251);
    doc.roundedRect(margin, y, contentWidth, 36, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...navy);
    doc.text("CURRENT LISTING READINESS SCORE", margin + 8, y + 10);
    doc.setFontSize(24);
    doc.text(`${currentScore}/100`, margin + 8, y + 26);
    doc.setFontSize(10);
    doc.text("POTENTIAL SCORE", margin + 98, y + 10);
    doc.setTextColor(18, 139, 83);
    doc.setFontSize(24);
    doc.text(`${potentialScore}/100`, margin + 98, y + 26);
    y += 50;

    addSectionTitle("Category Scores");
    categoryScores.forEach((category) => {
      addParagraph(
        `${category.name}: ${category.current}/100 | Potential: ${category.potential}/100`,
      );
    });

    addSectionTitle("Selected Recommendations");
    if (selectedRecommendations.length === 0) {
      addParagraph("No recommendations were selected for this homeowner report.");
    } else {
      selectedRecommendations.forEach((item, index) => {
        ensureSpace(24);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...navy);
        doc.text(`${index + 1}. ${item.title} (${item.room})`, margin, y);
        y += 6;
        addParagraph(
          `${item.description} Score impact: +${item.points} points. Difficulty: ${item.difficulty}. Estimated time: ${item.time}.`,
        );
      });
    }

    addSectionTitle("Marketing Highlights");
    marketingHighlights.forEach((highlight) => {
      addParagraph(`- ${highlight}`);
    });

    addSectionTitle("Next Steps");
    addParagraph("1. Confirm which selected preparation items will be completed before photography.");
    addParagraph("2. Schedule fresh listing photos after the visual preparation work is complete.");
    addParagraph("3. Lead marketing with the strongest rooms, curb appeal, and lifestyle features.");

    addSectionTitle("Important Disclaimer");
    addParagraph(
      "This report is marketing-preparation guidance only. It is not a home inspection, engineering report, appraisal, valuation, or guarantee of sale price or market performance.",
      8,
    );

    const pages = doc.getNumberOfPages();

    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(140, 150, 165);
      doc.text(`Page ${page} of ${pages}`, 178, 270);
    }

    doc.save(`${safeFilename(property.address)}-listing-readiness-report.pdf`);
    showMessage("Homeowner PDF downloaded.");
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
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Test Another Property</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter homeowner-facing property details and upload property
                  photos for the report cover and preview area.
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
              {(Object.keys(property) as Array<keyof PropertyDetails>).map((key) => (
                <label
                  className={key === "address" || key === "cityStateZip" ? "md:col-span-2" : ""}
                  key={key}
                >
                  <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    {formatKey(key)}
                  </span>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#d4a017]"
                    onChange={(event) => updatePropertyField(key, event.target.value)}
                    value={property[key]}
                  />
                </label>
              ))}
            </div>

            <label className="mt-5 block rounded-xl border-2 border-dashed border-slate-300 p-5 text-center">
              <span className="font-bold">Upload property photos</span>
              <span className="mt-1 block text-sm text-slate-500">
                The first uploaded photo is used as the report cover image.
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
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {photos.map((photo) => (
                  <div
                    aria-label={photo.name}
                    className="aspect-[4/3] rounded-xl bg-cover bg-center"
                    key={photo.id}
                    role="img"
                    style={{ backgroundImage: `url(${photo.dataUrl})` }}
                  />
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
              <div
                aria-label={property.address}
                className="h-40 w-full rounded-xl bg-cover bg-center sm:w-60"
                role="img"
                style={{
                  backgroundImage: `url(${
                    coverPhoto?.dataUrl ??
                    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=85"
                  })`,
                }}
              />
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
                  <div className="text-4xl font-black">{currentScore}</div>
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
                    {potentialScore}/100
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
            {categoryScores.map((category) => (
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
                          {active ? "✓" : index + 1}
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
                              <li key={reason}>✓ {reason}</li>
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
                    {baseScore} →{" "}
                    <span className="text-emerald-600">{currentScore}</span>
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
                <h3 className="font-black">How to Test This</h3>
                <ol className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>
                    <strong>1.</strong> Click Test Another Property.
                  </li>
                  <li>
                    <strong>2.</strong> Enter a real address and agent details.
                  </li>
                  <li>
                    <strong>3.</strong> Upload property photos.
                  </li>
                  <li>
                    <strong>4.</strong> Select recommendations.
                  </li>
                  <li>
                    <strong>5.</strong> Download and review the homeowner PDF.
                  </li>
                </ol>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="font-black">Report Includes</h3>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {[
                    "Property cover page",
                    "Current and potential score",
                    "Category scores",
                    "Selected recommendations",
                    "Marketing highlights",
                    "Next steps and disclaimer",
                  ].map((item) => (
                    <li key={item}>✓ {item}</li>
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
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm" key={item}>
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
