import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Chip, Input, Label } from "../../components/ui";

interface Session { id: string; scheduledAt: string | null; status: string; feedbackMd: string | null }

export default function Interview() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [when, setWhen] = useState("");

  const load = () => { api<{ sessions: Session[] }>("/me/interview").then((d) => setSessions(d.sessions)).catch(() => {}); };
  useEffect(load, []);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/me/interview/request", { method: "POST", body: JSON.stringify({ scheduledAt: when ? new Date(when).toISOString() : null }) });
    setWhen(""); load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Interview Prep</h1>
      <Card>
        <h2 className="font-semibold text-ink">Request a mock interview</h2>
        <form onSubmit={request} className="mt-3 flex items-end gap-3">
          <div><Label>Preferred date/time (optional)</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
          <Button type="submit">Request</Button>
        </form>
      </Card>
      <div className="space-y-2">
        <h2 className="font-semibold text-ink">Your sessions</h2>
        {sessions.length === 0 ? <Card className="text-muted">No interview sessions yet.</Card> : sessions.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <span className="text-ink">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "Awaiting schedule"}</span>
              <Chip tone={s.status === "requested" ? "yellow" : "blue"}>{s.status}</Chip>
            </div>
            {s.feedbackMd && <p className="mt-2 text-sm text-muted">Feedback: {s.feedbackMd}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
