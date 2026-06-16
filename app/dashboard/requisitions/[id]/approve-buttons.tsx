"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function ApproveRejectButtons({ requisitionId }: { requisitionId: string }) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);

  const handle = async (status: "APPROVED" | "REJECTED") => {
    setLoading(status);
    try {
      const res = await fetch(`/api/requisitions/${requisitionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comments }),
      });
      if (!res.ok) { toast.error("Action failed"); return; }
      toast.success(status === "APPROVED" ? "Requisition approved" : "Requisition rejected");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Approval Action</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Comments (optional)..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2">
          <Button onClick={() => handle("APPROVED")} disabled={!!loading} className="bg-green-600 hover:bg-green-700">
            {loading === "APPROVED" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </Button>
          <Button onClick={() => handle("REJECTED")} disabled={!!loading} variant="destructive">
            {loading === "REJECTED" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
