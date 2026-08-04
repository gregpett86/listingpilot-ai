"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { jsPDF } from "jspdf";

type Improvement = {
  id: number;
  room: string;
  title: string;
  description: string;
  points: number;
  difficulty: "Very Easy" | "Easy" | "Medium";
  time: string;
  reasons: string[];
};

const improvements: Improvement[] = [
  { id: 1, room: "Living Room", title: "Fresh Interior Paint", description: "Use a warm neutral paint color to brighten the room and create a cleaner first impression.", points: 8, difficulty: "Easy", time: "1–2 days", reasons: ["Dark wall color absorbs natural light", "Neutral paint photographs better", "Creates broader buyer appeal"] },
  { id: 2, room: "Dining Room", title: "Upgrade Light Fixtures", description: "Replace the dated fixture with a simple modern design that better matches the updated finishes.", points: 4, difficulty: "Easy", time: "2–3 hours", reasons: ["Existing fixture appears dated", "Modern lighting creates a stronger focal point", "Improves listing photography"] },
  { id: 3, room: "Whole Home", title: "Declutter & Depersonalize", description: "Remove excess décor and personal items so buyers can focus on the space rather than the belongings.", points: 3, difficulty: "Very Easy", time: "3–4 hours", reasons: ["Several surfaces appear visually busy", "Cleaner spaces feel larger", "Helps buyers picture themselves in the home"] },
  { id: 4, room: "Exterior", title: "Power Wash Exterior", description: "Clean the front walk, driveway and entry surfaces to sharpen curb appeal before photography.", points: 2, difficulty: "Easy", time: "2–4 hours", reasons: ["Walkway shows visible discoloration", "Entry photos shape first impressions", "Low-effort curb appeal improvement"] },
  { id: 5, room: "Primary Bedroom", title: "Stage Primary Bedroom", description: "Simplify furniture placement and use lighter bedding to make the room feel larger and more restful.", points: 4, difficulty: "Medium", time: "Half day", reasons: ["Furniture placement reduces visible floor area", "Lighter bedding improves photography", "A calm primary suite supports buyer emotion"] },
];

const categories = [
  { name: "Curb Appeal", score: 68, potential: 85 },
  { name: "Interior Appeal", score: 74, potential: 92 },
  { name: "Modernization", score: 63, potential: 81 },
  { name: "Buyer Appeal", score: 79, potential: 95 },
  { name: "Photo Readiness", score: 70, potential: 94 },
];

const highlights = ["Open Floor Plan", "Natural Light", "Updated Kitchen", "Hardwood Floors", "Great Curb Appeal", "Spacious Primary Suite"];

export default function ListingReadinessPage() {
  const [selected, setSelected] = useState<number[]>(improvements.map((item) => item.id));
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [propertyImage, setPropertyImage] = useState("https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=85");
  const [property, setProperty] = useState({
    address: "1234 Oak Ridge Drive",
    cityStateZip: "Dallas, TX 75230",
    beds: "5",
    baths: "3",
    sqft: "2,842",
    agentName: "Your Real Estate Professional",
    brokerage: "Realty Edge Pro",
  });

  const current = 78;
  const projected = useMemo(() => Math.min(100, current + improvements.filter((item) => selected.includes(item.id)).reduce((sum, item) => sum + item.points, 0)), [selected]);
  const chosen = improvements.filter((item) => selected.includes(item.id));

  function showMessage(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPropertyImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function downloadReport() {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const navy: [number, number, number] = [8, 36, 66];
    const gold: [number, number, number] = [228, 170, 36];
    const gray: [number, number, number] = [82, 96, 116];
    const margin = 18;
    const width = 180;
    let y = 22;

    const addTitle = (title: string) => {
      if (y > 245) { doc.addPage(); y = 22; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...navy);
      doc.text(title, margin, y);
      doc.setDrawColor(...gold);
      doc.line(margin, y + 2, margin + 42, y + 2);
      y += 10;
    };

    const addText = (text: string, size = 10) => {
      const lines = doc.splitTextToSize(text, width) as string[];
      if (y + lines.length * 5 > 260) { doc.addPage(); y = 22; }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      doc.setTextColor(...gray);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 3;
    };

    doc.setFillColor(...navy);
    doc.rect(0, 0, 216, 30, "F");
    doc.setFillColor(...gold);
    doc.rect(0, 30, 216, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("LISTING READINESS REPORT", margin, 18);
    doc.setFontSize(9);
    doc.text("Prepared with Realty Edge Pro Listing AI", margin, 25);
    y = 44;

    doc.setTextColor(...navy);
    doc.setFontSize(18);
    doc.text(property.address, margin, y);
    y += 7;
    doc.setFontSize(11);
    doc.setTextColor(...gray);
    doc.text(property.cityStateZip, margin, y);
    y += 8;
    doc.text(`${property.beds} bedrooms  |  ${property.baths} bathrooms  |  ${property.sqft} sq. ft.`, margin, y);
    y += 14;

    doc.setFillColor(247, 248, 251);
    doc.roundedRect(margin, y, width, 35, 3, 3, "F");
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CURRENT LISTING READINESS", margin + 8, y + 10);
    doc.setFontSize(24);
    doc.text(`${current}/100`, margin + 8, y + 25);
    doc.setFontSize(10);
    doc.text("POTENTIAL AFTER SELECTED IMPROVEMENTS", margin + 78, y + 10);
    doc.setTextColor(18, 139, 83);
    doc.setFontSize(24);
    doc.text(`${projected}/100`, margin + 78, y + 25);
    y += 48;

    addTitle("Property Readiness Summary");
    addText("The home presents a good foundation for market preparation. The selected recommendations focus on visual presentation, buyer appeal, and photography readiness. This report is not a home inspection, appraisal, or guarantee of sale price or market performance.");

    addTitle("Category Scores");
    categories.forEach((category) => addText(`${category.name}: ${category.score}/100  |  Potential: ${category.potential}/100`));

    addTitle("Recommended Preparation Plan");
    if (chosen.length === 0) {
      addText("No recommendations were selected for this report.");
    } else {
      chosen.forEach((item, index) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...navy);
        doc.text(`${index + 1}. ${item.title} (${item.room})`, margin, y);
        y += 6;
        addText(`${item.description} Score impact: +${item.points} points. Difficulty: ${item.difficulty}. Estimated time: ${item.time}.`);
      });
    }

    addTitle("Marketing Highlights");
    highlights.forEach((highlight) => addText(`• ${highlight}`));

    addTitle("Suggested Next Steps");
    addText("1. Decide which preparation items will be completed before photography.");
    addText("2. Retake any dark, cluttered, or poorly framed listing photos.");
    addText("3. Use the strongest rooms and features first in online marketing and video.");

    if (y > 235) { doc.addPage(); y = 22; }
    addTitle("Prepared For the Homeowner");
    addText(`Prepared by ${property.agentName}${property.brokerage ? `, ${property.brokerage}` : ""}.`);
    addText("Important: Scores and recommendations are generated from visible presentation factors and agent-provided information. They are intended as marketing-preparation guidance only.", 8);

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(140, 150, 165);
      doc.text(`Page ${page} of ${pages}`, 178, 270);
    }

    const safeName = property.address.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    doc.save(`${safeName || "property"}-listing-readiness-report.pdf`);
    showMessage("Homeowner PDF downloaded.");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#15213b]">
      {notice && <div className="fixed right-6 top-6 z-50 rounded-xl bg-[#082442] px-5 py-4 text-sm font-semibold text-white shadow-2xl">{notice}</div>}

      {showSetup && <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-black">Test a Property Report</h2><p className="mt-1 text-sm text-slate-500">Replace the sample details, choose a property photo, then download the homeowner report.</p></div><button onClick={() => setShowSetup(false)} className="rounded-lg bg-slate-100 px-3 py-2 font-bold">✕</button></div><div className="mt-6 grid gap-4 md:grid-cols-2">{Object.entries(property).map(([key, value]) => <label key={key} className={key === "address" || key === "cityStateZip" ? "md:col-span-2" : ""}><span className="mb-1 block text-xs font-bold uppercase text-slate-500">{key.replace(/([A-Z])/g, " $1")}</span><input value={value} onChange={(event) => setProperty((currentProperty) => ({ ...currentProperty, [key]: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#d4a017]"/></label>)}</div><label className="mt-5 block rounded-xl border-2 border-dashed border-slate-300 p-5 text-center"><span className="font-bold">Upload a property cover photo</span><input type="file" accept="image/*" onChange={handleImage} className="mt-3 block w-full text-sm"/></label><div className="mt-6 flex flex-wrap justify-end gap-3"><button onClick={() => setShowSetup(false)} className="rounded-lg border border-slate-300 px-5 py-3 font-bold">Use These Details</button><button onClick={downloadReport} className="rounded-lg bg-[#082442] px-5 py-3 font-bold text-white">Download Test PDF</button></div></div></div>}

      <div className="mx-auto flex max-w-[1550px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-[#082442] to-[#04182d] p-6 text-white xl:flex"><div className="mb-10 flex items-center gap-3"><img src="/logo_gold.png" alt="Realty Edge Pro" className="h-10 w-10 object-contain"/><div className="text-lg font-extrabold leading-5">REALTY<br/>EDGE PRO</div></div><nav className="space-y-1 text-sm">{["Dashboard", "Properties", "Contacts", "Marketing", "Transactions", "Listing AI", "Resources", "Reports", "Help Center"].map((item) => <div key={item} className={`rounded-xl px-4 py-3 ${item === "Listing AI" ? "bg-white/10 font-bold" : "text-slate-300"}`}>{item}</div>)}</nav></aside>

        <section className="min-w-0 flex-1 p-4 md:p-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-black">Listing AI <span className="text-base font-normal text-slate-500">Homeowner Report Test</span></h1><div className="flex gap-3"><button onClick={() => setShowSetup(true)} className="rounded-lg border border-[#d4a017] bg-white px-5 py-3 font-bold text-[#9a7100]">Test Another Property</button><button onClick={downloadReport} className="rounded-lg bg-[#082442] px-5 py-3 font-bold text-white">Download Homeowner Report ↓</button></div></header>

          <div className="mb-5 grid overflow-hidden rounded-2xl border bg-white shadow-sm lg:grid-cols-2"><div className="flex flex-col gap-5 p-5 sm:flex-row"><img src={propertyImage} alt={property.address} className="h-40 w-full rounded-xl object-cover sm:w-60"/><div className="self-center"><h2 className="text-xl font-black">{property.address}</h2><p className="mt-1 text-slate-500">{property.cityStateZip}</p><p className="mt-5 font-medium">{property.beds} Bed · {property.baths} Bath · {property.sqft} Sq Ft</p></div></div><div className="flex items-center gap-7 border-t p-6 lg:border-l lg:border-t-0"><div className="grid h-32 w-32 shrink-0 place-items-center rounded-full border-[10px] border-[#e4aa24]"><div className="text-center"><div className="text-4xl font-black">{current}</div><div className="text-xs text-slate-500">/100</div></div></div><div><div className="text-xs font-black uppercase text-slate-500">Listing Readiness Score</div><p className="mt-3 leading-6 text-slate-600">Good foundation with focused opportunities to improve presentation and buyer appeal.</p><button onClick={downloadReport} className="mt-4 rounded-lg border border-slate-400 px-4 py-2 text-sm font-bold">Download Full Report</button></div></div></div>

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">{categories.map((category) => <div key={category.name} className="rounded-2xl border bg-white p-4 text-center shadow-sm"><div className="text-sm font-bold">{category.name}</div><div className="mt-3 text-3xl font-black">{category.score}<span className="text-xs font-normal">/100</span></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#e4aa24]" style={{ width: `${category.score}%` }}/></div><div className="mt-2 text-xs font-bold text-emerald-600">Potential {category.potential}</div></div>)}</div>

          <div className="grid gap-5 lg:grid-cols-[1fr_310px]"><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="text-xl font-black">Recommended Improvements</h3><p className="mt-1 text-sm text-slate-500">Choose what the homeowner plans to complete. The projected score and PDF update automatically.</p><div className="mt-5 divide-y">{improvements.map((item, index) => { const active = selected.includes(item.id); return <div key={item.id}><div className="grid gap-3 py-4 md:grid-cols-[48px_1fr_110px_95px] md:items-center"><button onClick={() => setSelected((selection) => active ? selection.filter((id) => id !== item.id) : [...selection, item.id])} className={`grid h-9 w-9 place-items-center rounded-full font-black text-white ${active ? "bg-emerald-600" : "bg-slate-400"}`}>{active ? "✓" : index + 1}</button><button onClick={() => setExpanded(expanded === item.id ? null : item.id)} className="text-left"><span className="block font-black">{item.title}</span><span className="text-sm text-slate-500">{item.room} · {item.description}</span></button><div className="font-black text-emerald-600">+{item.points} points</div><span className="rounded-full bg-emerald-100 px-3 py-2 text-center text-xs font-bold text-emerald-700">{item.difficulty}</span></div>{expanded === item.id && <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><strong>Why recommended:</strong><ul className="mt-2 space-y-1">{item.reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}</ul><p className="mt-3"><strong>Estimated time:</strong> {item.time}</p></div>}</div>})}</div><div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-5"><div><div className="text-sm text-slate-500">Projected readiness</div><div className="text-3xl font-black">{current} → <span className="text-emerald-600">{projected}</span></div></div><button onClick={downloadReport} className="rounded-lg bg-[#082442] px-5 py-3 font-bold text-white">Create PDF Report</button></div></div><aside className="space-y-5"><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black">How to Test This</h3><ol className="mt-4 space-y-3 text-sm text-slate-600"><li><strong>1.</strong> Click Test Another Property.</li><li><strong>2.</strong> Enter a real address and agent details.</li><li><strong>3.</strong> Upload a property cover photo.</li><li><strong>4.</strong> Select recommendations.</li><li><strong>5.</strong> Download and review the homeowner PDF.</li></ol></div><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black">Report Includes</h3><ul className="mt-4 space-y-2 text-sm text-slate-600">{["Property summary", "Current and potential score", "Category scores", "Selected improvement plan", "Marketing highlights", "Next steps and disclaimer"].map((item) => <li key={item}>✓ {item}</li>)}</ul></div></aside></div>

          <div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black">Marketing Highlights <span className="font-normal text-slate-400">Detected by AI</span></h3><div className="mt-4 flex flex-wrap gap-2">{highlights.map((item) => <span key={item} className="rounded-full bg-slate-100 px-4 py-2 text-sm">✓ {item}</span>)}</div></div>
        </section>
      </div>
    </main>
  );
}
