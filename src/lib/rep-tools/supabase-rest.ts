import { supabaseConfig } from "./server-config";

type Json = Record<string, unknown>;

async function supabaseFetch(path: string, init: RequestInit, useServiceRole = false) {
  const { url, anonKey, serviceRoleKey } = supabaseConfig();
  const key = useServiceRole ? serviceRoleKey : anonKey;
  if (!url || !key) throw new Error("Supabase is not configured.");

  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function signupWithSupabase(email: string, password: string, fullName: string) {
  const response = await supabaseFetch("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.msg || data?.error_description || data?.message || "Unable to create account.");
  return data;
}

export async function signinWithSupabase(email: string, password: string) {
  const response = await supabaseFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.msg || data?.error_description || data?.message || "Unable to sign in.");
  return data;
}

export async function getSupabaseUser(accessToken: string) {
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

export async function upsertMembership(values: {
  user_id: string;
  email: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status: string;
}) {
  const response = await supabaseFetch("/rest/v1/rep_tools_memberships?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }),
  }, true);
  if (!response.ok) throw new Error("Unable to update membership.");
}

export async function getMembership(userId: string) {
  const response = await supabaseFetch(
    `/rest/v1/rep_tools_memberships?user_id=eq.${encodeURIComponent(userId)}&select=user_id,email,status,stripe_customer_id,stripe_subscription_id&limit=1`,
    { method: "GET" },
    true,
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as Json[];
  return rows[0] ?? null;
}
