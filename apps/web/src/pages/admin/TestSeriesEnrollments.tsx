import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Users } from "lucide-react";
import { api } from "../../lib/api";
import { mediaUrl } from "../../lib/media";
import { Chip } from "../../components/ui";

interface TestSeries {
  id: string; title: string; slug: string; status: string;
  thumbnailR2Key: string | null;
  enrollmentCount: number;
}

const GRADIENTS = ["from-neutral-800 to-neutral-950", "from-stone-800 to-stone-950", "from-zinc-800 to-zinc-950", "from-gray-800 to-gray-950"];
function gradientFor(seed: string) {
  let h = 0;
  for (const ch of seed || "x") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export default function TestSeriesEnrollments() {
  const [testSeriesList, setTestSeriesList] = useState<TestSeries[]>([]);

  useEffect(() => {
    api<{ testSeries: TestSeries[] }>("/admin/enrollments/test-series").then((d) => setTestSeriesList(d.testSeries)).catch(() => {});
  }, []);

  const totalEnrollments = testSeriesList.reduce((s, c) => s + c.enrollmentCount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Enrolled Test Series</h1>
          <p className="text-sm text-muted">{testSeriesList.length} test series · {totalEnrollments} total enrollments</p>
        </div>
      </div>

      {testSeriesList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-md bg-brand-50 text-brand-600"><FileText size={20} /></div>
          <p className="font-semibold text-ink">No test series yet</p>
          <p className="mt-1 text-sm text-muted">Create a test series and once students enroll they will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {testSeriesList.map((ts) => {
            const img = mediaUrl(ts.thumbnailR2Key);
            return (
              <Link
                key={ts.id}
                to={`/admin/enrollments/test-series/${ts.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-brand-500 hover:shadow-sm"
              >
                <div className={`relative aspect-video w-full overflow-hidden bg-gradient-to-tr ${gradientFor(ts.id)}`}>
                  {img && <img src={img} alt={ts.title} className="h-full w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100" />}
                  {ts.status === "draft" && (
                    <div className="absolute left-2 top-2"><Chip tone="neutral">Draft</Chip></div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 font-semibold leading-tight text-ink">{ts.title}</h3>
                  <div className="mt-auto pt-4 flex items-center justify-between text-sm text-muted">
                    <span className="flex items-center gap-1.5 font-medium"><Users size={16} /> {ts.enrollmentCount}</span>
                    <span>View students →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
