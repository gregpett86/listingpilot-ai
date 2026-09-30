"use client";

import { useMemo, useState } from "react";
import { addPropertySpace, buildPropertySpaces } from "@/lib/listing-evaluation-v2/property-template";
import { displaySpaceName, type PropertySpace, type SpaceCategory } from "@/lib/listing-evaluation-v2/types";

const baseSections: Array<{ category: SpaceCategory; label: string }> = [
  { category: "bedroom", label: "Bedrooms" },
  { category: "bathroom", label: "Bathrooms" },
  { category: "kitchen", label: "Kitchens" },
  { category: "living", label: "Living Areas" },
  { category: "dining", label: "Dining Areas" },
  { category: "office", label: "Offices" },
  { category: "garage", label: "Garages" },
  { category: "basement", label: "Basements" },
  { category: "exterior", label: "Exterior" },
  { category: "landscaping", label: "Landscaping" },
  { category: "pool", label: "Pools" },
  { category: "deck_patio", label: "Decks / Patios" },
  { category: "adu", label: "ADU / In-Law Suites" },
  { category: "specialty", label: "Other Spaces" },
];

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(20, Math.floor(parsed))) : 0;
}

export default function ListingEvaluationV2Client() {
  const [counts, setCounts] = useState<Record<string, number>>({
    bedroom: 3,
    bathroom: 2,
    kitchen: 1,
    living: 1,
    exterior: 2,
    landscaping: 1,
  });
  const [spaces, setSpaces] = useState<PropertySpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string>();

  const grouped = useMemo(
    () =>
      baseSections.map((section) => ({
        ...section,
        spaces: spaces.filter((space) => space.category === section.category),
      })),
    [spaces],
  );

  function generateSpaces() {
    const generated = buildPropertySpaces(counts);
    setSpaces(generated);
    setActiveSpaceId(generated[0]?.id);
  }

  function renameSpace(id: string, customLabel: string) {
    setSpaces((current) =>
      current.map((space) => (space.id === id ? { ...space, customLabel } : space)),
    );
  }

  function markNoPhotos(id: string) {
    setSpaces((current) =>
      current.map((space) =>
        space.id === id
          ? { ...space, status: "not_evaluated", noPhotosReason: "No photos available" }
          : space,
      ),
    );
  }

  const activeSpace = spaces.find((space) => space.id === activeSpaceId);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Realty Edge Pro</p>
          <h1 className="mt-2 text-3xl font-semibold">Listing Evaluation V2</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Define the property once, then evaluate every room and feature independently.
          </p>
        </header>

        {spaces.length === 0 ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">1. Build the property</h2>
            <p className="mt-1 text-sm text-slate-600">
              Realty Edge Pro data can prefill these values later. The agent can always correct them before the report is created.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {baseSections.map((section) => (
                <label key={section.category} className="rounded-xl border p-4">
                  <span className="text-sm font-medium">{section.label}</span>
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2"
                    min={0}
                    max={20}
                    type="number"
                    value={counts[section.category] ?? 0}
                    onChange={(event) =>
                      setCounts((current) => ({
                        ...current,
                        [section.category]: numberValue(event.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <button
              className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
              onClick={generateSpaces}
            >
              Create property sections
            </button>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <aside className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Property sections</h2>
                  <p className="text-xs text-slate-500">{spaces.length} spaces</p>
                </div>
                <button className="text-xs font-semibold text-amber-700" onClick={() => setSpaces([])}>
                  Edit counts
                </button>
              </div>

              <div className="space-y-5">
                {grouped.map((group) =>
                  group.spaces.length ? (
                    <section key={group.category}>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</h3>
                        <button
                          className="text-xs font-semibold text-amber-700"
                          onClick={() => setSpaces((current) => addPropertySpace(current, group.category))}
                        >
                          + Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {group.spaces.map((space) => (
                          <button
                            key={space.id}
                            className={`w-full rounded-xl border px-3 py-3 text-left ${
                              activeSpaceId === space.id ? "border-amber-400 bg-amber-50" : "bg-white"
                            }`}
                            onClick={() => setActiveSpaceId(space.id)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">{displaySpaceName(space)}</span>
                              <span className="text-xs text-slate-500">
                                {space.status === "not_evaluated" ? "Not evaluated" : "Add photos"}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null,
                )}
              </div>
            </aside>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              {activeSpace ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">2. Evaluate this space</p>
                  <h2 className="mt-2 text-2xl font-semibold">{displaySpaceName(activeSpace)}</h2>

                  <label className="mt-5 block max-w-lg">
                    <span className="text-sm font-medium">Optional custom name</span>
                    <input
                      className="mt-2 w-full rounded-xl border px-4 py-3"
                      placeholder={activeSpace.defaultLabel}
                      value={activeSpace.customLabel ?? ""}
                      onChange={(event) => renameSpace(activeSpace.id, event.target.value)}
                    />
                  </label>

                  <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center">
                    <h3 className="font-semibold">Add photos for {displaySpaceName(activeSpace)}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Photos uploaded here belong only to this space and will be sent to its specialist analysis agent.
                    </p>
                    <button className="mt-5 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950">
                      + Add photos
                    </button>
                    <div className="mt-4">
                      <button className="text-sm font-medium text-slate-500 underline" onClick={() => markNoPhotos(activeSpace.id)}>
                        No photos available / do not evaluate
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs uppercase text-slate-500">Current score</p>
                      <p className="mt-2 text-2xl font-semibold">Not analyzed</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs uppercase text-slate-500">Potential score</p>
                      <p className="mt-2 text-2xl font-semibold">Not analyzed</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs uppercase text-slate-500">Confidence</p>
                      <p className="mt-2 text-2xl font-semibold">Pending</p>
                    </div>
                  </div>
                </>
              ) : (
                <p>Select a property space.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
