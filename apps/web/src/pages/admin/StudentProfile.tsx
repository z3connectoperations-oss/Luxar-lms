import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, BookOpen, Target, Mic, Award, CheckCircle2, Clock, Mail, Phone, ClipboardCheck } from "lucide-react";
import { api } from "../../lib/api";

interface MockAttempt { score: number; correctCount: number; submittedAt: string | null }
interface CourseItem {
  courseId: string; title: string; slug: string | null; progressPct: number;
  lessonsCompleted: number; lessonsTotal: number; enrolledAt: string | null; expiryDate: string | null;
  certified: boolean; mockAttempts: MockAttempt[];
}
interface TSAttempt { testId: string; testTitle: string; score: number; correctCount: number; totalMarks: number; submittedAt: string | null }
interface TestSeriesItem {
  testSeriesId: string; title: string; slug: string | null; enrolledAt: string | null; expiryDate: string | null;
  testsCompleted: number; totalTests: number; attempts: TSAttempt[];
}
interface Interview { id: string; scheduledAt: string | null; status: string; feedbackMd: string | null }
interface Profile {
  user: { id: string; name: string; email: string; phone: string | null; status: string; role: string; createdAt: string | null };
  courses: CourseItem[];
  testSeries: TestSeriesItem[];
  interviews: Interview[];
  summary: { courseCount: number; testSeriesCount: number; testsAttempted: number };
}

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gold-100">
      <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export default function AdminStudentProfile() {
  const { id } = useParams();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Profile>(`/admin/users/${id}/profile`)
      .then(setData)
      .catch((e: any) => setErr(e.message || "Failed to load student"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-muted">Loading profile…</div>;
  if (err || !data) return <div className="p-12 text-center text-red-600">{err || "Not found"}</div>;

  const { user, courses, testSeries, interviews, summary } = data;

  return (
    <div className="space-y-5">
      <Link to="/admin/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink">
        <ChevronLeft size={16} /> All students
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gold-100 text-lg font-bold text-gold-700">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-ink">{user.name}</h1>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5"><Mail size={13} /> {user.email}</span>
                {user.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {user.phone}</span>}
                <span className="inline-flex items-center gap-1.5"><Clock size={13} /> Joined {fmtDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
          <span className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
            {user.status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Courses", value: summary.courseCount, icon: BookOpen },
            { label: "Test Series", value: summary.testSeriesCount, icon: Target },
            { label: "Tests Attempted", value: summary.testsAttempted, icon: ClipboardCheck },
          ].map((t) => (
            <div key={t.label} className="rounded-xl bg-canvas p-3 text-center">
              <t.icon size={16} className="mx-auto text-gold-500" />
              <div className="mt-1 font-display text-xl font-bold text-ink">{t.value}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted">{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Courses */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
          <BookOpen size={16} className="text-gold-500" /> Courses ({courses.length})
        </h2>
        {courses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted">Not enrolled in any course.</p>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <div key={c.courseId} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-ink">{c.title}</h3>
                    <p className="text-xs text-muted">Enrolled {fmtDate(c.enrolledAt)}{c.expiryDate ? ` · expires ${fmtDate(c.expiryDate)}` : ""}</p>
                  </div>
                  {c.certified && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                      <Award size={12} /> Certified
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar pct={c.progressPct} />
                  <span className="shrink-0 text-sm font-semibold text-ink">{c.progressPct}%</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} className="text-gold-500" /> {c.lessonsCompleted}/{c.lessonsTotal} lessons completed</span>
                  {c.mockAttempts.length > 0 && (
                    <span className="inline-flex items-center gap-1"><ClipboardCheck size={13} className="text-gold-500" /> {c.mockAttempts.length} mock test{c.mockAttempts.length > 1 ? "s" : ""} attempted</span>
                  )}
                </div>

                {c.mockAttempts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.mockAttempts.map((m, i) => (
                      <span key={i} className="rounded-lg bg-canvas px-2.5 py-1 text-xs text-ink">
                        Mock: <b>{m.score}</b> ({m.correctCount} correct) · {fmtDate(m.submittedAt)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Test Series */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
          <Target size={16} className="text-gold-500" /> Test Series ({testSeries.length})
        </h2>
        {testSeries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted">Not enrolled in any test series.</p>
        ) : (
          <div className="space-y-3">
            {testSeries.map((ts) => (
              <div key={ts.testSeriesId} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-ink">{ts.title}</h3>
                    <p className="text-xs text-muted">Enrolled {fmtDate(ts.enrolledAt)}{ts.expiryDate ? ` · expires ${fmtDate(ts.expiryDate)}` : ""}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gold-50 px-2.5 py-1 text-[10px] font-bold uppercase text-gold-700 ring-1 ring-gold-200">
                    {ts.testsCompleted}/{ts.totalTests} tests
                  </span>
                </div>

                {ts.attempts.length === 0 ? (
                  <p className="mt-3 text-xs text-muted">No tests attempted yet.</p>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-canvas text-[11px] uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Test</th>
                          <th className="px-3 py-2 text-center font-semibold">Score</th>
                          <th className="px-3 py-2 text-center font-semibold">Correct</th>
                          <th className="px-3 py-2 font-semibold">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ts.attempts.map((a, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium text-ink">{a.testTitle}</td>
                            <td className="px-3 py-2 text-center font-bold text-ink">{a.score}<span className="text-muted">/{a.totalMarks}</span></td>
                            <td className="px-3 py-2 text-center text-muted">{a.correctCount}</td>
                            <td className="px-3 py-2 text-muted">{fmtDate(a.submittedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Interviews */}
      {interviews.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
            <Mic size={16} className="text-gold-500" /> Interview Sessions ({interviews.length})
          </h2>
          <div className="space-y-2">
            {interviews.map((iv) => (
              <div key={iv.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                <div>
                  <div className="text-sm font-semibold text-ink">Mock Interview</div>
                  <div className="text-xs text-muted">{iv.scheduledAt ? `Scheduled ${fmtDate(iv.scheduledAt)}` : "Not scheduled"}</div>
                </div>
                <span className="rounded-full bg-gold-50 px-2.5 py-1 text-[10px] font-bold uppercase text-gold-700 ring-1 ring-gold-200">{iv.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
