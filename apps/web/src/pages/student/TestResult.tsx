import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";
import { cn } from "../../lib/cn";

interface QResult { promptMd: string; options: string[]; correctAnswer: string | null; solutionMd: string | null; topic: string | null; yourAnswer: string | null; isCorrect: boolean | null }
interface Result {
  attempt: { score: number | null; correctCount: number; incorrectCount: number; unattempted: number; rank: number | null; timeTakenSec: number; perTopic: Record<string, { correct: number; total: number }> };
  test: { title: string; type: string; totalMarks: number };
  descriptive: { contentMd: string; status: string; marks: number | null; feedbackMd: string | null } | null;
  questions: QResult[];
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: "pink" | "yellow" | "blue" }) {
  const bg = { pink: "bg-container-pink", yellow: "bg-container-yellow", blue: "bg-container-blue" }[tone];
  return <div className={`rounded-xl ${bg} p-4 text-center`}><div className="text-2xl font-extrabold text-ink">{value}</div><div className="text-xs text-muted">{label}</div></div>;
}

export default function TestResult() {
  const { attemptId } = useParams();
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => { api<Result>(`/learn/attempts/${attemptId}/result`).then(setR).catch(() => {}); }, [attemptId]);
  if (!r) return <div className="text-muted">Loading…</div>;

  if (r.test.type === "descriptive") {
    return (
      <div className="space-y-4">
        <Link to="/student/tests" className="text-sm text-accent-pink">← Tests</Link>
        <h1 className="text-2xl font-bold text-ink">{r.test.title}</h1>
        <Card>
          <Chip tone={r.descriptive?.status === "evaluated" ? "blue" : "yellow"}>{r.descriptive?.status}</Chip>
          {r.descriptive?.status === "evaluated" ? (
            <div className="mt-3">
              <div className="text-xl font-bold text-ink">{r.descriptive.marks} marks</div>
              {r.descriptive.feedbackMd && <p className="mt-2 text-sm text-muted">Feedback: {r.descriptive.feedbackMd}</p>}
            </div>
          ) : <p className="mt-3 text-sm text-muted">Your answer is awaiting evaluation by a trainer.</p>}
          <div className="mt-4 text-xs font-semibold text-muted">Your submission</div>
          <p className="whitespace-pre-wrap text-sm text-ink">{r.descriptive?.contentMd}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/student/tests" className="text-sm text-accent-pink">← Tests</Link>
      <h1 className="text-2xl font-bold text-ink">{r.test.title} — Result</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label={`/ ${r.test.totalMarks}`} value={r.attempt.score ?? 0} tone="pink" />
        <Stat label="Correct" value={r.attempt.correctCount} tone="blue" />
        <Stat label="Wrong" value={r.attempt.incorrectCount} tone="yellow" />
        <Stat label="Skipped" value={r.attempt.unattempted} tone="blue" />
        <Stat label="Rank" value={r.attempt.rank ?? "—"} tone="pink" />
      </div>

      {/* Per-topic analytics */}
      {Object.keys(r.attempt.perTopic).length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold text-ink">Topic analysis</h2>
          {Object.entries(r.attempt.perTopic).map(([topic, s]) => (
            <div key={topic} className="mb-2">
              <div className="flex justify-between text-sm text-ink"><span>{topic}</span><span className="text-muted">{s.correct}/{s.total}</span></div>
              <div className="mt-1 h-2 rounded-full bg-canvas"><div className="h-2 rounded-full bg-accent-blue" style={{ width: `${s.total ? (s.correct / s.total) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </Card>
      )}

      {/* Solutions */}
      <div className="space-y-2">
        <h2 className="font-semibold text-ink">Solutions</h2>
        {r.questions.map((q, i) => (
          <Card key={i}>
            <div className="font-medium text-ink">Q{i + 1}. {q.promptMd}</div>
            <div className="mt-2 space-y-1">
              {q.options.map((o, j) => (
                <div key={j} className={cn(
                  "rounded px-2 py-1 text-sm",
                  o === q.correctAnswer ? "bg-container-blue text-ink" : o === q.yourAnswer ? "bg-container-pink text-ink" : "text-muted"
                )}>
                  {o} {o === q.correctAnswer ? "✓ correct" : o === q.yourAnswer ? "(your answer)" : ""}
                </div>
              ))}
            </div>
            {q.solutionMd && <p className="mt-2 text-sm text-muted">Solution: {q.solutionMd}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
