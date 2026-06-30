import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Button, Card, Input, Select, Chip } from "../../components/ui";
import TestsManager from "../../components/TestsManager";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8787";

interface Lesson { id: string; title: string; type: string; r2Key: string | null; streamVideoId: string | null; downloadable: boolean }
interface Module { id: string; title: string; lessons: Lesson[] }
interface Material { id: string; title: string; kind: string }
interface Data { course: { id: string; title: string; status: string }; modules: Module[]; materials: Material[] }

async function uploadFile(file: File, folder: string): Promise<string> {
  const res = await fetch(`${BASE}/trainer/upload?folder=${folder}&filename=${encodeURIComponent(file.name)}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": file.type || "application/octet-stream" }, body: file,
  });
  const { key } = await res.json();
  return key;
}

export default function CourseManage() {
  const { id } = useParams();
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(() => { api<Data>(`/trainer/courses/${id}`).then(setData).catch(() => {}); }, [id]);
  useEffect(load, [load]);

  if (!data) return <div className="text-muted">Loading…</div>;

  return (
    <div className="space-y-6">
      <Link to="/trainer/courses" className="text-sm text-accent-pink">← Assigned courses</Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">{data.course.title}</h1>
          <Chip tone={data.course.status === "published" ? "blue" : "yellow"}>{data.course.status}</Chip>
        </div>
        <Link to={`/trainer/courses/${id}/live`} target="_blank" rel="noopener noreferrer"><Button>🔴 Live class</Button></Link>
      </div>

      <ModulesPanel courseId={id!} modules={data.modules} reload={load} />
      <MaterialsPanel courseId={id!} materials={data.materials} reload={load} />
      <TestsManager courseId={id!} />
    </div>
  );
}

function ModulesPanel({ courseId, modules, reload }: { courseId: string; modules: Module[]; reload: () => void }) {
  const [title, setTitle] = useState("");
  const addModule = async () => { if (!title.trim()) return; await api(`/trainer/courses/${courseId}/modules`, { method: "POST", body: JSON.stringify({ title, position: modules.length }) }); setTitle(""); reload(); };
  const delModule = async (mid: string) => { await api(`/trainer/modules/${mid}`, { method: "DELETE" }); reload(); };
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-ink">Curriculum — modules, lessons & videos</h2>
      {modules.map((m) => (
        <div key={m.id} className="mb-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">{m.title}</span>
            <button className="text-xs text-accent-pink" onClick={() => delModule(m.id)}>Delete module</button>
          </div>
          <LessonEditor module={m} reload={reload} />
        </div>
      ))}
      <div className="flex gap-2">
        <Input placeholder="New module title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button variant="outline" onClick={addModule}>Add module</Button>
      </div>
    </Card>
  );
}

function LessonEditor({ module, reload }: { module: Module; reload: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [videoUrl, setVideoUrl] = useState("");
  const [downloadable, setDownloadable] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = async (file?: File) => {
    if (!title.trim()) return alert("Lesson title required");
    setBusy(true);
    try {
      let r2Key: string | undefined;
      if (file) r2Key = await uploadFile(file, type === "pdf" ? "lesson-pdf" : "lesson-video");
      await api(`/trainer/modules/${module.id}/lessons`, {
        method: "POST",
        body: JSON.stringify({ title, type, streamVideoId: videoUrl || undefined, r2Key, downloadable, position: module.lessons.length }),
      });
      setTitle(""); setVideoUrl(""); setDownloadable(false);
      reload();
    } finally {
      setBusy(false);
    }
  };
  const del = async (lid: string) => { await api(`/trainer/lessons/${lid}`, { method: "DELETE" }); reload(); };

  return (
    <div className="mt-2 space-y-1">
      {module.lessons.map((l) => (
        <div key={l.id} className="flex items-center justify-between rounded bg-canvas px-2 py-1 text-sm">
          <span className="text-ink">
            {l.title} <span className="text-muted">· {l.type}</span>
            {l.r2Key && <Chip tone="blue">file</Chip>} {l.streamVideoId && <Chip tone="yellow">url</Chip>} {l.downloadable && <Chip tone="pink">offline</Chip>}
          </span>
          <button className="text-xs text-accent-pink" onClick={() => del(l.id)}>Remove</button>
        </div>
      ))}
      <div className="mt-2 grid gap-2 rounded-lg bg-canvas p-2 sm:grid-cols-2">
        <Input placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="video">video</option>
          <option value="pdf">pdf</option>
          <option value="quiz">quiz</option>
          <option value="live">live</option>
        </Select>
        <Input placeholder="Or paste a video URL (optional)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={downloadable} onChange={(e) => setDownloadable(e.target.checked)} /> allow offline download
        </label>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Button variant="outline" disabled={busy} onClick={() => add()}>{busy ? "Saving…" : "Add lesson (no file)"}</Button>
          <span className="text-xs text-muted">or upload file:</span>
          <input type="file" disabled={busy} onChange={(e) => e.target.files?.[0] && add(e.target.files[0])} className="text-sm" />
        </div>
      </div>
    </div>
  );
}

function MaterialsPanel({ courseId, materials, reload }: { courseId: string; materials: Material[]; reload: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const key = await uploadFile(file, "materials");
      await api(`/trainer/courses/${courseId}/materials`, { method: "POST", body: JSON.stringify({ title: title || file.name, kind: "pdf", r2Key: key }) });
      setTitle(""); reload();
    } finally { setBusy(false); }
  };
  const del = async (mid: string) => { await api(`/trainer/materials/${mid}`, { method: "DELETE" }); reload(); };
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-ink">Materials</h2>
      {materials.map((m) => (
        <div key={m.id} className="flex items-center justify-between border-b border-divider py-2 text-sm">
          <span className="text-ink">{m.title} <span className="text-muted">· {m.kind}</span></span>
          <button className="text-accent-pink" onClick={() => del(m.id)}>Remove</button>
        </div>
      ))}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Material title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="file" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-sm" />
        {busy && <span className="text-sm text-muted">Uploading…</span>}
      </div>
    </Card>
  );
}
