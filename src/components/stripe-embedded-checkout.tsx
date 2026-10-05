"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Stripe?: (key: string) => {
      initEmbeddedCheckout: (options: { fetchClientSecret: () => Promise<string> }) => Promise<{ mount: (selector: string) => void; destroy: () => void }>;
    };
  }
}

export default function StripeEmbeddedCheckout({ userId, email, publishableKey }: { userId: string; email: string; publishableKey: string }) {
  const mounted = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!publishableKey || mounted.current) return;
    mounted.current = true;
    let checkout: { destroy: () => void } | undefined;

    async function start() {
      try {
        if (!window.Stripe) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]') as HTMLScriptElement | null;
            if (existing) {
              if (window.Stripe) resolve();
              else existing.addEventListener("load", () => resolve(), { once: true });
              return;
            }
            const script = document.createElement("script");
            script.src = "https://js.stripe.com/v3/";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Unable to load Stripe."));
            document.head.appendChild(script);
          });
        }

        const stripe = window.Stripe?.(publishableKey);
        if (!stripe) throw new Error("Stripe could not be initialized.");

        const instance = await stripe.initEmbeddedCheckout({
          fetchClientSecret: async () => {
            const response = await fetch("/api/billing/create-checkout-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, email }),
            });
            const data = await response.json();
            if (!response.ok || !data.clientSecret) throw new Error(data.error || "Unable to start checkout.");
            return data.clientSecret;
          },
        });
        checkout = instance;
        instance.mount("#rep-tools-embedded-checkout");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load payment form.");
      }
    }

    void start();
    return () => checkout?.destroy();
  }, [email, publishableKey, userId]);

  if (!publishableKey) {
    return <div className="rounded-xl border border-[#E4D8B5] bg-[#FFF8E8] px-4 py-4 text-sm text-[#735A1A]"><strong>Stripe connection pending.</strong> Add the Stripe publishable key and price ID in Vercel to activate payment.</div>;
  }

  return (
    <div>
      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <div id="rep-tools-embedded-checkout" />
    </div>
  );
}
