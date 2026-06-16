"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const statuses = ["DRAFT", "SENT", "ACKNOWLEDGED", "RECEIVED", "CANCELLED"];

export function UpdateStatusButton({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const update = async () => {
    if (status === currentStatus) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Failed to update"); return; }
      toast.success("Status updated");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
      <CardContent className="flex items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={update} disabled={loading || status === currentStatus}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Update
        </Button>
      </CardContent>
    </Card>
  );
}
