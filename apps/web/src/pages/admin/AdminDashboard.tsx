import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";

interface Stats {
  courses: number;
  students: number;
  trainers: number;
  variants: number;
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: "pink" | "yellow" | "blue" }) {
  return (
    <div className="rounded-2xl bg-gold-50 border border-gold-200 p-5 transition-all duration-300 hover:border-gold-400 hover:shadow-soft">
      <div className="text-2xl font-semibold text-ink">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/admin/stats").then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">Admin — master root</h1>
        <Chip tone="brand">admin</Chip>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Courses" value={stats?.courses ?? "—"} tone="pink" />
        <Stat label="Students" value={stats?.students ?? "—"} tone="blue" />
        <Stat label="Trainers" value={stats?.trainers ?? "—"} tone="yellow" />
        <Stat label="Course variants" value={stats?.variants ?? "—"} tone="pink" />
      </div>
      <Card>
        <h2 className="font-semibold text-ink">Manage everything from here</h2>
        <p className="mt-1 text-sm text-muted">
          Categories, courses, lessons, materials, website content, users and pricing are managed here
          and reflect across the public website and the student & trainer portals.
        </p>
      </Card>
    </div>
  );
}
