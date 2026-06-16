"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  quantity: z.coerce.number().positive("Must be > 0"),
  unit: z.string().min(1, "Required"),
  estimatedPrice: z.coerce.number().positive("Must be > 0"),
});

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  department: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

type FormData = z.infer<typeof schema>;

export default function NewRequisitionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: "MEDIUM",
      items: [{ itemName: "", quantity: 1, unit: "pcs", estimatedPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  const total = watchedItems?.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.estimatedPrice) || 0;
    return sum + q * p;
  }, 0) ?? 0;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create"); return; }
      toast.success(`Requisition ${json.prNumber} created`);
      router.push("/dashboard/requisitions");
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
          <Link href="/dashboard/requisitions"><ArrowLeft className="w-4 h-4" /> Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Requisition</h1>
          <p className="text-sm text-gray-500">Submit a request for items or services</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Title *</Label>
              <Input {...register("title")} placeholder="e.g. Office Supplies Q4" />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input {...register("department")} placeholder="e.g. Finance" />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue="MEDIUM" onValueChange={(v) => setValue("priority", v as FormData["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register("description")} placeholder="Additional notes..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ itemName: "", quantity: 1, unit: "pcs", estimatedPrice: 0 })}>
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-4 space-y-1">
                  {i === 0 && <Label className="text-xs text-gray-500">Item Name *</Label>}
                  <Input {...register(`items.${i}.itemName`)} placeholder="Item name" />
                  {errors.items?.[i]?.itemName && <p className="text-xs text-red-500">{errors.items[i]?.itemName?.message}</p>}
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-xs text-gray-500">Qty *</Label>}
                  <Input {...register(`items.${i}.quantity`)} type="number" min="0.01" step="0.01" placeholder="1" />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-xs text-gray-500">Unit</Label>}
                  <Input {...register(`items.${i}.unit`)} placeholder="pcs" />
                </div>
                <div className="col-span-3 space-y-1">
                  {i === 0 && <Label className="text-xs text-gray-500">Unit Price (MVR) *</Label>}
                  <Input {...register(`items.${i}.estimatedPrice`)} type="number" min="0" step="0.01" placeholder="0.00" />
                </div>
                <div className="col-span-1 flex justify-end">
                  {i === 0 && <div className="h-5" />}
                  <button type="button" onClick={() => remove(i)} className="mt-0 p-2 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {errors.items && typeof errors.items.message === "string" && (
              <p className="text-xs text-red-500">{errors.items.message}</p>
            )}
            <div className="flex justify-end pt-2 border-t">
              <p className="text-sm font-semibold text-gray-700">
                Total: <span className="text-blue-600">{formatCurrency(total)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/requisitions">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Requisition
          </Button>
        </div>
      </form>
    </div>
  );
}
