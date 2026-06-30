import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Input, Textarea, Chip } from "../../components/ui";

interface Submission { id: string; contentMd: string | null; studentName: string | null; testTitle: string | null }

export default function Evaluations() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const load = () => { api<{ submissions: Submission[] }>("/trainer/evaluations").then((d) => setSubs(d.submissions)).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const evaluate = async (id: string) => {
    await api(`/trainer/evaluations/${id}`, { method: "POST", body: JSON.stringify({ marks: Number(marks[id] || 0), feedbackMd: feedback[id] || "" }) });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Descriptive Evaluation</h1>
      {subs.length === 0 ? (
        <Card className="text-muted">No pending descriptive answers to evaluate.</Card>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold text-ink">{s.studentName}</span>
                <Chip tone="blue">{s.testTitle}</Chip>
              </div>
              <p className="whitespace-pre-wrap rounded-lg bg-canvas p-3 text-sm text-ink">{s.contentMd}</p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="w-28">
                  <Input type="number" placeholder="Marks" value={marks[s.id] || ""} onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })} />
                </div>
                <div className="min-w-60 flex-1">
                  <Input placeholder="Feedback" value={feedback[s.id] || ""} onChange={(e) => setFeedback({ ...feedback, [s.id]: e.target.value })} />
                </div>
                <Button onClick={() => evaluate(s.id)}>Submit evaluation</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
