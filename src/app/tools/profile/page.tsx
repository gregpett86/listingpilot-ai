"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { RepToolsShell, ToolsPageHeader } from "@/components/rep-tools-shell";
import {
  emptyRepToolsProfile,
  loadRepToolsProfile,
  saveRepToolsProfile,
  type RepToolsProfile,
} from "@/lib/rep-tools/profile-storage";

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function cropHeadshotToCircle(file: File) {
  const dataUrl = await readImage(file);
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = 900;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Image canvas is unavailable."));
        return;
      }

      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
      // Bias the crop slightly upward so faces sit naturally inside the circle.
      const centeredY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
      const sourceY = Math.max(0, centeredY - sourceSize * 0.08);

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        size,
        size,
      );
      ctx.restore();

      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Unable to load that headshot."));
    image.src = dataUrl;
  });
}

export default function ToolsProfilePage() {
  const [profile, setProfile] = useState<RepToolsProfile>(emptyRepToolsProfile);
  const [saved, setSaved] = useState("");

  useEffect(() => setProfile(loadRepToolsProfile()), []);

  function update<K extends keyof RepToolsProfile>(key: K, value: RepToolsProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved("");
  }

  async function upload(event: ChangeEvent<HTMLInputElement>, key: "headshotDataUrl" | "logoDataUrl") {
    const file = event.target.files?.[0];
    if (!file) return;
    update(
      key,
      key === "headshotDataUrl"
        ? await cropHeadshotToCircle(file)
        : await readImage(file),
    );
    event.target.value = "";
  }

  function save() {
    saveRepToolsProfile(profile);
    setSaved("Profile saved. Listing AI will use this information on future reports.");
  }

  const input = "mt-2 w-full rounded-xl border border-[#D7D0C7] bg-[#FCFBF8] px-4 py-3 text-[#1F2937] outline-none transition focus:border-[#082442] focus:ring-2 focus:ring-[#082442]/10";
  const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7076]";

  return (
    <RepToolsShell activeLabel="Profile">
      <ToolsPageHeader eyebrow="ACCOUNT" title="Agent Profile" description="Your identity and branding are used across Listing AI reports created from this dashboard." />
      <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10">
        <section className="overflow-hidden rounded-2xl border border-[#DDD7CE] bg-[#F9F7F2] shadow-[0_12px_30px_rgba(46,42,35,0.05)]">
          <div className="border-b border-[#E3DDD4] px-6 py-5"><h2 className="font-serif text-2xl font-semibold text-[#082442]">Agent Profile</h2></div>
          <div className="grid gap-8 p-6 lg:grid-cols-[190px_1fr]">
            <div>
              <label className="group block cursor-pointer text-center">
                <div className="mx-auto grid h-36 w-36 place-items-center overflow-hidden rounded-full border-4 border-[#E3DDD4] bg-[#EEE9E0] shadow-sm">
                  {profile.headshotDataUrl ? <img src={profile.headshotDataUrl} alt="Agent headshot" className="h-full w-full object-cover object-[center_25%]" /> : <span className="font-serif text-4xl text-[#9A7100]">RP</span>}
                </div>
                <span className="mt-3 block text-sm font-semibold text-[#082442]">Upload headshot</span>
                <input type="file" accept="image/*" className="hidden" onChange={(event) => upload(event, "headshotDataUrl")} />
              </label>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className={label}>Full Name</span><input className={input} value={profile.fullName} onChange={(e) => update("fullName", e.target.value)} /></label>
              <label><span className={label}>Email Address</span><input className={input} type="email" value={profile.email} onChange={(e) => update("email", e.target.value)} /></label>
              <label><span className={label}>Phone Number</span><input className={input} value={profile.phone} onChange={(e) => update("phone", e.target.value)} /></label>
              <label><span className={label}>License Number</span><input className={input} value={profile.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} /></label>
              <label className="md:col-span-2"><span className={label}>Brokerage Name</span><input className={input} value={profile.brokerageName} onChange={(e) => update("brokerageName", e.target.value)} /></label>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#DDD7CE] bg-[#F9F7F2] shadow-[0_12px_30px_rgba(46,42,35,0.05)]">
          <div className="border-b border-[#E3DDD4] px-6 py-5">
            <h2 className="font-serif text-2xl font-semibold text-[#082442]">Branding</h2>
            <p className="mt-1 text-sm text-[#787B82]">Upload the logo you want associated with your reports.</p>
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(220px,360px)_1fr] md:items-center">
            <div className="grid min-h-[170px] place-items-center overflow-hidden rounded-2xl border border-[#D7D0C7] bg-[#F5F3EF] p-6">
              {profile.logoDataUrl ? <img src={profile.logoDataUrl} alt="Brokerage logo" className="max-h-28 max-w-full object-contain" /> : <span className="font-serif text-xl font-semibold text-[#082442]">Your Logo</span>}
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-[#082442]">Logo</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#6D7077]">PNG or SVG with a transparent background is recommended for the cleanest report presentation.</p>
              <label className="mt-5 inline-flex cursor-pointer rounded-xl bg-[#082442] px-5 py-3 text-sm font-bold text-[#D4A017]">Replace Logo<input type="file" accept="image/*" className="hidden" onChange={(event) => upload(event, "logoDataUrl")} /></label>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#DDD7CE] bg-[#F9F7F2] shadow-[0_12px_30px_rgba(46,42,35,0.05)]">
          <div className="border-b border-[#E3DDD4] px-6 py-5"><h2 className="font-serif text-2xl font-semibold text-[#082442]">Office Information</h2></div>
          <div className="grid gap-5 p-6 md:grid-cols-3">
            <label className="md:col-span-3"><span className={label}>Street Address</span><input className={input} value={profile.streetAddress} onChange={(e) => update("streetAddress", e.target.value)} /></label>
            <label><span className={label}>City</span><input className={input} value={profile.city} onChange={(e) => update("city", e.target.value)} /></label>
            <label><span className={label}>State</span><input className={input} value={profile.state} onChange={(e) => update("state", e.target.value)} /></label>
            <label><span className={label}>ZIP Code</span><input className={input} value={profile.zipCode} onChange={(e) => update("zipCode", e.target.value)} /></label>
            <label className="md:col-span-3"><span className={label}>Website URL</span><input className={input} value={profile.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} /></label>
          </div>
        </section>

        <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-[#D7D0C7] bg-[#F8F5EF]/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#42654F]">{saved}</p>
          <button type="button" onClick={save} className="rounded-xl bg-[#082442] px-6 py-3 text-sm font-bold text-[#D4A017]">Save Profile</button>
        </div>
      </div>
    </RepToolsShell>
  );
}
