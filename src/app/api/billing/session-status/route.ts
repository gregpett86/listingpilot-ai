import { NextResponse } from "next/server";
import { stripeConfig } from "@/lib/rep-tools/server-config";
import { upsertMembership } from "@/lib/rep-tools/supabase-rest";

export async function GET(request: Request) {
  const { secretKey } = stripeConfig();
  if (!secretKey) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session." }, { status: 400 });

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data?.error?.message || "Unable to verify payment." }, { status: 500 });

  const userId = data.client_reference_id || data.metadata?.user_id;
  const email = data.customer_details?.email || data.customer_email || data.metadata?.email || "";
  const subscription = typeof data.subscription === "object" ? data.subscription : null;
  const paid = data.status === "complete" && (data.payment_status === "paid" || subscription?.status === "active" || subscription?.status === "trialing");

  if (paid && userId) {
    await upsertMembership({
      user_id: userId,
      email,
      stripe_customer_id: typeof data.customer === "string" ? data.customer : data.customer?.id,
      stripe_subscription_id: subscription?.id || (typeof data.subscription === "string" ? data.subscription : null),
      status: "active",
    });
  }

  return NextResponse.json({ status: data.status, paymentStatus: data.payment_status, membershipActive: Boolean(paid) });
}
