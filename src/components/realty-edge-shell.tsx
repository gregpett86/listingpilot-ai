"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 2,
};

function IconHome() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...iconProps} />
      <polyline points="9 22 9 12 15 12 15 22" {...iconProps} />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5L12 3z" {...iconProps} />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" {...iconProps} />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...iconProps} />
      <polyline points="14 2 14 8 20 8" {...iconProps} />
      <line x1="16" x2="8" y1="13" y2="13" {...iconProps} />
      <line x1="16" x2="8" y1="17" y2="17" {...iconProps} />
    </svg>
  );
}

function IconLeads() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...iconProps} />
      <circle cx="9" cy="7" r="4" {...iconProps} />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" {...iconProps} />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" {...iconProps} />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <circle cx="12" cy="12" r="3" {...iconProps} />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...iconProps} />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg aria-hidden="true" height="20" viewBox="0 0 24 24" width="20">
      <line x1="3" x2="21" y1="6" y2="6" {...iconProps} strokeWidth={2.5} />
      <line x1="3" x2="21" y1="12" y2="12" {...iconProps} strokeWidth={2.5} />
      <line x1="3" x2="21" y1="18" y2="18" {...iconProps} strokeWidth={2.5} />
    </svg>
  );
}

function IconClose() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <line x1="18" x2="6" y1="6" y2="18" {...iconProps} strokeWidth={2.5} />
      <line x1="6" x2="18" y1="6" y2="18" {...iconProps} strokeWidth={2.5} />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 24 24" width="14">
      <polyline points="9 18 15 12 9 6" {...iconProps} />
    </svg>
  );
}

const navItems: NavItem[] = [
  { href: "#", label: "Dashboard", icon: <IconHome /> },
  {
    href: "#",
    label: "AI Listing Presentation",
    icon: <IconSpark />,
    active: true,
  },
  { href: "#", label: "New CMA / Property", icon: <IconDoc /> },
  { href: "#", label: "My Reports", icon: <IconDoc /> },
  { href: "#", label: "Leads", icon: <IconLeads /> },
  { href: "#", label: "Profile", icon: <IconSettings /> },
];

function Sidebar({ onClose, showClose }: { onClose?: () => void; showClose?: boolean }) {
  return (
    <aside className="flex h-full w-[260px] min-w-[260px] shrink-0 flex-col overflow-y-auto bg-[#1B2238]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0B1437]">
        <Image
          alt="Realty Edge Pro"
          className="block h-auto w-full"
          height={60}
          priority
          src="/logo_gold.png"
          width={180}
        />
        {showClose && (
          <button
            aria-label="Close navigation"
            className="mr-3 shrink-0 rounded-md p-1 text-white/50 transition hover:text-white"
            onClick={onClose}
            type="button"
          >
            <IconClose />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4">
        {navItems.map((item) => (
          <Link
            className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold no-underline transition ${
              item.active
                ? "bg-[#D4A017] text-[#111827]"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
            href={item.href}
            key={item.label}
          >
            <span className="shrink-0">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function RealtyEdgeShell({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F5F7FA]">
      <div className="h-[3px] w-full shrink-0 bg-[#D4A017]" />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!isMobile && <Sidebar />}

        {isMobile && (
          <>
            <button
              aria-label="Open navigation"
              className="fixed left-3 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B2238] text-white shadow-lg"
              onClick={() => setMobileOpen(true)}
              type="button"
            >
              <IconMenu />
            </button>
            {mobileOpen && (
              <>
                <button
                  aria-label="Close navigation backdrop"
                  className="fixed inset-0 z-[65] bg-black/50"
                  onClick={() => setMobileOpen(false)}
                  type="button"
                />
                <div className="fixed bottom-0 left-0 top-0 z-[66]">
                  <Sidebar onClose={() => setMobileOpen(false)} showClose />
                </div>
              </>
            )}
          </>
        )}

        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

export function RealtyEdgePageHeader() {
  return (
    <header className="shrink-0 border-b border-[#E5E7EB] bg-white px-6 py-5 sm:px-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-1 flex items-center gap-2 text-[13px] text-[#6B7280]"
      >
        <span>Dashboard</span>
        <IconChevron />
        <span className="font-semibold text-[#111827]">
          AI Listing Presentation
        </span>
      </nav>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.01em] text-[#111827]">
            AI Listing Presentation
          </h1>
          <p className="mt-1 text-sm font-medium text-[#6B7280]">
            Generate a seller-ready Home Sale Optimization Report from property photos.
          </p>
        </div>
      </div>
    </header>
  );
}
