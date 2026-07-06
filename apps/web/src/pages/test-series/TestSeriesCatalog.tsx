import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Award, Target, Sparkles, BookOpen } from "lucide-react";

interface TestSeries {
  id: string;
  title: string;
  slug: string;
  descriptionMd: string | null;
  price: number;
  discountPrice: number | null;
  thumbnailR2Key?: string | null;
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

  return (
    <div className="flex min-h-screen flex-col bg-canvas pb-20 pt-10">
      {/* Hero Section */}
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

      {/* Catalog Grid */}
      <section className="mx-auto mt-16 w-full max-w-content px-6 lg:px-10">
        <div className="mb-10 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Target size={24} className="text-gold-500" />
            Available Test Series
          </h2>
          <span className="text-sm font-semibold text-muted bg-white px-3 py-1 rounded-full border border-border shadow-sm">
            {testSeries.length} Programs
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-white shadow-card border border-border" />
            ))}
          </div>
        ) : testSeries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-white p-16 text-center shadow-card">
            <Sparkles size={48} className="mx-auto mb-4 text-gold-300" />
            <h3 className="mb-2 font-display text-xl font-bold text-ink">No Test Series Found</h3>
            <p className="text-muted">We're currently building our test series catalog. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {testSeries.map((ts) => {
              const finalPrice = ts.discountPrice ?? ts.price;
              return (
                <Link key={ts.id} to={`/test-series/${ts.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-1 hover:border-gold-400 hover:shadow-lux">
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
                    {ts.thumbnailR2Key ? (
                      <img src={`/files/${ts.thumbnailR2Key}`} alt={ts.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-ink">
                        <span className="font-display text-2xl font-bold text-white/20">TEST SERIES</span>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink backdrop-blur-md flex items-center gap-1">
                      <Target size={12} className="text-gold-500" />
                      Test Series
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-bold leading-tight text-ink line-clamp-2 mb-2">{ts.title}</h3>
                    <p className="text-sm text-muted line-clamp-2 mb-4">{ts.descriptionMd?.replace(/[#*`_]/g, "").slice(0, 80) || "Comprehensive test series"}</p>
                    
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                      <div className="font-display text-lg font-bold text-ink">
                        {finalPrice === 0 ? "Free" : `₹${(finalPrice / 100).toLocaleString()}`}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-gold-600 transition-colors group-hover:text-gold-500">
                        View Details <BookOpen size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
