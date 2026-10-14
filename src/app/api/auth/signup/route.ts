import { NextResponse } from "next/server";
import { signupWithSupabase, upsertMembership } from "@/lib/rep-tools/supabase-rest";
import { repToolsBillingMode } from "@/lib/rep-tools/server-config";

export async function POST(request: Request) {
  try {
    const { fullName, email, password } = await request.json();
    if (!fullName?.trim() || !email?.trim() || !password || password.length < 8) {
      return NextResponse.json({ error: "Enter your name, email and a password of at least 8 characters." }, { status: 400 });
    }

    const data = await signupWithSupabase(email.trim().toLowerCase(), password, fullName.trim());
    const user = data.user;
    if (!user?.id) throw new Error("Account was created without a user ID.");

    await upsertMembership({
      user_id: user.id,
      email: email.trim().toLowerCase(),
      status: repToolsBillingMode() === "open" ? "active" : "pending_payment",
    });

    const response = NextResponse.json({
      userId: user.id,
      email: email.trim().toLowerCase(),
      requiresPayment: repToolsBillingMode() === "paid",
      emailConfirmationRequired: !data.access_token,
    });

    if (data.access_token) {
      response.cookies.set("rep_tools_access_token", data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: data.expires_in ?? 3600,
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create account." }, { status: 500 });
  }
}
