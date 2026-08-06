"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RealtyEdgePageHeader,
  RealtyEdgeShell,
} from "@/components/realty-edge-shell";
import { ReportBadge } from "@/components/realty-edge-design-system";
import { downloadListingReadinessPdf } from "../listing-readiness/report-pdf";
import {
  deleteListingEvaluationReport,
  duplicateListingEvaluationReport,
  listListingEvaluationReports,
  type ListingEvaluationReportRecord,
} from "../listing-evaluation/listing-evaluation-repository";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function scoreTone(score: number) {
  return score >= 80 ? "positive" : score >= 70 ? "gold" : "muted";
}

function statusTone(status: ListingEvaluationReportRecord["status"]) {
  return status === "Ready"
    ? "positive"
    : status === "Needs Review"
      ? "gold"
      : "muted";
}

function EmptyReportsState() {
  return (
    <div className="rounded-xl border border-dashed border-[#D4A017]/50 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFFAF0] text-[#9A7100]">
        <svg aria-hidden="true" height="28" viewBox="0 0 24 24" width="28">
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M14 2v6h6M8 13h8M8 17h5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </div>
      <h2 className="mt-5 text-2xl font-black text-[#082442]">No Listing Reports Yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-[#6B7280]">
        Create your first Listing Evaluation to analyze a property and generate a homeowner-ready report.
      </p>
      <Link
        className="mt-6 inline-flex rounded-lg bg-[#D4A017] px-5 py-3 text-sm font-black text-[#111827] no-underline shadow-sm"
        href="/listing-evaluation/new"
      >
        Create Listing Evaluation
      </Link>
    </div>
  );
}

function ReportThumbnail({ report }: { report: ListingEvaluationReportRecord }) {
  if (!report.heroImageThumbnail) {
    return (
      <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-[#EEF3F8] text-[10px] font-black uppercase text-[#6B7280]">
        No Photo
      </div>
    );
  }

  return (
    <div
      aria-label={report.propertyAddress}
      className="h-16 w-24 shrink-0 rounded-lg bg-cover bg-center"
      role="img"
      style={{ backgroundImage: `url(${report.heroImageThumbnail})` }}
    />
  );
}

export function ListingReportsPage() {
  const [reports, setReports] = useState<ListingEvaluationReportRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [message, setMessage] = useState("");

  function refreshReports() {
    setReports(listListingEvaluationReports());
    setIsLoaded(true);
  }

  useEffect(() => {
    const timer = window.setTimeout(refreshReports, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const sortedReports = useMemo(
    () =>
      [...reports].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ),
    [reports],
  );

  function downloadReport(report: ListingEvaluationReportRecord) {
    downloadListingReadinessPdf(report.reportData.property, report.reportData.summary);
  }

  function duplicateReport(report: ListingEvaluationReportRecord) {
    const duplicated = duplicateListingEvaluationReport(report.id);
    if (duplicated?.storageWarning) {
      setMessage(duplicated.storageWarning);
    } else {
      setMessage(
        duplicated
          ? "Listing Evaluation duplicated as a Draft report."
          : "This Listing Evaluation could not be duplicated.",
      );
    }
    refreshReports();
  }

  function deleteReport(report: ListingEvaluationReportRecord) {
    const confirmed = window.confirm(
      "Delete this Listing Report?\n\nThis will permanently remove the saved evaluation from this browser.",
    );
    if (!confirmed) return;
    deleteListingEvaluationReport(report.id);
    setMessage("Listing Report deleted.");
    refreshReports();
  }

  return (
    <RealtyEdgeShell activeLabel="Listing Reports">
      <div className="flex h-full flex-col overflow-hidden">
        <RealtyEdgePageHeader
          breadcrumbCurrent="Listing Reports"
          description="View, download, edit, and manage your property evaluations."
          title="Listing Reports"
        />
        <main className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-8">
          <div className="mx-auto max-w-7xl space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9A7100]">
                  Report Library
                </p>
                <h1 className="mt-1 text-2xl font-black text-[#082442]">
                  Saved Listing Evaluation Reports
                </h1>
              </div>
              <Link
                className="inline-flex justify-center rounded-lg bg-[#D4A017] px-5 py-3 text-sm font-black text-[#111827] no-underline shadow-sm"
                href="/listing-evaluation/new"
              >
                New Listing Evaluation
              </Link>
            </div>

            {message && (
              <p className="rounded-lg border border-[#D4A017]/30 bg-[#FFFAF0] px-4 py-3 text-sm font-bold text-[#7A5800]">
                {message}
              </p>
            )}

            {!isLoaded && (
              <div className="rounded-xl border bg-white p-6 text-sm font-bold text-[#6B7280]">
                Loading Listing Reports...
              </div>
            )}

            {isLoaded && sortedReports.length === 0 && <EmptyReportsState />}

            {sortedReports.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                <div className="grid min-w-[1080px] grid-cols-[2fr_1fr_0.7fr_0.7fr_0.8fr_0.9fr_0.9fr_2.2fr] gap-4 bg-[#082442] px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white">
                  <span>Property</span>
                  <span>Homeowner</span>
                  <span>Current</span>
                  <span>Potential</span>
                  <span>Status</span>
                  <span>Created</span>
                  <span>Updated</span>
                  <span>Actions</span>
                </div>
                <div className="overflow-x-auto">
                  {sortedReports.map((report) => (
                    <article
                      className="grid min-w-[1080px] grid-cols-[2fr_1fr_0.7fr_0.7fr_0.8fr_0.9fr_0.9fr_2.2fr] items-center gap-4 border-t border-[#E5E7EB] px-4 py-4"
                      key={report.id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ReportThumbnail report={report} />
                        <div className="min-w-0">
                          <p className="truncate font-black text-[#082442]">
                            {report.propertyAddress}
                          </p>
                          <p className="truncate text-sm font-medium text-[#6B7280]">
                            {report.cityStateZip} | {report.beds} beds | {report.baths} baths | {report.sqft} sq ft
                          </p>
                          {report.storageWarning && (
                            <p className="mt-1 text-xs font-bold text-[#9A7100]">
                              {report.storageWarning}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="truncate text-sm font-bold text-[#374151]">
                        {report.homeownerName.trim() || "Homeowner"}
                      </span>
                      <ReportBadge tone={scoreTone(report.currentScore)}>
                        {report.currentScore}
                      </ReportBadge>
                      <ReportBadge tone={scoreTone(report.potentialScore)}>
                        {report.potentialScore}
                      </ReportBadge>
                      <ReportBadge tone={statusTone(report.status)}>
                        {report.status}
                      </ReportBadge>
                      <span className="text-sm font-semibold text-[#374151]">
                        {formatDate(report.createdAt)}
                      </span>
                      <span className="text-sm font-semibold text-[#374151]">
                        {formatDate(report.updatedAt)}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="rounded-md border border-[#D1D5DB] px-3 py-2 text-xs font-black text-[#082442] no-underline"
                          href={`/listing-evaluation/${report.id}`}
                        >
                          Open Report
                        </Link>
                        <button
                          className="rounded-md border border-[#D1D5DB] px-3 py-2 text-xs font-black text-[#082442]"
                          onClick={() => downloadReport(report)}
                          type="button"
                        >
                          Download PDF
                        </button>
                        <Link
                          className="rounded-md border border-[#D1D5DB] px-3 py-2 text-xs font-black text-[#082442] no-underline"
                          href="/listing-evaluation/new"
                        >
                          Edit Property
                        </Link>
                        <Link
                          className="rounded-md border border-[#D1D5DB] px-3 py-2 text-xs font-black text-[#082442] no-underline"
                          href={`/listing-evaluation/${report.id}`}
                        >
                          Reanalyze Photos
                        </Link>
                        <button
                          className="rounded-md border border-[#D1D5DB] px-3 py-2 text-xs font-black text-[#082442]"
                          onClick={() => duplicateReport(report)}
                          type="button"
                        >
                          Duplicate
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-3 py-2 text-xs font-black text-red-700"
                          onClick={() => deleteReport(report)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </RealtyEdgeShell>
  );
}
