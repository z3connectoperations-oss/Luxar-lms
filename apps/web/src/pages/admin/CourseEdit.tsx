import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { Radio, CalendarPlus } from "lucide-react";
import { api, authHeaders } from "../../lib/api";
import { cn } from "../../lib/cn";
import { mediaUrl } from "../../lib/media";
import { Button, Card, Input, Select, Textarea, Label, Chip } from "../../components/ui";
import CourseMockTests from "./CourseMockTestsTab";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8787";

interface Lesson { id: string; title: string; type: string; status: string; r2Key: string | null; isFreePreview?: boolean }
interface Module { id: string; title: string; subjectId?: string | null; lessons: Lesson[] }
interface Subject { id: string; title: string; description: string | null; position: number; status: string }
interface ChildCourse { id: string; title: string; slug: string; status: string; thumbnailR2Key: string | null }
interface PackagedTS { id: string; title: string; slug: string; status: string }
interface CourseData {
  course: any;
  modules: Module[];
  subjects?: Subject[];
  children?: ChildCourse[];
  packagedTestSeries?: PackagedTS[];
}

const DURATIONS = [
  { label: "1 month", days: 30 }, { label: "2 months", days: 60 }, { label: "3 months", days: 90 },
  { label: "6 months", days: 180 }, { label: "1 year", days: 365 },
];

const TABS = [
  { id: "details", label: "Details" },
  { id: "curriculum", label: "Curriculum" },
  { id: "mock_tests", label: "Mock Tests" },
] as const;

// Categories & trainers rarely change — fetch them once per session and reuse the
// promise, so opening course after course (e.g. a package's sub-courses) doesn't
// refetch this reference data every time.
let catsPromise: Promise<{ categories: { id: string; name: string }[] }> | null = null;
let trainersPromise: Promise<{ trainers: { id: string; name: string }[] }> | null = null;
const loadCats = () => (catsPromise ??= api<{ categories: { id: string; name: string }[] }>("/admin/categories"));
const loadTrainers = () => (trainersPromise ??= api<{ trainers: { id: string; name: string }[] }>("/admin/trainers"));

export default function CourseEdit() {
  const { id } = useParams();
  const [data, setData] = useState<CourseData | null>(null);
  const [form, setForm] = useState<any>({});
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [tab, setTab] = useState<string>("details");
  const [thumbBusy, setThumbBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (patch: Record<string, unknown>) => setForm((f: any) => ({ ...f, ...patch }));

  const load = useCallback(() => {
    api<CourseData>(`/admin/courses/${id}`).then((d) => { setData(d); setForm(d.course); });
  }, [id]);
  useEffect(load, [load]);
  // Navigating to a different course (e.g. Manage on a package's sub-course) reuses
  // this component, so reset to Details — otherwise a stale tab like "sub_courses"
  // matches nothing on a non-package course and the page renders blank.
  useEffect(() => { setTab("details"); }, [id]);
  useEffect(() => {
    loadCats().then((d) => setCats(d.categories)).catch(() => {});
    loadTrainers().then((d) => setTrainers(d.trainers)).catch(() => {});
  }, []);

  if (!data) return <div className="text-muted">Loading…</div>;

  // A package bundles sub-courses instead of having its own modules/tests, so it
  // shows a "Sub-courses" tab in place of Curriculum + Mock Tests.
  const isPackage = !!data.course.isPackage;
  const includesTs = !!data.course.includesTestSeries;
  const tsTab = includesTs ? [{ id: "test_series", label: "Test Series" }] : [];
  const tabs: { id: string; label: string }[] = isPackage
    ? [
        { id: "details", label: "Details" },
        { id: "sub_courses", label: "Sub-courses" },
        ...tsTab,
      ]
    : [...TABS, ...tsTab];

  const rupees = (paise: number | null | undefined) => (paise ? paise / 100 : 0);

  const saveCourse = async () => {
    setSaving(true);
    try {
      await api(`/admin/courses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title, summary: form.summary, descriptionMd: form.descriptionMd, status: form.status,
          categoryId: form.categoryId || null, trainerId: form.trainerId || null, level: form.level || "beginner",
          tags: form.tags, introVideo: form.introVideo, durationDays: Number(form.durationDays) || 365,
          price: Math.round(Number(form.price) || 0),
          discountPrice: form.discountPrice != null && form.discountPrice !== "" ? Math.round(Number(form.discountPrice)) : null,
          downloadableEnabled: !!form.downloadableEnabled, liveClassesEnabled: !!form.liveClassesEnabled,
          includesTestSeries: !!form.includesTestSeries,
        }),
      });
      load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const uploadThumb = async (file: File, field: "thumbnailR2Key" | "bannerR2Key") => {
    setThumbBusy(true);
    try {
      const res = await fetch(`${BASE}/admin/upload?folder=courses&filename=${encodeURIComponent(file.name)}`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": file.type || "application/octet-stream", ...authHeaders() }, body: file,
      });
      const { key } = await res.json();
      await api(`/admin/courses/${id}`, { method: "PATCH", body: JSON.stringify({ [field]: key }) });
      load();
    } finally { setThumbBusy(false); }
  };

  const SaveButton = () => (
    <div className="flex items-center gap-3">
      <Button onClick={saveCourse} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      {saved && <span className="text-sm font-medium text-emerald-700">✓ Saved</span>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-1 flex items-center justify-between gap-3 border-b border-border bg-canvas/95 px-6 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/admin/courses" className="shrink-0 text-sm font-semibold text-brand-600">← All courses</Link>
          <h1 className="truncate text-lg font-bold text-ink">{data.course.title}</h1>
          <Chip tone={data.course.status === "published" ? "blue" : "yellow"}>{data.course.status}</Chip>
        </div>
        <SaveButton />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition",
              tab === t.id ? "border-brand-600 text-brand-600" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* DETAILS */}
      {tab === "details" && (
        <div className="space-y-5">
          <Card className="space-y-3">
            <h2 className="font-semibold text-ink">Basics</h2>
            <div><Label>Title</Label><Input value={form.title || ""} onChange={(e) => set({ title: e.target.value })} /></div>
            <div><Label>Short summary</Label><Input value={form.summary || ""} onChange={(e) => set({ summary: e.target.value })} placeholder="One line shown on course cards" /></div>
            <div><Label>Description</Label><Textarea value={form.descriptionMd || ""} onChange={(e) => set({ descriptionMd: e.target.value })} placeholder="What students will learn" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select value={form.categoryId || ""} onChange={(e) => set({ categoryId: e.target.value })}>
                  <option value="">— none —</option>
                  {cats.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Trainer / mentor</Label>
                <Select value={form.trainerId || ""} onChange={(e) => set({ trainerId: e.target.value })}>
                  <option value="">— unassigned —</option>
                  {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={form.level || "beginner"} onChange={(e) => set({ level: e.target.value })}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </div>
              <div>
                <Label>Duration</Label>
                <Select value={form.durationDays ?? 365} onChange={(e) => set({ durationDays: +e.target.value })}>
                  {DURATIONS.map((d) => <option key={d.days} value={d.days}>{d.label}</option>)}
                </Select>
              </div>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags || ""} onChange={(e) => set({ tags: e.target.value })} placeholder="AI, LLM, RAG" /></div>
          </Card>

          <Card className="space-y-2">
            <h2 className="font-semibold text-ink">Test series</h2>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={!!form.includesTestSeries} onChange={(e) => set({ includesTestSeries: e.target.checked })} /> Include test series in this {isPackage ? "package" : "course"}
            </label>
            <p className="text-xs text-muted">Adds a “Test Series” tab so you can bundle test series. Click <b>Save changes</b> to apply.</p>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-semibold text-ink">Media</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Thumbnail</Label>
                {form.thumbnailR2Key && <img src={mediaUrl(form.thumbnailR2Key) || ""} alt="thumbnail" className="mb-2 aspect-video w-full rounded-lg border border-border object-cover" />}
                <input type="file" accept="image/*" disabled={thumbBusy} onChange={(e) => e.target.files?.[0] && uploadThumb(e.target.files[0], "thumbnailR2Key")} className="text-sm" />
              </div>
              <div>
                <Label>Banner</Label>
                {form.bannerR2Key && <img src={mediaUrl(form.bannerR2Key) || ""} alt="banner" className="mb-2 aspect-[3/1] w-full rounded-lg border border-border object-cover" />}
                <input type="file" accept="image/*" disabled={thumbBusy} onChange={(e) => e.target.files?.[0] && uploadThumb(e.target.files[0], "bannerR2Key")} className="text-sm" />
              </div>
            </div>
            <div><Label>Intro video (Stream id or URL, optional)</Label><Input value={form.introVideo || ""} onChange={(e) => set({ introVideo: e.target.value })} /></div>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-semibold text-ink">Pricing & access</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Price (₹) — 0 for free</Label><Input type="number" value={rupees(form.price)} onChange={(e) => set({ price: Math.round(Number(e.target.value || 0) * 100) })} /></div>
              <div><Label>Discount price (₹, optional)</Label><Input type="number" value={form.discountPrice != null ? rupees(form.discountPrice) : ""} onChange={(e) => set({ discountPrice: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} /></div>
              <div>
                <Label>Display Order</Label>
                <Input type="number" min={0} value={form.position ?? 0} onChange={(e) => set({ position: +e.target.value })} />
              </div>
              <div>
                <Label>Visibility</Label>
                <Select value={form.status} onChange={(e) => set({ status: e.target.value })}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="active">Active (public)</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="hidden">Hidden</option>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-5 pt-1">
              <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={!!form.downloadableEnabled} onChange={(e) => set({ downloadableEnabled: e.target.checked })} /> Downloadable lessons</label>
              <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={!!form.liveClassesEnabled} onChange={(e) => set({ liveClassesEnabled: e.target.checked })} /> Live classes enabled</label>
            </div>
            <div className="pt-2"><SaveButton /></div>
          </Card>
        </div>
      )}

      {/* CURRICULUM — Subject → Module → Lesson */}
      {tab === "curriculum" && !isPackage && <Curriculum courseId={id!} modules={data.modules} subjects={data.subjects || []} reload={load} />}

      {/* MOCK TESTS */}
      {tab === "mock_tests" && !isPackage && <CourseMockTests courseId={id!} />}

      {/* SUB-COURSES (packages only) */}
      {tab === "sub_courses" && isPackage && <SubCourses packageId={id!} children={data.children || []} reload={load} />}

      {/* TEST SERIES (courses/packages that include test series) */}
      {tab === "test_series" && includesTs && <PackageTestSeries packageId={id!} attached={data.packagedTestSeries || []} reload={load} />}
    </div>
  );
}

// Test series bundled into a package. Each package gets its OWN test series
// (created here, like sub-courses) — not shared from a global pool. Buying the
// package grants access to each of them.
function PackageTestSeries({ packageId, attached, reload }: { packageId: string; attached: PackagedTS[]; reload: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api(`/admin/courses/${packageId}/test-series`, { method: "POST", body: JSON.stringify({ title: title.trim() }) });
      setTitle("");
      reload();
    } finally { setBusy(false); }
  };

  const remove = async (t: PackagedTS) => {
    if (!window.confirm(`Remove "${t.title}" from this package?\n\nThis un-bundles the test series (the series and its tests remain under Test Series).`)) return;
    try {
      await api(`/admin/courses/${packageId}/test-series/${t.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      alert(`Could not remove "${t.title}": ${(err as Error)?.message || "unknown error"}`);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold text-ink">Test series in this package</h2>
          <p className="text-xs text-muted">Create test series just for this package. Buying the package unlocks all of them. Open one to add its tests & questions.</p>
        </div>
        <span className="text-xs text-muted">{attached.length} series</span>
      </div>

      {attached.length > 0 && (
        <div className="space-y-2">
          {attached.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{t.title}</div>
                <div className="truncate text-xs text-muted">/{t.slug} · {t.status}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link to={`/admin/test-series/${t.id}/tests`}><Button size="sm" variant="outline">Manage</Button></Link>
                <button className="text-xs font-semibold text-accent-pink hover:underline" onClick={() => remove(t)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 rounded-lg border border-dashed border-border p-3">
        <Input placeholder="New test series title (e.g. TNPSC Group 1 Mock Tests)" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button variant="outline" onClick={add} disabled={busy || !title.trim()}>{busy ? "Adding…" : "+ Add test series"}</Button>
      </div>
    </Card>
  );
}

// The list of courses bundled inside a package. "Add to Course" creates a new
// child course (parentCourseId = this package); each child is managed like a
// normal course (its own modules, lessons, live classes) via its Manage link.
function SubCourses({ packageId, children, reload }: { packageId: string; children: ChildCourse[]; reload: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api("/admin/courses", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), parentCourseId: packageId, status: "active", price: 0 }),
      });
      setTitle("");
      reload();
    } finally { setBusy(false); }
  };

  const remove = async (c: ChildCourse) => {
    if (!window.confirm(`Delete sub-course "${c.title}"?\n\nThis permanently removes it and all of its modules, lessons and live classes. This cannot be undone.`)) return;
    try {
      await api(`/admin/courses/${c.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      alert(`Could not delete "${c.title}": ${(err as Error)?.message || "unknown error"}`);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold text-ink">Sub-courses in this package</h2>
          <p className="text-xs text-muted">Buying this package unlocks every sub-course below. Open one to add its modules, lessons & live classes.</p>
        </div>
        <span className="text-xs text-muted">{children.length} course{children.length === 1 ? "" : "s"}</span>
      </div>

      {children.length > 0 && (
        <div className="space-y-2">
          {children.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex min-w-0 items-center gap-3">
                {c.thumbnailR2Key
                  ? <img src={mediaUrl(c.thumbnailR2Key) || ""} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                  : <div className="grid h-10 w-16 shrink-0 place-items-center rounded bg-canvas text-muted">📘</div>}
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{c.title}</div>
                  <div className="truncate text-xs text-muted">/{c.slug} · {c.status}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link to={`/admin/courses/${c.id}`}><Button size="sm" variant="outline">Manage</Button></Link>
                <button className="text-xs font-semibold text-accent-pink hover:underline" onClick={() => remove(c)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 rounded-lg border border-dashed border-border p-3">
        <Input placeholder="New sub-course title (e.g. TNPSC Group 1)" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button variant="outline" onClick={add} disabled={busy || !title.trim()}>{busy ? "Adding…" : "+ Add to Course"}</Button>
      </div>
    </Card>
  );
}

interface LiveSess { id: string; moduleId: string | null; title: string; status: string; scheduledStart: string | null; recordingUrl: string | null }
const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

// Curriculum tab: Course → Subject → Module → Lesson.
// Subjects are collapsible sections; one expands at a time (remembered per
// course). Modules that pre-date subjects appear under "Ungrouped modules" and
// can be moved into a subject at any time — nothing is lost by reorganising.
function Curriculum({ courseId, modules, subjects, reload }: { courseId: string; modules: Module[]; subjects: Subject[]; reload: () => void }) {
  const storeKey = `luxar_admin_subject_${courseId}`;
  const [expanded, setExpanded] = useState<string | null>(() => { try { return localStorage.getItem(storeKey); } catch { return null; } });
  const [newTitle, setNewTitle] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (sid: string) => {
    const next = expanded === sid ? null : sid;
    setExpanded(next);
    try { next ? localStorage.setItem(storeKey, next) : localStorage.removeItem(storeKey); } catch { /* ignore */ }
  };

  const addSubject = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>(`/admin/courses/${courseId}/subjects`, { method: "POST", body: JSON.stringify({ title: newTitle.trim(), position: subjects.length }) });
      setNewTitle("");
      setExpanded(id);
      reload();
    } finally { setBusy(false); }
  };
  const saveSubject = async (id: string) => {
    if (!editTitle.trim()) return;
    await api(`/admin/subjects/${id}`, { method: "PATCH", body: JSON.stringify({ title: editTitle.trim() }) });
    setEditId(null);
    reload();
  };
  const delSubject = async (s: Subject) => {
    if (!window.confirm(`Delete subject "${s.title}"?\n\nIts modules are NOT deleted — they move to "Ungrouped modules".`)) return;
    await api(`/admin/subjects/${s.id}`, { method: "DELETE" });
    reload();
  };
  // Reorder by writing index-based positions for the whole list (small N).
  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...subjects];
    const [s] = next.splice(idx, 1);
    next.splice(idx + dir, 0, s);
    await Promise.all(next.map((sub, i) => sub.position !== i ? api(`/admin/subjects/${sub.id}`, { method: "PATCH", body: JSON.stringify({ position: i }) }) : null));
    reload();
  };

  const ungrouped = modules.filter((m) => !m.subjectId);
  const modCount = (sid: string) => modules.filter((m) => m.subjectId === sid).length;

  // Legacy view — no subjects yet: exactly the old flat module editor.
  if (subjects.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-ink">Subjects</h2>
            <span className="text-xs text-muted">e.g. Aptitude, Reasoning, General English</span>
          </div>
          <p className="mb-3 text-xs text-muted">Organise this course by subject. Create subjects first, then add modules inside each — or keep using the flat module list below.</p>
          <div className="flex gap-2">
            <Input placeholder="New subject title (e.g. Aptitude)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubject()} />
            <Button variant="outline" onClick={addSubject} disabled={busy || !newTitle.trim()}>+ Add subject</Button>
          </div>
        </Card>
        <Modules courseId={courseId} modules={modules} reload={reload} subjects={subjects} title="Curriculum (modules & lessons)" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-semibold text-ink">Subjects</h2>
          <span className="text-xs text-muted">{subjects.length} subject{subjects.length === 1 ? "" : "s"} · {modules.length} module{modules.length === 1 ? "" : "s"}</span>
        </div>

        <div className="space-y-2">
          {subjects.map((s, idx) => (
            <div key={s.id} className="overflow-hidden rounded-lg border border-border">
              <div className={cn("flex items-center justify-between gap-2 px-3 py-2.5", expanded === s.id ? "bg-brand-50/60" : "bg-canvas/50")}>
                {editId === s.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && saveSubject(s.id)} />
                    <Button size="sm" onClick={() => saveSubject(s.id)} disabled={!editTitle.trim()}>Save</Button>
                    <button className="text-xs text-muted hover:underline" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => toggle(s.id)}>
                      <span className={cn("text-xs transition-transform", expanded === s.id && "rotate-90")}>▶</span>
                      <span className="truncate font-semibold text-ink">{s.title}</span>
                      <span className="shrink-0 text-xs text-muted">{modCount(s.id)} module{modCount(s.id) === 1 ? "" : "s"}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <button className="text-xs text-muted disabled:opacity-30" disabled={idx === 0} onClick={() => move(idx, -1)} title="Move up">↑</button>
                      <button className="text-xs text-muted disabled:opacity-30" disabled={idx === subjects.length - 1} onClick={() => move(idx, 1)} title="Move down">↓</button>
                      <button className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => { setEditId(s.id); setEditTitle(s.title); }}>Rename</button>
                      <button className="text-xs text-accent-pink" onClick={() => delSubject(s)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
              {expanded === s.id && (
                <div className="border-t border-border p-3">
                  <Modules courseId={courseId} modules={modules.filter((m) => m.subjectId === s.id)} reload={reload} subjectId={s.id} subjects={subjects} embedded />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <Input placeholder="New subject title (e.g. Reasoning)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubject()} />
          <Button variant="outline" onClick={addSubject} disabled={busy || !newTitle.trim()}>+ Add subject</Button>
        </div>
      </Card>

      {ungrouped.length > 0 && (
        <Card>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-ink">Ungrouped modules</h2>
            <span className="text-xs text-muted">Assign each to a subject with the “Subject” dropdown</span>
          </div>
          <Modules courseId={courseId} modules={ungrouped} reload={reload} subjects={subjects} embedded />
        </Card>
      )}
    </div>
  );
}

// The module editor (modules + lessons + live classes). Used standalone (legacy
// flat view) or embedded inside a subject; new modules inherit `subjectId`.
function Modules({ courseId, modules, reload, subjectId, subjects = [], embedded, title: cardTitle }: { courseId: string; modules: Module[]; reload: () => void; subjectId?: string | null; subjects?: Subject[]; embedded?: boolean; title?: string }) {
  const [title, setTitle] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [live, setLive] = useState<LiveSess[]>([]);
  const loadLive = useCallback(() => { api<{ sessions: LiveSess[] }>(`/trainer/courses/${courseId}/live`).then((d) => setLive(d.sessions)).catch(() => setLive([])); }, [courseId]);
  useEffect(() => { loadLive(); }, [loadLive]);
  const addModule = async () => { if (!title.trim()) return; await api(`/admin/courses/${courseId}/modules`, { method: "POST", body: JSON.stringify({ title, position: modules.length, subjectId: subjectId || null }) }); setTitle(""); reload(); };
  const delModule = async (id: string) => { if (!window.confirm("Delete this module and all its lessons?")) return; await api(`/admin/modules/${id}`, { method: "DELETE" }); reload(); };
  const saveModule = async (id: string) => { if (!editTitle.trim()) return; await api(`/admin/modules/${id}`, { method: "PATCH", body: JSON.stringify({ title: editTitle.trim() }) }); setEditId(null); reload(); };
  const moveToSubject = async (id: string, sid: string) => { await api(`/admin/modules/${id}`, { method: "PATCH", body: JSON.stringify({ subjectId: sid || null }) }); reload(); };

  const body = (
    <>
      {modules.map((m) => (
        <div key={m.id} className="mb-3 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {editId === m.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                <Button size="sm" onClick={() => saveModule(m.id)} disabled={!editTitle.trim()}>Save</Button>
                <button className="text-xs text-muted hover:underline" onClick={() => setEditId(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <span className="font-semibold text-ink">{m.title}</span>
                <div className="flex items-center gap-3">
                  {subjects.length > 0 && (
                    <label className="flex items-center gap-1 text-xs text-muted">
                      Subject
                      <Select className="h-7 w-36 text-xs" value={m.subjectId || ""} onChange={(e) => moveToSubject(m.id, e.target.value)}>
                        <option value="">— none —</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </Select>
                    </label>
                  )}
                  <button className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => { setEditId(m.id); setEditTitle(m.title); }}>Edit</button>
                  <button className="text-xs text-accent-pink" onClick={() => delModule(m.id)}>Delete module</button>
                </div>
              </>
            )}
          </div>
          <LessonList module={m} reload={reload} />
          <ModuleLive courseId={courseId} module={m} sessions={live.filter((s) => s.moduleId === m.id)} reload={() => { loadLive(); reload(); }} />
        </div>
      ))}
      <div className="flex gap-2">
        <Input placeholder="New module title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addModule()} />
        <Button variant="outline" onClick={addModule}>Add module</Button>
      </div>
    </>
  );

  if (embedded) return <div>{body}</div>;
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold text-ink">{cardTitle || "Curriculum (modules & lessons)"}</h2>
        <span className="text-xs text-muted">Saved automatically when added</span>
      </div>
      {body}
    </Card>
  );
}

function LessonList({ module, reload }: { module: Module; reload: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const needsFile = type === "video" || type === "pdf";

  const add = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      let r2Key: string | undefined;
      if (file && needsFile) {
        const res = await fetch(`${BASE}/admin/upload?folder=lessons&filename=${encodeURIComponent(file.name)}`, {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": file.type || "application/octet-stream", ...authHeaders() }, body: file,
        });
        r2Key = (await res.json()).key;
      }
      await api(`/admin/modules/${module.id}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title, type, position: module.lessons.length,
          r2Key, downloadable: type === "video" || type === "pdf", isFreePreview: preview, status: "published",
        }),
      });
      setTitle(""); setFile(null); setType("video"); setPreview(false);
      reload();
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-2 space-y-1">
      {module.lessons.map((l) => <LessonRow key={l.id} lesson={l} moduleId={module.id} reload={reload} />)}

      <div className="mt-2 space-y-2 rounded-lg border border-dashed border-border p-2.5">
        <div className="flex flex-wrap gap-2">
          <Input className="min-w-[12rem] flex-1" placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select className="w-32" value={type} onChange={(e) => { setType(e.target.value); setFile(null); }}>
            <option value="video">video</option>
            <option value="pdf">pdf</option>
            <option value="note">note</option>
            <option value="quiz">quiz</option>
            <option value="live">live</option>
          </Select>
        </div>

        {needsFile && (
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept={type === "video" ? "video/*" : "application/pdf"} onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
            {file
              ? <span className="text-xs text-muted">{file.name} ({(file.size / 1048576).toFixed(1)} MB)</span>
              : <span className="text-xs text-faint">Upload the {type} file (stored in R2)</span>}
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-ink"><input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} /> Free preview</label>
          <Button variant="outline" size="sm" onClick={add} disabled={busy || !title.trim()}>{busy ? "Uploading…" : "+ Add lesson"}</Button>
        </div>
      </div>
    </div>
  );
}

// One lesson row: read-only by default, expands to an inline editor (title, type,
// free-preview, optional file replacement) when "Edit" is clicked. Quiz lessons
// link to the module's mock test — that's where their questions are managed.
function LessonRow({ lesson, moduleId, reload }: { lesson: Lesson; moduleId: string; reload: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [type, setType] = useState(lesson.type);
  const [preview, setPreview] = useState(!!lesson.isFreePreview);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const needsFile = type === "video" || type === "pdf";

  const reset = () => { setTitle(lesson.title); setType(lesson.type); setPreview(!!lesson.isFreePreview); setFile(null); setEditing(false); };
  const del = async () => { if (!window.confirm("Remove this lesson?")) return; await api(`/admin/lessons/${lesson.id}`, { method: "DELETE" }); reload(); };

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const patch: Record<string, unknown> = { title: title.trim(), type, isFreePreview: preview };
      if (file && needsFile) {
        const res = await fetch(`${BASE}/admin/upload?folder=lessons&filename=${encodeURIComponent(file.name)}`, {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": file.type || "application/octet-stream", ...authHeaders() }, body: file,
        });
        patch.r2Key = (await res.json()).key;
        patch.downloadable = true;
      }
      await api(`/admin/lessons/${lesson.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setFile(null); setEditing(false);
      reload();
    } finally { setBusy(false); }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded bg-canvas px-2 py-1 text-sm">
        <span className="text-ink">
          {lesson.title} <span className="text-muted">· {lesson.type}</span>
          {lesson.r2Key && <span className="ml-1 text-xs font-semibold text-brand-600">· file ✓</span>}
          {lesson.isFreePreview && <span className="ml-1 text-xs font-semibold text-muted">· free preview</span>}
        </span>
        <div className="flex items-center gap-3">
          {lesson.type === "quiz" && (
            <Link to={`/admin/modules/${moduleId}/mock-test`} className="text-xs font-bold text-gold-600 hover:underline" title="Quiz lessons use the module's mock test — add questions there">
              Questions →
            </Link>
          )}
          <button className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => setEditing(true)}>Edit</button>
          <button className="text-xs text-accent-pink" onClick={del}>Remove</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-brand-300 bg-brand-50/40 p-2.5">
      <div className="flex flex-wrap gap-2">
        <Input className="min-w-[12rem] flex-1" placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <Select className="w-32" value={type} onChange={(e) => { setType(e.target.value); setFile(null); }}>
          <option value="video">video</option>
          <option value="pdf">pdf</option>
          <option value="note">note</option>
          <option value="quiz">quiz</option>
          <option value="live">live</option>
        </Select>
      </div>

      {needsFile && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept={type === "video" ? "video/*" : "application/pdf"} onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          {file
            ? <span className="text-xs text-muted">{file.name} ({(file.size / 1048576).toFixed(1)} MB)</span>
            : <span className="text-xs text-faint">{lesson.r2Key ? "Leave empty to keep the current file." : `Upload the ${type} file (stored in R2)`}</span>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-ink"><input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} /> Free preview</label>
        <div className="flex items-center gap-2">
          <button className="text-xs text-muted hover:underline" onClick={reset}>Cancel</button>
          <Button variant="outline" size="sm" onClick={save} disabled={busy || !title.trim()}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

// Live classes for one module — shown inline in the curriculum. One-click "Go live
// now" (opens the host room), a minimal "Schedule" (title + time), and the list of
// this module's live / upcoming / past classes.
function ModuleLive({ courseId, module, sessions, reload }: { courseId: string; module: Module; sessions: LiveSess[]; reload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [busy, setBusy] = useState(false);

  const live = sessions.filter((s) => s.status === "live");
  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) => s.status === "ended");

  const hostUrl = (id: string) => `/trainer/courses/${courseId}/live?host=${id}`;

  const goLive = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const s = await api<{ id: string }>(`/trainer/courses/${courseId}/live/start`, { method: "POST", body: JSON.stringify({ moduleId: module.id, title: title.trim() }) });
      setTitle("");
      window.open(hostUrl(s.id), "_blank", "noopener");
      reload();
    } finally { setBusy(false); }
  };
  const schedule = async () => {
    if (!title.trim() || !startAt) return;
    setBusy(true);
    try {
      await api(`/trainer/courses/${courseId}/live/schedule`, { method: "POST", body: JSON.stringify({ moduleId: module.id, title: title.trim(), scheduledStart: startAt, durationMin: 60 }) });
      setTitle(""); setStartAt(""); setShowForm(false); reload();
    } finally { setBusy(false); }
  };
  const end = async (id: string) => { await api(`/trainer/live/${id}/end`, { method: "POST" }); reload(); };
  const cancel = async (id: string) => { await api(`/trainer/live/${id}`, { method: "DELETE" }); reload(); };

  return (
    <div className="mt-2 rounded-lg border border-border bg-canvas/50 p-2.5">
      <div className="mb-2 space-y-2 rounded-lg border border-dashed border-border bg-card p-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted"><Radio size={13} /> Live classes</span>
        <Input placeholder="Live class title (required)" value={title} onChange={(e) => setTitle(e.target.value)} />
        {showForm && <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={goLive} disabled={busy || !title.trim()} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"><Radio size={13} /> Go live now</button>
          {showForm ? (
            <>
              <Button size="sm" onClick={schedule} disabled={busy || !title.trim() || !startAt}>Add scheduled class</Button>
              <button className="text-xs text-muted hover:underline" onClick={() => { setShowForm(false); setStartAt(""); }}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-canvas"><CalendarPlus size={13} /> Schedule</button>
          )}
        </div>
        {!title.trim() && <p className="text-[11px] text-faint">Enter a class title first, then go live or schedule.</p>}
      </div>

      <div className="space-y-1">
        {live.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded bg-rose-50 px-2 py-1 text-xs">
            <span className="font-semibold text-rose-600">● LIVE · {s.title}</span>
            <div className="flex items-center gap-3">
              <a href={hostUrl(s.id)} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">Join as host</a>
              <button onClick={() => end(s.id)} className="text-red-600 hover:text-red-700 hover:underline">End</button>
            </div>
          </div>
        ))}
        {upcoming.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-2 py-1 text-xs">
            <span className="text-amber-700">⏰ {s.title} <span className="text-muted">· {fmtDT(s.scheduledStart)}</span></span>
            <button onClick={() => cancel(s.id)} className="text-red-600 hover:text-red-700 hover:underline">Cancel</button>
          </div>
        ))}
        {past.slice(0, 10).map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 px-2 py-1 text-xs">
            <span className="min-w-0 truncate text-muted">{s.title} · {fmtDT(s.scheduledStart)}</span>
            {s.recordingUrl
              ? <span className="shrink-0 font-semibold text-emerald-700">Recording saved ✓</span>
              : <span className="shrink-0 text-faint">recording saves automatically after the class</span>}
          </div>
        ))}
        {sessions.length === 0 && !showForm && <p className="px-2 text-xs text-faint">No live classes for this module yet.</p>}
      </div>
    </div>
  );
}

