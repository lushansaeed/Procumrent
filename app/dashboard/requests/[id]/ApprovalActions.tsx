"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";

interface ApprovalActionsProps { requestId: string; }

export function ApprovalActions({ requestId }: ApprovalActionsProps) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: "APPROVE" | "REJECT" | "RETURN") => {
    if (action !== "APPROVE" && !comments.trim()) { toast.error("Please provide comments before rejecting or returning."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, comments }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Action failed."); } else {
        toast.success(action === "APPROVE" ? "Request approved." : action === "REJECT" ? "Request rejected." : "Request returned.");
        setComments(""); router.refresh();
      }
    } catch { toast.error("Network error."); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Comments</label>
        <Textarea className="mt-1" placeholder="Add comments (required for Reject / Return)..." value={comments} onChange={e => setComments(e.target.value)} rows={3} disabled={loading} />
      </div>
      <div className="flex flex-col gap-2">
        <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction("APPROVE")} disabled={loading}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>
        <Button className="w-full" variant="outline" onClick={() => handleAction("RETURN")} disabled={loading}><RotateCcw className="mr-2 h-4 w-4" />Return for Revision</Button>
        <Button className="w-full" variant="destructive" onClick={() => handleAction("REJECT")} disabled={loading}><XCircle className="mr-2 h-4 w-4" />Reject</Button>
      </div>
    </div>
  );
}
