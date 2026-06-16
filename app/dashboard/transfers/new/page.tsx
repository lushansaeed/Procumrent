"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Location { id: string; name: string; code: string }
interface Item { id: string; name: string; code: string; unit: string }

const schema = z.object({
  fromLocationId: z.string().min(1, "From location required"),
  toLocationId: z.string().min(1, "To location required"),
  remarks: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1, "Item required"),
    itemName: z.string().min(1),
    unit: z.string().min(1),
    requestedQty: z.coerce.number().min(1, "Qty must be at least 1"),
  })).min(1, "At least one item required"),
});
type FormData = z.infer<typeof schema>;

export default function NewTransferPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const { register, handleSubmit, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ itemId: "", itemName: "", unit: "", requestedQty: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(setLocations).catch(() => {});
    fetch("/api/items").then(r => r.json()).then(setItems).catch(() => {});
  }, []);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/stock/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Failed to create transfer"); return; }
    toast.success("Transfer request submitted");
    router.push("/dashboard/transfers");
  };

  const watchedItems = watch("items");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <ArrowLeftRight className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Stock Transfer</h1>
          <p className="text-sm text-gray-500">Request a transfer of stock between locations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Transfer Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>From Location *</Label>
                <Select onValueChange={(v) => setValue("fromLocationId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.fromLocationId && <p className="text-xs text-red-500">{errors.fromLocationId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>To Location *</Label>
                <Select onValueChange={(v) => setValue("toLocationId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.toLocationId && <p className="text-xs text-red-500">{errors.toLocationId.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input {...register("remarks")} placeholder="Reason for transfer" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Items to Transfer</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => append({ itemId: "", itemName: "", unit: "", requestedQty: 1 })}>
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-5 gap-2 items-end border-b pb-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Item *</Label>
                  <Select onValueChange={(v) => {
                    const item = items.find(it => it.id === v);
                    if (item) {
                      setValue(`items.${i}.itemId`, item.id);
                      setValue(`items.${i}.itemName`, item.name);
                      setValue(`items.${i}.unit`, item.unit);
                    }
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>
                      {items.map(it => <SelectItem key={it.id} value={it.id}>{it.name} ({it.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.items?.[i]?.itemId && <p className="text-xs text-red-500">{errors.items[i]?.itemId?.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input readOnly value={watchedItems?.[i]?.unit ?? ""} className="bg-gray-50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty *</Label>
                  <Input type="number" {...register(`items.${i}.requestedQty`)} />
                  {errors.items?.[i]?.requestedQty && <p className="text-xs text-red-500">{errors.items[i]?.requestedQty?.message}</p>}
                </div>
                <div className="flex items-end">
                  <Button type="button" size="sm" variant="ghost" className="text-red-500 h-9 w-9 p-0" onClick={() => fields.length > 1 && remove(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {errors.items?.root && <p className="text-xs text-red-500">{errors.items.root.message}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit Transfer
          </Button>
        </div>
      </form>
    </div>
  );
}
