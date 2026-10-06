"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

type Props = { activeLabel?: string; children: ReactNode };

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
};

function DocIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...iconProps}/><path d="M14 2v6h6M8 13h8M8 17h8" {...iconProps}/></svg>;
}
function SparkIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" {...iconProps}/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" {...iconProps}/></svg>;
}
function ReportsIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" {...iconProps}/><path d="M6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5v-16A2.5 2.5 0 0 1 6.5 2z" {...iconProps}/><path d="M9 7h7M9 11h7" {...iconProps}/></svg>;
}
function ProfileIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" {...iconProps}/><path d="M4 22a8 8 0 0 1 16 0" {...iconProps}/></svg>;
}
function MenuIcon() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" {...iconProps}/></svg>;
}
function CloseIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" {...iconProps}/></svg>;
}

const nav = [
  { label: "Create CMA", href: null, icon: <DocIcon /> },
  { label: "CMA Reports", href: null, icon: <ReportsIcon /> },
  { label: "Create Listing AI", href: "/tools/listing-ai", icon: <SparkIcon /> },
  { label: "Listing AI Reports", href: "/tools/listing-ai-reports", icon: <ReportsIcon /> },
  { label: "Profile", href: "/tools/profile", icon: <ProfileIcon /> },
];

function Sidebar({ activeLabel, close }: { activeLabel?: string; close?: () => void }) {
  return (
    <aside className="flex h-full w-[252px] min-w-[252px] flex-col border-r border-[#DED8CF] bg-[#F4F0E8] text-[#1E2430]">
      <Link href="/tools-dashboard" className="flex min-h-[94px] items-center border-b border-[#DED8CF] px-6 no-underline">
        <img src="/rep-tools-logo.svg" alt="Realty Edge Pro" className="h-auto w-[190px] max-w-full" />
      </Link>
      <nav className="flex-1 px-4 py-6">
        {nav.map((item) => {
          const active = item.label === activeLabel;
          const className = `mb-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[14px] font-semibold transition ${active ? "bg-[#082442] text-[#D4A017] shadow-sm" : item.href ? "text-[#3B424D] hover:bg-white hover:text-[#082442]" : "cursor-default text-[#7B7F86]"}`;
          if (!item.href) {
            return <div key={item.label} className={className} aria-disabled="true"><span>{item.icon}</span><span>{item.label}</span></div>;
          }
          return <Link key={item.label} href={item.href} onClick={close} className={className + " no-underline"}><span>{item.icon}</span><span>{item.label}</span></Link>;
        })}
      </nav>
      <div className="border-t border-[#DED8CF] px-6 py-5">
        <p className="font-serif text-sm font-bold text-[#082442]">REALTY EDGE TOOLS</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#8B8172]">CMA + Listing Intelligence</p>
      </div>
      {close ? <button type="button" aria-label="Close menu" onClick={close} className="absolute right-3 top-3 rounded-lg bg-[#082442] p-2 text-[#D4A017]"><CloseIcon /></button> : null}
    </aside>
  );
}

export function RepToolsShell({ activeLabel = "", children }: Props) {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#EEE9E0]">
      <div className="h-[3px] shrink-0 bg-[#D4A017]" />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!mobile && <Sidebar activeLabel={activeLabel} />}
        {mobile && (
          <>
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="fixed left-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-xl bg-[#082442] text-[#D4A017] shadow-lg"><MenuIcon /></button>
            {open && <>
              <button type="button" aria-label="Close menu backdrop" onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/40" />
              <div className="fixed bottom-0 left-0 top-0 z-[51]"><Sidebar activeLabel={activeLabel} close={() => setOpen(false)} /></div>
            </>}
          </>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function ToolsPageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <header className="border-b border-[#DED8CF] bg-[#F8F5EF] px-6 py-7 sm:px-10">
      <div className="mx-auto max-w-7xl">
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A7100]">{eyebrow}</p> : null}
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.025em] text-[#082442]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6D7077]">{description}</p>
      </div>
    </header>
  );
}
