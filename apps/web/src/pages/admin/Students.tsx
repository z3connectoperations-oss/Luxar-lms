import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, BookOpen, Target, ClipboardCheck, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string | null;
  courseCount: number;
  testSeriesCount: number;
  testsAttempted: number;
}

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    api<{ students: Student[] }>("/admin/students")
      .then((d) => setStudents(d.students || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return students;
    return students.filter((st) => `${st.name} ${st.email} ${st.phone ?? ""}`.toLowerCase().includes(s));
  }, [students, q]);

  const totals = useMemo(
    () => ({
      students: students.length,
      enrolled: students.filter((s) => s.courseCount + s.testSeriesCount > 0).length,
      attempts: students.reduce((a, s) => a + s.testsAttempted, 0),
    }),
    [students]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-ink">
          <Users size={22} className="text-gold-500" /> Students
        </h1>
        <p className="text-sm text-muted">Every enrolled student in one place — click a student to see their full activity.</p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Students", value: totals.students, icon: Users },
          { label: "Active (enrolled)", value: totals.enrolled, icon: BookOpen },
          { label: "Tests attempted", value: totals.attempts, icon: ClipboardCheck },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <t.icon size={18} className="text-gold-500" />
            <div className="mt-2 font-display text-2xl font-bold text-ink">{t.value}</div>
            <div className="text-xs uppercase tracking-wide text-muted">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 shadow-card">
        <Search size={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search students by name, email or phone…"
          className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
        />
        <span className="text-xs font-semibold text-muted">{filtered.length}</span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted">Loading students…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-card">
          <Users size={40} className="mx-auto mb-3 text-gold-300" />
          <h3 className="font-semibold text-ink">No students found</h3>
          <p className="text-sm text-muted">{students.length === 0 ? "No students have signed up yet." : "Try a different search."}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {/* Desktop table */}
          <table className="hidden w-full text-left text-sm sm:table">
            <thead className="bg-canvas text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 text-center font-semibold">Courses</th>
                <th className="px-4 py-3 text-center font-semibold">Test Series</th>
                <th className="px-4 py-3 text-center font-semibold">Tests Attempted</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="group cursor-pointer transition hover:bg-gold-50/40">
                  <td className="px-5 py-3">
                    <Link to={`/admin/students/${s.id}`} className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">
                        {initials(s.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{s.name}</span>
                        <span className="block truncate text-xs text-muted">{s.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-ink">{s.courseCount}</td>
                  <td className="px-4 py-3 text-center font-semibold text-ink">{s.testSeriesCount}</td>
                  <td className="px-4 py-3 text-center font-semibold text-ink">{s.testsAttempted}</td>
                  <td className="px-4 py-3 text-muted">{fmtDate(s.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/students/${s.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-gold-600 transition group-hover:text-gold-700">
                      View <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="divide-y divide-border sm:hidden">
            {filtered.map((s) => (
              <Link key={s.id} to={`/admin/students/${s.id}`} className="flex items-center gap-3 p-4 transition active:bg-gold-50/50">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-100 text-sm font-bold text-gold-700">
                  {initials(s.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{s.name}</div>
                  <div className="truncate text-xs text-muted">{s.email}</div>
                  <div className="mt-1 flex gap-3 text-[11px] font-medium text-muted">
                    <span className="inline-flex items-center gap-1"><BookOpen size={11} /> {s.courseCount}</span>
                    <span className="inline-flex items-center gap-1"><Target size={11} /> {s.testSeriesCount}</span>
                    <span className="inline-flex items-center gap-1"><ClipboardCheck size={11} /> {s.testsAttempted}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
