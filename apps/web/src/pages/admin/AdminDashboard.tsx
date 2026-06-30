import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";
import { BookOpen, Users, GraduationCap, Copy, ArrowRight, MessageSquare, Phone, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  courses: number;
  students: number;
  trainers: number;
  variants: number;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  examInterest: string | null;
  createdAt: string;
}

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-gold-400 hover:shadow-lux">
      {/* Subtle background glow effect on hover */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold-500/10 blur-2xl transition-all group-hover:bg-gold-500/20"></div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 relative z-10">
        <div className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-600 ring-1 ring-gold-100 transition-transform group-hover:scale-110">
          <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">{value}</div>
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    api<Stats>("/admin/stats").then(setStats).catch(() => {});
    api<{ leads: Lead[] }>("/admin/leads").then((d) => setLeads(d.leads || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white shadow-soft">
            <span className="font-display font-bold">L</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink leading-none">Admin Dashboard</h1>
            <p className="text-xs text-muted mt-1">Master root access</p>
          </div>
        </div>
        <Chip tone="brand" className="shadow-sm">admin</Chip>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <Stat label="Courses" value={stats?.courses ?? "—"} icon={BookOpen} />
        <Stat label="Students" value={stats?.students ?? "—"} icon={Users} />
        <Stat label="Trainers" value={stats?.trainers ?? "—"} icon={GraduationCap} />
        <Stat label="Variants" value={stats?.variants ?? "—"} icon={Copy} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Info Card */}
        <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-5 sm:p-6 shadow-sm flex flex-col justify-center h-full">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-500/20 text-gold-700">
              <ArrowRight size={20} className="sm:-rotate-45" />
            </div>
            <div>
              <h2 className="font-semibold text-ink text-base sm:text-lg">Manage everything from here</h2>
              <p className="mt-1.5 text-[13px] sm:text-sm text-muted leading-relaxed max-w-xl">
                Categories, courses, lessons, materials, website content, users and pricing are managed here
                and reflect across the public website and the student & trainer portals. Use the sidebar to navigate.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Leads Widget */}
        <Card className="h-full flex flex-col">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold-100 text-gold-600">
                <MessageSquare size={16} />
              </div>
              <h2 className="font-display font-bold text-ink">Recent Leads</h2>
            </div>
            <Link to="/admin/leads" className="text-xs font-bold uppercase tracking-wider text-gold-600 hover:text-gold-700">View All</Link>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-border">
              {leads.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">No recent leads found.</p>
              ) : (
                leads.slice(0, 4).map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-semibold text-ink">{l.name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted mt-1">
                        <span className="flex items-center gap-1"><Phone size={12}/> {l.phone}</span>
                        <span>•</span>
                        <span>{new Date(l.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {l.examInterest && (
                      <Chip tone="brand" className="text-[10px] uppercase tracking-wider">{l.examInterest}</Chip>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
