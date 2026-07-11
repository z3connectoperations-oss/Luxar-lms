import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, Users, IndianRupee, TrendingUp, CreditCard, GraduationCap,
  MessageSquare, Phone, Target, Activity, CheckCircle2, type LucideIcon,
} from "lucide-react";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";
import { formatINR } from "../../lib/format";

interface Dashboard {
  counts: {
    courses: number; students: number; trainers: number; variants: number;
    enrollments: number; courseEnrollments: number; testSeriesEnrollments: number; paidOrders: number;
  };
  revenue: { total: number; verified: number; thisMonth: number };
  revenueByMonth: { label: string; revenue: number }[];
  recentPayments: { id: string; userName: string; userEmail: string; item: string; amount: number; provider: string; verified: boolean; date: string | null }[];
  activity: { type: "course" | "test-series"; userName: string; item: string; date: string | null }[];
  topCourses: { title: string; count: number }[];
}
interface Lead { id: string; name: string; phone: string; examInterest: string | null; createdAt: string }

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—");

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: LucideIcon; accent?: boolean }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lux ${accent ? "border-gold-300 bg-gradient-to-br from-gold-50 to-white" : "border-border bg-white hover:border-gold-400"}`}>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold-500/10 blur-2xl transition-all group-hover:bg-gold-500/20" />
      <div className="relative z-10 flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-600 ring-1 ring-gold-100 transition-transform group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-extrabold tracking-tight text-ink">{value}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div className="flex h-40 items-end justify-between gap-2 sm:gap-3">
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg bg-gold-400 transition-all duration-500 group-hover:bg-gold-500"
              style={{ height: `${Math.max(4, (d.revenue / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-ink opacity-0 transition group-hover:opacity-100">
              {formatINR(d.revenue)}
            </span>
          </div>
          <span className="text-[10px] font-medium text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [d, setD] = useState<Dashboard | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    api<Dashboard>("/admin/dashboard").then(setD).catch(() => {});
    api<{ leads: Lead[] }>("/admin/leads").then((r) => setLeads(r.leads || [])).catch(() => {});
  }, []);

  const c = d?.counts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white shadow-soft">
            <span className="font-display font-bold">L</span>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none text-ink">Admin Dashboard</h1>
            <p className="mt-1 text-xs text-muted">Payments, students &amp; analytics at a glance</p>
          </div>
        </div>
        <Chip tone="brand" className="shadow-sm">admin</Chip>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Total Revenue" value={d ? formatINR(d.revenue.total) : "—"} icon={IndianRupee} accent />
        <Kpi label="This Month" value={d ? formatINR(d.revenue.thisMonth) : "—"} icon={TrendingUp} accent />
        <Kpi label="Students" value={c?.students ?? "—"} icon={Users} />
        <Kpi label="Enrollments" value={c?.enrollments ?? "—"} icon={GraduationCap} />
        <Kpi label="Paid Orders" value={c?.paidOrders ?? "—"} icon={CreditCard} />
        <Kpi label="Courses" value={c?.courses ?? "—"} icon={BookOpen} />
      </div>

      {/* Revenue chart + Top courses */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display font-bold text-ink">
              <TrendingUp size={18} className="text-gold-500" /> Revenue — last 6 months
            </h2>
            <span className="text-xs font-semibold text-muted">Total {d ? formatINR(d.revenue.total) : "—"}</span>
          </div>
          {d ? <RevenueChart data={d.revenueByMonth} /> : <div className="h-40 animate-pulse rounded-xl bg-canvas" />}
        </Card>

        <Card className="flex flex-col">
          <h2 className="mb-4 flex items-center gap-2 font-display font-bold text-ink">
            <Target size={18} className="text-gold-500" /> Top Courses
          </h2>
          <div className="space-y-3">
            {!d ? (
              <div className="h-24 animate-pulse rounded-xl bg-canvas" />
            ) : d.topCourses.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No enrollments yet.</p>
            ) : (
              d.topCourses.map((t, i) => {
                const max = Math.max(1, ...d.topCourses.map((x) => x.count));
                return (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate pr-2 font-medium text-ink">{t.title}</span>
                      <span className="shrink-0 font-bold text-gold-700">{t.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gold-100">
                      <div className="h-full rounded-full bg-gold-500" style={{ width: `${(t.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Payments + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
            <h2 className="flex items-center gap-2 font-display font-bold text-ink">
              <CreditCard size={18} className="text-gold-500" /> Recent Payments
            </h2>
            <Link to="/admin/enrollments" className="text-xs font-bold uppercase tracking-wider text-gold-600 hover:text-gold-700">View All</Link>
          </div>
          <div className="divide-y divide-border">
            {!d ? (
              <div className="h-24 animate-pulse rounded-xl bg-canvas" />
            ) : d.recentPayments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No payments yet.</p>
            ) : (
              d.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-ink">{p.userName}</span>
                      {p.verified && <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />}
                    </div>
                    <div className="truncate text-xs text-muted">{p.item} · {fmtDate(p.date)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold text-ink">{formatINR(p.amount)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">{p.provider}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-4 font-display font-bold text-ink">
            <Activity size={18} className="text-gold-500" /> Student Activity
          </h2>
          <div className="divide-y divide-border">
            {!d ? (
              <div className="h-24 animate-pulse rounded-xl bg-canvas" />
            ) : d.activity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No recent activity.</p>
            ) : (
              d.activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${a.type === "course" ? "bg-gold-100 text-gold-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {a.type === "course" ? <BookOpen size={15} /> : <Target size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-ink">
                      <span className="font-semibold">{a.userName}</span> enrolled in <span className="font-medium">{a.item}</span>
                    </div>
                    <div className="text-xs text-muted">{fmtDate(a.date)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card className="flex flex-col">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
          <h2 className="flex items-center gap-2 font-display font-bold text-ink">
            <MessageSquare size={18} className="text-gold-500" /> Recent Leads
          </h2>
          <Link to="/admin/leads" className="text-xs font-bold uppercase tracking-wider text-gold-600 hover:text-gold-700">View All</Link>
        </div>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {leads.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No recent leads found.</p>
          ) : (
            leads.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div>
                  <div className="font-semibold text-ink">{l.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <Phone size={12} /> {l.phone} · {new Date(l.createdAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
                {l.examInterest && <Chip tone="brand" className="text-[10px] uppercase tracking-wider">{l.examInterest}</Chip>}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
