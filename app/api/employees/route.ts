import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const employees = await db.employee.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(employees);
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
