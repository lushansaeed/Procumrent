import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const suppliers = await db.supplier.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, email, phone, address, contactPerson } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const count = await db.supplier.count();
  const code = `SUP-${String(count + 1).padStart(4, "0")}`;
  const supplier = await db.supplier.create({
    data: { code, name, email, phone, address, contactPerson, ...body },
  });

  return NextResponse.json(supplier, { status: 201 });
}
