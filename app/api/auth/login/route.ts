import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const hrmsUrl = process.env.HRMS_API_URL ?? "https://hrms.vahmaafushi.com/api";

  try {
    const hrmsRes = await fetch(`${hrmsUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!hrmsRes.ok) {
      const body = await hrmsRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.message ?? body.error ?? "Invalid credentials" },
        { status: 401 }
      );
    }

    const body = await hrmsRes.json();

    // Handle various HRMS response shapes
    const user =
      body.user ?? body.data?.user ?? body.employee ?? body.data ?? null;
    const token = body.token ?? body.accessToken ?? body.data?.token ?? null;

    if (!user) {
      return NextResponse.json({ error: "Unexpected response from HRMS" }, { status: 502 });
    }

    await createSession({
      id: String(user.id ?? user._id ?? user.employeeId ?? ""),
      name: user.name ?? user.fullName ?? user.firstName ?? email.split("@")[0],
      email: user.email ?? email,
      role: user.role ?? user.position ?? "staff",
    });

    return NextResponse.json({ ok: true, token });
  } catch (err) {
    console.error("HRMS auth error:", err);
    return NextResponse.json({ error: "Could not reach HRMS server" }, { status: 502 });
  }
}
