"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createListingEvaluationV2Pdf } from "@/app/listing-evaluation-v2/report-v2";
import {
  deleteListingAiReport,
  listListingAiReports,
  type SavedListingAiReport,
} from "@/lib/listing-evaluation-v2/report-storage";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function ListingAiReportsClient() {
  const [reports, setReports] = useState<SavedListingAiReport[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    setReports(await listListingAiReports());
    setLoaded(true);
  }

  useEffect(() => { void refresh(); }, []);

  function download(report: SavedListingAiReport) {
    const doc = createListingEvaluationV2Pdf({ evaluation: report.evaluation, agent: report.agent });
    const address = report.evaluation.property.address || "listing-evaluation";
    const safe = address.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    doc.save(`${safe}-listing-ai-dashboard-report.pdf`);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this saved Listing AI report?")) return;
    await deleteListingAiReport(id);
    await refresh();
  }

  if (!loaded) return <div className="rounded-2xl border border-[#DDD7CE] bg-[#F9F7F2] p-6 text-sm text-[#6D7077]">Loading reports...</div>;

  if (!reports.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#CFC8BE] bg-[#F9F7F2] p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#E7EBF0] text-[#082442]">✦</div>
        <h2 className="mt-5 font-serif text-2xl font-semibold text-[#082442]">No Listing AI reports yet</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#6D7077]">Generate a Listing AI report and it will be saved here automatically.</p>
        <Link href="/tools/listing-ai" className="mt-6 inline-flex rounded-xl bg-[#082442] px-5 py-3 text-sm font-bold text-[#D4A017] no-underline">Create Listing AI</Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DDD7CE] bg-[#F9F7F2] shadow-[0_10px_30px_rgba(46,42,35,0.05)]">
      <div className="hidden grid-cols-[2fr_.7fr_.7fr_.8fr_1.1fr] gap-4 border-b border-[#DED8CF] bg-[#082442] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#D4A017] md:grid">
        <span>Property</span><span>Current</span><span>Potential</span><span>Updated</span><span>Actions</span>
      </div>
      {reports.map((report) => (
        <article key={report.id} className="grid gap-4 border-b border-[#E3DDD4] px-5 py-5 last:border-0 md:grid-cols-[2fr_.7fr_.7fr_.8fr_1.1fr] md:items-center">
          <div>
            <p className="font-serif text-lg font-semibold text-[#082442]">{report.evaluation.property.address || "Untitled Property"}</p>
            <p className="mt-1 text-sm text-[#777A80]">{report.evaluation.property.cityStateZip || "Location not entered"}</p>
          </div>
          <div><span className="md:hidden text-xs text-[#8B8172]">Current: </span><strong className="text-[#082442]">{report.evaluation.currentScore ?? "—"}</strong></div>
          <div><span className="md:hidden text-xs text-[#8B8172]">Potential: </span><strong className="text-[#082442]">{report.evaluation.potentialScore ?? "—"}</strong></div>
          <div className="text-sm text-[#666A71]">{formatDate(report.updatedAt)}</div>
          <div className="flex gap-2">
            <button onClick={() => download(report)} className="rounded-lg bg-[#082442] px-4 py-2 text-xs font-bold text-[#D4A017]">Download</button>
            <button onClick={() => void remove(report.id)} className="rounded-lg border border-[#D7D0C7] px-4 py-2 text-xs font-bold text-[#6E7076]">Delete</button>
          </div>
        </article>
      ))}
    </div>
  );
}
