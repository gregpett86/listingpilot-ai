"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

type Props = { activeLabel?: string; children: ReactNode };

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 2,
};

function DashboardIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" {...iconProps}/><rect x="14" y="3" width="7" height="7" rx="1" {...iconProps}/><rect x="3" y="14" width="7" height="7" rx="1" {...iconProps}/><rect x="14" y="14" width="7" height="7" rx="1" {...iconProps}/></svg>;
}
function DocIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...iconProps}/><path d="M14 2v6h6" {...iconProps}/><path d="M8 13h8M8 17h8" {...iconProps}/></svg>;
}
function SparkIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" {...iconProps}/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" {...iconProps}/></svg>;
}
function ReportsIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" {...iconProps}/><path d="M6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5v-16A2.5 2.5 0 0 1 6.5 2z" {...iconProps}/><path d="M9 7h7M9 11h7" {...iconProps}/></svg>;
}
function MenuIcon() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" {...iconProps}/></svg>;
}
function CloseIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" {...iconProps}/></svg>;
}

const nav = [
  { label: "Dashboard", href: "/tools-dashboard", icon: <DashboardIcon /> },
  { label: "Create CMA", href: "/tools/cma", icon: <DocIcon /> },
  { label: "CMA Reports", href: "/tools/cma-reports", icon: <ReportsIcon /> },
  { label: "Create Listing AI", href: "/tools/listing-ai", icon: <SparkIcon /> },
  { label: "Listing AI Reports", href: "/tools/listing-ai-reports", icon: <ReportsIcon /> },
];

function Sidebar({ activeLabel, close }: { activeLabel?: string; close?: () => void }) {
  return (
    <aside className="flex h-full w-[258px] min-w-[258px] flex-col bg-[#082442] text-white">
      <div className="flex min-h-[82px] items-center justify-between border-b border-white/10 bg-[#04182D] px-5">
        <Image src="/logo_gold.png" alt="Realty Edge Pro" width={185} height={62} className="h-auto w-[185px]" priority />
        {close ? <button type="button" aria-label="Close menu" onClick={close} className="ml-2 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"><CloseIcon /></button> : null}
      </div>
      <div className="px-5 pb-2 pt-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#D4A017]">Agent Tools</p>
        <p className="mt-1 text-xs leading-5 text-white/45">CMA + Listing AI workspace</p>
      </div>
      <nav className="flex-1 px-3 py-3">
        {nav.map((item) => {
          const active = item.label === activeLabel;
          return (
            <Link key={item.label} href={item.href} onClick={close} className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-bold no-underline transition ${active ? "bg-[#D4A017] text-[#082442]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-5">
        <p className="text-xs font-semibold text-white/75">Realty Edge Pro Tools</p>
        <p className="mt-1 text-[11px] leading-4 text-white/40">Standalone test dashboard</p>
      </div>
    </aside>
  );
}

export function RepToolsShell({ activeLabel = "Dashboard", children }: Props) {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F5F3EF]">
      <div className="h-[3px] shrink-0 bg-[#D4A017]" />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!mobile && <Sidebar activeLabel={activeLabel} />}
        {mobile && (
          <>
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-[#082442] text-white shadow-lg"><MenuIcon /></button>
            {open && (
              <>
                <button type="button" aria-label="Close menu backdrop" onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/45" />
                <div className="fixed bottom-0 left-0 top-0 z-[51]"><Sidebar activeLabel={activeLabel} close={() => setOpen(false)} /></div>
              </>
            )}
          </>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function ToolsPageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <header className="border-b border-[#E5E7EB] bg-white px-6 py-6 sm:px-9">
      <div className="mx-auto max-w-6xl">
        {eyebrow ? <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A7100]">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-[#082442]">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6B7280]">{description}</p>
      </div>
    </header>
  );
}
