import { RepToolsShell, ToolsPageHeader } from "@/components/rep-tools-shell";

export default function ToolsCmaReportsPage() {
  return (
    <RepToolsShell activeLabel="CMA Reports">
      <ToolsPageHeader eyebrow="CMA BUILDER" title="CMA Reports" description="A dedicated home for CMA reports created from this tools membership." />
      <div className="mx-auto max-w-6xl p-6 sm:p-9">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-[0_14px_34px_rgba(8,36,66,0.07)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9A7100]">REPORT LIBRARY</p>
          <h2 className="mt-2 text-xl font-black text-[#082442]">No CMA reports connected yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">Once the shared CMA service is connected, completed reports can appear here under the correct member account without touching the current Realty Edge Pro dashboard.</p>
        </section>
      </div>
    </RepToolsShell>
  );
}
