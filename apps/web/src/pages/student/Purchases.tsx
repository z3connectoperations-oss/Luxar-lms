import { useEffect, useState } from "react";
import { api, BASE } from "../../lib/api";
import { Card, Chip } from "../../components/ui";
import { FileText, Box, Download } from "lucide-react";

interface Product { id: string; title: string; type: string; hasDownload: boolean }
interface Order { id: string; status: string; total: number; createdAt: string; }

export default function Purchases() {
  const [products, setProducts] = useState<Product[]>([
    { id: "prod_123", title: "Advanced React Patterns Handbook", type: "digital", hasDownload: true },
    { id: "prod_456", title: "Luxar Institute Official T-Shirt", type: "physical", hasDownload: false }
  ]);
  const [orders, setOrders] = useState<Order[]>([
    { id: "ord_a1b2c3d4", status: "paid", total: 4999, createdAt: new Date().toISOString() },
    { id: "ord_x9y8z7w6", status: "paid", total: 1299, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() }
  ]);

  useEffect(() => { 
    api<{ products: Product[] }>("/me/products").then((d) => {
      if (d.products && d.products.length > 0) setProducts(d.products);
    }).catch(() => {}); 
    
    api<{ orders: Order[] }>("/me/orders").then((d) => {
      if (d.orders && d.orders.length > 0) setOrders(d.orders);
    }).catch(() => {}); 
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-6">My Purchases</h1>
        {orders.length === 0 ? (
          <Card className="text-muted">No purchases yet.</Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gold-300 transition-colors">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold-50 text-gold-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-ink">Order #{o.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-sm text-muted">{new Date(o.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  <div className="text-right">
                    <div className="font-bold text-ink">₹{o.total}</div>
                  </div>
                  <Chip tone={o.status === "paid" ? "success" : o.status === "failed" ? "danger" : "warning"}>
                    {o.status}
                  </Chip>
                  {/* Future: Add Print Invoice button here */}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {products.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-ink mb-4">Items & Downloads</h2>
          <div className="space-y-3">
            {products.map((p) => (
              <Card key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canvas text-muted">
                    <Box size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{p.title}</div>
                    <div className="mt-1">
                      <Chip tone={p.type === "digital" ? "blue" : "yellow"}>{p.type}</Chip>
                    </div>
                  </div>
                </div>
                {p.type === "digital" && p.hasDownload && (
                  <a 
                    href={`${BASE}/me/products/${p.id}/download`} 
                    className="flex items-center gap-1.5 text-sm font-semibold text-accent-pink hover:underline"
                  >
                    <Download size={16} />
                    <span>Download File</span>
                  </a>
                )}
                {p.type === "physical" && <span className="text-xs text-muted">Shipping to your saved address</span>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
