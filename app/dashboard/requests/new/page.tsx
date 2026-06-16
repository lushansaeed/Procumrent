"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

type SessionUser = { id: string; name: string; email: string; role: string; department?: string; section?: string; designation?: string; workLocation?: string; reportingManagerId?: string; reportingManagerName?: string; };
type Location = { id: string; name: string; code?: string; };
type RequestItem = { id: string; itemName: string; description: string; quantity: string; unit: string; estimatedPrice: string; };

const REQUEST_TYPES = [{value:"GOODS",label:"Goods"},{value:"SERVICES",label:"Services"},{value:"WORKS",label:"Works"},{value:"IT_EQUIPMENT",label:"IT Equipment"},{value:"OFFICE_SUPPLIES",label:"Office Supplies"},{value:"MAINTENANCE",label:"Maintenance"},{value:"OTHER",label:"Other"}];
const PRIORITIES = [{value:"LOW",label:"Low"},{value:"MEDIUM",label:"Medium"},{value:"HIGH",label:"High"},{value:"URGENT",label:"Urgent"}];
const UNITS = ["PCS","KG","LTR","MTR","BOX","CARTON","PACK","ROLL","SET","PAIR","DOZEN","UNIT"];

function generateId() { return Math.random().toString(36).substr(2, 9); }
function emptyItem(): RequestItem { return { id: generateId(), itemName: "", description: "", quantity: "1", unit: "PCS", estimatedPrice: "0" }; }

export default function NewRequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [requestType, setRequestType] = useState("GOODS");
  const [priority, setPriority] = useState("MEDIUM");
  const [deliveryLocationId, setDeliveryLocationId] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<RequestItem[]>([emptyItem()]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => setUser(data.user ?? null))
      .catch(() => {})
      .finally(() => setLoadingUser(false));
    fetch("/api/locations").then(r => r.json()).then(data => { if (Array.isArray(data)) setLocations(data); else if (Array.isArray(data?.locations)) setLocations(data.locations); }).catch(() => {});
  }, []);

  const updateItem = (id: string, field: keyof RequestItem, value: string) => setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (id: string) => { if (items.length === 1) { toast.error("At least one item is required"); return; } setItems(prev => prev.filter(item => item.id !== id)); };
  const getRowTotal = (item: RequestItem) => (parseFloat(item.quantity) || 0) * (parseFloat(item.estimatedPrice) || 0);
  const grandTotal = items.reduce((sum, item) => sum + getRowTotal(item), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) { toast.error("Purpose is required"); return; }
    if (!deliveryLocationId) { toast.error("Please select a delivery location"); return; }
    if (!requiredDate) { toast.error("Required date is required"); return; }
    const invalidItem = items.find(item => !item.itemName.trim() || !item.quantity || parseFloat(item.quantity) <= 0);
    if (invalidItem) { toast.error("Please fill in all item names and valid quantities"); return; }
    setLoading(true);
    try {
      const payload = { requestType, priority, deliveryLocationId, requiredDate, purpose: purpose.trim(), remarks: remarks.trim(), estimatedTotal: grandTotal, items: items.map(item => ({ itemName: item.itemName.trim(), description: item.description.trim(), quantity: parseFloat(item.quantity) || 0, unit: item.unit, estimatedPrice: parseFloat(item.estimatedPrice) || 0, estimatedTotal: getRowTotal(item) })) };
      const res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message ?? "Failed to submit request"); }
      toast.success("Purchase request submitted successfully!");
      router.push("/dashboard/requests");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/requests"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft size={16} />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Request</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill in the details below to submit a procurement request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Requester Information</CardTitle></CardHeader>
          <CardContent>
            {loadingUser ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[{label:"Employee Name",value:user?.name},{label:"Department",value:user?.department},{label:"Section",value:user?.section},{label:"Work Location",value:user?.workLocation},{label:"Reporting Manager",value:user?.reportingManagerName},{label:"Designation",value:user?.designation}].map(f => (
                  <div key={f.label}><Label className="text-xs text-gray-500 font-medium">{f.label}</Label><div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">{f.value ?? "—"}</div></div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Request Type <span className="text-red-500">*</span></Label>
                <Select value={requestType} onValueChange={setRequestType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority <span className="text-red-500">*</span></Label>
                <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Location <span className="text-red-500">*</span></Label>
                <Select value={deliveryLocationId} onValueChange={setDeliveryLocationId}><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger><SelectContent>{locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}{loc.code ? ` (${loc.code})` : ""}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label>Required By Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Purpose / Justification <span className="text-red-500">*</span></Label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Describe the business need..." value={purpose} onChange={e => setPurpose(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Remarks / Additional Notes</Label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Any additional information..." value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Request Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2"><Plus size={14} />Add Row</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-6">#</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[180px]">Item Name *</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[160px]">Description</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-24">Qty *</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-28">Unit</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-32">Unit Price</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-32">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2"><Input value={item.itemName} onChange={e => updateItem(item.id, "itemName", e.target.value)} placeholder="Item name" className="h-8 text-sm" /></td>
                      <td className="px-3 py-2"><Input value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)} placeholder="Optional" className="h-8 text-sm" /></td>
                      <td className="px-3 py-2"><Input type="number" min="0.01" step="any" value={item.quantity} onChange={e => updateItem(item.id, "quantity", e.target.value)} className="h-8 text-sm" /></td>
                      <td className="px-3 py-2"><Select value={item.unit} onValueChange={val => updateItem(item.id, "unit", val)}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></td>
                      <td className="px-3 py-2"><Input type="number" min="0" step="any" value={item.estimatedPrice} onChange={e => updateItem(item.id, "estimatedPrice", e.target.value)} className="h-8 text-sm" /></td>
                      <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap">{formatCurrency(getRowTotal(item))}</td>
                      <td className="px-3 py-2"><Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="h-7 w-7 p-0 text-red-400 hover:text-red-600"><Trash2 size={14} /></Button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50"><td colSpan={6} className="px-3 py-3 text-right font-semibold text-gray-700">Estimated Grand Total:</td><td className="px-3 py-3 font-bold text-gray-900 text-base whitespace-nowrap">{formatCurrency(grandTotal)}</td><td></td></tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/dashboard/requests"><Button type="button" variant="outline" disabled={loading}>Cancel</Button></Link>
          <Button type="submit" disabled={loading} className="min-w-[140px]">{loading ? "Submitting..." : "Submit Request"}</Button>
        </div>
      </form>
    </div>
  );
}
