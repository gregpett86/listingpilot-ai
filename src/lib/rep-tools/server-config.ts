export function repToolsBillingMode() {
  return process.env.REP_TOOLS_BILLING_MODE === "paid" ? "paid" : "open";
}

export function supabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

export function stripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    priceId: process.env.STRIPE_REP_TOOLS_PRICE_ID ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  };
}

export function appBaseUrl(requestUrl?: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (requestUrl) {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}`;
  }
  return "http://localhost:3000";
}
