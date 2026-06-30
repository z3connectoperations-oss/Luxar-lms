import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Clock, BarChart3, User, BadgeCheck, FileDown, ChevronRight, ChevronDown,
  PlayCircle, FileText, ClipboardCheck, Radio, Lock, Award, Layers, BookOpen,
  ShieldCheck, Infinity as InfinityIcon, Sparkles, GraduationCap, LucideIcon
} from "lucide-react";
import { api } from "../lib/api";
import { mediaUrl } from "../lib/media";
import { formatINR } from "../lib/format";
import { enrollInCourse } from "../lib/checkout";
import { useAuth } from "../auth/AuthContext";
import { cn } from "../lib/cn";

interface CurriculumLesson { title: string; type: string; isFreePreview: boolean }
interface Module { id: string; title: string; lessonCount: number; lessons: CurriculumLesson[] }
interface Detail {
  course: { id: string; title: string; summary: string | null; descriptionMd: string | null; introPdfR2Key: string | null; level: string | null; durationDays: number | null; price: number; discountPrice: number | null };
  category: { name: string } | null;
  trainer: { name: string } | null;
  curriculum: Module[];
}

const durationLabel = (days: number | null) => {
  if (!days) return "Self-paced";
  if (days % 365 === 0) return `${days / 365} year${days > 365 ? "s" : ""}`;
  if (days % 30 === 0) return `${days / 30} month${days > 30 ? "s" : ""}`;
  return `${days} days`;
};

/** Lesson type → icon + readable label. */
function lessonMeta(type: string) {
  switch (type?.toLowerCase()) {
    case "video": return { Icon: PlayCircle, label: "Video" };
    case "pdf": return { Icon: FileText, label: "PDF / Notes" };
    case "quiz": return { Icon: ClipboardCheck, label: "Quiz" };
    case "live": return { Icon: Radio, label: "Live class" };
    default: return { Icon: BookOpen, label: type || "Lesson" };
  }
}

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api<Detail>(`/site/courses/${slug}`).then((d) => {
      setData(d);
      // Open the first module by default.
      if (d.curriculum?.[0]) setOpen({ [d.curriculum[0].id]: true });
    }).catch(() => setData(null));
  }, [slug]);

  const totals = useMemo(() => {
    if (!data) return { modules: 0, lessons: 0, byType: {} as Record<string, number> };
    const byType: Record<string, number> = {};
    let lessons = 0;
    for (const m of data.curriculum) {
      for (const l of m.lessons) {
        lessons++;
        const k = l.type?.toLowerCase() || "lesson";
        byType[k] = (byType[k] || 0) + 1;
      }
    }
    return { modules: data.curriculum.length, lessons, byType };
  }, [data]);

  if (!data) {
    return (
      <div className="mx-auto max-w-content px-6 py-20 text-center text-muted">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <p className="mt-4">Loading course…</p>
      </div>
    );
  }

  const base = data.course.discountPrice != null ? data.course.discountPrice : data.course.price;
  const finalPrice = base;
  const isFree = base === 0;
  const hasDiscount = !isFree && data.course.discountPrice != null && data.course.price > data.course.discountPrice;
  const discountPct = hasDiscount ? Math.round((1 - data.course.discountPrice! / data.course.price) * 100) : 0;

  const enroll = async () => {
    if (!user) return navigate("/login");
    setErr(""); setBusy(true);
    try {
      await enrollInCourse(data.course.id, undefined, user);
      navigate("/student");
    } catch (e: any) {
      setErr(e?.message || "Checkout failed");
    } finally { setBusy(false); }
  };

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const metaStats = [
    { Icon: Clock, label: durationLabel(data.course.durationDays), sub: "Access" },
    { Icon: Layers, label: `${totals.modules}`, sub: totals.modules === 1 ? "Module" : "Modules" },
    { Icon: BookOpen, label: `${totals.lessons}`, sub: totals.lessons === 1 ? "Lesson" : "Lessons" },
    { Icon: BarChart3, label: data.course.level || "All levels", sub: "Level" },
  ];

  return (
    <div className="bg-canvas pb-24">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-brand-800 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cta-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-content px-6 pb-44 pt-8 lg:px-10 lg:pb-52">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-white/60">
            <Link to="/" className="transition hover:text-white">Home</Link>
            <ChevronRight size={14} />
            <Link to="/courses" className="transition hover:text-white">Courses</Link>
            <ChevronRight size={14} />
            <span className="max-w-[60vw] truncate font-medium text-white/90">{data.course.title}</span>
          </nav>

          <div className="mt-8 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {data.category && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20 backdrop-blur">
                  {data.category.name}
                </span>
              )}
              {data.course.level && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20 backdrop-blur">
                  {data.course.level}
                </span>
              )}

            </div>

            <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
              {data.course.title}
            </h1>
            {data.course.summary && (
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">{data.course.summary}</p>
            )}

            {data.trainer && (
              <div className="mt-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-sm font-bold uppercase text-white ring-1 ring-white/25">
                  {data.trainer.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </span>
                <div className="text-sm">
                  <div className="text-white/60">Instructor</div>
                  <div className="font-semibold text-white">{data.trainer.name}</div>
                </div>
              </div>
            )}

            {/* Meta stats */}
            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {metaStats.map((s) => (
                <div key={s.sub} className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
                  <s.Icon size={18} className="text-cta-400" />
                  <div className="mt-2 truncate font-display text-lg font-bold leading-none">{s.label}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-white/55">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ BODY (sticky card overlaps hero) ============ */}
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* -------- LEFT -------- */}
          <div className="-mt-28 space-y-6 lg:-mt-32">
            {/* What this course covers */}
            {data.curriculum.length > 0 && (
              <SectionCard
                icon={<Sparkles size={20} className="text-brand-600" />}
                title="What this course covers"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.curriculum.slice(0, 8).map((m) => (
                    <div key={m.id} className="flex items-start gap-2.5">
                      <BadgeCheck size={18} className="mt-0.5 shrink-0 text-brand-600" />
                      <span className="text-sm text-ink">{m.title}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* About */}
            {data.course.descriptionMd && (
              <SectionCard
                icon={<BookOpen size={20} className="text-brand-600" />}
                title="About this course"
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{data.course.descriptionMd}</p>
              </SectionCard>
            )}

            {/* Intro PDF */}
            {data.course.introPdfR2Key && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-white">
                    <FileText size={20} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">Course introduction</h3>
                    <p className="text-sm text-muted">Download the intro PDF to see exactly what's inside.</p>
                  </div>
                </div>
                <a
                  href={mediaUrl(data.course.introPdfR2Key)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  <FileDown size={16} /> Download PDF
                </a>
              </div>
            )}

            {/* Curriculum accordion */}
            <SectionCard
              icon={<Layers size={20} className="text-brand-600" />}
              title="Curriculum"
              aside={
                totals.lessons > 0 ? (
                  <span className="text-sm font-medium text-muted">
                    {totals.modules} {totals.modules === 1 ? "module" : "modules"} · {totals.lessons} {totals.lessons === 1 ? "lesson" : "lessons"}
                  </span>
                ) : undefined
              }
            >
              {data.curriculum.length === 0 ? (
                <p className="text-sm text-muted">Curriculum coming soon.</p>
              ) : (
                <div className="space-y-3">
                  {data.curriculum.map((m, idx) => {
                    const isOpen = !!open[m.id];
                    const count = m.lessons.length || m.lessonCount;
                    return (
                      <div key={m.id} className="overflow-hidden rounded-xl border border-border">
                        <button
                          onClick={() => toggle(m.id)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between gap-3 bg-canvas px-4 py-3.5 text-left transition hover:bg-brand-50"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span className="truncate font-semibold text-ink">{m.title}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-3">
                            <span className="text-xs font-medium text-muted">{count} {count === 1 ? "lesson" : "lessons"}</span>
                            <ChevronDown size={18} className={cn("text-muted transition-transform duration-200", isOpen && "rotate-180")} />
                          </span>
                        </button>
                        <div className={cn("grid transition-all duration-200", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                          <div className="overflow-hidden">
                            <ul className="divide-y divide-divider border-t border-border bg-white">
                              {m.lessons.map((l, i) => {
                                const { Icon, label } = lessonMeta(l.type);
                                return (
                                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                                    <span className="flex min-w-0 items-center gap-3">
                                      <Icon size={17} className="shrink-0 text-brand-500" />
                                      <span className="truncate text-sm text-ink">{l.title}</span>
                                      <span className="hidden shrink-0 text-xs text-faint sm:inline">{label}</span>
                                    </span>
                                    {l.isFreePreview ? (
                                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                                        <PlayCircle size={12} /> Free preview
                                      </span>
                                    ) : (
                                      <Lock size={14} className="shrink-0 text-faint" />
                                    )}
                                  </li>
                                );
                              })}
                              {m.lessons.length === 0 && (
                                <li className="px-4 py-3 text-sm text-muted">Lessons coming soon.</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Instructor */}
            {data.trainer && (
              <SectionCard
                icon={<GraduationCap size={20} className="text-ink" />}
                title="Your instructor"
              >
                <div className="flex items-center gap-4">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-ink text-xl font-bold uppercase text-white">
                    {data.trainer.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </span>
                  <div>
                    <div className="font-display text-lg font-bold text-ink">{data.trainer.name}</div>
                    <p className="mt-0.5 text-sm text-muted">
                      Mentor{data.category ? ` · ${data.category.name}` : ""}. Guiding aspirants with structured, exam-focused teaching.
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>

          {/* -------- RIGHT: sticky enroll card -------- */}
          <div className="lg:-mt-44">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-lux">
                {/* Price band */}
                <div className="border-b border-divider p-6">
                  <div className="flex items-end gap-3">
                    <span className="font-display text-3xl font-bold text-ink">
                      {isFree ? "Free" : formatINR(finalPrice)}
                    </span>
                    {hasDiscount && (
                      <span className="mb-1 text-base text-muted line-through">{formatINR(data.course.price)}</span>
                    )}
                  </div>
                  {hasDiscount && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-cta-100 px-2.5 py-0.5 text-xs font-bold text-cta-700">
                      {discountPct}% OFF · limited time
                    </span>
                  )}
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                    <Clock size={14} /> {durationLabel(data.course.durationDays)} access
                  </div>

                  <button
                    onClick={enroll}
                    disabled={busy}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 font-display font-bold text-white shadow-soft transition-all duration-300 hover:bg-gold-600 hover:text-ink disabled:opacity-60"
                  >
                    {busy ? "Processing…" : user ? (isFree ? "Enroll for free" : "Enroll now") : "Login to enroll"}
                    {!busy && <ChevronRight size={18} />}
                  </button>
                  {err && <p className="mt-2 text-center text-sm text-red-600">{err}</p>}
                  <p className="mt-3 text-center text-xs text-muted">30-day satisfaction guarantee</p>
                </div>

                {/* Includes */}
                <div className="p-6">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">This course includes</h3>
                  <ul className="space-y-3 text-sm text-ink">
                    {totals.byType.video ? (
                      <Include Icon={PlayCircle} text={`${totals.byType.video} on-demand video lessons`} />
                    ) : null}
                    {totals.byType.pdf ? (
                      <Include Icon={FileText} text={`${totals.byType.pdf} downloadable PDF${totals.byType.pdf > 1 ? "s" : ""} & notes`} />
                    ) : null}
                    {totals.byType.quiz ? (
                      <Include Icon={ClipboardCheck} text={`${totals.byType.quiz} practice quiz${totals.byType.quiz > 1 ? "zes" : ""}`} />
                    ) : null}
                    {totals.byType.live ? (
                      <Include Icon={Radio} text={`${totals.byType.live} live class session${totals.byType.live > 1 ? "s" : ""}`} />
                    ) : null}
                    <Include Icon={InfinityIcon} text="Full lifetime-of-plan access" />
                    <Include Icon={FileDown} text="Downloadable resources" />

                    <Include Icon={ShieldCheck} text="Access on mobile & desktop" />
                  </ul>
                </div>
              </div>

              <Link
                to="/courses"
                className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
              >
                <ChevronRight size={15} className="rotate-180" /> Back to all courses
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function SectionCard({
  icon, title, aside, children,
}: { icon: React.ReactNode; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-card md:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-ink">
          {icon} {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Include({ Icon, text }: { Icon: LucideIcon; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <Icon size={17} className="shrink-0 text-brand-600" />
      <span>{text}</span>
    </li>
  );
}
