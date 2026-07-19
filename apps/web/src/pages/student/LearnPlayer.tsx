import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Lock, PlayCircle, FileText, X, ChevronRight, Download, Trash2, Menu } from "lucide-react";
import { api, lessonFileUrl } from "../../lib/api";
import { cn } from "../../lib/cn";
import { isSaved, saveLesson, getOfflineUrl, removeLesson } from "../../lib/offline";

const COMPLETE_RATIO = 0.9; // 90% of the video must actually be watched

interface Lesson {
  id: string; title: string; type: string; downloadable: boolean; durationSec: number;
  hasFile: boolean; externalVideoUrl: string | null; completed: boolean; unlocked: boolean;
  lastPositionSec: number; watchedSec: number;
}
interface Module { id: string; title: string; subjectId?: string | null; lessons: Lesson[] }
interface SubjectInfo { id: string; title: string; position: number }
interface PlayerData {
  course: { id: string; title: string };
  subjects?: SubjectInfo[];
  curriculum: Module[];
  progressPct: number; totalLessons: number; completedLessons: number;
}

interface LiveSession { id: string; moduleId: string | null; title: string; status: string; scheduledStart: string | null }
const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

export default function LearnPlayer() {
  const { courseId } = useParams();
  const [data, setData] = useState<PlayerData | null>(null);
  const [activeId, setActiveId] = useState("");
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  // Mobile: the Table of Content lives in a slide-out drawer.
  const [tocOpen, setTocOpen] = useState(false);

  const load = useCallback(async () => {
    const d = await api<PlayerData>(`/learn/courses/${courseId}`);
    setData(d);
    setActiveId((cur) => {
      const flat = d.curriculum.flatMap((m) => m.lessons);
      if (cur && flat.some((l) => l.id === cur)) return cur;
      // default to first unlocked & incomplete, else first unlocked, else first
      return (flat.find((l) => l.unlocked && !l.completed) || flat.find((l) => l.unlocked) || flat[0])?.id || "";
    });
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  // Live/scheduled classes (module-scoped). Polled so "LIVE NOW" appears when a trainer goes live.
  useEffect(() => {
    const fetchLive = () => api<{ sessions: LiveSession[] }>(`/live/course/${courseId}/sessions`).then((d) => setLiveSessions(d.sessions)).catch(() => {});
    fetchLive();
    const t = window.setInterval(fetchLive, 30000);
    return () => window.clearInterval(t);
  }, [courseId]);
  const liveByModule = (mid: string) => liveSessions.filter((s) => s.moduleId === mid);

  const flat = useMemo(() => data?.curriculum.flatMap((m) => m.lessons) ?? [], [data]);
  const active = useMemo(() => flat.find((l) => l.id === activeId), [flat, activeId]);

  // Group modules under subjects (Course → Subject → Module → Lesson). Courses
  // without subjects keep the legacy flat module list. Ungrouped modules land in
  // a trailing "General" section so nothing disappears.
  const groups = useMemo(() => {
    const subs = data?.subjects ?? [];
    if (!data || subs.length === 0) return null;
    const grouped = subs
      .map((s) => ({ id: s.id, title: s.title, modules: data.curriculum.filter((m) => m.subjectId === s.id) }))
      .filter((g) => g.modules.length > 0);
    const general = data.curriculum.filter((m) => !m.subjectId || !subs.some((s) => s.id === m.subjectId));
    if (general.length) grouped.push({ id: "__general", title: "General", modules: general });
    return grouped;
  }, [data]);

  // One subject expands at a time; remember the learner's last section.
  const subjectStoreKey = `luxar_lp_subject_${courseId}`;
  const [openSubject, setOpenSubject] = useState<string | null>(() => { try { return localStorage.getItem(subjectStoreKey); } catch { return null; } });
  const toggleSubject = (sid: string) => {
    const next = openSubject === sid ? null : sid;
    setOpenSubject(next);
    try { next ? localStorage.setItem(subjectStoreKey, next) : localStorage.removeItem(subjectStoreKey); } catch { /* ignore */ }
  };
  // Default to the subject holding the active lesson (or the first section).
  useEffect(() => {
    if (!groups) return;
    if (openSubject && groups.some((g) => g.id === openSubject)) return;
    const holder = groups.find((g) => g.modules.some((m) => m.lessons.some((l) => l.id === activeId))) || groups[0];
    if (holder) setOpenSubject(holder.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, activeId]);

  const activeModule = useMemo(() => data?.curriculum.find((m) => m.lessons.some((l) => l.id === activeId)) ?? null, [data, activeId]);
  const activeSubject = useMemo(() => {
    if (!activeModule?.subjectId) return null;
    return (data?.subjects ?? []).find((s) => s.id === activeModule.subjectId) ?? null;
  }, [data, activeModule]);

  // Content protection: turn the screen solid black during capture attempts
  // (Print-Screen key, window losing focus / tab hidden) and blank the page on print.
  // Browsers can't truly block OS screenshots/recording, so this is best-effort.
  const [blackout, setBlackout] = useState(false);
  useEffect(() => {
    let t: number | undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        navigator.clipboard?.writeText("").catch(() => {});
        setBlackout(true);
        window.clearTimeout(t);
        t = window.setTimeout(() => setBlackout(false), 1000);
      }
    };
    const onBlur = () => setBlackout(true);
    const onFocus = () => setBlackout(false);
    const onVis = () => setBlackout(document.visibilityState !== "visible");
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!data) return <div className="grid h-screen place-items-center bg-canvas text-muted">Loading…</div>;

  return (
    <div className="flex h-screen select-none flex-col bg-canvas" onContextMenu={(e) => e.preventDefault()}>
      {/* Blank the page entirely when printing / print-to-PDF. */}
      <style>{`@media print { body { display: none !important; } }`}</style>
      {/* Solid black capture-shield (no text). */}
      {blackout && <div className="fixed inset-0 z-[60] bg-black" />}
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-2.5 text-ink sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Mobile: open the Table of Content drawer */}
          <button onClick={() => setTocOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink hover:bg-canvas md:hidden" title="Course content" aria-label="Open course content">
            <Menu size={20} />
          </button>
          <img src="/luxaar.png" alt="" className="hidden h-7 w-7 rounded-md object-cover ring-1 ring-ink/10 sm:block" />
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold">Luxaar Institute</div>
            <div className="truncate text-[11px] text-muted">{data.course.title}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <span className="whitespace-nowrap text-[11px] text-muted sm:text-xs">{data.completedLessons}/{data.totalLessons} · {data.progressPct}%</span>
          <button onClick={() => window.close()} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-canvas hover:text-ink" title="Close">
            <X size={18} />
          </button>
        </div>
      </header>

      {(() => {
        const renderModule = (m: Module) => (
          <div key={m.id} className="py-1">
            <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">{m.title}</div>
            {liveByModule(m.id).map((s) => (
              s.status === "live" ? (
                <a
                  key={s.id}
                  href={`/student/courses/${courseId}/live`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mx-2 my-1 flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
                >
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-white" />
                  <span className="flex-1 truncate">LIVE NOW — Join “{s.title}”</span>
                </a>
              ) : (
                <div key={s.id} className="mx-2 my-1 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
                  <span className="shrink-0">⏰</span>
                  <span className="flex-1 truncate">{s.title} · {fmtTime(s.scheduledStart)}</span>
                </div>
              )
            ))}
            {m.lessons.map((l) => {
              const isActive = l.id === activeId;
              return (
                <button
                  key={l.id}
                  disabled={!l.unlocked}
                  onClick={() => { if (l.unlocked) { setActiveId(l.id); setTocOpen(false); } }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition",
                    isActive ? "bg-brand-50 font-semibold text-brand-700" : "text-ink hover:bg-canvas",
                    !l.unlocked && "cursor-not-allowed text-faint hover:bg-transparent"
                  )}
                >
                  <span className="shrink-0">
                    {l.completed ? <CheckCircle2 size={16} className="text-emerald-600" />
                      : !l.unlocked ? <Lock size={15} className="text-faint" />
                      : l.type === "video" ? <PlayCircle size={16} className="text-brand-500" />
                      : <FileText size={16} className="text-brand-500" />}
                  </span>
                  <span className="flex-1 truncate">{l.title}</span>
                  <span className="shrink-0 text-[11px] text-faint">{l.type}</span>
                </button>
              );
            })}
          </div>
        );

        return (
      <div className="relative grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[300px_1fr]">
        {/* Mobile backdrop behind the TOC drawer */}
        {tocOpen && <div className="fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={() => setTocOpen(false)} />}
        {/* Table of contents — Subject → Module → Lesson.
            Mobile: fixed slide-out drawer; desktop: static left column. */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] -translate-x-full flex-col overflow-y-auto border-r border-border bg-white transition-transform duration-200",
          tocOpen && "translate-x-0",
          "md:static md:z-auto md:w-auto md:max-w-none md:translate-x-0 md:transition-none"
        )}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-ink">Table of Content</span>
            <button onClick={() => setTocOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-canvas hover:text-ink md:hidden" aria-label="Close course content">
              <X size={17} />
            </button>
          </div>
          {groups
            ? groups.map((g) => {
                const gLessons = g.modules.flatMap((m) => m.lessons);
                const gDone = gLessons.filter((l) => l.completed).length;
                const isOpen = openSubject === g.id;
                return (
                  <div key={g.id} className="border-b border-border/60">
                    <button
                      onClick={() => toggleSubject(g.id)}
                      className={cn("flex w-full items-center gap-2 px-4 py-3 text-left transition", isOpen ? "bg-brand-50/70" : "hover:bg-canvas")}
                    >
                      <ChevronRight size={14} className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-90")} />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{g.title}</span>
                      <span className="shrink-0 text-[11px] text-muted">{gDone}/{gLessons.length}</span>
                    </button>
                    {isOpen && g.modules.map(renderModule)}
                  </div>
                );
              })
            : data.curriculum.map(renderModule)}
        </aside>

        {/* Content */}
        <main className="min-w-0 overflow-y-auto p-3 sm:p-5">
          {!active ? (
            <div className="grid h-full place-items-center text-muted">Select a lesson.</div>
          ) : !active.unlocked ? (
            <div className="grid h-full place-items-center text-muted">
              <div className="text-center">
                <Lock className="mx-auto mb-2 text-faint" size={32} />
                Complete the previous lesson to unlock this one.
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl">
              {/* Breadcrumb: Course › Subject › Module › Lesson */}
              <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted">
                <span className="truncate">{data.course.title}</span>
                {activeSubject && <><ChevronRight size={12} className="shrink-0" /><span className="truncate">{activeSubject.title}</span></>}
                {activeModule && <><ChevronRight size={12} className="shrink-0" /><span className="truncate">{activeModule.title}</span></>}
                <ChevronRight size={12} className="shrink-0" />
                <span className="truncate font-semibold text-ink">{active.title}</span>
              </nav>
              <LessonStage key={active.id} courseId={courseId!} courseTitle={data.course.title} lesson={active} flat={flat} reload={load} onGoNext={(id) => setActiveId(id)} />
            </div>
          )}
        </main>
      </div>
        );
      })()}
    </div>
  );
}

function LessonStage({ courseId, courseTitle, lesson, flat, reload, onGoNext }: {
  courseId: string; courseTitle: string; lesson: Lesson; flat: Lesson[]; reload: () => Promise<void> | void; onGoNext: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchedRef = useRef(lesson.watchedSec || 0);
  const lastTimeRef = useRef(0);
  const savedRef = useRef(lesson.watchedSec || 0);
  const completedRef = useRef(lesson.completed);
  const [completed, setCompleted] = useState(lesson.completed);

  // Portal-only offline download (IndexedDB) — the sole sanctioned download path.
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [offlineUrl, setOfflineUrl] = useState<string | null>(null);
  const [dlBusy, setDlBusy] = useState(false);
  useEffect(() => {
    if (lesson.downloadable && lesson.hasFile) isSaved(lesson.id).then(setOfflineSaved);
  }, [lesson.id, lesson.downloadable, lesson.hasFile]);

  const fileUrl = lessonFileUrl(lesson.id);
  const src = offlineUrl || lesson.externalVideoUrl || (lesson.hasFile ? fileUrl : "");

  const nextId = useMemo(() => {
    const i = flat.findIndex((l) => l.id === lesson.id);
    return i >= 0 && i + 1 < flat.length ? flat[i + 1].id : null;
  }, [flat, lesson.id]);

  const save = useCallback(async (markComplete?: boolean) => {
    const v = videoRef.current;
    const duration = v?.duration && isFinite(v.duration) ? v.duration : lesson.durationSec || 0;
    await api(`/learn/lessons/${lesson.id}/progress`, {
      method: "POST",
      body: JSON.stringify({
        watchedSec: Math.round(watchedRef.current),
        durationSec: Math.round(duration),
        lastPositionSec: Math.round(v?.currentTime ?? 0),
        ...(markComplete ? { completed: true } : {}),
      }),
    }).catch(() => {});
  }, [lesson.id, lesson.durationSec]);

  // Flush progress when leaving the lesson.
  useEffect(() => () => { void save(); }, [save]);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const t = v.currentTime;
    const delta = t - lastTimeRef.current;
    // Only credit normal forward playback; ignore seeks (large jumps) and rewinds.
    if (delta > 0 && delta < 1.5) watchedRef.current += delta;
    lastTimeRef.current = t;

    // Periodic heartbeat.
    if (watchedRef.current - savedRef.current >= 5) { savedRef.current = watchedRef.current; void save(); }

    // Auto-complete once enough has actually been watched.
    if (!completedRef.current && watchedRef.current >= COMPLETE_RATIO * v.duration) {
      completedRef.current = true;
      setCompleted(true);
      save().then(reload);
    }
  };

  const markRead = async () => {
    completedRef.current = true; setCompleted(true);
    await save(true); await reload();
  };

  const downloadOffline = async () => {
    setDlBusy(true);
    try {
      await saveLesson(lesson.id, fileUrl, { title: lesson.title, courseId, courseTitle, type: lesson.type });
      setOfflineSaved(true);
    } catch (e: any) { alert(e?.message || "Download failed"); }
    finally { setDlBusy(false); }
  };
  const playOffline = async () => { setOfflineUrl(await getOfflineUrl(lesson.id)); };
  const removeOffline = async () => { await removeLesson(lesson.id); setOfflineSaved(false); setOfflineUrl(null); };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-ink">{lesson.title}</h1>
        {completed && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Completed</span>}
      </div>

      {lesson.type === "video" ? (
        src ? (
          <video
            ref={videoRef}
            src={src}
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            crossOrigin="use-credentials"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (lesson.lastPositionSec && lesson.lastPositionSec < v.duration - 1) {
                v.currentTime = lesson.lastPositionSec;
                lastTimeRef.current = lesson.lastPositionSec;
              }
            }}
            onTimeUpdate={onTimeUpdate}
            onPause={() => void save()}
            onEnded={() => { savedRef.current = watchedRef.current; void save(); }}
            className="aspect-video w-full rounded-xl bg-black"
          />
        ) : <Placeholder text="Video not uploaded yet." />
      ) : lesson.type === "pdf" ? (
        lesson.hasFile
          ? <iframe title={lesson.title} src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="h-[70vh] w-full rounded-xl border border-border" />
          : <Placeholder text="PDF not uploaded yet." />
      ) : (
        <Placeholder text={`${lesson.type} content`} />
      )}

      {/* Completion control */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white px-4 py-3">
        {completed ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"><CheckCircle2 size={16} /> Completed</span>
        ) : lesson.type === "video" ? (
          <button onClick={() => markRead()} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas">
            Mark as complete
          </button>
        ) : (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={completed} disabled={completed} onChange={() => markRead()} /> Mark as read
          </label>
        )}

        {completed && nextId && (
          <button onClick={() => onGoNext(nextId)} className="inline-flex items-center gap-1 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-gold-600 hover:text-ink">
            Next lesson <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Offline save — the only sanctioned download (stays inside the portal). */}
      {(lesson.type === "video" || lesson.type === "pdf") && lesson.downloadable && lesson.hasFile && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm">
          {!offlineSaved ? (
            <button onClick={downloadOffline} disabled={dlBusy} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-semibold text-ink hover:bg-canvas disabled:opacity-50">
              <Download size={15} /> {dlBusy ? "Saving…" : "Save for offline"}
            </button>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 size={15} /> Saved offline</span>
              {lesson.type === "video" && <button onClick={playOffline} className="rounded-lg border border-border px-3 py-1.5 font-semibold text-ink hover:bg-canvas">Play offline copy</button>}
              <button onClick={removeOffline} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 hover:underline"><Trash2 size={14} /> Remove</button>
            </>
          )}
          <span className="text-xs text-faint">Available in <strong>Downloads</strong> · plays inside Luxaar only — not saved to your device's files.</span>
        </div>
      )}
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return <div className="grid aspect-video w-full place-items-center rounded-xl bg-border text-sm text-muted">{text}</div>;
}
