import { useEffect, useMemo, useState } from "react";
import { Download, Trash2, PlayCircle, FileText, WifiOff, ChevronLeft, BookOpen } from "lucide-react";
import { listSaved, getOfflineUrl, removeLesson, type SavedLessonMeta } from "../../lib/offline";
import { Card, Button } from "../../components/ui";

const GRADIENTS = ["from-neutral-800 to-neutral-950", "from-stone-800 to-stone-950", "from-zinc-800 to-zinc-950", "from-gray-800 to-gray-950"];
function gradientFor(seed: string) {
  let h = 0;
  for (const ch of seed || "x") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

interface CourseGroup { courseId: string; courseTitle: string; items: SavedLessonMeta[]; bytes: number }

export default function Downloads() {
  const [items, setItems] = useState<SavedLessonMeta[]>([]);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [activeId, setActiveId] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  const load = () => listSaved().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  // Group downloads by course.
  const courses = useMemo<CourseGroup[]>(() => {
    const map = new Map<string, CourseGroup>();
    for (const it of items) {
      const g = map.get(it.courseId) || { courseId: it.courseId, courseTitle: it.courseTitle, items: [], bytes: 0 };
      g.items.push(it); g.bytes += it.size || 0;
      map.set(it.courseId, g);
    }
    return [...map.values()];
  }, [items]);

  const group = courses.find((c) => c.courseId === openCourse);

  const play = async (m: SavedLessonMeta) => { setActiveId(m.lessonId); setUrl(await getOfflineUrl(m.lessonId)); };
  const remove = async (id: string) => {
    await removeLesson(id);
    if (id === activeId) { setActiveId(""); setUrl(null); }
    load();
  };
  const active = items.find((i) => i.lessonId === activeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {group && (
            <button onClick={() => { setOpenCourse(null); setActiveId(""); setUrl(null); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink">
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-ink">{group ? group.courseTitle : "Downloads"}</h1>
            <p className="text-sm text-muted">{group ? `${group.items.length} item(s) · ${(group.bytes / 1048576).toFixed(1)} MB` : "Saved courses play here even without internet."}</p>
          </div>
        </div>
        {!online && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
            <WifiOff size={15} /> Offline
          </span>
        )}
      </div>

      {/* Empty */}
      {items.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-12 text-center text-muted">
          <Download size={28} className="text-faint" />
          <p className="font-semibold text-ink">No downloads yet</p>
          <p className="text-sm">Open a course lesson and tap “Save for offline” to keep it here for offline viewing.</p>
        </Card>
      )}

      {/* Course cards */}
      {!group && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <button key={c.courseId} onClick={() => setOpenCourse(c.courseId)} className="overflow-hidden rounded-xl border border-border bg-card text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className={`flex aspect-[16/10] items-center justify-center bg-gradient-to-br ${gradientFor(c.courseId)}`}>
                <BookOpen size={30} className="text-white/90" />
              </div>
              <div className="p-3">
                <div className="truncate font-semibold text-ink">{c.courseTitle}</div>
                <div className="mt-0.5 text-xs text-muted">{c.items.length} download(s) · {(c.bytes / 1048576).toFixed(1)} MB</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected course: player + items */}
      {group && (
        <>
          {active && (
            <Card className="space-y-3">
              <div className="text-sm font-semibold text-ink">{active.title}</div>
              {active.type === "pdf"
                ? <iframe title={active.title} src={`${url ?? ""}#toolbar=0`} className="h-[70vh] w-full rounded-xl border border-border" />
                : url
                  ? <video src={url} controls controlsList="nodownload noremoteplayback" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} className="aspect-video w-full rounded-xl bg-black" />
                  : <div className="grid aspect-video place-items-center rounded-xl bg-border text-sm text-muted">Loading…</div>}
            </Card>
          )}

          <div className="space-y-2">
            {group.items.map((m) => (
              <Card key={m.lessonId} className={`flex items-center justify-between gap-3 ${m.lessonId === activeId ? "ring-2 ring-brand-200" : ""}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    {m.type === "pdf" ? <FileText size={20} /> : <PlayCircle size={20} />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{m.title}</div>
                    <div className="truncate text-xs text-muted">{m.type} · {(m.size / 1048576).toFixed(1)} MB</div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => play(m)}>{m.type === "pdf" ? "Open" : "Play"}</Button>
                  <button onClick={() => remove(m.lessonId)} className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 hover:underline"><Trash2 size={14} /> Remove</button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
