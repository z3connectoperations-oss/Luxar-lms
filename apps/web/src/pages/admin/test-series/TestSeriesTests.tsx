import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Target, Plus, Edit2, Trash2, Search, FileText } from "lucide-react";
import { api } from "../../../lib/api";
import { Input, Button } from "../../../components/ui";

interface Test {
  id: string;
  testSeriesId: string;
  title: string;
  durationMin: number;
  durationMinutes?: number; // UI-only alias used by the edit form
  passingPct?: number;
  maxAttempts: number;
  status: "draft" | "published";
  position: number;
}

interface TestSeries {
  id: string;
  title: string;
}

export default function AdminTestSeriesTests() {
  const { id } = useParams();
  const [testSeries, setTestSeries] = useState<TestSeries | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editingTest, setEditingTest] = useState<Partial<Test>>({});

  const load = () => {
    setLoading(true);
    api<{ testSeries: TestSeries; tests: Test[] }>(`/admin/test-series/${id}/tests`)
      .then((d) => {
        setTestSeries(d.testSeries);
        setTests(d.tests || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const openNew = () => {
    setEditingTest({
      title: "",
      durationMinutes: 60,
      maxAttempts: 3,
      status: "draft",
      position: tests.length,
    });
    setIsEditing(true);
  };

  const openEdit = (t: Test) => {
    // API returns durationMin (not durationMinutes); map it so the field pre-fills.
    setEditingTest({ ...t, durationMinutes: (t as any).durationMin ?? t.durationMinutes });
    setIsEditing(true);
  };

  const save = async () => {
    // Send only real columns. totalMarks is derived from questions (no column),
    // and the DB field is durationMin (not durationMinutes).
    const payload = {
      title: (editingTest.title || "").trim(),
      durationMin: Number(editingTest.durationMinutes) || 60,
      maxAttempts: Number(editingTest.maxAttempts) || 3,
      status: editingTest.status || "draft",
    };
    if (!payload.title) return alert("Title is required.");
    try {
      if (editingTest.id) {
        // Tests are addressed by testId alone (no series id in the path).
        await api(`/admin/test-series/tests/${editingTest.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/admin/test-series/${id}/tests`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setIsEditing(false);
      load();
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
  };

  const del = async (testId: string) => {
    if (!confirm("Delete this test? This also removes its questions and attempts.")) return;
    try {
      await api(`/admin/test-series/tests/${testId}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      alert(e.message || "Delete failed");
    }
  };

  const filtered = tests.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/test-series"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:bg-canvas hover:text-ink"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink">Manage Tests</h1>
            <p className="text-sm text-muted">For {testSeries?.title || "Test Series"}</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} /> Add Test
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-2 shadow-card">
        <Search size={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tests..."
          className="flex-1 bg-transparent text-sm text-ink outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-card">
          <Target size={40} className="mx-auto mb-3 text-gold-300" />
          <h3 className="font-semibold text-ink">No tests found</h3>
          <p className="text-sm text-muted">Click 'Add Test' to create one.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Details</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id} className="transition hover:bg-canvas">
                  <td className="px-5 py-4 font-medium text-ink">
                    {t.title}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {t.durationMin}m · {t.maxAttempts} attempts
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        t.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/test-series/${id}/tests/${t.id}/questions`}
                        className="flex items-center gap-1.5 rounded-lg border border-gold-300 bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-700 transition hover:bg-gold-100"
                      >
                        <FileText size={14} /> Questions
                      </Link>
                      <button
                        onClick={() => openEdit(t)}
                        className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => del(t.id)}
                        className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-ink">
              {editingTest.id ? "Edit Test" : "Create Test"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted">Title</label>
                <Input
                  value={editingTest.title || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                  placeholder="Test Title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted">Duration (mins)</label>
                  <Input
                    type="number"
                    value={editingTest.durationMinutes || ""}
                    onChange={(e) => setEditingTest({ ...editingTest, durationMinutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted">Max Attempts</label>
                  <Input
                    type="number"
                    value={editingTest.maxAttempts || ""}
                    onChange={(e) => setEditingTest({ ...editingTest, maxAttempts: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted">Status</label>
                <select
                  value={editingTest.status || "draft"}
                  onChange={(e) => setEditingTest({ ...editingTest, status: e.target.value as any })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:bg-canvas"
              >
                Cancel
              </button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
