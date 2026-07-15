import { useEffect, useState } from "react";
import { api, authHeaders } from "../../lib/api";
import { Button, Card, Input, Textarea, Label, Chip } from "../../components/ui";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8787";
interface Category { id: string; name: string; slug: string; description: string | null; thumbnailR2Key: string | null; status: string }

export default function Categories() {
  const [items, setItems] = useState<Category[]>([]);
  const [f, setF] = useState({ name: "", description: "" });
  const [thumb, setThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => { api<{ categories: Category[] }>("/admin/categories").then((d) => setItems(d.categories)).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const uploadThumb = async (file: File) => {
    setBusy(true);
    try {
      const res = await fetch(`${BASE}/admin/upload?folder=categories&filename=${encodeURIComponent(file.name)}`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": file.type || "application/octet-stream", ...authHeaders() }, body: file,
      });
      const { key } = await res.json();
      setThumb(key);
    } finally { setBusy(false); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    await api("/admin/categories", { method: "POST", body: JSON.stringify({ name: f.name, description: f.description, thumbnailR2Key: thumb }) });
    setF({ name: "", description: "" }); setThumb(null);
    load();
  };
  const del = async (id: string) => { await api(`/admin/categories/${id}`, { method: "DELETE" }); load(); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Categories</h1>
      <Card>
        <h2 className="mb-3 font-semibold text-ink">Create category</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Artificial Intelligence" /></div>
          <div>
            <Label>Thumbnail</Label>
            <input type="file" accept="image/*" disabled={busy} onChange={(e) => e.target.files?.[0] && uploadThumb(e.target.files[0])} className="text-sm" />
            {thumb && <Chip tone="brand">image uploaded</Chip>}
          </div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="sm:col-span-2"><Button type="submit">Add category</Button></div>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((cat) => (
          <Card key={cat.id} className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-ink">{cat.name}</div>
              <div className="text-xs text-muted">/{cat.slug}</div>
            </div>
            <div className="flex items-center gap-3">
              <Chip tone={cat.status === "published" ? "brand" : "yellow"}>{cat.status}</Chip>
              <button className="text-sm text-brand-600" onClick={() => del(cat.id)}>Delete</button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card className="text-muted">No categories yet.</Card>}
      </div>
    </div>
  );
}
