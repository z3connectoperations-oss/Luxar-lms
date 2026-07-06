import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../lib/api";
import { Target, Clock, ArrowRight } from "lucide-react";

interface TestSeries {
  id: string;
  title: string;
  slug: string;
  descriptionMd: string | null;
  thumbnailR2Key?: string | null;
}

interface Enrollment {
  id: string;
  testSeriesId: string;
  expiryDate: string;
}

export default function MyTestSeries() {
  const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ testSeries: TestSeries[]; enrollments: Enrollment[] }>("/learn/test-series")
      .then((d) => {
        setTestSeries(d.testSeries || []);
        setEnrollments(d.enrollments || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted">Loading your test series...</div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">My Test Series</h1>
        <p className="mt-1 text-sm text-muted">Continue your exam preparation and track your progress.</p>
      </div>

      {testSeries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-12 text-center shadow-card">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-gold-50">
            <Target size={32} className="text-gold-500" />
          </div>
          <h2 className="font-display text-xl font-bold text-ink">No Test Series Found</h2>
          <p className="mb-6 mt-2 max-w-sm text-sm text-muted">
            You haven't enrolled in any test series yet. Explore our catalog to start practicing.
          </p>
          <Link
            to="/test-series"
            className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-gold-500 hover:text-ink"
          >
            Explore Test Series
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testSeries.map((ts) => {
            const enroll = enrollments.find((e) => e.testSeriesId === ts.id);
            const expired = enroll ? new Date(enroll.expiryDate).getTime() < Date.now() : true;
            const daysLeft = enroll
              ? Math.max(0, Math.ceil((new Date(enroll.expiryDate).getTime() - Date.now()) / 86400000))
              : 0;

            return (
              <div
                key={ts.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all hover:-translate-y-1 hover:border-gold-400 hover:shadow-lux"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-canvas">
                  {ts.thumbnailR2Key ? (
                    <img src={`/files/${ts.thumbnailR2Key}`} alt={ts.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-ink font-display text-xl font-bold text-white/20">
                      TEST SERIES
                    </div>
                  )}
                  {expired && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink/70 backdrop-blur-sm">
                      <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                        Expired
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-bold text-ink line-clamp-2">{ts.title}</h3>
                  <p className="mt-1 text-sm text-muted line-clamp-2">
                    {ts.descriptionMd?.replace(/[#*`_]/g, "").slice(0, 80)}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted">
                    <Clock size={14} className={daysLeft < 7 && !expired ? "text-red-500" : ""} />
                    {expired ? (
                      <span className="text-red-500">Access expired</span>
                    ) : (
                      <span className={daysLeft < 7 ? "text-red-500" : ""}>{daysLeft} days left</span>
                    )}
                  </div>

                  <div className="mt-6">
                    {expired ? (
                      <Link
                        to={`/test-series/${ts.slug}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-canvas py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-50 hover:text-gold-700"
                      >
                        Renew Access
                      </Link>
                    ) : (
                      <Link
                        to={`/student/test-series/${ts.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-sm font-semibold text-white shadow-soft transition group-hover:bg-gold-500 group-hover:text-ink"
                      >
                        Go to Tests <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
