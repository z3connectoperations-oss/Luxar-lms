import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Card } from "../components/ui";
import CourseCard from "../components/CourseCard";
import { cn } from "../lib/cn";

interface Course {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  fromPrice: number | null;
  thumbnailR2Key?: string | null;
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [params, setParams] = useSearchParams();
  const catParam = params.get("category") || "all";
  const q = (params.get("q") || "").toLowerCase();

  useEffect(() => {
    api<{ courses: Course[] }>("/site/courses").then((d) => setCourses(d.courses)).catch(() => {});
  }, []);

  const cats = useMemo(
    () => Array.from(new Set(courses.map((c) => c.category).filter(Boolean))) as string[],
    [courses]
  );

  const shown = courses.filter((c) => {
    if (catParam !== "all" && c.category !== catParam) return false;
    if (q && !(`${c.title} ${c.summary ?? ""} ${c.category ?? ""}`.toLowerCase().includes(q))) return false;
    return true;
  });

  const setCat = (e: string) => {
    const next = new URLSearchParams(params);
    if (e === "all") next.delete("category"); else next.set("category", e);
    setParams(next);
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="relative mx-auto max-w-content px-6 py-12">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-gold-400">Catalogue</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Explore Courses</h1>
          <p className="mt-2 text-white/65">
            {q ? <>Results for “{q}” · </> : null}Browse by category and start learning today.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-content space-y-6 px-6 py-10">
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {["all", ...cats].map((e) => (
            <button
              key={e}
              onClick={() => setCat(e)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold transition",
                catParam === e ? "bg-ink text-white" : "border border-border bg-card text-muted hover:border-gold-400 hover:text-ink"
              )}
            >
              {e === "all" ? "All categories" : e}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <Card className="text-muted">No courses match your search.</Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((c) => (
            <CourseCard key={c.id} title={c.title} slug={c.slug} exam={c.category} summary={c.summary} fromPrice={c.fromPrice} image={c.thumbnailR2Key} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
