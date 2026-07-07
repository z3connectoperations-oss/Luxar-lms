import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Target, MoreVertical, Trash2 } from "lucide-react";
import { api } from "../../../lib/api";
import { formatINR } from "../../../lib/format";

interface TestSeries {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "coming_soon";
  price: number;
  discountPrice: number | null;
  validityDays: number;
}

export default function AdminTestSeriesList() {
  const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = () => {
    setLoading(true);
    api<{ testSeries: TestSeries[] }>("/admin/test-series")
      .then((d) => setTestSeries(d.testSeries || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this test series? This action cannot be undone.")) return;
    try {
      await api(`/admin/test-series/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      alert(e.message || "Failed to delete test series.");
    }
  };

  const filtered = testSeries.filter((ts) => ts.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Test Series</h1>
          <p className="text-sm text-muted">Manage standalone test series and their content.</p>
        </div>
        <Link
          to="/admin/test-series/new"
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-gold-500 hover:text-ink"
        >
          <Plus size={16} /> Create Test Series
        </Link>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-2 shadow-card">
        <Search size={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search test series..."
          className="flex-1 bg-transparent text-sm text-ink outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-card">
          <Target size={40} className="mx-auto mb-3 text-gold-300" />
          <h3 className="font-semibold text-ink">No test series found</h3>
          <p className="text-sm text-muted">Try a different search or create a new test series.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ts) => (
            <div key={ts.id} className="flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-lux">
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-bold text-ink line-clamp-2">{ts.title}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      ts.status === "published"
                        ? "bg-emerald-100 text-emerald-800"
                        : ts.status === "coming_soon"
                        ? "bg-gold-100 text-gold-700"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {ts.status === "coming_soon" ? "Coming Soon" : ts.status}
                  </span>
                </div>
                <div className="text-xs text-muted mb-4">Slug: {ts.slug}</div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div className="rounded-lg bg-canvas p-2">
                    <div className="text-xs text-muted">Price</div>
                    <div className="font-semibold text-ink">{formatINR(ts.price)}</div>
                  </div>
                  <div className="rounded-lg bg-canvas p-2">
                    <div className="text-xs text-muted">Validity</div>
                    <div className="font-semibold text-ink">{ts.validityDays} Days</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-border pt-4">
                <Link
                  to={`/admin/test-series/${ts.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-ink transition hover:bg-canvas"
                >
                  <Edit size={14} /> Edit
                </Link>
                <Link
                  to={`/admin/test-series/${ts.id}/tests`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-300 bg-gold-50 py-2 text-xs font-semibold text-gold-700 transition hover:bg-gold-100"
                >
                  <Target size={14} /> Manage Tests
                </Link>
                <button
                  onClick={() => del(ts.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
