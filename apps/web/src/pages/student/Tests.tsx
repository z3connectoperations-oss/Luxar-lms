import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Chip, Button } from "../../components/ui";

interface Test { id: string; title: string; type: string; durationMin: number; totalMarks: number; attempts?: number; bestScore?: number; courseTitle?: string; isFree?: boolean }
interface Enrollment { courseId: string; title: string }

export default function Tests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [free, setFree] = useState<Test[]>([]);

  useEffect(() => {
    api<{ enrollments: Enrollment[] }>("/me/enrollments").then(async (d) => {
      const all: Test[] = [];
      for (const e of d.enrollments) {
        const r = await api<{ tests: Test[] }>(`/learn/courses/${e.courseId}/tests`).catch(() => ({ tests: [] }));
        r.tests.forEach((t) => all.push({ ...t, courseTitle: e.title }));
      }
      setTests(all);
    }).catch(() => {});
    api<{ tests: Test[] }>("/learn/free-tests").then((d) => setFree(d.tests)).catch(() => {});
  }, []);

  const Row = ({ t }: { t: Test }) => (
    <Card className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{t.title}</span>
          <Chip tone="blue">{t.type}</Chip>
          {t.isFree && <Chip tone="yellow">free</Chip>}
        </div>
        <div className="text-xs text-muted">
          {t.courseTitle ? `${t.courseTitle} · ` : ""}{t.totalMarks} marks · {t.durationMin} min
          {t.attempts ? ` · best ${t.bestScore}` : ""}
        </div>
      </div>
      <Link to={`/student/tests/${t.id}/take`}><Button>{t.attempts ? "Re-attempt" : "Start"}</Button></Link>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Tests & Mocks</h1>
      <div className="space-y-2">
        {tests.length === 0 && <Card className="text-muted">No tests in your courses yet.</Card>}
        {tests.map((t) => <Row key={t.id} t={t} />)}
      </div>
      {free.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-ink">Free mock tests</h2>
          <div className="space-y-2">{free.map((t) => <Row key={t.id} t={{ ...t, isFree: true }} />)}</div>
        </>
      )}
    </div>
  );
}
