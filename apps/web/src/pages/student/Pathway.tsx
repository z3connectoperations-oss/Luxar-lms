import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, GraduationCap, ExternalLink, Radio, Video, BookOpen } from "lucide-react";
import { api } from "../../lib/api";
import { mediaUrl } from "../../lib/media";
import { Card, Button, Progress } from "../../components/ui";

interface Lesson { id: string; title: string; type: string; completed: boolean }
interface Module { id: string; title: string; subjectId?: string | null; lessons: Lesson[] }
interface SubjectInfo { id: string; title: string; position: number }
interface PlayerData {
  course: { id: string; title: string; thumbnailR2Key: string | null };
  subjects?: SubjectInfo[];
  curriculum: Module[];
  progressPct: number;
  totalLessons: number;
  completedLessons: number;
  enrollmentExpiry: string | null;
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

export default function Pathway() {
  const { courseId } = useParams();
  const [data, setData] = useState<PlayerData | null>(null);
  const [mockTests, setMockTests] = useState<any[]>([]);

  const load = () => {
    api<PlayerData>(`/learn/courses/${courseId}`).then(setData).catch(() => setData(null));
    api<{ mockTests: any[] }>(`/learn/courses/${courseId}/mock-tests`).then(d => setMockTests(d.mockTests)).catch(() => setMockTests([]));
  };
  useEffect(() => { load(); }, [courseId]);

  if (!data) return <div className="text-muted">Loading…</div>;

  const { course, curriculum } = data;
  const openPlayer = () => window.open(`/learn/${courseId}`, "_blank", "noopener");

  return (
    <div className="space-y-6">
      <Link to="/student/courses" className="text-sm font-semibold text-gold-600">← My courses</Link>

      {/* Header */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-24 w-40 shrink-0 overflow-hidden rounded-xl bg-canvas">
          {mediaUrl(course.thumbnailR2Key)
            ? <img src={mediaUrl(course.thumbnailR2Key)!} alt="" className="h-full w-full object-cover" />
            : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-white"><GraduationCap size={28} /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ink">{course.title}</h1>
          <p className="mt-0.5 text-sm text-muted">Track your progress across modules.</p>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={data.progressPct} className="max-w-xs" />
            <span className="shrink-0 text-sm font-semibold text-ink">{data.completedLessons} / {data.totalLessons} lessons</span>
          </div>
          {data.enrollmentExpiry && (
            <p className="mt-1 text-xs text-muted">Access until {fmt(data.enrollmentExpiry)}.</p>
          )}
        </div>
        <Button onClick={openPlayer} className="shrink-0"><ExternalLink size={16} /> Open course</Button>
      </Card>

      {/* Module tracker — grouped by subject when the course has subjects */}
      {(() => {
        const moduleCard = (m: Module, i: number) => {
          const total = m.lessons.length;
          const done = m.lessons.filter((l) => l.completed).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const complete = total > 0 && done === total;
          const mTest = mockTests.find(mt => mt.moduleId === m.id);
          return (
            <Card key={m.id} className="flex items-center gap-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${complete ? "bg-emerald-600 text-white" : "bg-brand-50 text-brand-600"}`}>
                {complete ? <CheckCircle2 size={22} /> : <BookOpen size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Module {i + 1}</span>
                  {complete && <span className="text-xs font-semibold text-emerald-700">✓ Completed</span>}
                </div>
                <div className="truncate font-semibold text-ink">{m.title}</div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={pct} className="max-w-xs" />
                  <span className="shrink-0 text-xs font-medium text-muted">{done} / {total} lessons · {pct}%</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Button variant="outline" onClick={openPlayer} className="shrink-0">
                  <ExternalLink size={16} /> {complete ? "Review" : "Continue"}
                </Button>
                {mTest && (
                  <Link to={`/student/mock-tests/${mTest.id}/intro`}>
                    <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white border-brand-600 hover:border-brand-700">
                      Take Mock Test
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          );
        };

        const subs = data.subjects ?? [];
        if (subs.length === 0) {
          return (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Modules</h2>
              {curriculum.length === 0 && <Card className="text-sm text-muted">No modules yet.</Card>}
              {curriculum.map(moduleCard)}
            </div>
          );
        }
        const groups = subs
          .map((s) => ({ id: s.id, title: s.title, modules: curriculum.filter((m) => m.subjectId === s.id) }))
          .filter((g) => g.modules.length > 0);
        const general = curriculum.filter((m) => !m.subjectId || !subs.some((s) => s.id === m.subjectId));
        if (general.length) groups.push({ id: "__general", title: "General", modules: general });
        return (
          <div className="space-y-5">
            {groups.map((g) => {
              const gl = g.modules.flatMap((m) => m.lessons);
              const gDone = gl.filter((l) => l.completed).length;
              const gPct = gl.length ? Math.round((gDone / gl.length) * 100) : 0;
              return (
                <div key={g.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{g.title}</h2>
                    <span className="text-xs font-semibold text-muted">{gPct}%</span>
                  </div>
                  {g.modules.map(moduleCard)}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Live classes */}
      <LiveClasses courseId={courseId!} />
    </div>
  );
}

interface LiveSession { id: string; title: string; status: string; scheduledStart: string | null }
function LiveClasses({ courseId }: { courseId: string }) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  useEffect(() => {
    api<{ sessions: LiveSession[] }>(`/live/course/${courseId}/sessions`).then((d) => setSessions(d.sessions)).catch(() => {});
  }, [courseId]);
  if (sessions.length === 0) return null;

  return (
    <Card className="space-y-2">
      <h2 className="flex items-center gap-2 font-semibold text-ink"><Radio size={18} className="text-brand-600" /> Live classes</h2>
      {sessions.map((s) => {
        const isLive = s.status === "live";
        return (
          <div key={s.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLive ? "border-rose-200 bg-rose-50" : "border-border"}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isLive && <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">● LIVE</span>}
                <span className="truncate font-medium text-ink">{s.title}</span>
              </div>
              {!isLive && s.scheduledStart && <div className="text-xs text-muted">{fmt(s.scheduledStart)}</div>}
            </div>
            {isLive
              ? <Button size="sm" onClick={() => window.open(`/student/courses/${courseId}/live`, "_blank", "noopener,noreferrer")}><Video size={15} /> Join now</Button>
              : <span className="shrink-0 text-xs font-medium text-amber-700">Upcoming</span>}
          </div>
        );
      })}
    </Card>
  );
}
