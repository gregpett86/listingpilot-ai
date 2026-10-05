"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SigninClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      router.push("/tools-dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-2 w-full rounded-xl border border-[#D7D0C7] bg-white px-4 py-3.5 text-[#1F2937] outline-none focus:border-[#082442] focus:ring-2 focus:ring-[#082442]/10";

  return (
    <div className="w-full max-w-[470px] rounded-[28px] border border-[#D8D1C7] bg-[#FAF8F3] p-7 shadow-[0_24px_60px_rgba(36,32,26,0.12)] sm:p-9">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A7100]">REALTY EDGE TOOLS</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.04em] text-[#082442]">Welcome back</h1>
      <p className="mt-3 text-sm leading-6 text-[#6D7077]">Sign in to continue to your CMA and Listing AI workspace.</p>
      <form className="mt-7 space-y-5" onSubmit={submit}>
        <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7076]">Email address</span><input className={input} autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7076]">Password</span><input className={input} autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="text-sm font-semibold text-[#9B2C2C]">{error}</p>}
        <button disabled={busy} type="submit" className="w-full rounded-xl bg-[#082442] px-5 py-3.5 text-sm font-bold text-[#D4A017] shadow-sm disabled:opacity-50">{busy ? "Signing in..." : "Sign In"}</button>
      </form>
      <div className="mt-6 border-t border-[#E4DED5] pt-5 text-center text-sm text-[#777A80]">New to Realty Edge Tools? <Link href="/signup" className="font-bold text-[#082442] no-underline">Join for $49/month</Link></div>
    </div>
  );
}
