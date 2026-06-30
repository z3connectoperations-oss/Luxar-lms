import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card } from "../../components/ui";
import CourseCard from "../../components/CourseCard";

interface Enrollment { id: string; courseId: string; title: string; slug: string; image: string | null; expiryDate: string | null; progressPct: number }

export default function MyCourses() {
  const [items, setItems] = useState<Enrollment[]>([]);

  useEffect(() => {
    api<{ enrollments: Enrollment[] }>("/me/enrollments").then((d) => setItems(d.enrollments)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">My Courses</h1>
      {items.length === 0 ? (
        <Card className="text-muted">No enrolled courses yet. <Link to="/courses" className="font-semibold text-brand-600">Browse courses →</Link></Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <CourseCard key={e.id} title={e.title} slug={e.slug} image={e.image} progress={e.progressPct} to={`/student/courses/${e.courseId}`} />
          ))}
        </div>
      )}
    </div>
  );
}
