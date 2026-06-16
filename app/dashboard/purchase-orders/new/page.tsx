"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const itemSchema = z.object({
  itemName: z.string().min(1, "Required"),
  description: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.coerce.number().positive(),
});

const schema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  deliveryDate: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

type FormData = z.infer<typeof schema>;

interface Supplier { id: string; name: string }

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requisitionId = searchParams.get("requisitionId");
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ itemName: "", quantity: 1, unit: "pcs", unitPrice: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const total = watchedItems?.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0) ?? 0;

  useEffect(() => {
    fetch("/api/suppliers").then(r => r.json()).then(setSuppliers).catch(() => {});
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, requisitionId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(`Purchase order ${json.poNumber} created`);
      router.push("/dashboard/purchase-orders");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/purchase-orders"><ArrowLeft className="w-4 h-4" /> Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
          {requisitionId && <p className="text-sm text-blue-600">Linked to requisition</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select onValueChange={(v) => setValue("supplierId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.supplierId && <p className="text-xs text-red-500">{errors.supplierId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Expected Delivery Date</Label>
              <Input {...register("deliveryDate")} type="date" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Terms & Conditions</Label>
              <Textarea {...register("terms")} placeholder="Payment terms, delivery conditions..." rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ itemName: "", quantity: 1, unit: "pcs", unitPrice: 0 })}>
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-4 space-y-1">
                  {i === 0 && <Label className="text-xs text-gray-500">Item Name *</Label>}
                  <Input {...register(`items.${i}.itemName`)} placeholder="Item name" />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-xs text-gray-500">Qty</Label>}
                  <Input {...register(`items.${i}.quantity`)} type="number" min="0.01" step="0.01" />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-xs text-gray-500">Unit</Label>}
                  <Input {...register(`items.${i}.unit`)} placeholder="pcs" />
                </div>
                <div className="col-span-3 space-y-1">
                  {i === 0 && <Label className="text-xs text-gray-500">Unit Price (MVR)</Label>}
                  <Input {...register(`items.${i}.unitPrice`)} type="number" min="0" step="0.01" />
                </div>
                <div className="col-span-1 flex justify-end">
                  {i === 0 && <div className="h-5" />}
                  <button type="button" onClick={() => remove(i)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-2 border-t">
              <p className="text-sm font-semibold text-gray-700">
                Total: <span className="text-blue-600">{formatCurrency(total)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/purchase-orders">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Purchase Order
          </Button>
        </div>
      </form>
    </div>
  );
}
