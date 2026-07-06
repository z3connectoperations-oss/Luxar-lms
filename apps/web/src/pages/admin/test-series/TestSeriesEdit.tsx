import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Target } from "lucide-react";
import { api } from "../../../lib/api";
import { Input, Button, Textarea } from "../../../components/ui";

interface TestSeries {
  id: string;
  title: string;
  slug: string;
  descriptionMd: string | null;
  status: "draft" | "published";
  price: number;
  discountPrice: number | null;
  validityDays: number;
  thumbnailR2Key: string | null;
  position: number;
}

export default function AdminTestSeriesEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<Partial<TestSeries>>({
    title: "",
    slug: "",
    descriptionMd: "",
    status: "draft",
    price: 0,
    discountPrice: null,
    validityDays: 365,
    position: 0,
  });

  useEffect(() => {
    if (isNew) return;
    api<TestSeries>(`/admin/test-series/${id}`)
      .then((d) => {
        setData({
          ...d,
          price: d.price / 100, // DB stores in paise
          discountPrice: d.discountPrice ? d.discountPrice / 100 : null,
        });
      })
      .catch((e: any) => setErr(e.message || "Failed to load test series."));
  }, [id, isNew]);

  const save = async () => {
    if (!data.title || !data.slug) {
      setErr("Title and slug are required.");
      return;
    }
    setErr("");
    setBusy(true);

    const payload = {
      ...data,
      price: Math.round((Number(data.price) || 0) * 100),
      discountPrice: data.discountPrice ? Math.round(Number(data.discountPrice) * 100) : null,
      validityDays: Number(data.validityDays) || 365,
      position: Number(data.position) || 0,
    };

    try {
      if (isNew) {
        await api("/admin/test-series", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await api(`/admin/test-series/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      navigate("/admin/test-series");
    } catch (e: any) {
      setErr(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/test-series"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:bg-canvas hover:text-ink"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Target size={24} className="text-gold-500" />
            {isNew ? "Create Test Series" : "Edit Test Series"}
          </h1>
        </div>
        <Button onClick={save} disabled={busy} className="h-10 gap-2 px-5">
          <Save size={16} /> {busy ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {err}
        </div>
      )}

      <div className="space-y-6 rounded-2xl border border-border bg-white p-6 shadow-card">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Title</label>
            <Input
              value={data.title || ""}
              onChange={(e) => {
                const title = e.target.value;
                const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
                setData({ ...data, title, slug: data.slug || slug });
              }}
              placeholder="e.g. TNPSC Group 1 Mock Tests"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Slug (URL)</label>
            <Input
              value={data.slug || ""}
              onChange={(e) => setData({ ...data, slug: e.target.value })}
              placeholder="e.g. tnpsc-group-1-mock"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Description (Markdown)</label>
          <Textarea
            value={data.descriptionMd || ""}
            onChange={(e) => setData({ ...data, descriptionMd: e.target.value })}
            placeholder="Detailed description..."
            className="min-h-[150px]"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Price (₹)</label>
            <Input
              type="number"
              min="0"
              value={data.price || 0}
              onChange={(e) => setData({ ...data, price: parseFloat(e.target.value) })}
            />
            <p className="mt-1 text-[11px] text-muted">Set to 0 for free test series.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Discount Price (₹)</label>
            <Input
              type="number"
              min="0"
              value={data.discountPrice || ""}
              onChange={(e) => setData({ ...data, discountPrice: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="Leave empty for no discount"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Validity (Days)</label>
            <Input
              type="number"
              min="1"
              value={data.validityDays || 365}
              onChange={(e) => setData({ ...data, validityDays: parseInt(e.target.value, 10) })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Display Order</label>
            <Input
              type="number"
              value={data.position || 0}
              onChange={(e) => setData({ ...data, position: parseInt(e.target.value, 10) })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Status</label>
            <select
              value={data.status || "draft"}
              onChange={(e) => setData({ ...data, status: e.target.value as "draft" | "published" })}
              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:ring-1 focus:ring-gold-400"
            >
              <option value="draft">Draft (Hidden)</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
