import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";
import ThreadView from "../../components/ThreadView";

interface Thread { id: string; title: string; courseTitle: string | null; authorName: string | null; createdAt: string }

export default function TrainerDoubts() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = () => { api<{ threads: Thread[] }>("/trainer/doubts").then((d) => setThreads(d.threads)).catch(() => {}); };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Student Doubts</h1>
      {threads.length === 0 ? (
        <Card className="text-muted">No doubts from your courses yet.</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-2">
            {threads.map((t) => (
              <button key={t.id} onClick={() => setOpen(t.id)} className="block w-full text-left">
                <Card className={open === t.id ? "border-accent-pink" : ""}>
                  <div className="font-semibold text-ink">{t.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <Chip tone="blue">{t.courseTitle}</Chip>
                    <span>by {t.authorName} · {new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </Card>
              </button>
            ))}
          </div>
          <div>
            {open ? <Card><ThreadView threadId={open} onReplied={load} /></Card> : <Card className="text-muted">Select a doubt to view and reply.</Card>}
          </div>
        </div>
      )}
    </div>
  );
}
