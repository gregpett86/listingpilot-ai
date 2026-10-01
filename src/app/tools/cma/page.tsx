import { RepToolsShell, ToolsPageHeader } from "@/components/rep-tools-shell";

export default function ToolsCmaPage() {
  return (
    <RepToolsShell activeLabel="Create CMA">
      <ToolsPageHeader eyebrow="CMA BUILDER" title="Create CMA" description="This isolated dashboard is ready for the existing CMA engine to be connected without changing the CMA repository today." />
      <div className="mx-auto max-w-6xl p-6 sm:p-9">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-[0_14px_34px_rgba(8,36,66,0.07)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9A7100]">Connection point prepared</p>
          <h2 className="mt-2 text-2xl font-black text-[#082442]">CMA Builder</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">The dashboard shell is in place. The next step is connecting this page to the existing CMA service through a protected API or shared service boundary. No CMA code has been copied or changed.</p>
          <div className="mt-6 rounded-xl border border-[#E8D9B0] bg-[#FFF9EA] px-5 py-4 text-sm text-[#66501E]">Current status: UI ready • CMA engine intentionally untouched</div>
        </section>
      </div>
    </RepToolsShell>
  );
}
