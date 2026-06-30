import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8787";
interface Product { id: string; title: string; type: string; hasDownload: boolean }

export default function Purchases() {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => { api<{ products: Product[] }>("/me/products").then((d) => setItems(d.products)).catch(() => {}); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">My Purchases</h1>
      {items.length === 0 ? (
        <Card className="text-muted">No purchases yet.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <Card key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink">{p.title}</span>
                <Chip tone={p.type === "digital" ? "blue" : "yellow"}>{p.type}</Chip>
              </div>
              {p.type === "digital" && p.hasDownload && (
                <a href={`${BASE}/me/products/${p.id}/download`} className="text-sm font-semibold text-accent-pink underline">Download</a>
              )}
              {p.type === "physical" && <span className="text-xs text-muted">Shipping to your saved address</span>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
