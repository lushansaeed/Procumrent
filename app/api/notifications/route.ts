import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const notifications = await db.notification.findMany({
    where: { employeeId: user.id },
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
  return NextResponse.json(notifications);
}

export async function PATCH() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.notification.updateMany({ where: { employeeId: user.id, isRead: false }, data: { isRead: true } });
  return NextResponse.json({ ok: true });
}
