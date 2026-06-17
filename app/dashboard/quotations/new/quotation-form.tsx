"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

type RequestOption = {
  id: string;
  requestNumber: string;
  purpose: string | null;
  status: string;
  items: Array<{
    itemName: string;
    itemDescription: string | null;
    quantity: number;
    unit: string;
    estimatedPrice: number;
  }>;
};

type SupplierOption = {
  id: string;
  name: string;
  code: string;
  paymentTerms: string | null;
};

type QuotationItem = {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

function emptyItem(): QuotationItem {
  return {
    id: Math.random().toString(36).slice(2),
    itemName: "",
    quantity: "1",
    unit: "PCS",
    unitPrice: "0",
  };
}

export function QuotationForm({
  requests,
  suppliers,
  initialRequestId,
}: {
  requests: RequestOption[];
  suppliers: SupplierOption[];
  initialRequestId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState(initialRequestId ?? "");
  const [supplierId, setSupplierId] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [warranty, setWarranty] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [availability, setAvailability] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([emptyItem()]);

  const selectedRequest = requests.find((request) => request.id === requestId);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0),
    [items]
  );

  function selectRequest(id: string) {
    setRequestId(id);
    const request = requests.find((item) => item.id === id);
    if (!request?.items.length) return;
    setItems(
      request.items.map((item) => ({
        id: Math.random().toString(36).slice(2),
        itemName: item.itemName,
        quantity: String(item.quantity),
        unit: item.unit || "PCS",
        unitPrice: String(item.estimatedPrice ?? 0),
      }))
    );
  }

  function selectSupplier(id: string) {
    setSupplierId(id);
    const supplier = suppliers.find((item) => item.id === id);
    if (supplier?.paymentTerms) setPaymentTerms(supplier.paymentTerms);
  }

  function updateItem(id: string, field: keyof QuotationItem, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!requestId) return toast.error("Select a request");
    if (!supplierId) return toast.error("Select a supplier");
    const validItems = items.filter((item) => item.itemName.trim() && Number(item.quantity) > 0 && Number(item.unitPrice) >= 0);
    if (validItems.length === 0) return toast.error("Add at least one valid quotation item");

    setLoading(true);
    try {
      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          supplierId,
          totalAmount: total,
          deliveryDays: deliveryDays ? Number(deliveryDays) : undefined,
          warranty: warranty.trim(),
          paymentTerms: paymentTerms.trim(),
          availability: availability.trim(),
          remarks: remarks.trim(),
          items: validItems.map((item) => ({
            itemName: item.itemName.trim(),
            quantity: Number(item.quantity) || 0,
            unit: item.unit || "PCS",
            unitPrice: Number(item.unitPrice) || 0,
            totalPrice: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to create quotation");
      toast.success(`Quotation ${json.quotationNumber} created`);
      router.push(`/dashboard/quotations/${json.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create quotation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/quotations"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Quotation</h1>
          <p className="text-sm text-gray-500">Record a supplier quotation against an approved request</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Quotation Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Request *</Label>
              <Select value={requestId} onValueChange={selectRequest}>
                <SelectTrigger><SelectValue placeholder="Select request" /></SelectTrigger>
                <SelectContent>
                  {requests.map((request) => (
                    <SelectItem key={request.id} value={request.id}>
                      {request.requestNumber} - {request.purpose || request.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={selectSupplier}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Days</Label>
              <Input type="number" min="0" value={deliveryDays} onChange={(event) => setDeliveryDays(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Availability</Label>
              <Input value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="In stock, 2 weeks, backorder..." />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms</Label>
              <Input value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} placeholder="30 days, advance, cash..." />
            </div>
            <div className="space-y-1.5">
              <Label>Warranty</Label>
              <Input value={warranty} onChange={(event) => setWarranty(event.target.value)} placeholder="12 months, none..." />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Remarks</Label>
              <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={2} placeholder="Supplier notes, attachment references, negotiation details..." />
            </div>
          </CardContent>
        </Card>

        {selectedRequest && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <Info label="Request" value={selectedRequest.requestNumber} />
                <Info label="Status" value={selectedRequest.status.replace(/_/g, " ")} />
                <Info label="Purpose" value={selectedRequest.purpose ?? "—"} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Quoted Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((current) => [...current, emptyItem()])}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2.5 text-left font-medium text-gray-600 min-w-[220px]">Item</th>
                    <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-28">Qty</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-28">Unit</th>
                    <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-36">Unit Price</th>
                    <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-36">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-3 py-2"><Input value={item.itemName} onChange={(event) => updateItem(item.id, "itemName", event.target.value)} placeholder="Item name" className="h-8" /></td>
                      <td className="px-3 py-2"><Input type="number" min="0.01" step="any" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} className="h-8 text-right" /></td>
                      <td className="px-3 py-2"><Input value={item.unit} onChange={(event) => updateItem(item.id, "unit", event.target.value)} className="h-8" /></td>
                      <td className="px-3 py-2"><Input type="number" min="0" step="any" value={item.unitPrice} onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)} className="h-8 text-right" /></td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</td>
                      <td className="px-3 py-2">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setItems((current) => current.length === 1 ? current : current.filter((row) => row.id !== item.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="px-3 py-3 text-right font-semibold">Quotation Total</td>
                    <td className="px-3 py-3 text-right text-base font-bold">{formatCurrency(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild><Link href="/dashboard/quotations">Cancel</Link></Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Quotation
          </Button>
        </div>
      </form>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  );
}
