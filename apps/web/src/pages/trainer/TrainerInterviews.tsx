import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Input, Chip } from "../../components/ui";

interface Session { id: string; studentName: string | null; scheduledAt: string | null; status: string; feedbackMd: string | null }

export default function TrainerInterviews() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [when, setWhen] = useState<Record<string, string>>({});
  const [fb, setFb] = useState<Record<string, string>>({});

  const load = () => { api<{ sessions: Session[] }>("/trainer/interviews").then((d) => setSessions(d.sessions)).catch(() => {}); };
  useEffect(load, []);

  const update = async (id: string, patch: any) => {
    await api(`/trainer/interviews/${id}`, { method: "POST", body: JSON.stringify(patch) });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Interview Requests</h1>
      {sessions.length === 0 ? <Card className="text-muted">No interview requests.</Card> : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{s.studentName}</span>
                <Chip tone={s.status === "requested" ? "yellow" : "blue"}>{s.status}</Chip>
              </div>
              <div className="mt-1 text-xs text-muted">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "no time set"}</div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Input type="datetime-local" value={when[s.id] || ""} onChange={(e) => setWhen({ ...when, [s.id]: e.target.value })} className="max-w-56" />
                <Button variant="outline" onClick={() => update(s.id, { scheduledAt: when[s.id] ? new Date(when[s.id]).toISOString() : undefined, status: "scheduled" })}>Schedule</Button>
                <Input placeholder="Feedback" value={fb[s.id] || ""} onChange={(e) => setFb({ ...fb, [s.id]: e.target.value })} className="min-w-60 flex-1" />
                <Button onClick={() => update(s.id, { feedbackMd: fb[s.id] || "", status: "completed" })}>Save feedback</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
