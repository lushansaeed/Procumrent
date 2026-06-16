"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { statusColor } from "@/lib/utils";

interface Location { id: string; code: string; name: string; type: string; address?: string | null; isActive: boolean }

const schema = z.object({
  code: z.string().min(2, "Code required"),
  name: z.string().min(1, "Name required"),
  type: z.string().min(1),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { type: "BRANCH" },
  });

  const load = () => fetch("/api/locations").then(r => r.json()).then(setLocations).catch(() => {});
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { toast.error("Failed to add location"); return; }
      toast.success("Location added"); setOpen(false); reset(); load();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{locations.length} locations configured</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> Add Location</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Location</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Code *</Label>
                  <Input {...register("code")} placeholder="HO, MF, VH" />
                  {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select defaultValue="BRANCH" onValueChange={(v) => setValue("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HEAD_OFFICE">Head Office</SelectItem>
                      <SelectItem value="BRANCH">Branch</SelectItem>
                      <SelectItem value="STORE">Store</SelectItem>
                      <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Location Name *</Label>
                <Input {...register("name")} placeholder="e.g. Head Office Store" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input {...register("address")} placeholder="Physical address" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin" />}Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center py-12 text-gray-400">
            <MapPin className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No locations yet</p>
          </div>
        ) : locations.map((l) => (
          <Card key={l.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <Badge className={statusColor(l.isActive ? "ACTIVE" : "INACTIVE")}>{l.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="font-semibold text-gray-900">{l.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{l.code} · {l.type.replace(/_/g, " ")}</p>
              {l.address && <p className="text-xs text-gray-500 mt-1">📍 {l.address}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
