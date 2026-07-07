import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, X, BookOpen, BarChart3, Pencil, Trash2 } from "lucide-react";
import { api, authHeaders } from "../../lib/api";
import { formatINR } from "../../lib/format";
import { mediaUrl } from "../../lib/media";
import { Button, Input, Textarea, Select, Label, Chip } from "../../components/ui";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8787";

interface Course {
  id: string; title: string; slug: string; status: string; categoryName: string | null;
  thumbnailR2Key: string | null; level: string | null; price: number | null; position: number;
}
interface Category { id: string; name: string }
interface Trainer { id: string; name: string }

const DURATIONS = [
  { label: "1 month", days: 30 }, { label: "2 months", days: 60 }, { label: "3 months", days: 90 },
  { label: "6 months", days: 180 }, { label: "1 year", days: 365 },
];

const GRADIENTS = ["from-neutral-800 to-neutral-950", "from-stone-800 to-stone-950", "from-zinc-800 to-zinc-950", "from-gray-800 to-gray-950"];
function gradientFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

const emptyForm = {
  title: "", summary: "", descriptionMd: "",
  categoryId: "", trainerId: "", level: "beginner",
  durationDays: 365, price: 0, discountPrice: "" as number | "",
  tags: "", introVideo: "",
  thumbnailR2Key: "", bannerR2Key: "", introPdfR2Key: "",
  downloadableEnabled: true, liveClassesEnabled: true,
  completionRule: "allLessons", minProgressPct: 100,
  status: "draft", position: 0,
};
type Form = typeof emptyForm;

export default function Courses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [f, setF] = useState<Form>(emptyForm);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"thumbnailR2Key" | "bannerR2Key" | "introPdfR2Key" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    api<{ courses: Course[] }>("/admin/courses").then((d) => setCourses(d.courses));
    api<{ categories: Category[] }>("/admin/categories").then((d) => setCats(d.categories)).catch(() => {});
    api<{ trainers: Trainer[] }>("/admin/trainers").then((d) => setTrainers(d.trainers)).catch(() => {});
  };
  useEffect(load, []);

  const set = (patch: Partial<Form>) => setF((prev) => ({ ...prev, ...patch }));

  const uploadFile = async (file: File, field: "thumbnailR2Key" | "bannerR2Key" | "introPdfR2Key") => {
    setUploading(field);
    try {
      const res = await fetch(`${BASE}/admin/upload?folder=courses&filename=${encodeURIComponent(file.name)}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": file.type || "application/octet-stream", ...authHeaders() }, body: file,
      });
      const { key } = await res.json();
      set({ [field]: key } as Partial<Form>);
    } finally { setUploading(null); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>("/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          title: f.title.trim(),
          summary: f.summary || null,
          descriptionMd: f.descriptionMd || null,
          categoryId: f.categoryId || null,
          trainerId: f.trainerId || null,
          level: f.level,
          tags: f.tags || null,
          introVideo: f.introVideo || null,
          thumbnailR2Key: f.thumbnailR2Key || null,
          bannerR2Key: f.bannerR2Key || null,
          introPdfR2Key: f.introPdfR2Key || null,
          durationDays: Number(f.durationDays),
          price: Math.round(Number(f.price) * 100),
          discountPrice: f.discountPrice === "" ? null : Math.round(Number(f.discountPrice) * 100),
          downloadableEnabled: f.downloadableEnabled,
          liveClassesEnabled: f.liveClassesEnabled,
          completionRule: f.completionRule,
          minProgressPct: Number(f.minProgressPct),
          status: f.status,
          position: Number(f.position),
        }),
      });
      setF(emptyForm);
      setOpen(false);
      // Continue to the curriculum builder (modules/lessons need the course to exist).
      navigate(`/admin/courses/${id}`);
    } finally { setBusy(false); }
  };



  const remove = async (c: Course) => {
    if (!window.confirm(`Delete "${c.title}"?\n\nThis permanently removes the course and ALL of its modules, lessons, materials, tests, live sessions/recordings, and enrollments. This cannot be undone.`)) return;
    setDeletingId(c.id);
    try {
      await api(`/admin/courses/${c.id}`, { method: "DELETE" });
      setCourses((prev) => prev.filter((x) => x.id !== c.id));
    } finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Courses</h1>
          <p className="text-sm text-muted">{courses.length} course{courses.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={() => { setF(emptyForm); setOpen(true); }}>
          <Plus size={18} /> Add Course
        </Button>
      </div>

      {/* Card grid */}
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><BookOpen size={24} /></div>
          <p className="font-semibold text-ink">No courses yet</p>
          <p className="mt-1 text-sm text-muted">Click “Add Course” to create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {courses.map((c) => {
            const img = mediaUrl(c.thumbnailR2Key);
            const isActive = c.status === "active";
            return (
              <div key={c.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
                {/* Cover */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  {img ? (
                    <img src={img} alt={c.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(c.slug)}`}>
                      <BookOpen size={26} className="text-white/90" />
                    </div>
                  )}
                  <span className={`absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActive ? "bg-ink text-white" : c.status === "coming_soon" ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100" : "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200"}`}>
                    {c.status}
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-3">
                  {c.categoryName && <div className="mb-1.5"><Chip tone="blue">{c.categoryName}</Chip></div>}
                  <h3 className="line-clamp-1 text-sm font-semibold text-ink">{c.title}</h3>
                  <div className="mt-0.5 truncate text-xs text-muted">/{c.slug}</div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    {c.level && <span className="inline-flex items-center gap-1 capitalize"><BarChart3 size={13} /> {c.level}</span>}
                    <span className="font-semibold text-ink">{c.price ? formatINR(c.price) : "Free"}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-divider pt-3">

                    <Link to={`/admin/courses/${c.id}`} className="flex-1">
                      <Button size="sm" className="w-full"><Pencil size={14} /> Manage</Button>
                    </Link>
                    <button
                      onClick={() => remove(c)}
                      disabled={deletingId === c.id}
                      title="Delete course"
                      aria-label={`Delete ${c.title}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal — full course form */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="my-8 flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-soft" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold text-ink">Add a course</h2>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={create} className="flex min-h-0 flex-1 flex-col">
              {/* Scrollable body */}
              <div className="grid gap-4 overflow-y-auto p-6 sm:grid-cols-2">
                {/* Basics */}
                <div className="sm:col-span-2">
                  <Label>Title</Label>
                  <Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. LLM Engineering" autoFocus />
                </div>
                <div className="sm:col-span-2">
                  <Label>Summary</Label>
                  <Input value={f.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="One-line summary shown on cards" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={f.descriptionMd} onChange={(e) => set({ descriptionMd: e.target.value })} placeholder="What students will learn (markdown supported)" />
                </div>

                {/* Introduction PDF — shown on the public course page for anyone to download */}
                <div className="sm:col-span-2">
                  <Label>Introduction PDF (optional)</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={!!uploading}
                      onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "introPdfR2Key")}
                      className="text-sm"
                    />
                    {uploading === "introPdfR2Key" ? (
                      <span className="text-xs text-muted">Uploading…</span>
                    ) : f.introPdfR2Key && (
                      <>
                        <Chip tone="brand">PDF uploaded</Chip>
                        <button type="button" onClick={() => set({ introPdfR2Key: "" })} className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline">Remove</button>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">Students can download this from the course page when exploring the course.</p>
                </div>

                {/* Classification */}
                <div>
                  <Label>Category</Label>
                  <Select value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                    <option value="">— select —</option>
                    {cats.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Trainer / Mentor</Label>
                  <Select value={f.trainerId} onChange={(e) => set({ trainerId: e.target.value })}>
                    <option value="">— unassigned —</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Level</Label>
                  <Select value={f.level} onChange={(e) => set({ level: e.target.value })}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Select value={f.durationDays} onChange={(e) => set({ durationDays: +e.target.value })}>
                    {DURATIONS.map((d) => <option key={d.days} value={d.days}>{d.label}</option>)}
                  </Select>
                </div>

                {/* Pricing */}
                <div>
                  <Label>Price (₹)</Label>
                  <Input type="number" min={0} value={f.price} onChange={(e) => set({ price: +e.target.value })} />
                </div>
                <div>
                  <Label>Discount price (₹, optional)</Label>
                  <Input type="number" min={0} value={f.discountPrice} onChange={(e) => set({ discountPrice: e.target.value === "" ? "" : +e.target.value })} placeholder="—" />
                </div>

                {/* Meta */}
                <div className="sm:col-span-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input value={f.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="AI, LLM, RAG" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Intro video (Stream id or URL, optional)</Label>
                  <Input value={f.introVideo} onChange={(e) => set({ introVideo: e.target.value })} />
                </div>

                {/* Media */}
                <div>
                  <Label>Thumbnail</Label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" disabled={!!uploading} onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "thumbnailR2Key")} className="text-sm" />
                    {uploading === "thumbnailR2Key" ? <span className="text-xs text-muted">Uploading…</span> : f.thumbnailR2Key && <Chip tone="brand">set</Chip>}
                  </div>
                </div>
                <div>
                  <Label>Banner</Label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" disabled={!!uploading} onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "bannerR2Key")} className="text-sm" />
                    {uploading === "bannerR2Key" ? <span className="text-xs text-muted">Uploading…</span> : f.bannerR2Key && <Chip tone="brand">set</Chip>}
                  </div>
                </div>

                {/* Toggles */}
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={f.downloadableEnabled} onChange={(e) => set({ downloadableEnabled: e.target.checked })} /> Downloadable lessons
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={f.liveClassesEnabled} onChange={(e) => set({ liveClassesEnabled: e.target.checked })} /> Live classes enabled
                </label>

                {/* Display Order */}
                <div>
                  <Label>Display Order</Label>
                  <Input type="number" min={0} value={f.position} onChange={(e) => set({ position: +e.target.value })} />
                </div>

                {/* Status */}
                <div>
                  <Label>Status</Label>
                  <Select value={f.status} onChange={(e) => set({ status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="hidden">Hidden</option>
                  </Select>
                </div>

                {cats.length === 0 && (
                  <p className="text-xs text-muted sm:col-span-2">Tip: create a Category first so you can group courses.</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-6 py-4">
                <p className="text-xs text-muted">You'll continue to modules & lessons after creating.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={busy || !!uploading}>{busy ? "Creating…" : "Create course"}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
