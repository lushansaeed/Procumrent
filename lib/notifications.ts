import { db } from "@/lib/db";

export async function createNotification(
  employeeId: string,
  type: string,
  title: string,
  message: string,
  reference?: string,
  referenceType?: string
) {
  await db.notification.create({
    data: { employeeId, type, title, message, reference, referenceType },
  });
}
