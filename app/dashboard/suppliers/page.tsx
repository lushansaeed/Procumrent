"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Building2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { statusColor } from "@/lib/utils";

interface Supplier {
  id: string; name: string; email?: string; phone?: string;
  contactPerson?: string; address?: string; status: string;
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = () => fetch("/api/suppliers").then(r => r.json()).then(setSuppliers).catch(() => {});

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { toast.error("Failed to add supplier"); return; }
      toast.success("Supplier added");
      setOpen(false);
      reset();
      load();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">{suppliers.length} suppliers registered</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" /> Add Supplier</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input {...register("name")} placeholder="Supplier name" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input {...register("email")} type="email" placeholder="email@supplier.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input {...register("phone")} placeholder="+960 xxx xxxx" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input {...register("contactPerson")} placeholder="Primary contact name" />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input {...register("address")} placeholder="Business address" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Supplier
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400">
            <Building2 className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No suppliers yet</p>
          </div>
        ) : (
          suppliers.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <Badge className={statusColor(s.status)}>{s.status}</Badge>
                </div>
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                {s.contactPerson && <p className="text-sm text-gray-500 mt-0.5">{s.contactPerson}</p>}
                <div className="mt-3 space-y-1 text-xs text-gray-400">
                  {s.email && <p>✉ {s.email}</p>}
                  {s.phone && <p>📞 {s.phone}</p>}
                  {s.address && <p>📍 {s.address}</p>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
