import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Radio, CalendarPlus, Play, X, Video } from "lucide-react";
import { api } from "../../lib/api";
import { Button, Card, Input, Select, Label } from "../../components/ui";
import LiveRoom from "../../components/LiveRoom";

interface Session { id: string; moduleId: string | null; title: string; status: string; scheduledStart: string | null }
interface Module { id: string; title: string }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function TrainerLive() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  // Opening with ?host=<sessionId> (e.g. from "Go live now" in the curriculum) jumps straight into hosting.
  const [hostId, setHostId] = useState<string | null>(searchParams.get("host"));
  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);

  const load = () => api<{ sessions: Session[] }>(`/trainer/courses/${id}/live`).then((d) => setSessions(d.sessions)).catch(() => setSessions([]));
  useEffect(() => {
    load();
    api<{ modules: Module[] }>(`/trainer/courses/${id}`).then((d) => setModules(d.modules || [])).catch(() => setModules([]));
  }, [id]);

  const moduleName = (mid: string | null) => modules.find((m) => m.id === mid)?.title ?? "—";

  const schedule = async () => {
    if (!title.trim() || !startAt || !moduleId) return;
    setBusy(true);
    try {
      await api(`/trainer/courses/${id}/live/schedule`, { method: "POST", body: JSON.stringify({ moduleId, title, scheduledStart: startAt, durationMin: duration }) });
      setTitle(""); setStartAt("");
      load();
    } finally { setBusy(false); }
  };
  const goLiveNow = async () => {
    if (!moduleId || !title.trim()) return;
    setBusy(true);
    try {
      const s = await api<{ id: string }>(`/trainer/courses/${id}/live/start`, { method: "POST", body: JSON.stringify({ moduleId, title: title.trim() }) });
      setHostId(s.id); load();
    } finally { setBusy(false); }
  };
  const startScheduled = async (s: Session) => { await api(`/trainer/live/${s.id}/start`, { method: "POST" }); setHostId(s.id); load(); };
  const end = async (s: Session) => { await api(`/trainer/live/${s.id}/end`, { method: "POST" }); if (hostId === s.id) setHostId(null); load(); };
  const cancel = async (s: Session) => { await api(`/trainer/live/${s.id}`, { method: "DELETE" }); load(); };

  if (sessions === null) {
    return (
      <div className="min-h-screen bg-canvas grid place-items-center text-muted text-sm font-medium">
        Loading…
      </div>
    );
  }

  // Hosting view
  if (hostId) {
    const s = sessions.find((x) => x.id === hostId);
    return (
      <div className="min-h-screen bg-canvas p-6 flex flex-col justify-between">
        <div className="mx-auto w-full max-w-7xl flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between shrink-0 border-b border-border pb-3">
            <h1 className="text-base font-extrabold text-ink tracking-tight">Hosting: {s?.title || "Live class"}</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setHostId(null)}>Leave (keep running)</Button>
              {s && <Button variant="outline" size="sm" onClick={() => end(s)}>End class</Button>}
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <LiveRoom sessionId={hostId} onLeave={() => setHostId(null)} />
          </div>
        </div>
      </div>
    );
  }

  const live = sessions.filter((s) => s.status === "live");
  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) => s.status === "ended");

  return (
    <div className="min-h-screen bg-canvas p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <Link to={`/trainer/courses/${id}`} className="text-sm font-bold text-brand-600 hover:text-brand-800 transition">
            ← Back to course
          </Link>
          <div className="text-xs text-muted font-bold">Trainer Dashboard Portal</div>
        </div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Live classes</h1>

        {/* Schedule / go live */}
        <Card className="space-y-3">
          <h2 className="font-semibold text-ink">Schedule a class</h2>
          <div>
            <Label>Module</Label>
            <Select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
              <option value="">— select a module —</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Class title" />
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(+e.target.value)} className="w-28" placeholder="Minutes" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={schedule} disabled={busy || !moduleId || !title.trim() || !startAt}><CalendarPlus size={16} /> Schedule</Button>
            <Button variant="outline" onClick={goLiveNow} disabled={busy || !moduleId || !title.trim()}><Radio size={16} /> Go live now</Button>
          </div>
          <p className="text-xs text-muted">Each live class belongs to a module. Enrolled students get a notification when you schedule and when you go live.</p>
          {modules.length === 0 && <p className="text-xs font-semibold text-amber-700">Add a module to this course first (Curriculum tab).</p>}
        </Card>

        {/* Live now */}
        {live.length > 0 && (
          <Card className="space-y-2 border-rose-200 bg-rose-50">
            <h2 className="font-semibold text-rose-700">● Live now</h2>
            {live.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-card px-3 py-2">
                <div>
                  <span className="font-medium text-ink">{s.title}</span>
                  <div className="text-xs text-muted">{moduleName(s.moduleId)}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setHostId(s.id)}><Video size={15} /> Join as host</Button>
                  <Button size="sm" variant="outline" onClick={() => end(s)}>End</Button>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Upcoming */}
        <Card className="space-y-2">
          <h2 className="font-semibold text-ink">Upcoming</h2>
          {upcoming.length === 0 ? <p className="text-sm text-muted">No scheduled classes.</p> : upcoming.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <div className="font-medium text-ink">{s.title}</div>
                <div className="text-xs text-muted">{moduleName(s.moduleId)} · {fmt(s.scheduledStart)}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => startScheduled(s)}><Play size={15} /> Start</Button>
                <button onClick={() => cancel(s)} className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 hover:underline"><X size={15} /> Cancel</button>
              </div>
            </div>
          ))}
        </Card>

        {/* Past */}
        {past.length > 0 && (
          <Card className="space-y-1">
            <h2 className="mb-1 font-semibold text-ink">Past classes</h2>
            {past.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1 text-sm">
                <span className="text-ink">{s.title}</span>
                <span className="text-xs text-muted">{fmt(s.scheduledStart)}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
