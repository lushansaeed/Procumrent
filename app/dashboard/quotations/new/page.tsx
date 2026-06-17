export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuotationForm } from "./quotation-form";

const QUOTATION_REQUEST_STATUSES = [
  "PURCHASE_REQUIRED",
  "QUOTATION_PENDING",
  "SUPPLIER_SELECTED",
  "PO_CREATED",
  "PURCHASE_APPROVED",
];

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!["ADMIN", "PROCUREMENT", "MANAGEMENT"].includes(user.role)) redirect("/dashboard");

  const params = await searchParams;
  const [requests, suppliers] = await Promise.all([
    db.purchaseRequest.findMany({
      where: params.requestId
        ? { OR: [{ status: { in: QUOTATION_REQUEST_STATUSES } }, { id: params.requestId }] }
        : { status: { in: QUOTATION_REQUEST_STATUSES } },
      include: {
        items: {
          select: {
            itemName: true,
            itemDescription: true,
            quantity: true,
            unit: true,
            estimatedPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.supplier.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, code: true, paymentTerms: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <QuotationForm
      requests={requests.map((request) => ({
        id: request.id,
        requestNumber: request.requestNumber,
        purpose: request.purpose,
        status: request.status,
        items: request.items,
      }))}
      suppliers={suppliers}
      initialRequestId={params.requestId}
    />
  );
}
