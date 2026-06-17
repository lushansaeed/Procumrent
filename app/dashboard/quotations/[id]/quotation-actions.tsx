"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, FilePlus2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type QuotationItem = {
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export function QuotationActions({
  quotationId,
  requestId,
  supplierId,
  items,
  isSelected,
  hasPurchaseOrder,
}: {
  quotationId: string;
  requestId: string;
  supplierId: string;
  items: QuotationItem[];
  isSelected: boolean;
  hasPurchaseOrder: boolean;
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [creatingPo, setCreatingPo] = useState(false);

  async function selectQuotation() {
    const reason = window.prompt("Selection reason", "Best value quotation");
    if (reason === null) return;
    setSelecting(true);
    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSelected: true, selectionReason: reason }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Failed to select quotation");
      toast.success("Quotation selected");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to select quotation");
    } finally {
      setSelecting(false);
    }
  }

  async function createPurchaseOrder() {
    if (!window.confirm("Create a purchase order from this selected quotation?")) return;
    setCreatingPo(true);
    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          quotationId,
          supplierId,
          items: items.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
          })),
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Failed to create purchase order");
      toast.success(`Purchase order ${json.poNumber} created`);
      router.push(`/dashboard/purchase-orders/${json.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create purchase order");
    } finally {
      setCreatingPo(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!isSelected && (
        <Button type="button" onClick={selectQuotation} disabled={selecting}>
          {selecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Select Quotation
        </Button>
      )}
      {isSelected && !hasPurchaseOrder && (
        <Button type="button" onClick={createPurchaseOrder} disabled={creatingPo}>
          {creatingPo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
          Create Purchase Order
        </Button>
      )}
    </div>
  );
}
