"use client";

import { useMemo, useState } from "react";

const items = [
  { id: 1, room: "Living Room", title: "Fresh Interior Paint", points: 8, difficulty: "Easy" },
  { id: 2, room: "Dining Room", title: "Upgrade Light Fixtures", points: 4, difficulty: "Easy" },
  { id: 3, room: "Whole Home", title: "Declutter & Depersonalize", points: 3, difficulty: "Very Easy" },
  { id: 4, room: "Exterior", title: "Power Wash Exterior", points: 2, difficulty: "Easy" },
  { id: 5, room: "Primary Bedroom", title: "Stage Primary Bedroom", points: 4, difficulty: "Medium" },
];

const categories = [
  ["Curb Appeal", 68, 85], ["Interior Appeal", 74, 92], ["Modernization", 63, 81],
  ["Buyer Appeal", 79, 95], ["Photo Readiness", 70, 94],
] as const;

export default function ListingReadinessPage() {
  const [selected, setSelected] = useState<number[]>([]);
  const [view, setView] = useState<"priority" | "room">("priority");
  const current = 78;
  const projected = useMemo(() => Math.min(100, current + items.filter(i => selected.includes(i.id)).reduce((s, i) => s + i.points, 0)), [selected]);
  const rows = view === "priority" ? items : [...items].sort((a,b) => a.room.localeCompare(b.room));

  return <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
    <div className="mx-auto flex max-w-[1500px]">
      <aside className="hidden min-h-screen w-64 shrink-0 bg-[#071f3c] p-6 text-white xl:block">
        <div className="mb-12 text-xl font-bold text-[#e5aa20]">REALTY EDGE PRO</div>
        <nav className="space-y-2 text-sm">{["Dashboard","Properties","Contacts","Marketing","Transactions"].map(x => <div className="rounded-lg px-4 py-3 text-slate-300" key={x}>{x}</div>)}<div className="rounded-lg bg-white/10 px-4 py-3 font-bold">Listing AI <span className="ml-2 rounded bg-[#e5aa20] px-2 py-1 text-[10px] text-[#071f3c]">NEW</span></div>{["Resources","Reports","Help Center"].map(x => <div className="rounded-lg px-4 py-3 text-slate-300" key={x}>{x}</div>)}</nav>
      </aside>
      <section className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-6 flex items-center justify-between"><h1 className="text-3xl font-bold">Listing AI <span className="text-base font-normal text-slate-500">Post-Photo Analysis</span></h1><button className="rounded-lg border border-[#d4a017] bg-white px-5 py-3 font-semibold text-[#9a7100]">New Analysis +</button></header>

        <div className="mb-5 grid gap-6 rounded-2xl border bg-white p-6 shadow-sm lg:grid-cols-2">
          <div className="flex gap-5"><div className="h-36 w-52 rounded-xl bg-gradient-to-br from-green-200 to-green-700"/><div><h2 className="text-xl font-bold">1234 Oak Ridge Drive</h2><p className="text-slate-500">Dallas, TX 75230</p><p className="mt-4">5 Bed • 3 Bath • 2,842 Sq Ft</p><p className="mt-5 text-sm text-slate-500">Analyzed May 16, 2025</p></div></div>
          <div className="flex items-center gap-6 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><div className="grid h-32 w-32 shrink-0 place-items-center rounded-full border-[10px] border-[#e5aa20]"><div className="text-center"><div className="text-4xl font-bold">{current}</div><div className="text-xs text-slate-500">/100</div></div></div><div><div className="text-xs font-bold uppercase text-slate-500">Listing Readiness Score</div><p className="mt-3 leading-6 text-slate-600">Good start. A few focused improvements can strengthen presentation and buyer appeal.</p></div></div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">{categories.map(([name, score, potential]) => <div className="rounded-2xl border bg-white p-4 text-center shadow-sm" key={name}><div className="text-sm font-semibold">{name}</div><div className="mt-3 text-3xl font-bold">{score}<span className="text-xs font-normal">/100</span></div><div className="mt-3 h-1.5 rounded bg-slate-100"><div className="h-full rounded bg-[#e5aa20]" style={{width:`${score}%`}}/></div><div className="mt-2 text-xs font-bold text-emerald-600">Potential {potential}</div></div>)}</div>

        <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div><h3 className="text-xl font-bold">Recommended Improvements</h3><p className="text-sm text-slate-500">Select items to preview the updated score.</p></div><div className="rounded-lg bg-slate-100 p-1 text-sm"><button onClick={() => setView("priority")} className={`rounded px-3 py-2 ${view === "priority" ? "bg-[#071f3c] text-white" : ""}`}>Priority</button><button onClick={() => setView("room")} className={`rounded px-3 py-2 ${view === "room" ? "bg-[#071f3c] text-white" : ""}`}>Room</button></div></div>
            {rows.map(item => { const on = selected.includes(item.id); return <button key={item.id} onClick={() => setSelected(s => on ? s.filter(id => id !== item.id) : [...s, item.id])} className={`grid w-full gap-3 border-t px-2 py-5 text-left md:grid-cols-[55px_1fr_120px_100px] md:items-center ${on ? "bg-emerald-50" : "hover:bg-slate-50"}`}><div className={`grid h-9 w-9 place-items-center rounded-full font-bold text-white ${on ? "bg-emerald-600" : "bg-[#0b8c43]"}`}>{on ? "✓" : item.id}</div><div><div className="font-bold">{item.title}</div><div className="mt-1 text-sm text-slate-500">{item.room}</div></div><div className="font-bold text-emerald-600">+{item.points} points</div><div><span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">{item.difficulty}</span></div></button>})}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-5"><div><div className="text-sm text-slate-500">Selected plan</div><div className="text-3xl font-bold">{current} → <span className="text-emerald-600">{projected}</span></div></div><button className="rounded-lg bg-[#071f3c] px-5 py-3 font-semibold text-white">Create Improvement Plan</button></div>
          </div>
          <aside className="space-y-5"><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Score Summary</h3><p className="mt-5 flex justify-between">Current <strong>{current}/100</strong></p><div className="mt-2 h-2 rounded bg-slate-100"><div className="h-full rounded bg-[#e5aa20]" style={{width:`${current}%`}}/></div><p className="mt-5 flex justify-between">Selected Plan <strong className="text-emerald-600">{projected}/100</strong></p><div className="mt-2 h-2 rounded bg-slate-100"><div className="h-full rounded bg-emerald-600" style={{width:`${projected}%`}}/></div></div><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Estimated Time</h3><div className="mt-3 text-4xl font-bold">{selected.length || 5} Days</div><p className="mt-2 text-sm text-slate-500">Focus on the highest-impact items first.</p></div><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Marketing Assets</h3><p className="mt-2 text-sm text-slate-500">Generate listing descriptions, social posts, flyers and video storyboards.</p><button className="mt-4 w-full rounded-lg border border-[#071f3c] px-4 py-3 font-semibold">Generate Assets</button></div></aside>
        </div>
        <div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Marketing Highlights <span className="font-normal text-slate-400">Detected by AI</span></h3><div className="mt-4 flex flex-wrap gap-2">{["Open Floor Plan","Natural Light","Updated Kitchen","Hardwood Floors","Great Curb Appeal","Spacious Primary Suite"].map(x => <span className="rounded-full bg-slate-100 px-4 py-2 text-sm" key={x}>✓ {x}</span>)}</div></div>
      </section>
    </div>
  </main>;
}
