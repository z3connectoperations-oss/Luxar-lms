import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui";

interface Notif { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string }
interface Prefs { email: boolean; push: boolean; inApp: boolean }

export default function Notifications() {
  const [items, setItems] = useState<Notif[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  const load = () => api<{ notifications: Notif[] }>("/me/notifications").then((d) => setItems(d.notifications)).catch(() => {});
  useEffect(() => {
    load();
    api<{ prefs: Prefs }>("/me/notification-prefs").then((d) => setPrefs(d.prefs)).catch(() => {});
  }, []);

  const savePrefs = async (next: Prefs) => {
    setPrefs(next);
    await api("/me/notification-prefs", { method: "PUT", body: JSON.stringify(next) }).catch(() => {});
  };

  const markRead = async (id: string) => {
    await api(`/me/notifications/${id}/read`, { method: "POST" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Notifications</h1>

      {prefs && (
        <Card className="bg-container-blue">
          <h2 className="mb-2 font-semibold text-ink">Preferences</h2>
          <div className="flex flex-wrap gap-5 text-sm text-ink">
            <label className="flex items-center gap-2 opacity-60"><input type="checkbox" checked readOnly /> In-app (always on)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.email} onChange={(e) => savePrefs({ ...prefs, email: e.target.checked })} /> Email me</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.push} onChange={(e) => savePrefs({ ...prefs, push: e.target.checked })} /> Push (coming soon)</label>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="text-muted">No notifications yet.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.read ? "" : "border-accent-pink"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{n.title}</div>
                  {n.body && <div className="text-sm text-muted">{n.body}</div>}
                  <div className="mt-1 text-xs text-faint">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.read && <button className="shrink-0 text-sm text-accent-pink" onClick={() => markRead(n.id)}>Mark read</button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
