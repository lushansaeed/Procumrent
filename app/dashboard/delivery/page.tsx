"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type RequestItem = {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
};

type PurchaseRequest = {
  id: string;
  requestNumber: string;
  requesterName: string;
  status: string;
  deliveryLocationId?: string | null;
  items: RequestItem[];
};

type Location = {
  id: string;
  name: string;
};

type DeliveryConfirmation = {
  id: string;
  confirmationNumber: string;
  locationName: string;
  receivedByName: string;
  condition: string;
  confirmedAt: string;
  request: { requestNumber: string; status: string };
  items: Array<{ id: string; itemName: string; sentQty: number; receivedQty: number }>;
};

export default function DeliveryConfirmationsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [confirmations, setConfirmations] = useState<DeliveryConfirmation[]>([]);
  const [requestId, setRequestId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [remarks, setRemarks] = useState("");
  const [receivedQty, setReceivedQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === requestId),
    [requestId, requests]
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/requests?status=IN_TRANSIT&limit=100").then((res) => res.json()),
      fetch("/api/locations").then((res) => res.json()),
      fetch("/api/delivery-confirmations").then((res) => res.json()),
    ])
      .then(([requestData, locationData, confirmationData]) => {
        setRequests(requestData.requests ?? []);
        setLocations(Array.isArray(locationData) ? locationData : []);
        setConfirmations(Array.isArray(confirmationData) ? confirmationData : []);
      })
      .catch(() => toast.error("Could not load delivery data"));
  }, []);

  useEffect(() => {
    if (!selectedRequest) return;
    setLocationId(selectedRequest.deliveryLocationId ?? "");
    setReceivedQty(
      Object.fromEntries(selectedRequest.items.map((item) => [item.id, item.quantity]))
    );
  }, [selectedRequest]);

  async function submitConfirmation() {
    if (!selectedRequest || !locationId) {
      toast.error("Select a request and receiving location");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/delivery-confirmations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        locationId,
        condition,
        remarks,
        items: selectedRequest.items.map((item) => ({
          itemName: item.itemName,
          sentQty: item.quantity,
          receivedQty: receivedQty[item.id] ?? 0,
          condition,
        })),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error("Failed to confirm delivery");
      return;
    }

    const confirmation = await res.json();
    setConfirmations((current) => [confirmation, ...current]);
    setRequests((current) => current.filter((request) => request.id !== requestId));
    setRequestId("");
    setLocationId("");
    setRemarks("");
    toast.success("Delivery confirmed");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Confirmation</h1>
        <p className="text-sm text-gray-500 mt-0.5">Confirm goods received at the requested location</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-blue-600" />
              Confirm Receipt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Request</Label>
              <Select value={requestId} onValueChange={setRequestId}>
                <SelectTrigger><SelectValue placeholder="Select in-transit request" /></SelectTrigger>
                <SelectContent>
                  {requests.length === 0 ? (
                    <SelectItem value="none" disabled>No in-transit requests</SelectItem>
                  ) : requests.map((request) => (
                    <SelectItem key={request.id} value={request.id}>
                      {request.requestNumber} - {request.requesterName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Receiving Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                  <SelectItem value="MISSING">Missing</SelectItem>
                  <SelectItem value="PARTIAL">Partially received</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRequest && (
              <div className="space-y-2">
                <Label>Items</Label>
                {selectedRequest.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_96px] gap-2 items-center rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                      <p className="text-xs text-gray-500">Sent: {item.quantity} {item.unit}</p>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={receivedQty[item.id] ?? 0}
                      onChange={(event) => setReceivedQty((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Damage, missing quantity, or receiver notes" />
            </div>

            <Button className="w-full" onClick={submitConfirmation} disabled={submitting}>
              <CheckCircle2 className="w-4 h-4" />
              Confirm Delivery
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Confirmations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {confirmations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No delivery confirmations yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="px-6 py-3 text-left">Confirmation</th>
                      <th className="px-6 py-3 text-left">Request</th>
                      <th className="px-6 py-3 text-left">Location</th>
                      <th className="px-6 py-3 text-left">Receiver</th>
                      <th className="px-6 py-3 text-left">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {confirmations.map((confirmation) => (
                      <tr key={confirmation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-blue-600">{confirmation.confirmationNumber}</td>
                        <td className="px-6 py-3 text-gray-600">{confirmation.request.requestNumber}</td>
                        <td className="px-6 py-3 text-gray-600">{confirmation.locationName}</td>
                        <td className="px-6 py-3 text-gray-600">{confirmation.receivedByName}</td>
                        <td className="px-6 py-3"><Badge>{confirmation.condition}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
