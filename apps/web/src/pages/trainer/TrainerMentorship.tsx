import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Input, Label, Chip } from "../../components/ui";

interface Slot { id: string; startTime: string; capacity: number; booked: number }

export default function TrainerMentorship() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [f, setF] = useState({ startTime: "", capacity: 1 });

  const load = () => { api<{ slots: Slot[] }>("/trainer/mentorship/slots").then((d) => setSlots(d.slots)).catch(() => {}); };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.startTime) return;
    await api("/trainer/mentorship/slots", { method: "POST", body: JSON.stringify({ startTime: new Date(f.startTime).toISOString(), capacity: Number(f.capacity) }) });
    setF({ startTime: "", capacity: 1 }); load();
  };
  const del = async (id: string) => { await api(`/trainer/mentorship/slots/${id}`, { method: "DELETE" }); load(); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Mentorship Slots</h1>
      <Card>
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div><Label>Date & time</Label><Input type="datetime-local" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></div>
          <div className="w-28"><Label>Capacity</Label><Input type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} /></div>
          <Button type="submit">Open slot</Button>
        </form>
      </Card>
      <div className="space-y-2">
        {slots.map((s) => (
          <Card key={s.id} className="flex items-center justify-between">
            <span className="text-ink">{new Date(s.startTime).toLocaleString()}</span>
            <div className="flex items-center gap-3"><Chip tone="blue">{s.booked}/{s.capacity} booked</Chip><button className="text-accent-pink" onClick={() => del(s.id)}>Delete</button></div>
          </Card>
        ))}
        {slots.length === 0 && <Card className="text-muted">No slots yet.</Card>}
      </div>
    </div>
  );
}
