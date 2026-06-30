import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Chip } from "../../components/ui";

interface Slot { id: string; startTime: string; capacity: number; booked: number; mentorName: string | null }
interface Booking { id: string; status: string; startTime: string; mentorName: string | null }

export default function Mentorship() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [msg, setMsg] = useState("");

  const load = () => {
    api<{ slots: Slot[] }>("/me/mentorship/slots").then((d) => setSlots(d.slots)).catch(() => {});
    api<{ bookings: Booking[] }>("/me/bookings").then((d) => setBookings(d.bookings)).catch(() => {});
  };
  useEffect(load, []);

  const book = async (id: string) => {
    setMsg("");
    try { await api(`/me/mentorship/book/${id}`, { method: "POST" }); setMsg("Booked! See your sessions below."); load(); }
    catch (e: any) { setMsg(e.message); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">1:1 Mentorship</h1>
      {msg && <div className="rounded-lg bg-container-blue p-3 text-sm text-ink">{msg}</div>}

      <div>
        <h2 className="mb-2 font-semibold text-ink">Available slots</h2>
        {slots.length === 0 ? <Card className="text-muted">No open slots right now.</Card> : (
          <div className="space-y-2">
            {slots.map((s) => (
              <Card key={s.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-ink">{new Date(s.startTime).toLocaleString()}</div>
                  <div className="text-xs text-muted">{s.mentorName} · {(s.capacity - s.booked)} seat(s) left</div>
                </div>
                <Button onClick={() => book(s.id)}>Book</Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-ink">My sessions</h2>
        {bookings.length === 0 ? <Card className="text-muted">No bookings yet.</Card> : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <Card key={b.id} className="flex items-center justify-between">
                <span className="text-ink">{new Date(b.startTime).toLocaleString()} · {b.mentorName}</span>
                <Chip tone="blue">{b.status}</Chip>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
