"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SignupCompleteClient({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<"checking" | "active" | "error">("checking");
  const [message, setMessage] = useState("Confirming your membership...");

  useEffect(() => {
    async function check() {
      try {
        const response = await fetch(`/api/billing/session-status?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json();
        if (!response.ok || !data.membershipActive) throw new Error(data.error || "Payment is not complete yet.");
        setState("active");
        setMessage("Your $49/month Realty Edge Tools membership is active.");
      } catch (err) {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Unable to verify payment.");
      }
    }
    if (sessionId) void check();
    else {
      setState("error");
      setMessage("Missing payment session.");
    }
  }, [sessionId]);

  return (
    <div className="w-full max-w-[500px] rounded-[28px] border border-[#D8D1C7] bg-[#FAF8F3] p-8 text-center shadow-[0_24px_60px_rgba(36,32,26,0.12)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#082442] text-xl text-[#D4A017]">{state === "active" ? "✓" : state === "error" ? "!" : "…"}</div>
      <h1 className="mt-5 font-serif text-3xl font-semibold text-[#082442]">{state === "active" ? "Welcome to Realty Edge Tools" : "Membership setup"}</h1>
      <p className="mt-3 text-sm leading-6 text-[#6D7077]">{message}</p>
      {state === "active" && <Link href="/tools-dashboard" className="mt-6 inline-flex rounded-xl bg-[#082442] px-6 py-3 text-sm font-bold text-[#D4A017] no-underline">Enter Dashboard</Link>}
      {state === "error" && <Link href="/signup" className="mt-6 inline-flex rounded-xl border border-[#082442] px-6 py-3 text-sm font-bold text-[#082442] no-underline">Return to Signup</Link>}
    </div>
  );
}
