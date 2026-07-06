import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { enrollInTestSeries } from "../../lib/checkout";
import { useAuth } from "../../auth/AuthContext";
import { formatINR } from "../../lib/format";
import { Target, ChevronRight, Clock, Award, FileText, ChevronDown, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/cn";

interface Test {
  id: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  maxAttempts: number;
}

interface TestSeriesDetailData {
  testSeries: {
    id: string;
    title: string;
    slug: string;
    descriptionMd: string | null;
    price: number;
    discountPrice: number | null;
    thumbnailR2Key: string | null;
    validityDays: number;
  };
  tests: Test[];
}

export default function TestSeriesDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [data, setData] = useState<TestSeriesDetailData | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showTests, setShowTests] = useState(true);

  useEffect(() => {
    api<TestSeriesDetailData>(`/site/test-series/${slug}`)
      .then(setData)
      .catch(() => setData(null));
  }, [slug]);

  if (!data) {
    return (
      <div className="mx-auto max-w-content px-6 py-20 text-center text-muted">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <p className="mt-4">Loading Test Series…</p>
      </div>
    );
  }

  const { testSeries, tests } = data;
  const base = testSeries.discountPrice != null ? testSeries.discountPrice : testSeries.price;
  const isFree = base === 0;
  const hasDiscount = !isFree && testSeries.discountPrice != null && testSeries.price > testSeries.discountPrice;
  const discountPct = hasDiscount ? Math.round((1 - testSeries.discountPrice! / testSeries.price) * 100) : 0;

  const enroll = async () => {
    if (!user) return navigate("/login");
    setErr("");
    setBusy(true);
    try {
      await enrollInTestSeries(testSeries.id);
      navigate("/student/test-series");
    } catch (e: any) {
      setErr(e?.message || "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-canvas pb-24">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-brand-800 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        
        <div className="relative mx-auto max-w-content px-6 pb-44 pt-8 lg:px-10 lg:pb-52">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-white/60">
            <Link to="/" className="transition hover:text-white">Home</Link>
            <ChevronRight size={14} />
            <Link to="/test-series" className="transition hover:text-white">Test Series</Link>
            <ChevronRight size={14} />
            <span className="max-w-[60vw] truncate font-medium text-white/90">{testSeries.title}</span>
          </nav>

          <div className="mt-8 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-widest text-gold-200 shadow-sm backdrop-blur-md">
              <Target size={14} className="text-gold-400" />
              TEST SERIES
            </div>

            <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
              {testSeries.title}
            </h1>
            
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">
              Exam-grade practice tests to evaluate your readiness.
            </p>

            {/* Meta stats */}
            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
                <FileText size={18} className="text-cta-400" />
                <div className="mt-2 truncate font-display text-lg font-bold leading-none">{tests.length}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-white/55">Mock Tests</div>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
                <Clock size={18} className="text-cta-400" />
                <div className="mt-2 truncate font-display text-lg font-bold leading-none">{testSeries.validityDays} Days</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-white/55">Validity</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BODY ============ */}
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* -------- LEFT -------- */}
          <div className="-mt-28 space-y-6 lg:-mt-32 relative z-10">
            {/* About */}
            <section className="rounded-2xl border border-border bg-white p-6 shadow-card md:p-7">
              <div className="mb-5 flex items-center gap-3">
                <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-ink">
                  <Award size={20} className="text-brand-600" /> About this Test Series
                </h2>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted prose prose-sm max-w-none">
                {testSeries.descriptionMd || "No description provided."}
              </div>
            </section>

            {/* Included Tests */}
            <section className="rounded-2xl border border-border bg-white p-6 shadow-card md:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-ink">
                  <Target size={20} className="text-brand-600" /> Included Tests
                </h2>
                <span className="text-sm font-medium text-muted">
                  {tests.length} {tests.length === 1 ? "test" : "tests"}
                </span>
              </div>
              
              <div className="overflow-hidden rounded-xl border border-border">
                <button
                  onClick={() => setShowTests(!showTests)}
                  className="flex w-full items-center justify-between gap-3 bg-canvas px-4 py-3.5 text-left transition hover:bg-brand-50"
                >
                  <span className="font-semibold text-ink">Tests List</span>
                  <ChevronDown size={18} className={cn("text-muted transition-transform duration-200", showTests && "rotate-180")} />
                </button>
                <div className={cn("grid transition-all duration-200", showTests ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <div className="overflow-hidden">
                    <ul className="divide-y divide-divider border-t border-border bg-white">
                      {tests.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-muted">No tests added yet.</li>
                      ) : (
                        tests.map((test, idx) => (
                          <li key={test.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
                                {idx + 1}
                              </span>
                              <span className="truncate text-sm font-semibold text-ink">{test.title}</span>
                            </span>
                            <div className="flex shrink-0 items-center gap-4 text-xs text-muted pl-10 sm:pl-0">
                              <span className="flex items-center gap-1"><CheckCircle2 size={14} /> {test.questionCount} Qs</span>
                              <span className="flex items-center gap-1"><Award size={14} /> {test.totalMarks} Marks</span>
                              <span className="flex items-center gap-1"><Clock size={14} /> {test.durationMinutes}m</span>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* -------- RIGHT: sticky enroll card -------- */}
          <div className="lg:-mt-44 relative z-10">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-lux">
                <div className="border-b border-divider p-6">
                  <div className="flex items-end gap-3">
                    <span className="font-display text-3xl font-bold text-ink">
                      {isFree ? "Free" : formatINR(base)}
                    </span>
                    {hasDiscount && (
                      <span className="mb-1 text-base text-muted line-through">{formatINR(testSeries.price)}</span>
                    )}
                  </div>
                  {hasDiscount && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-cta-100 px-2.5 py-0.5 text-xs font-bold text-cta-700">
                      {discountPct}% OFF
                    </span>
                  )}
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                    <Clock size={14} /> {testSeries.validityDays} days access
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
                </div>
                
                <div className="p-6">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">This test series includes</h3>
                  <ul className="space-y-3 text-sm text-ink">
                    <li className="flex items-center gap-3">
                      <FileText size={17} className="shrink-0 text-brand-600" />
                      <span>{tests.length} exam-grade mock tests</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Clock size={17} className="shrink-0 text-brand-600" />
                      <span>Real-time exam environment simulation</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Award size={17} className="shrink-0 text-brand-600" />
                      <span>Detailed performance analytics</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
