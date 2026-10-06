import { NextResponse } from "next/server";
import { appBaseUrl, stripeConfig } from "@/lib/rep-tools/server-config";

export async function POST(request: Request) {
  const { secretKey, priceId } = stripeConfig();
  if (!secretKey || !priceId) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
  }

  try {
    const { userId, email } = await request.json();
    if (!userId || !email) return NextResponse.json({ error: "Missing account information." }, { status: 400 });

    const body = new URLSearchParams();
    body.set("ui_mode", "embedded_page");
    body.set("mode", "subscription");
    body.set("customer_email", email);
    body.set("line_items[0][price]", priceId);
    body.set("line_items[0][quantity]", "1");
    body.set("client_reference_id", userId);
    body.set("metadata[user_id]", userId);
    body.set("metadata[email]", email);
    body.set("subscription_data[metadata][user_id]", userId);
    body.set("subscription_data[metadata][email]", email);
    body.set("return_url", `${appBaseUrl(request.url)}/signup/complete?session_id={CHECKOUT_SESSION_ID}`);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "Unable to start checkout." }, { status: 500 });
    return NextResponse.json({ clientSecret: data.client_secret });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, { status: 500 });
  }
}
