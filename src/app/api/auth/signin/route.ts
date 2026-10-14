import { NextResponse } from "next/server";
import { signinWithSupabase } from "@/lib/rep-tools/supabase-rest";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const data = await signinWithSupabase(String(email || "").trim().toLowerCase(), String(password || ""));
    const response = NextResponse.json({ ok: true });
    response.cookies.set("rep_tools_access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: data.expires_in ?? 3600,
    });
    if (data.refresh_token) {
      response.cookies.set("rep_tools_refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign in." }, { status: 401 });
  }
}
