"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  addPropertySpace,
  buildPropertySpaces,
} from "@/lib/listing-evaluation-v2/property-template";
import {
  calculatePropertyScores,
  calculateSpaceCurrentScore,
  calculateSpacePotentialScore,
} from "@/lib/listing-evaluation-v2/scoring";
import { buildRecommendationsFromAgentCandidates } from "@/lib/listing-evaluation-v2/recommendation-impact";
import {
  displaySpaceName,
  type EvaluationPhoto,
  type ImprovementRecommendation,
  type ListingEvaluationV2,
  type PropertySpace,
  type SpaceAnalysis,
  type SpaceCategory,
} from "@/lib/listing-evaluation-v2/types";
import type { SpaceAgentOutput } from "@/lib/listing-evaluation-v2/agent-contracts";

const baseSections: Array<{ category: SpaceCategory; label: string }> = [
  { category: "bedroom", label: "Bedrooms" },
  { category: "bathroom", label: "Bathrooms" },
  { category: "kitchen", label: "Kitchens" },
  { category: "living", label: "Living Areas" },
  { category: "dining", label: "Dining Areas" },
  { category: "office", label: "Offices" },
  { category: "laundry", label: "Laundry" },
  { category: "entry", label: "Entry / Foyer" },
  { category: "garage", label: "Garages" },
  { category: "basement", label: "Basements" },
  { category: "exterior", label: "Exterior" },
  { category: "landscaping", label: "Landscaping" },
  { category: "pool", label: "Pools" },
  { category: "spa", label: "Spas" },
  { category: "deck_patio", label: "Decks / Patios" },
  { category: "guest_house", label: "Guest Houses" },
  { category: "adu", label: "ADU / In-Law Suites" },
  { category: "specialty", label: "Other Spaces" },
];

const priorityOrder: ImprovementRecommendation["priority"][] = [
  "do_first",
  "next_if_possible",
  "optional_polish",
];

const priorityLabel: Record<ImprovementRecommendation["priority"], string> = {
  do_first: "Do First",
  next_if_possible: "Next If Possible",
  optional_polish: "Optional Polish",
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(20, Math.floor(parsed)))
    : 0;
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function coverageForPhotoCount(count: number): SpaceAnalysis["coverage"] {
  if (count >= 4) return "excellent";
  if (count >= 2) return "good";
  if (count === 1) return "limited";
  return "none";
}

export default function ListingEvaluationV2Client() {
  const [property, setProperty] = useState({
    address: "",
    cityStateZip: "",
    homeownerName: "",
    beds: 3,
    baths: 2,
    sqft: 0,
    yearBuilt: 0,
    propertyType: "Single Family",
  });
  const [counts, setCounts] = useState<Record<string, number>>({
    bedroom: 3,
    bathroom: 2,
    kitchen: 1,
    living: 1,
    dining: 1,
    exterior: 2,
    landscaping: 1,
  });
  const [spaces, setSpaces] = useState<PropertySpace[]>([]);
  const [photos, setPhotos] = useState<EvaluationPhoto[]>([]);
  const [analyses, setAnalyses] = useState<SpaceAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<
    ImprovementRecommendation[]
  >([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string>();
  const [analyzingSpaceId, setAnalyzingSpaceId] = useState<string>();
  const [analysisError, setAnalysisError] = useState("");

  const dynamicAnalyses = useMemo(
    () =>
      analyses.map((analysis) => ({
        ...analysis,
        potentialScore: calculateSpacePotentialScore(
          analysis.currentScore,
          recommendations.filter(
            (recommendation) => recommendation.spaceId === analysis.spaceId,
          ),
        ),
      })),
    [analyses, recommendations],
  );

  const evaluation = useMemo<ListingEvaluationV2>(
    () => ({
      id: "listing-evaluation-v2-preview",
      property: {
        address: property.address,
        cityStateZip: property.cityStateZip,
        homeownerName: property.homeownerName,
        beds: property.beds || undefined,
        baths: property.baths || undefined,
        sqft: property.sqft || undefined,
        yearBuilt: property.yearBuilt || undefined,
        propertyType: property.propertyType,
        source: "manual",
        agentEditable: true,
      },
      spaces,
      photos,
      analyses: dynamicAnalyses,
      recommendations,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [property, spaces, photos, dynamicAnalyses, recommendations],
  );

  const propertyScores = useMemo(
    () => calculatePropertyScores(evaluation),
    [evaluation],
  );

  const grouped = useMemo(
    () =>
      baseSections.map((section) => ({
        ...section,
        spaces: spaces.filter((space) => space.category === section.category),
      })),
    [spaces],
  );

  const activeSpace = spaces.find((space) => space.id === activeSpaceId);
  const activePhotos = photos.filter(
    (photo) => photo.spaceId === activeSpaceId,
  );
  const activeAnalysis = dynamicAnalyses.find(
    (analysis) => analysis.spaceId === activeSpaceId,
  );
  const activeRecommendations = recommendations.filter(
    (recommendation) => recommendation.spaceId === activeSpaceId,
  );

  const prioritizedRecommendations = useMemo(
    () =>
      priorityOrder.flatMap((priority) =>
        recommendations
          .filter(
            (recommendation) =>
              recommendation.priority === priority && recommendation.selected,
          )
          .sort((a, b) => b.scoreImpact - a.scoreImpact),
      ),
    [recommendations],
  );

  function generateSpaces() {
    const generated = buildPropertySpaces(counts);
    setSpaces(generated);
    setPhotos([]);
    setAnalyses([]);
    setRecommendations([]);
    setActiveSpaceId(generated[0]?.id);
  }

  function renameSpace(id: string, customLabel: string) {
    setSpaces((current) =>
      current.map((space) =>
        space.id === id ? { ...space, customLabel } : space,
      ),
    );
  }

  function markNoPhotos(id: string) {
    setSpaces((current) =>
      current.map((space) =>
        space.id === id
          ? {
              ...space,
              status: "not_evaluated",
              noPhotosReason: "No photos available",
            }
          : space,
      ),
    );
    setAnalyses((current) => current.filter((analysis) => analysis.spaceId !== id));
    setRecommendations((current) =>
      current.filter((recommendation) => recommendation.spaceId !== id),
    );
  }

  async function addPhotos(
    event: ChangeEvent<HTMLInputElement>,
    space: PropertySpace,
  ) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const newPhotos = await Promise.all(
      files.map(async (file, index): Promise<EvaluationPhoto> => ({
        id: `${space.id}:photo:${Date.now()}:${index}`,
        spaceId: space.id,
        name: file.name,
        dataUrl: await readFile(file),
        createdAt: new Date().toISOString(),
      })),
    );

    setPhotos((current) => [...current, ...newPhotos]);
    setSpaces((current) =>
      current.map((item) =>
        item.id === space.id
          ? {
              ...item,
              status: "in_progress",
              noPhotosReason: undefined,
              photoIds: [...item.photoIds, ...newPhotos.map((photo) => photo.id)],
            }
          : item,
      ),
    );
    setAnalysisError("");
    event.target.value = "";
  }

  async function analyzeSpace(space: PropertySpace) {
    const spacePhotos = photos.filter(
      (photo) => photo.spaceId === space.id && photo.dataUrl,
    );
    if (!spacePhotos.length) {
      setAnalysisError("Add at least one photo before analysis.");
      return;
    }

    setAnalyzingSpaceId(space.id);
    setAnalysisError("");

    try {
      const response = await fetch("/api/listing-evaluation-v2/analyze-space", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId: evaluation.id,
          spaceId: space.id,
          category: space.category,
          displayName: displaySpaceName(space),
          propertyContext: {
            propertyType: property.propertyType,
            yearBuilt: property.yearBuilt || undefined,
          },
          photos: spacePhotos.map((photo) => ({
            id: photo.id,
            dataUrl: photo.dataUrl,
          })),
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        analysis?: SpaceAgentOutput;
      };

      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error || "Space analysis failed.");
      }

      const generatedRecommendations = buildRecommendationsFromAgentCandidates({
        spaceId: space.id,
        candidates: payload.analysis.recommendationCandidates,
      });
      const currentScore = calculateSpaceCurrentScore({
        conditionScore: payload.analysis.componentScores.condition,
        presentationScore: payload.analysis.componentScores.presentation,
        photoReadinessScore:
          payload.analysis.componentScores.photoReadiness,
        marketabilityScore: payload.analysis.componentScores.marketability,
      });
      const nextAnalysis: SpaceAnalysis = {
        spaceId: space.id,
        visibleFindings: payload.analysis.findings.map((finding, index) => ({
          id: `${space.id}:finding:${index + 1}`,
          ...finding,
        })),
        conditionScore: payload.analysis.componentScores.condition,
        presentationScore: payload.analysis.componentScores.presentation,
        photoReadinessScore:
          payload.analysis.componentScores.photoReadiness,
        marketabilityScore: payload.analysis.componentScores.marketability,
        currentScore,
        potentialScore: calculateSpacePotentialScore(
          currentScore,
          generatedRecommendations,
        ),
        confidence: payload.analysis.confidence,
        coverage: coverageForPhotoCount(spacePhotos.length),
        analyzedAt: new Date().toISOString(),
      };

      setAnalyses((current) => [
        ...current.filter((analysis) => analysis.spaceId !== space.id),
        nextAnalysis,
      ]);
      setRecommendations((current) => [
        ...current.filter(
          (recommendation) => recommendation.spaceId !== space.id,
        ),
        ...generatedRecommendations,
      ]);
      setSpaces((current) =>
        current.map((item) =>
          item.id === space.id ? { ...item, status: "complete" } : item,
        ),
      );
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Space analysis failed.",
      );
    } finally {
      setAnalyzingSpaceId(undefined);
    }
  }

  function toggleRecommendation(id: string) {
    setRecommendations((current) =>
      current.map((recommendation) =>
        recommendation.id === id
          ? { ...recommendation, selected: !recommendation.selected }
          : recommendation,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
            Realty Edge Pro
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Listing Evaluation V2</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Room-by-room photo analysis, deterministic scoring and prioritized
            seller preparation.
          </p>
        </header>

        {spaces.length === 0 ? (
          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">1. Property information</h2>
              <p className="mt-1 text-sm text-slate-600">
                Realty Edge Pro can prefill this later. Every field remains editable before the seller report is generated.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <input className="rounded-xl border px-4 py-3" placeholder="Property address" value={property.address} onChange={(event) => setProperty((current) => ({ ...current, address: event.target.value }))} />
                <input className="rounded-xl border px-4 py-3" placeholder="City, State ZIP" value={property.cityStateZip} onChange={(event) => setProperty((current) => ({ ...current, cityStateZip: event.target.value }))} />
                <input className="rounded-xl border px-4 py-3" placeholder="Homeowner name" value={property.homeownerName} onChange={(event) => setProperty((current) => ({ ...current, homeownerName: event.target.value }))} />
                <input className="rounded-xl border px-4 py-3" placeholder="Property type" value={property.propertyType} onChange={(event) => setProperty((current) => ({ ...current, propertyType: event.target.value }))} />
                <input className="rounded-xl border px-4 py-3" type="number" placeholder="Beds" value={property.beds || ""} onChange={(event) => {
                  const beds = numberValue(event.target.value);
                  setProperty((current) => ({ ...current, beds }));
                  setCounts((current) => ({ ...current, bedroom: beds }));
                }} />
                <input className="rounded-xl border px-4 py-3" type="number" step="0.5" placeholder="Baths" value={property.baths || ""} onChange={(event) => setProperty((current) => ({ ...current, baths: Number(event.target.value) || 0 }))} />
                <input className="rounded-xl border px-4 py-3" type="number" placeholder="Square feet" value={property.sqft || ""} onChange={(event) => setProperty((current) => ({ ...current, sqft: Number(event.target.value) || 0 }))} />
                <input className="rounded-xl border px-4 py-3" type="number" placeholder="Year built" value={property.yearBuilt || ""} onChange={(event) => setProperty((current) => ({ ...current, yearBuilt: Number(event.target.value) || 0 }))} />
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">2. Build the property</h2>
              <p className="mt-1 text-sm text-slate-600">
                Add as many instances as the property actually has. Names can be changed later.
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
              <button className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white" onClick={generateSpaces}>
                Create property sections
              </button>
            </section>
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">Overall current</p>
                <p className="mt-2 text-3xl font-semibold">{propertyScores.currentScore ?? "—"}</p>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">Overall potential</p>
                <p className="mt-2 text-3xl font-semibold">{propertyScores.potentialScore ?? "—"}</p>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">Confidence</p>
                <p className="mt-2 text-3xl font-semibold capitalize">{propertyScores.confidence}</p>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">Areas complete</p>
                <p className="mt-2 text-3xl font-semibold">
                  {spaces.filter((space) => space.status === "complete").length}/{spaces.filter((space) => space.status !== "not_evaluated").length}
                </p>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
              <aside className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">Property sections</h2>
                    <p className="text-xs text-slate-500">{spaces.length} spaces</p>
                  </div>
                  <button className="text-xs font-semibold text-amber-700" onClick={() => setSpaces([])}>
                    Edit setup
                  </button>
                </div>

                <div className="space-y-5">
                  {grouped.map((group) =>
                    group.spaces.length ? (
                      <section key={group.category}>
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</h3>
                          <button className="text-xs font-semibold text-amber-700" onClick={() => setSpaces((current) => addPropertySpace(current, group.category))}>
                            + Add
                          </button>
                        </div>
                        <div className="space-y-2">
                          {group.spaces.map((space) => {
                            const score = dynamicAnalyses.find((analysis) => analysis.spaceId === space.id);
                            return (
                              <button key={space.id} className={`w-full rounded-xl border px-3 py-3 text-left ${activeSpaceId === space.id ? "border-amber-400 bg-amber-50" : "bg-white"}`} onClick={() => setActiveSpaceId(space.id)}>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium">{displaySpaceName(space)}</span>
                                  <span className="text-xs font-semibold text-slate-500">
                                    {space.status === "not_evaluated" ? "N/E" : score ? score.currentScore : space.photoIds.length ? "Ready" : "Photos"}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ) : null,
                  )}
                </div>
              </aside>

              <section className="rounded-2xl border bg-white p-6 shadow-sm">
                {activeSpace ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evaluate this space</p>
                    <h2 className="mt-2 text-2xl font-semibold">{displaySpaceName(activeSpace)}</h2>

                    <label className="mt-5 block max-w-lg">
                      <span className="text-sm font-medium">Optional custom name</span>
                      <input className="mt-2 w-full rounded-xl border px-4 py-3" placeholder={activeSpace.defaultLabel} value={activeSpace.customLabel ?? ""} onChange={(event) => renameSpace(activeSpace.id, event.target.value)} />
                    </label>

                    <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 p-6">
                      <div className="text-center">
                        <h3 className="font-semibold">Photos for {displaySpaceName(activeSpace)}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          These photos are isolated to this space and routed to the correct specialist AI.
                        </p>
                        <label className="mt-5 inline-block cursor-pointer rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950">
                          + Add photos
                          <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => addPhotos(event, activeSpace)} />
                        </label>
                      </div>

                      {activePhotos.length > 0 ? (
                        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                          {activePhotos.map((photo) => (
                            <div key={photo.id} className="overflow-hidden rounded-xl border bg-white">
                              {photo.dataUrl ? <img alt={photo.name} className="h-28 w-full object-cover" src={photo.dataUrl} /> : null}
                              <p className="truncate px-3 py-2 text-xs">{photo.name}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap justify-center gap-3">
                        <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-40" disabled={!activePhotos.length || analyzingSpaceId === activeSpace.id} onClick={() => analyzeSpace(activeSpace)}>
                          {analyzingSpaceId === activeSpace.id ? "Analyzing..." : activeAnalysis ? "Re-analyze space" : "Analyze space"}
                        </button>
                        <button className="px-4 py-3 text-sm font-medium text-slate-500 underline" onClick={() => markNoPhotos(activeSpace.id)}>
                          No photos available / do not evaluate
                        </button>
                      </div>
                      {analysisError ? <p className="mt-4 text-center text-sm font-medium text-red-700">{analysisError}</p> : null}
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs uppercase text-slate-500">Current score</p>
                        <p className="mt-2 text-3xl font-semibold">{activeAnalysis?.currentScore ?? "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs uppercase text-slate-500">Potential score</p>
                        <p className="mt-2 text-3xl font-semibold">{activeAnalysis?.potentialScore ?? "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs uppercase text-slate-500">Confidence</p>
                        <p className="mt-2 text-3xl font-semibold capitalize">{activeAnalysis?.confidence ?? "Pending"}</p>
                      </div>
                    </div>

                    {activeAnalysis ? (
                      <div className="mt-6 space-y-6">
                        <section>
                          <h3 className="text-lg font-semibold">Visible findings</h3>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {activeAnalysis.visibleFindings.map((finding) => (
                              <div key={finding.id} className="rounded-xl border p-4">
                                <p className="text-xs font-bold uppercase text-slate-500">{finding.kind === "positive" ? "Positive" : "Opportunity"}</p>
                                <p className="mt-1 font-semibold">{finding.label}</p>
                                <p className="mt-2 text-sm text-slate-600">{finding.evidence}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold">What can raise this score</h3>
                          <div className="mt-3 space-y-3">
                            {activeRecommendations.length ? activeRecommendations.map((recommendation) => (
                              <label key={recommendation.id} className="flex cursor-pointer gap-3 rounded-xl border p-4">
                                <input type="checkbox" checked={recommendation.selected} onChange={() => toggleRecommendation(recommendation.id)} />
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">{recommendation.title}</p>
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">+{recommendation.scoreImpact} potential</span>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-600">{recommendation.reason}</p>
                                  <p className="mt-1 text-xs text-slate-500">Visible evidence: {recommendation.evidence}</p>
                                </div>
                              </label>
                            )) : <p className="text-sm text-slate-500">No supported preparation recommendations were returned for this space.</p>}
                          </div>
                        </section>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p>Select a property space.</p>
                )}
              </section>
            </div>

            {prioritizedRecommendations.length > 0 ? (
              <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Highest-impact preparation plan</h2>
                <p className="mt-1 text-sm text-slate-600">
                  This is the default seller-facing order. Room views remain available above.
                </p>
                <div className="mt-5 space-y-6">
                  {priorityOrder.map((priority) => {
                    const items = prioritizedRecommendations.filter((item) => item.priority === priority);
                    if (!items.length) return null;
                    return (
                      <div key={priority}>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{priorityLabel[priority]}</h3>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {items.map((item) => {
                            const space = spaces.find((candidate) => candidate.id === item.spaceId);
                            return (
                              <div key={item.id} className="rounded-xl border p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-semibold">{item.title}</p>
                                  <span className="text-sm font-bold text-amber-700">+{item.scoreImpact}</span>
                                </div>
                                <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{space ? displaySpaceName(space) : "Property"}</p>
                                <p className="mt-2 text-sm text-slate-600">{item.reason}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Final property review</h2>
              <p className="mt-1 text-sm text-slate-600">
                Property facts remain editable here before the seller report is generated.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <input className="rounded-xl border px-4 py-3" placeholder="Property address" value={property.address} onChange={(event) => setProperty((current) => ({ ...current, address: event.target.value }))} />
                <input className="rounded-xl border px-4 py-3" placeholder="City, State ZIP" value={property.cityStateZip} onChange={(event) => setProperty((current) => ({ ...current, cityStateZip: event.target.value }))} />
                <input className="rounded-xl border px-4 py-3" type="number" placeholder="Beds" value={property.beds || ""} onChange={(event) => setProperty((current) => ({ ...current, beds: numberValue(event.target.value) }))} />
                <input className="rounded-xl border px-4 py-3" type="number" step="0.5" placeholder="Baths" value={property.baths || ""} onChange={(event) => setProperty((current) => ({ ...current, baths: Number(event.target.value) || 0 }))} />
              </div>
              <button className="mt-6 rounded-xl bg-slate-300 px-5 py-3 font-semibold text-slate-600" disabled>
                Generate seller report (next integration step)
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
