import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Input, Label } from "../../components/ui";

interface Exam { id: string; name: string; slug: string; description: string | null }

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [name, setName] = useState("");

  const load = () => api<{ exams: Exam[] }>("/admin/exams").then((d) => setExams(d.exams));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api("/admin/exams", { method: "POST", body: JSON.stringify({ name }) });
    setName("");
    load();
  };
  const del = async (id: string) => { await api(`/admin/exams/${id}`, { method: "DELETE" }); load(); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Exams</h1>
      <Card>
        <form onSubmit={create} className="flex items-end gap-3">
          <div className="flex-1">
            <Label>Exam name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TNPSC AE Civil" />
          </div>
          <Button type="submit">Add exam</Button>
        </form>
      </Card>
      <div className="space-y-2">
        {exams.map((x) => (
          <Card key={x.id} className="flex items-center justify-between">
            <span className="text-ink">{x.name} <span className="text-xs text-muted">/{x.slug}</span></span>
            <button className="text-accent-pink" onClick={() => del(x.id)}>Delete</button>
          </Card>
        ))}
        {exams.length === 0 && <Card className="text-muted">No exams yet.</Card>}
      </div>
    </div>
  );
}
