import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Search, Download } from "lucide-react";
import { api } from "../../lib/api";
import { formatINR } from "../../lib/format";
import { Input } from "../../components/ui";

interface Row {
  sl: number; enrollmentId: string; userId: string;
  name: string; email: string; phone: string | null;
  enrolledAt: string | null; expiryDate: string | null;
  progressPct: number; amountPaise: number; paymentStatus: string;
}
interface Detail {
  course: { id: string; title: string; slug: string; thumbnailR2Key: string | null; price: number | null; discountPrice: number | null };
  totalRevenuePaise: number;
  rows: Row[];
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
const statusTone = (s: string) =>
  s === "paid" ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
  : s === "free" ? "bg-brand-50 text-brand-700 ring-brand-100"
  : s === "failed" ? "bg-red-50 text-red-700 ring-red-100"
  : "bg-amber-50 text-amber-800 ring-amber-100";

export default function EnrollmentDetail() {
  const { courseId } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    api<Detail>(`/admin/enrollments/courses/${courseId}`).then(setData).catch(() => setData(null));
  }, [courseId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    if (!s) return data.rows;
    return data.rows.filter((r) =>
      r.name.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      (r.phone || "").toLowerCase().includes(s)
    );
  }, [data, q]);

  const exportCsv = () => {
    if (!data) return;
    const cols = ["#", "Name", "Email", "Phone", "Enrolled on", "Expiry", "Progress %", "Amount (INR)", "Status"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [cols.join(",")].concat(
      filtered.map((r) => [
        r.sl, r.name, r.email, r.phone || "", fmt(r.enrolledAt), fmt(r.expiryDate),
        r.progressPct, (r.amountPaise / 100).toFixed(2), r.paymentStatus,
      ].map(escape).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `enrollments-${data.course.slug}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (!data) return <div className="text-muted">Loading…</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Link to="/admin/enrollments" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
        <ChevronLeft size={16} /> All enrolled courses
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{data.course.title}</h1>
          <p className="text-sm text-muted">
            {data.rows.length} enrollment{data.rows.length === 1 ? "" : "s"}
            {" · "}Total revenue: <span className="font-semibold text-ink">{formatINR(data.totalRevenuePaise)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone" className="!pl-7 w-56" />
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Excel-style table */}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-canvas text-left">
            <tr className="text-muted">
              {["#", "Student name", "Email", "Phone", "Enrolled on", "Expiry date", "Progress", "Amount paid", "Status"].map((h) => (
                <th key={h} className="border-b border-r border-border px-3 py-2 font-semibold last:border-r-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-muted">No enrollments match.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.enrollmentId} className="odd:bg-card even:bg-canvas hover:bg-brand-50/50">
                <td className="border-b border-r border-border px-3 py-1.5 text-center font-medium text-muted">{r.sl}</td>
                <td className="border-b border-r border-border px-3 py-1.5 font-medium text-ink">{r.name}</td>
                <td className="border-b border-r border-border px-3 py-1.5 text-muted">{r.email}</td>
                <td className="border-b border-r border-border px-3 py-1.5 text-muted">{r.phone || "—"}</td>
                <td className="border-b border-r border-border px-3 py-1.5 text-muted">{fmt(r.enrolledAt)}</td>
                <td className="border-b border-r border-border px-3 py-1.5 text-muted">{fmt(r.expiryDate)}</td>
                <td className="border-b border-r border-border px-3 py-1.5 text-muted">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-canvas"><div className="h-full bg-brand-500" style={{ width: `${Math.min(100, Math.max(0, r.progressPct))}%` }} /></div>
                    <span className="tabular-nums">{r.progressPct}%</span>
                  </div>
                </td>
                <td className="border-b border-r border-border px-3 py-1.5 text-right font-medium text-ink tabular-nums">
                  {r.paymentStatus === "free" ? "Free" : formatINR(r.amountPaise)}
                </td>
                <td className="border-b px-3 py-1.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ${statusTone(r.paymentStatus)}`}>
                    {r.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted">Showing {filtered.length} of {data.rows.length} · Amount in INR · Hover a row to highlight · Export to open in Excel/Sheets.</p>
      )}
    </div>
  );
}
