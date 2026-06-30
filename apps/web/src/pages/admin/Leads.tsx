import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  examInterest: string | null;
  source: string | null;
  createdAt: string;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    api<{ leads: Lead[] }>("/admin/leads").then((d) => setLeads(d.leads || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Leads / Enquiries</h1>
      <p className="text-sm text-muted">Manage all incoming leads from the website contact forms.</p>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Recent Enquiries</h2>
            <p className="text-sm text-muted">All leads generated from the website.</p>
          </div>
          <Chip tone="brand">{leads.length} total</Chip>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="pb-3 font-semibold uppercase tracking-wider text-xs">Date</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-xs">Name</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-xs">Phone</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-xs">Email</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-xs">Interest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted">No enquiries found.</td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-canvas/50">
                    <td className="py-3 pr-4 whitespace-nowrap">{new Date(l.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 font-medium">{l.name}</td>
                    <td className="py-3 pr-4">{l.phone}</td>
                    <td className="py-3 pr-4 text-muted">{l.email || "—"}</td>
                    <td className="py-3 pr-4">
                      {l.examInterest ? <Chip tone="brand">{l.examInterest}</Chip> : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
