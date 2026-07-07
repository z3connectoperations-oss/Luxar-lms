import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Target, Sparkles, Clock, FileText, Rocket, Tag, BarChart3 } from "lucide-react";
import { api } from "../../lib/api";
import { mediaUrl } from "../../lib/media";

interface TestSeries {
  id: string;
  title: string;
  slug: string;
  descriptionMd: string | null;
  category: string | null;
  difficulty: string | null;
  status: string;
  price: number;
  discountPrice: number | null;
  thumbnailR2Key?: string | null;
  bannerR2Key?: string | null;
  questionCount: number;
  totalMarks: number;
  durationMin: number;
  testCount: number;
}

const difficultyStyle: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-100 text-amber-700 ring-amber-200",
  hard: "bg-rose-100 text-rose-700 ring-rose-200",
};

function ActiveCard({ ts }: { ts: TestSeries }) {
  const finalPrice = ts.discountPrice ?? ts.price;
  const img = mediaUrl(ts.bannerR2Key || ts.thumbnailR2Key);
  return (
    <Link
      to={`/test-series/${ts.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-400 hover:shadow-lux"
    >
      {/* Banner */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink">
        {img ? (
          <img src={img} alt={ts.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
            <Target size={30} className="text-white/25" />
          </div>
        )}
        {ts.category && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink backdrop-blur-md">
            <Tag size={11} className="text-gold-500" />
            {ts.category}
          </span>
        )}
        {ts.difficulty && (
          <span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 backdrop-blur-md ${difficultyStyle[ts.difficulty.toLowerCase()] || "bg-white/90 text-ink ring-border"}`}>
            <BarChart3 size={11} />
            {ts.difficulty}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-2 line-clamp-2 font-display text-lg font-bold leading-tight text-ink">{ts.title}</h3>
        <p className="mb-4 line-clamp-2 text-sm text-muted">
          {ts.descriptionMd?.replace(/[#*`_]/g, "").slice(0, 90) || "Comprehensive exam-grade test series."}
        </p>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink">
            <FileText size={13} className="text-gold-500" /> {ts.questionCount} Qs
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink">
            <Clock size={13} className="text-gold-500" /> {ts.durationMin} min
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="font-display text-lg font-bold text-ink">
            {finalPrice === 0 ? "Free" : `₹${(finalPrice / 100).toLocaleString("en-IN")}`}
          </div>
          <span className="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-white transition-colors group-hover:bg-gold-500 group-hover:text-ink">
            Enroll Now
          </span>
        </div>
      </div>
    </Link>
  );
}

function ComingSoonCard({ ts }: { ts: TestSeries }) {
  const img = mediaUrl(ts.bannerR2Key || ts.thumbnailR2Key);
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white opacity-95">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink">
        {img ? (
          <img src={img} alt={ts.title} loading="lazy" className="h-full w-full object-cover grayscale" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
            <Rocket size={30} className="text-white/25" />
          </div>
        )}
        <div className="absolute inset-0 bg-ink/40" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-gold-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink shadow-sm">
          <Rocket size={11} /> Coming Soon
        </span>
        {ts.category && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink backdrop-blur-md">
            {ts.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-2 line-clamp-2 font-display text-lg font-bold leading-tight text-ink">{ts.title}</h3>
        <p className="mb-4 line-clamp-2 text-sm text-muted">
          {ts.descriptionMd?.replace(/[#*`_]/g, "").slice(0, 90) || "Launching soon — stay tuned."}
        </p>
        <div className="mt-auto border-t border-border pt-4">
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gold-300 bg-gold-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gold-700">
            <Rocket size={13} /> Notify me soon
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TestSeriesCatalog() {
  const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ testSeries: TestSeries[] }>("/site/test-series")
      .then((d) => setTestSeries(d.testSeries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = testSeries.filter((ts) => ts.status === "published");
  const comingSoon = testSeries.filter((ts) => ts.status === "coming_soon");

  return (
    <div className="flex min-h-screen flex-col bg-canvas pb-20 pt-10">
      {/* Hero */}
      <section className="mx-auto w-full max-w-content px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-3xl bg-ink p-8 text-white shadow-lux md:p-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-widest text-gold-200 shadow-sm backdrop-blur-md">
              <Award size={14} className="text-gold-400" />
              EXAM PREP
            </div>
            <h1 className="mb-4 font-display text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
              Standalone <span className="font-light italic text-gold-400">Test Series</span>
            </h1>
            <p className="text-lg leading-relaxed text-white/70">
              Rigorous, exam-grade test series built by experts to help you evaluate your preparation and master time management. Practice with the exact format of the real exam.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="mx-auto mt-16 w-full max-w-content px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl border border-border bg-white shadow-card" />
            ))}
          </div>
        </section>
      ) : testSeries.length === 0 ? (
        <section className="mx-auto mt-16 w-full max-w-content px-6 lg:px-10">
          <div className="rounded-3xl border border-dashed border-border bg-white p-16 text-center shadow-card">
            <Sparkles size={48} className="mx-auto mb-4 text-gold-300" />
            <h3 className="mb-2 font-display text-xl font-bold text-ink">No Test Series Found</h3>
            <p className="text-muted">We're currently building our test series catalog. Check back soon!</p>
          </div>
        </section>
      ) : (
        <>
          {/* Active Test Series */}
          {active.length > 0 && (
            <section className="mx-auto mt-16 w-full max-w-content px-6 lg:px-10">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-ink">
                  <Target size={24} className="text-gold-500" />
                  Active Test Series
                </h2>
                <span className="rounded-full border border-border bg-white px-3 py-1 text-sm font-semibold text-muted shadow-sm">
                  {active.length} Available
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {active.map((ts) => (
                  <ActiveCard key={ts.id} ts={ts} />
                ))}
              </div>
            </section>
          )}

          {/* Coming Soon */}
          {comingSoon.length > 0 && (
            <section className="mx-auto mt-16 w-full max-w-content px-6 lg:px-10">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-ink">
                  <Rocket size={24} className="text-gold-500" />
                  Coming Soon
                </h2>
                <span className="rounded-full border border-border bg-white px-3 py-1 text-sm font-semibold text-muted shadow-sm">
                  {comingSoon.length} Announced
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {comingSoon.map((ts) => (
                  <ComingSoonCard key={ts.id} ts={ts} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
