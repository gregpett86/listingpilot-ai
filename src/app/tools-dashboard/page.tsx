import Link from "next/link";
import { RepToolsShell } from "@/components/rep-tools-shell";

const tools = [
  { title: "Create CMA", description: "Generate professional comparative market analyses in minutes.", enabled: false, href: "" },
  { title: "CMA Reports", description: "View and manage your CMA reports.", enabled: false, href: "" },
  { title: "Create Listing AI", description: "Analyze a home room-by-room and build a seller-ready evaluation.", enabled: true, href: "/tools/listing-ai" },
  { title: "Listing AI Reports", description: "Access and manage your saved Listing AI reports.", enabled: true, href: "/tools/listing-ai-reports" },
];

export default function ToolsDashboardPage() {
  return (
    <RepToolsShell>
      <div className="min-h-full bg-[#EEE9E0]">
        <header className="border-b border-[#DED8CF] bg-[#F8F5EF] px-6 py-5 sm:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
            <div className="hidden w-full max-w-md rounded-xl border border-[#D8D2C9] bg-white px-4 py-3 text-sm text-[#96928A] md:block">Search properties, reports, clients...</div>
            <div className="ml-auto text-right">
              <p className="text-sm font-bold text-[#082442]">Realty Edge Tools</p>
              <p className="text-xs text-[#85817A]">Listing intelligence workspace</p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
          <section className="grid gap-6 border-b border-[#D8D2C9] pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9A7100]">REALTY EDGE TOOLS</p>
              <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] text-[#101722] sm:text-5xl">Welcome to Realty Edge Tools</h1>
              <p className="mt-3 text-lg text-[#686B72]">Powerful tools. Sharper insights. A faster path to your next listing.</p>
            </div>
            <p className="max-w-[260px] border-l border-[#CFC8BE] pl-6 font-serif text-lg italic leading-7 text-[#6F6A63]">“Better data.<br/>Brighter opportunities.”</p>
          </section>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tools.map((tool, index) => (
              <article key={tool.title} className="flex min-h-[250px] flex-col rounded-2xl border border-[#DDD7CE] bg-[#F9F7F2] p-6 shadow-[0_10px_30px_rgba(46,42,35,0.05)]">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#E7EBF0] text-[#082442]">
                  <span className="font-serif text-xl font-bold">{index + 1}</span>
                </div>
                <h2 className="mt-5 font-serif text-2xl font-semibold text-[#111722]">{tool.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#696D74]">{tool.description}</p>
                {tool.enabled ? (
                  <Link href={tool.href} className="mt-5 inline-flex items-center justify-between rounded-xl bg-[#082442] px-5 py-3 text-sm font-bold text-[#D4A017] no-underline shadow-sm transition hover:bg-[#04182D]">
                    {tool.title.startsWith("Create") ? "Open Tool" : "View Reports"} <span>→</span>
                  </Link>
                ) : (
                  <div className="mt-5 inline-flex items-center justify-between rounded-xl border border-[#D7D0C6] bg-[#F2EEE7] px-5 py-3 text-sm font-semibold text-[#8C8881]">
                    Coming next <span>—</span>
                  </div>
                )}
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-2xl border border-[#DDD7CE] bg-[#F9F7F2] p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A7100]">REPORT LIBRARY</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-[#082442]">Your reports stay organized here.</h2>
                <p className="mt-2 text-sm text-[#6D7077]">Listing AI reports created from this dashboard are saved in the browser and available from Listing AI Reports.</p>
              </div>
              <Link href="/tools/listing-ai-reports" className="inline-flex rounded-xl border border-[#082442] px-5 py-3 text-sm font-bold text-[#082442] no-underline">View Listing AI Reports →</Link>
            </div>
          </section>
        </div>
      </div>
    </RepToolsShell>
  );
}
