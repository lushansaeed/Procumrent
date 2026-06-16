import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

export default async function StockPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const stocks = await db.stock.findMany({
    include: { item: { include: { category: true } }, location: true },
    orderBy: [{ location: { name: "asc" } }, { item: { name: "asc" } }],
  });

  function stockStatus(qty: number, reorder: number, min: number) {
    if (qty <= 0) return { label: "OUT", cls: "bg-red-100 text-red-700" };
    if (qty <= min) return { label: "CRITICAL", cls: "bg-red-50 text-red-600" };
    if (qty <= reorder) return { label: "LOW", cls: "bg-yellow-100 text-yellow-700" };
    return { label: "OK", cls: "bg-green-100 text-green-700" };
  }

  const lowCount = stocks.filter((s) => s.quantity <= s.item.reorderLevel).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock / Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stocks.length} stock records · {lowCount} low stock alerts</p>
        </div>
      </div>

      {lowCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-sm text-yellow-800 font-medium">
            ⚠ {lowCount} item{lowCount > 1 ? "s are" : " is"} at or below reorder level. Review and reorder as needed.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Stock Levels by Location</CardTitle></CardHeader>
        <CardContent className="p-0">
          {stocks.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <Package className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No stock records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">Item</th>
                    <th className="px-6 py-3 text-left">Category</th>
                    <th className="px-6 py-3 text-left">Location</th>
                    <th className="px-6 py-3 text-right">Qty</th>
                    <th className="px-6 py-3 text-right">Reserved</th>
                    <th className="px-6 py-3 text-right">Available</th>
                    <th className="px-6 py-3 text-right">Reorder At</th>
                    <th className="px-6 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stocks.map((s) => {
                    const st = stockStatus(s.quantity, s.item.reorderLevel, s.item.minStockLevel);
                    const available = s.quantity - s.reserved;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <p className="font-medium text-gray-900">{s.item.name}</p>
                          <p className="text-xs text-gray-400">{s.item.code}</p>
                        </td>
                        <td className="px-6 py-3 text-gray-500">{s.item.category.name}</td>
                        <td className="px-6 py-3 text-gray-600">{s.location.name}</td>
                        <td className="px-6 py-3 text-right font-medium">{s.quantity} {s.item.unit}</td>
                        <td className="px-6 py-3 text-right text-gray-400">{s.reserved}</td>
                        <td className="px-6 py-3 text-right font-semibold">{available}</td>
                        <td className="px-6 py-3 text-right text-gray-400">{s.item.reorderLevel}</td>
                        <td className="px-6 py-3"><Badge className={st.cls}>{st.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
