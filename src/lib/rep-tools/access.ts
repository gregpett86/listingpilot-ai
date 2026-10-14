import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMembership, getSupabaseUser } from "@/lib/rep-tools/supabase-rest";
import { repToolsBillingMode } from "@/lib/rep-tools/server-config";

export async function requireRepToolsAccess() {
  if (repToolsBillingMode() === "open") return;

  const store = await cookies();
  const token = store.get("rep_tools_access_token")?.value;
  if (!token) redirect("/signin");

  const user = await getSupabaseUser(token);
  if (!user?.id) redirect("/signin");

  const membership = await getMembership(user.id);
  if (!membership || membership.status !== "active") {
    redirect("/signup");
  }
}
