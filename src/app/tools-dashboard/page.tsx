import Link from "next/link";
import { RepToolsShell, ToolsPageHeader } from "@/components/rep-tools-shell";

const tools = [
  { eyebrow: "CMA", title: "Create CMA", description: "Build a polished, agent-branded comparative market analysis for a homeowner.", href: "/tools/cma", button: "Create New CMA" },
  { eyebrow: "CMA", title: "CMA Reports", description: "Open the workspace for saved and completed CMA reports.", href: "/tools/cma-reports", button: "View CMA Reports" },
  { eyebrow: "LISTING AI", title: "Create Listing AI", description: "Evaluate a property room by room and create a seller-facing listing-readiness report.", href: "/tools/listing-ai", button: "Start Listing AI" },
  { eyebrow: "LISTING AI", title: "Listing AI Reports", description: "View the Listing AI reports area and continue working with prior evaluations.", href: "/tools/listing-ai-reports", button: "View Listing AI Reports" },
];

export default function ToolsDashboardPage() {
  return (
    <RepToolsShell activeLabel="Dashboard">
      <ToolsPageHeader eyebrow="REALTY EDGE PRO TOOLS" title="Agent Tools Dashboard" description="One simple workspace for CMA reports and Listing AI." />
      <div className="mx-auto max-w-6xl p-6 sm:p-9">
        <section className="overflow-hidden rounded-2xl bg-[#082442] px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#D4A017]">Your listing toolkit</p>
          <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">Create better seller presentations from one place.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Build a CMA, evaluate listing readiness, and keep your reports organized without the rest of the full Realty Edge Pro platform.</p>
            </div>
            <div className="rounded-xl border border-[#D4A017]/40 bg-white/5 px-4 py-3 text-sm text-white/80">CMA Builder <span className="mx-2 text-[#D4A017]">+</span> Listing AI</div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {tools.map((tool) => (
            <article key={tool.title} className="flex min-h-[225px] flex-col rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_14px_34px_rgba(8,36,66,0.07)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9A7100]">{tool.eyebrow}</p>
              <h3 className="mt-2 text-xl font-black text-[#082442]">{tool.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#6B7280]">{tool.description}</p>
              <Link href={tool.href} className="mt-6 inline-flex w-fit items-center rounded-xl bg-[#082442] px-5 py-3 text-sm font-extrabold text-white no-underline transition hover:bg-[#04182D]">{tool.button} <span className="ml-2 text-[#D4A017]">→</span></Link>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[#E8D9B0] bg-[#FFF9EA] px-5 py-4 text-sm leading-6 text-[#66501E]">
          <strong>Isolated build:</strong> this dashboard lives only in the Listing AI project. It is not connected to or modifying the live Realty Edge Pro dashboard or the CMA repository.
        </div>
      </div>
    </RepToolsShell>
  );
}
