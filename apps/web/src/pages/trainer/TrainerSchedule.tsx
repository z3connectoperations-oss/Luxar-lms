import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Input, Select, Label, Chip } from "../../components/ui";

interface Course { id: string; title: string }
interface Event { id: string; title: string; type: string; startsAt: string; courseTitle: string; courseId: string }

const tone = (t: string) => (t === "live" ? "pink" : t === "test" ? "yellow" : "blue") as "pink" | "yellow" | "blue";

export default function TrainerSchedule() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState({ courseId: "", title: "", type: "class", startsAt: "" });

  const load = () => {
    api<{ courses: Course[] }>("/trainer/courses").then((d) => setCourses(d.courses));
    api<{ events: Event[] }>("/trainer/schedule").then((d) => setEvents(d.events));
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId || !form.title || !form.startsAt) return;
    await api(`/trainer/courses/${form.courseId}/schedule`, {
      method: "POST",
      body: JSON.stringify({ title: form.title, type: form.type, startsAt: new Date(form.startsAt).toISOString() }),
    });
    setForm({ courseId: "", title: "", type: "class", startsAt: "" });
    load();
  };
  const del = async (id: string) => { await api(`/trainer/schedule/${id}`, { method: "DELETE" }); load(); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Schedule a class</h1>
      <Card>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Course</Label>
            <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              <option value="">— select —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="class">class</option>
              <option value="live">live</option>
              <option value="test">test</option>
              <option value="deadline">deadline</option>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. ESI doubt session" />
          </div>
          <div>
            <Label>Date & time</Label>
            <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Add to schedule</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        <h2 className="font-semibold text-ink">Upcoming</h2>
        {events.length === 0 && <Card className="text-muted">No scheduled events.</Card>}
        {events.map((e) => (
          <Card key={e.id} className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-ink">{e.title}</div>
              <div className="text-xs text-muted">{e.courseTitle} · {new Date(e.startsAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <Chip tone={tone(e.type)}>{e.type}</Chip>
              <button className="text-sm text-accent-pink" onClick={() => del(e.id)}>Delete</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
