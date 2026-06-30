import { useEffect, useMemo, useState, Fragment } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Select, Chip, Button, Input, Label } from "../../components/ui";

interface U { id: string; email: string; name: string; phone: string | null; role: string; status: string; createdAt?: string | null }
interface Course { id: string; title: string }

const emptyForm = { id: "", name: "", email: "", phone: "", role: "trainer" };

export default function Users() {
  const [users, setUsers] = useState<U[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    api<{ users: U[] }>("/admin/users").then((d) => setUsers(d.users));
    api<{ courses: Course[] }>("/admin/courses").then((d) => setCourses(d.courses)).catch(() => {});
  };
  useEffect(load, []);

  const team = useMemo(() => users.filter((u) => u.role !== "student"), [users]);

  const setRole = async (u: U, role: string) => {
    try { await api(`/admin/users/${u.id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const openAssign = async (u: U) => {
    if (expanded === u.id) return setExpanded(null);
    const d = await api<{ assignedCourseIds: string[] }>(`/admin/users/${u.id}`);
    setAssigned(d.assignedCourseIds); setExpanded(u.id);
  };
  const toggleCourse = async (userId: string, courseId: string, on: boolean) => {
    if (on) await api(`/admin/users/${userId}/trainer-courses`, { method: "POST", body: JSON.stringify({ courseId }) });
    else await api(`/admin/users/${userId}/trainer-courses/${courseId}`, { method: "DELETE" });
    setAssigned((prev) => (on ? [...prev, courseId] : prev.filter((c) => c !== courseId)));
  };

  const openCreate = () => { setForm(emptyForm); setErr(""); setOpen(true); };
  const openEdit = (u: U) => { setForm({ id: u.id, name: u.name, email: u.email, phone: u.phone || "", role: u.role === "admin" ? "admin" : "trainer" }); setErr(""); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setErr("Name and email are required."); return; }
    setBusy(true); setErr("");
    try {
      if (form.id) {
        await api(`/admin/users/${form.id}`, { method: "PATCH", body: JSON.stringify({ name: form.name, phone: form.phone, role: form.role }) });
      } else {
        await api("/admin/users", { method: "POST", body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, role: form.role }) });
      }
      setOpen(false); load();
    } catch (e: any) { setErr(e.message || "Failed to save"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Team ({team.length})</h1>
        <Button onClick={openCreate}><Plus size={16} /> Add User</Button>
      </div>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {team.map((u) => (
              <Fragment key={u.id}>
                <tr className="border-b border-divider">
                  <td className="p-3 font-medium text-ink">{u.name}</td>
                  <td className="p-3 text-muted">{u.email}</td>
                  <td className="p-3 text-muted">{u.phone || "—"}</td>
                  <td className="p-3">
                    <Select className="w-28" value={u.role} onChange={(e) => setRole(u, e.target.value)}>
                      <option value="trainer">trainer</option>
                      <option value="admin">admin</option>
                    </Select>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {u.role === "trainer" && (
                        <Button variant="ghost" size="sm" onClick={() => openAssign(u)}>{expanded === u.id ? "Hide" : "Courses"}</Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil size={13} /> Edit</Button>
                    </div>
                  </td>
                </tr>
                {expanded === u.id && (
                  <tr className="bg-canvas">
                    <td colSpan={5} className="p-3">
                      <div className="mb-1 text-xs font-medium text-muted">Courses this trainer manages:</div>
                      <div className="flex flex-wrap gap-3">
                        {courses.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
                            <input type="checkbox" checked={assigned.includes(c.id)} onChange={(e) => toggleCourse(u.id, c.id, e.target.checked)} />
                            {c.title}
                          </label>
                        ))}
                        {courses.length === 0 && <span className="text-muted">No courses yet.</span>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {team.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted">No team members yet. Click “Add User” to invite an admin or trainer.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <p className="text-sm text-muted">
        <Chip tone="yellow">note</Chip> Added members sign in later with their email (Google or password) and are linked automatically — keeping the role you set here.
      </p>

      {/* Add/Edit modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="my-8 w-full max-w-md rounded-lg border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-base font-semibold text-ink">{form.id ? "Edit user" : "Add user"}</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-canvas hover:text-ink"><X size={16} /></button>
            </div>
            <div className="space-y-3 p-5">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" autoFocus /></div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} disabled={!!form.id} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" />
                {form.id && <p className="mt-1 text-[11px] text-faint">Email can't be changed.</p>}
              </div>
              <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" /></div>
              <div>
                <Label>Role *</Label>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              {err && <p className="text-sm font-semibold text-red-700">{err}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : form.id ? "Save changes" : "Create user"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
