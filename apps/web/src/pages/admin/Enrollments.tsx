import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Users } from "lucide-react";
import { api } from "../../lib/api";
import { mediaUrl } from "../../lib/media";
import { Chip } from "../../components/ui";

interface Course {
  id: string; title: string; slug: string; status: string;
  thumbnailR2Key: string | null; categoryName: string | null;
  enrollmentCount: number;
}

const GRADIENTS = ["from-neutral-800 to-neutral-950", "from-stone-800 to-stone-950", "from-zinc-800 to-zinc-950", "from-gray-800 to-gray-950"];
function gradientFor(seed: string) {
  let h = 0;
  for (const ch of seed || "x") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export default function Enrollments() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    api<{ courses: Course[] }>("/admin/enrollments/courses").then((d) => setCourses(d.courses)).catch(() => {});
  }, []);

  const totalEnrollments = courses.reduce((s, c) => s + c.enrollmentCount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Enrolled Courses</h1>
          <p className="text-sm text-muted">{courses.length} course{courses.length === 1 ? "" : "s"} · {totalEnrollments} total enrollments</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-md bg-brand-50 text-brand-600"><BookOpen size={20} /></div>
          <p className="font-semibold text-ink">No courses yet</p>
          <p className="mt-1 text-sm text-muted">Create a course and once students enroll they will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {courses.map((c) => {
            const img = mediaUrl(c.thumbnailR2Key);
            return (
              <Link
                key={c.id}
                to={`/admin/enrollments/${c.id}`}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {img
                    ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                    : <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(c.slug || c.id)}`}><BookOpen size={26} className="text-white/90" /></div>}
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">
                    <Users size={12} /> {c.enrollmentCount}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-3">
                  {c.categoryName && <div className="mb-1.5"><Chip tone="blue">{c.categoryName}</Chip></div>}
                  <h3 className="line-clamp-1 text-sm font-semibold text-ink">{c.title}</h3>
                  <div className="mt-0.5 truncate text-xs text-muted">/{c.slug}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted">{c.enrollmentCount} student{c.enrollmentCount === 1 ? "" : "s"}</span>
                    <span className="font-medium text-brand-700">View details →</span>
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
