"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createOpenAccessSession } from "@/lib/rep-tools/auth-storage";

type Mode = "signup" | "signin";

export default function RepToolsAuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }
    if (mode === "signup" && !fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    createOpenAccessSession(fullName || email.split("@")[0], email);
    router.push("/tools-dashboard");
  }

  return (
    <div className="w-full max-w-[470px] rounded-[28px] border border-[#D8D1C7] bg-[#FAF8F3] p-7 shadow-[0_24px_60px_rgba(36,32,26,0.12)] sm:p-9">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A7100]">
        REALTY EDGE TOOLS
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.04em] text-[#082442]">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#6D7077]">
        {mode === "signup"
          ? "One membership. CMA Builder and Listing AI in one workspace."
          : "Sign in to continue to your CMA and Listing AI workspace."}
      </p>

      <form className="mt-7 space-y-5" onSubmit={submit}>
        {mode === "signup" && (
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7076]">Full name</span>
            <input
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-[#D7D0C7] bg-white px-4 py-3.5 text-[#1F2937] outline-none focus:border-[#082442] focus:ring-2 focus:ring-[#082442]/10"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
        )}

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7076]">Email address</span>
          <input
            autoComplete="email"
            type="email"
            className="mt-2 w-full rounded-xl border border-[#D7D0C7] bg-white px-4 py-3.5 text-[#1F2937] outline-none focus:border-[#082442] focus:ring-2 focus:ring-[#082442]/10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7076]">Password</span>
          <input
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            type="password"
            className="mt-2 w-full rounded-xl border border-[#D7D0C7] bg-white px-4 py-3.5 text-[#1F2937] outline-none focus:border-[#082442] focus:ring-2 focus:ring-[#082442]/10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {mode === "signup" && (
          <div className="rounded-xl border border-[#E4D8B5] bg-[#FFF8E8] px-4 py-3 text-xs leading-5 text-[#735A1A]">
            <strong>Payment connection coming next.</strong> Access is temporarily open while we finish and test the dashboard.
          </div>
        )}

        {error && <p className="text-sm font-semibold text-[#9B2C2C]">{error}</p>}

        <button type="submit" className="w-full rounded-xl bg-[#082442] px-5 py-3.5 text-sm font-bold text-[#D4A017] shadow-sm transition hover:bg-[#04182D]">
          {mode === "signup" ? "Create Account & Enter Dashboard" : "Sign In"}
        </button>
      </form>

      <div className="mt-6 border-t border-[#E4DED5] pt-5 text-center text-sm text-[#777A80]">
        {mode === "signup" ? "Already have an account?" : "New to Realty Edge Tools?"}{" "}
        <Link href={mode === "signup" ? "/signin" : "/signup"} className="font-bold text-[#082442] no-underline">
          {mode === "signup" ? "Sign in" : "Create account"}
        </Link>
      </div>
    </div>
  );
}
