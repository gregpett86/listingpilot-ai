"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import StripeEmbeddedCheckout from "@/components/stripe-embedded-checkout";

export default function SignupClient({ billingMode, publishableKey }: { billingMode: "open" | "paid"; publishableKey: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "payment">("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create account.");

      if (!data.requiresPayment) {
        router.push("/tools-dashboard");
        return;
      }
      setUserId(data.userId);
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-2 w-full rounded-xl border border-[#D7D0C7] bg-white px-4 py-3.5 text-[#1F2937] outline-none focus:border-[#082442] focus:ring-2 focus:ring-[#082442]/10";

  return (
    <div className="w-full max-w-[560px] rounded-[28px] border border-[#D8D1C7] bg-[#FAF8F3] p-7 shadow-[0_24px_60px_rgba(36,32,26,0.12)] sm:p-9">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A7100]">REALTY EDGE TOOLS</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.04em] text-[#082442]">
        {step === "account" ? "Create your account" : "Complete your membership"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#6D7077]">
        One membership includes CMA Builder, Listing AI, saved reports and agent branding.
      </p>

      {step === "account" ? (
        <form className="mt-7 space-y-5" onSubmit={submit}>
          <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7076]">Full name</span><input className={input} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
          <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7076]">Email address</span><input className={input} autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7076]">Password</span><input className={input} autoComplete="new-password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>

          <div className="rounded-xl border border-[#DDD7CE] bg-[#F3EFE7] px-4 py-4">
            <div className="flex items-center justify-between gap-4"><span className="font-serif text-lg font-semibold text-[#082442]">Realty Edge Tools Membership</span><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#9A7100]">One plan</span></div>
            <p className="mt-2 text-xs leading-5 text-[#6D7077]">CMA Builder + Listing AI + report library + agent branding. The exact subscription price is shown securely in the payment form.</p>
          </div>

          {billingMode === "open" && <div className="rounded-xl border border-[#E4D8B5] bg-[#FFF8E8] px-4 py-3 text-xs leading-5 text-[#735A1A]"><strong>Testing mode:</strong> payment gating is currently open until Stripe is connected.</div>}
          {error && <p className="text-sm font-semibold text-[#9B2C2C]">{error}</p>}
          <button disabled={busy} type="submit" className="w-full rounded-xl bg-[#082442] px-5 py-3.5 text-sm font-bold text-[#D4A017] shadow-sm disabled:opacity-50">{busy ? "Creating account..." : billingMode === "paid" ? "Continue to Payment" : "Create Account & Enter Dashboard"}</button>
        </form>
      ) : (
        <div className="mt-7">
          <div className="mb-5 rounded-xl border border-[#D7D0C7] bg-white px-4 py-3 text-sm text-[#565B63]"><strong className="text-[#082442]">{email}</strong><br/>Account created. Complete payment below to activate dashboard access.</div>
          <StripeEmbeddedCheckout userId={userId} email={email} publishableKey={publishableKey} />
        </div>
      )}

      <div className="mt-6 border-t border-[#E4DED5] pt-5 text-center text-sm text-[#777A80]">Already have an account? <Link href="/signin" className="font-bold text-[#082442] no-underline">Sign in</Link></div>
    </div>
  );
}
