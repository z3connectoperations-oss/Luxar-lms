import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Button, Input, Select, Label, Chip, Textarea } from "../../components/ui";
import MockTestQuestions from "./MockTestQuestions";

export default function MockTestManage() {
  const { moduleId } = useParams();
  const [form, setForm] = useState<any>({
    title: "",
    description: "",
    durationMin: 60,
    passingMarks: 40,
    passingPct: 40,
    maxAttempts: 3,
    status: "draft",
  });
  const [testId, setTestId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);

  const load = useCallback(() => {
    api<{ module: any; mockTest: any }>(`/admin/modules/${moduleId}/mock-tests`)
      .then((d) => {
        setModule(d.module);
        if (d.mockTest) {
          setTestId(d.mockTest.id);
          setForm(d.mockTest);
        } else {
          setForm((f: any) => ({ ...f, title: `${d.module.title} - Mock Test` }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [moduleId]);

  useEffect(load, [load]);

  const saveTest = async () => {
    setSaving(true);
    try {
      const res = await api<{ id: string }>(`/admin/modules/${moduleId}/mock-tests`, {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          durationMin: Number(form.durationMin),
          passingMarks: Number(form.passingMarks),
          passingPct: Number(form.passingPct),
          maxAttempts: Number(form.maxAttempts),
          status: form.status,
        }),
      });
      setTestId(res.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Record<string, unknown>) => setForm((f: any) => ({ ...f, ...patch }));

  if (loading) return <div className="text-muted">Loading...</div>;
  if (!module) return <div className="text-red-500">Module not found</div>;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-1 flex items-center justify-between gap-3 border-b border-border bg-canvas/95 px-6 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={`/admin/courses/${module.courseId}`} className="shrink-0 text-sm font-semibold text-brand-600">
            ← Back to Course
          </Link>
          <h1 className="truncate text-lg font-bold text-ink">{module.title} Mock Test</h1>
          {testId && <Chip tone={form.status === "published" ? "emerald" : "yellow"}>{form.status}</Chip>}
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm font-medium text-emerald-700">✓ Saved</span>}
          <Button onClick={saveTest} disabled={saving}>{saving ? "Saving..." : "Save Test Settings"}</Button>
        </div>
      </div>

      <Card className="space-y-4">
        <h2 className="font-semibold text-ink">Test Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title || ""} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || "draft"} onChange={(e) => set({ status: e.target.value })}>
              <option value="draft">Draft (Hidden)</option>
              <option value="published">Published (Visible to students)</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Instructions / Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => set({ description: e.target.value })} placeholder="Any specific instructions for this mock test..." />
          </div>
          <div>
            <Label>Duration (Minutes)</Label>
            <Input type="number" value={form.durationMin || 0} onChange={(e) => set({ durationMin: e.target.value })} />
          </div>
          <div>
            <Label>Max Attempts</Label>
            <Input type="number" value={form.maxAttempts || 0} onChange={(e) => set({ maxAttempts: e.target.value })} />
          </div>
          <div>
            <Label>Passing Marks</Label>
            <Input type="number" value={form.passingMarks || 0} onChange={(e) => set({ passingMarks: e.target.value })} />
          </div>
          <div>
            <Label>Passing Percentage (%)</Label>
            <Input type="number" value={form.passingPct || 0} onChange={(e) => set({ passingPct: e.target.value })} />
          </div>
        </div>
      </Card>

      {testId ? (
        <MockTestQuestions testId={testId} />
      ) : (
        <Card className="text-center text-sm text-faint">
          Please save the test settings above to start adding questions.
        </Card>
      )}
    </div>
  );
}
