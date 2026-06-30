import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";

interface Course { id: string; title: string; status: string }

export default function TrainerCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    api<{ courses: Course[] }>("/trainer/courses").then((d) => setCourses(d.courses)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Assigned Courses</h1>
      {courses.length === 0 ? (
        <Card className="text-muted">No courses assigned to you yet. An admin assigns trainers to courses.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <Link key={c.id} to={`/trainer/courses/${c.id}`}>
              <Card className="flex items-center justify-between">
                <span className="font-semibold text-ink">{c.title}</span>
                <Chip tone={c.status === "published" ? "blue" : "yellow"}>{c.status}</Chip>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
