import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input, Select, Label, Chip } from "./ui";

interface Test { id: string; title: string; type: string; durationMin: number; totalMarks: number; isFree: boolean }
interface Question { id: string; type: string; promptMd: string; optionsJson: string | null; correctAnswer: string | null; marks: number; topic: string | null }

/** Reusable test + question manager. Uses /trainer endpoints (admin allowed). */
export default function TestsManager({ courseId }: { courseId: string }) {
  const [tests, setTests] = useState<Test[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [nt, setNt] = useState({ title: "", type: "objective", durationMin: 30, isFree: false });

  const load = () => { api<{ tests: Test[] }>(`/trainer/courses/${courseId}/tests`).then((d) => setTests(d.tests)).catch(() => {}); };
  useEffect(() => { load(); }, [courseId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nt.title.trim()) return;
    await api(`/trainer/courses/${courseId}/tests`, { method: "POST", body: JSON.stringify(nt) });
    setNt({ title: "", type: "objective", durationMin: 30, isFree: false });
    load();
  };
  const del = async (id: string) => { await api(`/trainer/tests/${id}`, { method: "DELETE" }); load(); };

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-ink">Tests & mock exams</h2>
      <form onSubmit={create} className="mb-4 grid gap-2 sm:grid-cols-4">
        <Input placeholder="Test title" value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} />
        <Select value={nt.type} onChange={(e) => setNt({ ...nt, type: e.target.value })}>
          <option value="objective">objective (MCQ)</option>
          <option value="descriptive">descriptive</option>
        </Select>
        <Input type="number" placeholder="Minutes" value={nt.durationMin} onChange={(e) => setNt({ ...nt, durationMin: +e.target.value })} />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm text-ink"><input type="checkbox" checked={nt.isFree} onChange={(e) => setNt({ ...nt, isFree: e.target.checked })} /> free mock</label>
          <Button type="submit">Add</Button>
        </div>
      </form>

      {tests.map((t) => (
        <div key={t.id} className="mb-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink">{t.title}</span>
              <Chip tone="blue">{t.type}</Chip>
              {t.isFree && <Chip tone="yellow">free</Chip>}
              <span className="text-xs text-muted">{t.totalMarks} marks · {t.durationMin}m</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(open === t.id ? null : t.id)}>{open === t.id ? "Close" : "Questions"}</Button>
              <button className="text-sm text-accent-pink" onClick={() => del(t.id)}>Delete</button>
            </div>
          </div>
          {open === t.id && <QuestionEditor testId={t.id} type={t.type} onChange={load} />}
        </div>
      ))}
      {tests.length === 0 && <p className="text-sm text-muted">No tests yet.</p>}
    </Card>
  );
}

function QuestionEditor({ testId, type, onChange }: { testId: string; type: string; onChange: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [q, setQ] = useState({ promptMd: "", options: ["", "", "", ""], correctAnswer: "", marks: 1, topic: "", solutionMd: "" });

  const load = () => { api<{ questions: Question[] }>(`/trainer/tests/${testId}`).then((d) => setQuestions(d.questions)).catch(() => {}); };
  useEffect(() => { load(); }, [testId]);

  const add = async () => {
    if (!q.promptMd.trim()) return;
    const body: any = { type: type === "descriptive" ? "descriptive" : "mcq", promptMd: q.promptMd, marks: q.marks, topic: q.topic, solutionMd: q.solutionMd };
    if (body.type === "mcq") { body.options = q.options.filter((o) => o.trim()); body.correctAnswer = q.correctAnswer; }
    await api(`/trainer/tests/${testId}/questions`, { method: "POST", body: JSON.stringify(body) });
    setQ({ promptMd: "", options: ["", "", "", ""], correctAnswer: "", marks: 1, topic: "", solutionMd: "" });
    load(); onChange();
  };
  const del = async (id: string) => { await api(`/trainer/questions/${id}`, { method: "DELETE" }); load(); onChange(); };

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-canvas p-3">
      {questions.map((qq, i) => (
        <div key={qq.id} className="flex items-start justify-between rounded bg-card p-2 text-sm">
          <span className="text-ink">{i + 1}. {qq.promptMd} <span className="text-muted">({qq.marks}m{qq.topic ? `, ${qq.topic}` : ""})</span></span>
          <button className="text-xs text-accent-pink" onClick={() => del(qq.id)}>×</button>
        </div>
      ))}
      <div className="space-y-2 border-t border-border pt-2">
        <Input placeholder="Question prompt" value={q.promptMd} onChange={(e) => setQ({ ...q, promptMd: e.target.value })} />
        {type !== "descriptive" && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o, i) => (
                <Input key={i} placeholder={`Option ${i + 1}`} value={o} onChange={(e) => { const opts = [...q.options]; opts[i] = e.target.value; setQ({ ...q, options: opts }); }} />
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label>Correct option</Label>
                <Select value={q.correctAnswer} onChange={(e) => setQ({ ...q, correctAnswer: e.target.value })}>
                  <option value="">—</option>
                  {q.options.filter((o) => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
                </Select>
              </div>
              <div><Label>Topic</Label><Input value={q.topic} onChange={(e) => setQ({ ...q, topic: e.target.value })} /></div>
              <div><Label>Marks</Label><Input type="number" value={q.marks} onChange={(e) => setQ({ ...q, marks: +e.target.value })} /></div>
            </div>
          </>
        )}
        <Button variant="outline" onClick={add}>Add question</Button>
      </div>
    </div>
  );
}
