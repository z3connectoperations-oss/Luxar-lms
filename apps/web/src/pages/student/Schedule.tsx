import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";

interface Event { id: string; title: string; type: string; startsAt: string; endsAt: string | null; courseTitle: string }

const tone = (t: string) => (t === "live" ? "pink" : t === "test" ? "yellow" : "blue") as "pink" | "yellow" | "blue";

export default function Schedule() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    api<{ events: Event[] }>("/me/schedule").then((d) => setEvents(d.events)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Schedule</h1>
      {events.length === 0 ? (
        <Card className="text-muted">No upcoming classes or events. Trainers will schedule sessions for your courses.</Card>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Card key={e.id} className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-ink">{e.title}</div>
                <div className="text-xs text-muted">{e.courseTitle} · {new Date(e.startsAt).toLocaleString()}</div>
              </div>
              <Chip tone={tone(e.type)}>{e.type}</Chip>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
