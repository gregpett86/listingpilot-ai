import Link from "next/link";
import { RealtyEdgeShell, RealtyEdgePageHeader } from "@/components/realty-edge-shell";

const previewTools = [
  { title: "New CMA / Property", description: "Existing REP module represented for layout only.", status: "Preview", href: null },
  { title: "Listing AI", description: "Open the working standalone room-by-room photo evaluation and seller PDF.", status: "Test now", href: "/listing-ai" },
  { title: "Listing Reports", description: "Explore the standalone reports area. It does not read your live REP account.", status: "Standalone", href: "/listing-reports" },
  { title: "Leads", description: "Visual placeholder. No production leads or agent data are connected.", status: "Preview", href: null },
  { title: "Profile", description: "Visual placeholder. Your live profile remains untouched.", status: "Preview", href: null },
];

export default function DemoDashboard() {
  return (
    <RealtyEdgeShell activeLabel="Dashboard">
      <div className="h-full overflow-y-auto bg-[#F5F7FA]">
        <RealtyEdgePageHeader
          title="Dashboard Preview"
          breadcrumbCurrent="Dashboard"
          description="An isolated demonstration of where Listing AI fits within Realty Edge Pro."
        />
        <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
          <div className="rounded-2xl border border-[#E8D9B0] bg-[#FFF9EA] px-5 py-4 text-sm text-[#66501E]">
            <strong>Sandbox only.</strong> This is a dashboard layout preview within Listing AI. It is not connected to the live Realty Edge Pro dashboard, CMA API, subscriptions or lead data.
          </div>
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#AD7C0D]">Tool preview</p>
            <h2 className="mt-2 text-2xl font-bold text-[#111827]">Your real estate toolkit</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">See how the left navigation feels. Listing AI is the active working tool in this sandbox; other areas are illustrative or independent existing test pages.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {previewTools.map((tool) => (
                <article className="flex flex-col rounded-xl border border-[#E5E7EB] p-5" key={tool.title}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-[#111827]">{tool.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tool.href ? "bg-[#F7EDD1] text-[#785B12]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>{tool.status}</span>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-6 text-[#6B7280]">{tool.description}</p>
                  {tool.href ? (
                    <Link className="mt-6 inline-flex w-fit rounded-lg bg-[#1B2238] px-4 py-2 text-sm font-semibold text-white no-underline" href={tool.href}>Open {tool.title}</Link>
                  ) : (
                    <span className="mt-6 inline-flex w-fit rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#6B7280]">Preview only</span>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </RealtyEdgeShell>
  );
}