"use client";

import { useMemo, useState } from "react";

type Improvement = {
  id: number;
  room: string;
  title: string;
  description: string;
  points: number;
  difficulty: "Very Easy" | "Easy" | "Medium";
  time: string;
  image: string;
  reasons: string[];
};

const improvements: Improvement[] = [
  { id: 1, room: "Living Room", title: "Fresh Interior Paint", description: "Use a warm neutral paint color to brighten the room and create a cleaner first impression.", points: 8, difficulty: "Easy", time: "1–2 days", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=500&q=80", reasons: ["Dark wall color absorbs natural light", "Neutral paint photographs better", "Creates broader buyer appeal"] },
  { id: 2, room: "Dining Room", title: "Upgrade Light Fixtures", description: "Replace the dated fixture with a simple modern design that better matches the updated finishes.", points: 4, difficulty: "Easy", time: "2–3 hours", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=500&q=80", reasons: ["Existing fixture appears dated", "Modern lighting creates a stronger focal point", "Improves listing photography"] },
  { id: 3, room: "Whole Home", title: "Declutter & Depersonalize", description: "Remove excess décor and personal items so buyers can focus on the space rather than the belongings.", points: 3, difficulty: "Very Easy", time: "3–4 hours", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=500&q=80", reasons: ["Several surfaces appear visually busy", "Cleaner spaces feel larger", "Helps buyers picture themselves in the home"] },
  { id: 4, room: "Exterior", title: "Power Wash Exterior", description: "Clean the front walk, driveway and entry surfaces to sharpen curb appeal before photography.", points: 2, difficulty: "Easy", time: "2–4 hours", image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=500&q=80", reasons: ["Walkway shows visible discoloration", "Entry photos shape first impressions", "Low-effort curb appeal improvement"] },
  { id: 5, room: "Primary Bedroom", title: "Stage Primary Bedroom", description: "Simplify furniture placement and use lighter bedding to make the room feel larger and more restful.", points: 4, difficulty: "Medium", time: "Half day", image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=500&q=80", reasons: ["Furniture placement reduces visible floor area", "Lighter bedding improves photography", "A calm primary suite supports buyer emotion"] },
];

const categories = [
  { name: "Curb Appeal", score: 68, potential: 85, icon: "⌂" },
  { name: "Interior Appeal", score: 74, potential: 92, icon: "▤" },
  { name: "Modernization", score: 63, potential: 81, icon: "✦" },
  { name: "Buyer Appeal", score: 79, potential: 95, icon: "◎" },
  { name: "Photo Readiness", score: 70, potential: 94, icon: "◉" },
];

const nav = ["Dashboard", "Properties", "Contacts", "Marketing", "Transactions", "Listing AI", "Resources", "Reports", "Help Center"];

export default function ListingReadinessPage() {
  const [selected, setSelected] = useState<number[]>(improvements.map((item) => item.id));
  const [view, setView] = useState<"priority" | "room">("priority");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const current = 78;
  const projected = useMemo(() => Math.min(100, current + improvements.filter((item) => selected.includes(item.id)).reduce((sum, item) => sum + item.points, 0)), [selected]);
  const rows = view === "priority" ? improvements : [...improvements].sort((a, b) => a.room.localeCompare(b.room));
  const selectedTime = selected.length === 0 ? "No plan selected" : selected.length <= 2 ? "1–2 Days" : selected.length <= 4 ? "3 Days" : "5 Days";

  function toggleItem(id: number) {
    setSelected((currentSelection) => currentSelection.includes(id) ? currentSelection.filter((itemId) => itemId !== id) : [...currentSelection, id]);
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#15213b]">
      {notice && <div className="fixed right-6 top-6 z-50 rounded-xl bg-[#082442] px-5 py-4 text-sm font-semibold text-white shadow-2xl">{notice}</div>}
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-[#082442] to-[#04182d] p-6 text-white xl:flex">
          <div className="mb-10 flex items-center gap-3"><img src="/logo_gold.png" alt="Realty Edge Pro" className="h-10 w-10 object-contain"/><div className="text-lg font-extrabold leading-5">REALTY<br/>EDGE PRO</div></div>
          <nav className="space-y-1 text-sm">{nav.map((item) => <button key={item} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${item === "Listing AI" ? "bg-white/12 font-bold text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}><span>{item}</span>{item === "Listing AI" && <span className="rounded-md bg-[#e4aa24] px-2 py-1 text-[10px] font-black text-[#082442]">NEW</span>}</button>)}</nav>
          <div className="mt-auto rounded-2xl border border-[#d8a733]/70 p-5"><div className="text-2xl text-[#e4aa24]">✦</div><h3 className="mt-3 font-bold">AI Advantage</h3><p className="mt-2 text-sm leading-6 text-slate-300">Photo intelligence that helps agents prepare stronger listings.</p></div>
        </aside>

        <section className="min-w-0 flex-1 p-4 md:p-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-extrabold tracking-tight">Listing AI <span className="ml-2 text-base font-normal text-slate-500">Post-Photo Analysis</span></h1><button onClick={() => showNotice("New analysis workflow is ready for connection.")} className="rounded-lg border border-[#d4a017] bg-white px-5 py-3 font-semibold text-[#9a7100] shadow-sm hover:bg-amber-50">New Analysis ＋</button></header>

          <div className="mb-5 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-5 p-5 sm:flex-row"><img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=85" alt="1234 Oak Ridge Drive" className="h-40 w-full rounded-xl object-cover sm:w-60"/><div className="self-center"><h2 className="text-xl font-extrabold">1234 Oak Ridge Drive</h2><p className="mt-1 text-slate-500">Dallas, TX 75230</p><p className="mt-5 font-medium">5 Bed · 3 Bath · 2,842 Sq Ft</p><p className="mt-5 text-sm text-slate-500">Analyzed May 16, 2025 at 10:42 AM</p></div></div>
            <div className="flex items-center gap-7 border-t border-slate-200 p-6 lg:border-l lg:border-t-0"><div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{background:`conic-gradient(#e4aa24 ${current * 3.6}deg,#f2eee6 0deg)`}}><div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center"><div><div className="text-4xl font-black">{current}</div><div className="text-xs text-slate-500">/100</div></div></div></div><div><div className="text-xs font-black uppercase tracking-wide text-slate-500">Listing Readiness Score ⓘ</div><p className="mt-3 max-w-sm leading-6 text-slate-600">Good start. A few focused improvements can strengthen presentation and buyer appeal.</p><button onClick={() => showNotice("Full seller report preview opened.")} className="mt-4 rounded-lg border border-slate-400 px-4 py-2 text-sm font-bold">View Full Report ↗</button></div></div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">{categories.map((category) => <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm" key={category.name}><div className="text-2xl text-[#0c3157]">{category.icon}</div><div className="mt-1 text-sm font-bold">{category.name}</div><div className="mt-3 text-3xl font-black">{category.score}<span className="text-xs font-normal text-slate-500">/100</span></div><div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#e4aa24]" style={{width:`${category.score}%`}}/></div><div className="mt-2 text-xs font-bold text-emerald-600">Potential {category.potential}</div></div>)}</div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold"><span className="text-[#e4aa24]">✦</span> Recommended Improvements</h3><p className="mt-1 text-sm text-slate-500">AI-prioritized recommendations to increase the score and improve presentation.</p></div><div className="rounded-lg bg-slate-100 p-1 text-sm"><button onClick={() => setView("priority")} className={`rounded-md px-3 py-2 ${view === "priority" ? "bg-[#082442] font-bold text-white" : "text-slate-600"}`}>Priority View</button><button onClick={() => setView("room")} className={`rounded-md px-3 py-2 ${view === "room" ? "bg-[#082442] font-bold text-white" : "text-slate-600"}`}>Room View</button></div></div>

              <div className="hidden grid-cols-[48px_1fr_120px_100px] border-b px-2 pb-3 text-[10px] font-black uppercase tracking-wide text-slate-400 md:grid"><span>Priority</span><span>Recommendation</span><span>Score Impact</span><span>Difficulty</span></div>
              {rows.map((item, index) => { const active = selected.includes(item.id); const isExpanded = expanded === item.id; return <div key={item.id} className={`border-b transition ${active ? "bg-emerald-50/40" : "bg-white"}`}><div className="grid gap-3 px-2 py-4 md:grid-cols-[48px_1fr_120px_100px] md:items-center"><button onClick={() => toggleItem(item.id)} aria-label={`Toggle ${item.title}`} className={`grid h-9 w-9 place-items-center rounded-full font-black text-white ${active ? "bg-emerald-600" : "bg-slate-400"}`}>{active ? "✓" : index + 1}</button><button onClick={() => setExpanded(isExpanded ? null : item.id)} className="flex items-center gap-4 text-left"><img src={item.image} alt="" className="h-16 w-24 rounded-lg object-cover"/><span><span className="block font-extrabold">{item.title}</span><span className="mt-1 block text-sm text-slate-500">{item.room} · {item.description}</span></span></button><div className="font-extrabold text-emerald-600">+{item.points} points</div><div><span className={`rounded-full px-3 py-2 text-xs font-bold ${item.difficulty === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{item.difficulty}</span></div></div>{isExpanded && <div className="mx-2 mb-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2"><div><div className="text-xs font-black uppercase tracking-wide text-slate-400">Why AI recommended this</div><ul className="mt-3 space-y-2 text-sm text-slate-600">{item.reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}</ul></div><div><div className="text-xs font-black uppercase tracking-wide text-slate-400">Plan details</div><p className="mt-3 text-sm"><strong>Estimated time:</strong> {item.time}</p><p className="mt-2 text-sm"><strong>AI confidence:</strong> High</p></div></div>}</div>})}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5"><div><div className="text-sm text-slate-500">Complete the selected recommendations</div><div className="mt-1 text-3xl font-black">{current} → <span className="text-emerald-600">{projected}</span></div></div><button onClick={() => showNotice(`Improvement plan created with ${selected.length} selected items.`)} disabled={selected.length === 0} className="rounded-lg bg-[#082442] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Create Improvement Plan →</button></div>
            </div>

            <aside className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-extrabold">Score Summary ⓘ</h3><p className="mt-5 flex justify-between text-sm">Current Score <strong className="text-lg">{current}<span className="text-xs text-slate-400">/100</span></strong></p><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#e4aa24]" style={{width:`${current}%`}}/></div><p className="mt-5 flex justify-between text-sm">Selected Plan <strong className="text-lg text-emerald-600">{projected}<span className="text-xs text-slate-400">/100</span></strong></p><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{width:`${projected}%`}}/></div><div className="mt-5 space-y-2 text-xs text-slate-600"><p><span className="text-emerald-600">●</span> 90–100 Premium Listing</p><p><span className="text-blue-600">●</span> 75–89 Market Ready</p><p><span className="text-amber-500">●</span> 60–74 Good Foundation</p><p><span className="text-red-500">●</span> 0–59 Needs Attention</p></div></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-extrabold">Why It Matters</h3><p className="mt-3 text-sm leading-6 text-slate-600">A higher readiness score means stronger visual presentation, clearer marketing highlights and fewer distractions for buyers.</p><div className="mt-5 flex h-16 items-end gap-1">{[18,24,22,35,48,43,58,66,61,76,82].map((height, index) => <div key={index} className="flex-1 rounded-t bg-blue-100" style={{height:`${height}%`}}/>)}</div></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-extrabold">◷ Estimated Time</h3><div className="mt-3 text-4xl font-black">{selectedTime}</div><p className="mt-2 text-sm text-slate-500">Focus on the selected high-impact items first.</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-extrabold">Marketing Assets</h3><p className="mt-2 text-sm leading-6 text-slate-500">Generate listing descriptions, social posts, flyers and a video storyboard from this analysis.</p><button onClick={() => showNotice("Marketing asset workspace opened.")} className="mt-4 w-full rounded-lg border border-[#082442] px-4 py-3 font-bold">Generate Assets →</button></div></aside>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-extrabold">Marketing Highlights <span className="font-normal text-slate-400">Detected by AI</span></h3><div className="mt-4 flex flex-wrap gap-2">{["Open Floor Plan", "Natural Light", "Updated Kitchen", "Hardwood Floors", "Great Curb Appeal", "Spacious Primary Suite"].map((highlight) => <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium" key={highlight}><span className="text-emerald-600">✓</span> {highlight}</span>)}</div></div>
        </section>
      </div>
    </main>
  );
}
