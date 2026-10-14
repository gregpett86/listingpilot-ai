import Image from "next/image";
import { ReactNode } from "react";

export default function RepToolsAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#EEE9E0]">
      <div className="h-[3px] bg-[#D4A017]" />
      <div className="grid min-h-[calc(100vh-3px)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden border-r border-[#D8D1C7] bg-[#082442] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Image src="/logo_gold.png" alt="Realty Edge Pro" width={210} height={72} className="h-auto w-[210px]" priority />
          <div className="max-w-xl pb-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4A017]">AI-POWERED LISTING INTELLIGENCE</p>
            <h2 className="mt-5 font-serif text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">
              Professional seller tools without the software clutter.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/65">
              Create professional CMAs, analyze properties room by room with Listing AI, and keep every report organized in one focused workspace.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {["CMA Builder", "Listing AI", "Saved Reports", "Agent Branding"].map((item) => (
                <div key={item} className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80">
                  <span className="mr-2 text-[#D4A017]">✦</span>{item}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/35">REALTY EDGE TOOLS</p>
        </section>

        <section className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full">
            <div className="mb-8 text-center lg:hidden">
              <Image src="/logo_gold.png" alt="Realty Edge Pro" width={190} height={64} className="mx-auto h-auto w-[190px]" priority />
            </div>
            <div className="mx-auto flex justify-center">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
