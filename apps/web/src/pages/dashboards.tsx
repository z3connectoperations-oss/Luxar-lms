import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, TrendingUp, Award, CalendarClock, GraduationCap, ArrowRight,
  CalendarDays, Activity, type LucideIcon,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { Card, Chip, Progress } from "../components/ui";

function StatCard({ icon: Icon, label, value, tone }: {
  icon: LucideIcon;
  label: string; value: string | number; tone: "brand" | "amber" | "sky";
}) {
  return (
    <Card className="flex items-center gap-4">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-50 text-gold-600">
        <Icon size={22} />
      </span>
      <div>
        <div className="text-2xl font-extrabold text-ink">{value}</div>
        <div className="text-sm text-muted">{label}</div>
      </div>
    </Card>
  );
}

interface Enrollment { id: string; courseId: string; title: string; slug: string; image: string | null; expiryDate: string | null; progressPct: number }
interface SchedEvent { id: string; title: string; type: string; startsAt: string; courseTitle: string }
interface Notif { id: string; title: string; body: string | null; read: boolean; createdAt: string }

const COVER_GRADIENTS = ["from-neutral-800 to-neutral-950", "from-stone-800 to-stone-950", "from-zinc-800 to-zinc-950", "from-gray-800 to-gray-950"];
const gradFor = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COVER_GRADIENTS[h % COVER_GRADIENTS.length]; };

export function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [events, setEvents] = useState<SchedEvent[]>([]);
  const [activity, setActivity] = useState<Notif[]>([]);

  useEffect(() => {
    api<{ enrollments: Enrollment[] }>("/me/enrollments").then((d) => setEnrollments(d.enrollments)).catch(() => {});
    api<{ events: SchedEvent[] }>("/me/schedule").then((d) => setEvents(d.events)).catch(() => {});
    api<{ notifications: Notif[] }>("/me/notifications").then((d) => setActivity(d.notifications)).catch(() => {});
  }, []);

  const avg = enrollments.length ? Math.round(enrollments.reduce((s, e) => s + e.progressPct, 0) / enrollments.length) : 0;
  const first = user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card">
        <BookOpen size={120} className="pointer-events-none absolute -right-4 -top-4 text-gold-50" />
        <div className="relative">
          <h1 className="text-xl font-semibold text-ink">Welcome back, {first}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {enrollments.length
              ? `You're enrolled in ${enrollments.length} course${enrollments.length > 1 ? "s" : ""} with ${avg}% average progress. Keep the momentum going!`
              : "Browse the catalog and enroll in your first course to begin your journey."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-gold-200"><BookOpen size={13} /> {enrollments.length} Courses</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-gold-200"><TrendingUp size={13} /> {avg}% Progress</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Enrolled courses */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Enrolled Courses</h2>
            <Link to="/student/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-gold-600">View all <ArrowRight size={15} /></Link>
          </div>
          {enrollments.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-50 text-gold-600"><GraduationCap size={26} /></span>
              <p className="text-muted">You haven't enrolled in any course yet.</p>
              <Link to="/courses" className="font-semibold text-gold-600">Browse courses →</Link>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {enrollments.map((e) => <EnrolledCard key={e.id} e={e} />)}
            </div>
          )}
        </section>

        {/* Right rail */}
        <div className="space-y-6">
          <Card className="p-0">
            <div className="flex items-center gap-2 border-b border-divider px-5 py-4">
              <CalendarDays size={18} className="text-gold-500" />
              <h3 className="font-semibold text-ink">Upcoming Schedule</h3>
            </div>
            <div className="divide-y divide-divider">
              {events.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">No upcoming classes scheduled.</p>
              ) : (
                events.slice(0, 4).map((ev) => {
                  const d = new Date(ev.startsAt);
                  return (
                    <div key={ev.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-50 text-center leading-none text-ink">
                        <div className="text-[10px] font-bold uppercase">{d.toLocaleString("en", { month: "short" })}</div>
                        <div className="text-lg font-extrabold">{d.getDate()}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{ev.title}</div>
                        <div className="text-xs text-muted">{d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} · {ev.courseTitle}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Link to="/student/schedule" className="block border-t border-divider px-5 py-3 text-center text-sm font-semibold text-gold-600">Full calendar</Link>
          </Card>

          <Card className="p-0">
            <div className="flex items-center gap-2 border-b border-divider px-5 py-4">
              <Activity size={18} className="text-gold-500" />
              <h3 className="font-semibold text-ink">Recent Activity</h3>
            </div>
            <div className="divide-y divide-divider">
              {activity.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">No recent activity.</p>
              ) : (
                activity.slice(0, 5).map((n) => (
                  <div key={n.id} className="flex gap-3 px-5 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-border" : "bg-gold-500"}`} />
                    <div>
                      <div className="text-sm font-medium text-ink">{n.title}</div>
                      {n.body && <div className="text-xs text-muted">{n.body}</div>}
                      <div className="mt-0.5 text-[11px] text-faint">{new Date(n.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EnrolledCard({ e }: { e: Enrollment }) {
  const [imgOk, setImgOk] = useState(true);
  const showImg = e.image && e.image.startsWith("http") && imgOk;
  return (
    <Card className="flex flex-col p-0">
      <div className={`relative h-32 overflow-hidden rounded-t-2xl ${showImg ? "" : `bg-gradient-to-br ${gradFor(e.slug)}`}`}>
        {showImg ? (
          <img src={e.image as string} alt={e.title} onError={() => setImgOk(false)} className="h-full w-full object-cover" />
        ) : (
          <BookOpen size={26} className="absolute bottom-3 left-4 text-white/90" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-snug text-ink">{e.title}</h3>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-muted"><span>Progress</span><span>{e.progressPct}%</span></div>
          <Progress value={e.progressPct} />
        </div>
        <Link
          to={`/student/courses/${e.courseId}`}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-gold-600 hover:text-ink"
        >
          Continue Learning <ArrowRight size={16} />
        </Link>
      </div>
    </Card>
  );
}

export function TrainerDashboard() {
  const [courses, setCourses] = useState<{ id: string; title: string; status: string }[]>([]);
  useEffect(() => {
    api<{ courses: { id: string; title: string; status: string }[] }>("/trainer/courses").then((d) => setCourses(d.courses)).catch(() => {});
  }, []);
  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">Trainer dashboard</h1>
        <Chip tone="brand">trainer</Chip>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Assigned courses" value={courses.length} tone="brand" />
        <StatCard icon={CalendarClock} label="Upcoming classes" value="—" tone="sky" />
        <StatCard icon={Award} label="Students taught" value="—" tone="amber" />
      </div>
      <Card>
        <h2 className="font-semibold text-ink">Your assigned courses</h2>
        {courses.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No courses assigned yet. An admin assigns trainers to courses.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {courses.map((c) => (
              <Link key={c.id} to={`/trainer/courses/${c.id}`} className="flex items-center justify-between rounded-xl border border-border p-3 transition-all duration-200 hover:bg-gold-50 hover:border-gold-400">
                <span className="font-medium text-ink">{c.title}</span>
                <Chip tone={c.status === "published" ? "brand" : "yellow"}>{c.status}</Chip>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
