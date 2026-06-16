"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PO { id: string; poNumber: string; supplier: { name: string } }

const schema = z.object({
  poId: z.string().min(1, "PO required"),
  receivedAt: z.string().min(1, "Date required"),
  deliveryNote: z.string().optional(),
  invoiceNumber: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(z.object({
    itemName: z.string().min(1, "Item name required"),
    orderedQty: z.coerce.number().min(1),
    receivedQty: z.coerce.number().min(0),
    rejectedQty: z.coerce.number().min(0).optional(),
    condition: z.string().optional(),
    remarks: z.string().optional(),
  })).min(1, "At least one item required"),
});
type FormData = z.infer<typeof schema>;

export default function NewGRNPage() {
  const router = useRouter();
  const [pos, setPOs] = useState<PO[]>([]);

  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      receivedAt: new Date().toISOString().split("T")[0],
      items: [{ itemName: "", orderedQty: 1, receivedQty: 1, rejectedQty: 0, condition: "GOOD" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    fetch("/api/purchase-orders?status=APPROVED,SENT")
      .then(r => r.json())
      .then(setPOs)
      .catch(() => {});
  }, []);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/grn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Failed to create GRN"); return; }
    toast.success("GRN created successfully");
    router.push("/dashboard/grn");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <PackageCheck className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Goods Received Note</h1>
          <p className="text-sm text-gray-500">Record goods received against a Purchase Order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">GRN Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Purchase Order *</Label>
                <Select onValueChange={(v) => setValue("poId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO" />
                  </SelectTrigger>
                  <SelectContent>
                    {pos.length === 0 ? (
                      <SelectItem value="none" disabled>No approved POs available</SelectItem>
                    ) : pos.map(po => (
                      <SelectItem key={po.id} value={po.id}>{po.poNumber} — {po.supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.poId && <p className="text-xs text-red-500">{errors.poId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Received Date *</Label>
                <Input type="date" {...register("receivedAt")} />
                {errors.receivedAt && <p className="text-xs text-red-500">{errors.receivedAt.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Delivery Note #</Label>
                <Input {...register("deliveryNote")} placeholder="DN-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice #</Label>
                <Input {...register("invoiceNumber")} placeholder="INV-001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input {...register("remarks")} placeholder="Any notes about this receipt" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Items Received</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => append({ itemName: "", orderedQty: 1, receivedQty: 1, rejectedQty: 0, condition: "GOOD" })}>
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-6 gap-2 items-end border-b pb-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Item Name *</Label>
                  <Input {...register(`items.${i}.itemName`)} placeholder="Item description" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ordered Qty</Label>
                  <Input type="number" {...register(`items.${i}.orderedQty`)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Received Qty</Label>
                  <Input type="number" {...register(`items.${i}.receivedQty`)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Condition</Label>
                  <Select defaultValue="GOOD" onValueChange={(v) => setValue(`items.${i}.condition`, v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="DAMAGED">Damaged</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="button" size="sm" variant="ghost" className="text-red-500 h-9 w-9 p-0" onClick={() => fields.length > 1 && remove(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {errors.items && <p className="text-xs text-red-500">{errors.items.message}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Create GRN
          </Button>
        </div>
      </form>
    </div>
  );
}
