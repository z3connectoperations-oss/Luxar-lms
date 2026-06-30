import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Button, Card, Textarea } from "../../components/ui";
import { cn } from "../../lib/cn";

interface Question { id: string; type: string; promptMd: string; options: string[]; marks: number; topic: string | null }
interface TakeData { test: { id: string; title: string; type: string; durationMin: number; totalMarks: number }; questions: Question[] }

export default function TestPlayer() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<TakeData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [descAnswer, setDescAnswer] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    api<TakeData>(`/learn/tests/${testId}/take`).then((d) => {
      setData(d);
      setRemaining(d.test.durationMin * 60);
    }).catch(() => {});
  }, [testId]);

  const submit = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const timeTakenSec = Math.round((Date.now() - startedAt.current) / 1000);
      const body = data.test.type === "descriptive"
        ? { contentMd: descAnswer, timeTakenSec }
        : { answers, timeTakenSec };
      const res = await api<{ attemptId: string }>(`/learn/tests/${testId}/submit`, { method: "POST", body: JSON.stringify(body) });
      navigate(`/student/tests/result/${res.attemptId}`);
    } finally {
      setBusy(false);
    }
  };

  // Countdown timer (auto-submit at 0).
  useEffect(() => {
    if (!data || data.test.type === "descriptive") return;
    if (remaining <= 0) { submit(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, data]);

  const mmss = useMemo(() => `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`, [remaining]);

  if (!data) return <div className="text-muted">Loading…</div>;

  if (data.test.type === "descriptive") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-xl font-bold text-ink">{data.test.title}</h1>
        {data.questions.map((q, i) => (
          <Card key={q.id}><div className="font-medium text-ink">Q{i + 1}. {q.promptMd}</div></Card>
        ))}
        <Card>
          <Textarea className="min-h-60" placeholder="Write your answer here…" value={descAnswer} onChange={(e) => setDescAnswer(e.target.value)} />
        </Card>
        <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit for evaluation"}</Button>
      </div>
    );
  }

  const q = data.questions[current];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">{data.test.title}</h1>
        <div className="rounded-lg bg-container-yellow px-3 py-1.5 font-mono font-bold text-ink">⏱ {mmss}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <Card>
          {q ? (
            <>
              <div className="mb-1 text-xs text-muted">Question {current + 1} of {data.questions.length} · {q.marks} mark(s)</div>
              <div className="mb-4 font-medium text-ink">{q.promptMd}</div>
              <div className="space-y-2">
                {q.options.map((o, i) => (
                  <label key={i} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm", answers[q.id] === o ? "border-accent-pink bg-container-pink" : "border-border")}>
                    <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => setAnswers({ ...answers, [q.id]: o })} />
                    {o}
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-between">
                <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Previous</Button>
                {current < data.questions.length - 1
                  ? <Button onClick={() => setCurrent((c) => c + 1)}>Next</Button>
                  : <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit test"}</Button>}
              </div>
            </>
          ) : <p className="text-muted">No questions.</p>}
        </Card>

        {/* Palette */}
        <Card className="h-fit">
          <div className="mb-2 text-xs font-semibold text-muted">Question palette</div>
          <div className="grid grid-cols-5 gap-2">
            {data.questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-9 w-9 rounded-lg text-sm font-semibold",
                  i === current ? "ring-2 ring-accent-pink" : "",
                  answers[qq.id] ? "bg-accent-blue text-ink" : "bg-canvas text-muted"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button className="mt-4 w-full" onClick={submit} disabled={busy}>Submit</Button>
        </Card>
      </div>
    </div>
  );
}
