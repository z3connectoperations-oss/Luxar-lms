import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Video, CalendarPlus } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Button, Input, Select, Label } from "../../components/ui";

interface Session { id: string; courseId: string; moduleId: string | null; title: string; status: string; scheduledStart: string | null; courseTitle: string; moduleTitle: string | null }
interface Course { id: string; title: string }
interface Module { id: string; title: string }
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function LiveClasses() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);

  const load = () => api<{ sessions: Session[] }>("/trainer/live").then((d) => setSessions(d.sessions)).catch(() => setSessions([]));
  useEffect(() => {
    load();
    api<{ courses: Course[] }>("/admin/courses").then((d) => setCourses(d.courses)).catch(() => {});
  }, []);

  // Load the chosen course's modules (live classes are module-scoped).
  useEffect(() => {
    setModuleId("");
    if (!courseId) { setModules([]); return; }
    api<{ modules: Module[] }>(`/admin/courses/${courseId}`).then((d) => setModules(d.modules || [])).catch(() => setModules([]));
  }, [courseId]);

  const schedule = async () => {
    if (!courseId || !moduleId || !title.trim() || !startAt) return;
    setBusy(true);
    try {
      await api(`/trainer/courses/${courseId}/live/schedule`, { method: "POST", body: JSON.stringify({ moduleId, title, scheduledStart: startAt, durationMin: duration }) });
      setTitle(""); setStartAt("");
      load();
    } finally { setBusy(false); }
  };
  const goLiveNow = async () => {
    if (!courseId || !moduleId) return;
    setBusy(true);
    try {
      await api(`/trainer/courses/${courseId}/live/start`, { method: "POST", body: JSON.stringify({ moduleId, title: title || "Live class" }) });
      load();
    } finally { setBusy(false); }
  };

  if (sessions === null) return <div className="text-muted">Loading…</div>;

  const live = sessions.filter((s) => s.status === "live");
  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) => s.status === "ended");

  const Row = ({ s, action }: { s: Session; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">{s.title}</div>
        <div className="truncate text-xs text-muted">{s.courseTitle}{s.moduleTitle ? ` · ${s.moduleTitle}` : ""} · {fmt(s.scheduledStart)}</div>
      </div>
      {action}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Live Classes</h1>
        <p className="text-sm text-muted">Schedule a class for any course, or go live now. Students get notified.</p>
      </div>

      {/* Create */}
      <Card className="space-y-3">
        <h2 className="font-semibold text-ink">Schedule a class</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Course</Label>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">— select a course —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
          <div>
            <Label>Module</Label>
            <Select value={moduleId} onChange={(e) => setModuleId(e.target.value)} disabled={!courseId}>
              <option value="">{courseId ? "— select a module —" : "select a course first"}</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Class title" />
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(+e.target.value)} className="w-28" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={schedule} disabled={busy || !courseId || !moduleId || !title.trim() || !startAt}><CalendarPlus size={16} /> Schedule</Button>
          <Button variant="outline" onClick={goLiveNow} disabled={busy || !courseId || !moduleId}><Radio size={16} /> Go live now</Button>
        </div>
        {courses.length === 0 && <p className="text-xs text-muted">Create a course first.</p>}
        {courseId && modules.length === 0 && <p className="text-xs font-semibold text-amber-700">This course has no modules yet — add one in the course's Curriculum tab.</p>}
      </Card>

      {live.length > 0 && (
        <Card className="space-y-2 border-rose-200 bg-rose-50">
          <h2 className="font-semibold text-rose-700">● Live now</h2>
          {live.map((s) => (
            <Row key={s.id} s={s} action={<Link to={`/trainer/courses/${s.courseId}/live`} target="_blank" rel="noopener noreferrer"><Button size="sm"><Video size={15} /> Open</Button></Link>} />
          ))}
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="font-semibold text-ink">Upcoming</h2>
        {upcoming.length === 0 ? <p className="text-sm text-muted">No scheduled classes.</p> : upcoming.map((s) => (
          <Row key={s.id} s={s} action={<Link to={`/trainer/courses/${s.courseId}/live`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline">Manage</Button></Link>} />
        ))}
      </Card>

      {past.length > 0 && (
        <Card className="space-y-1">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink"><Radio size={16} /> Past classes</h2>
          {past.slice(0, 15).map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1 text-sm">
              <span className="text-ink">{s.title} <span className="text-muted">· {s.courseTitle}</span></span>
              <span className="text-xs text-muted">{fmt(s.scheduledStart)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
