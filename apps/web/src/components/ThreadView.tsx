import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Textarea, Chip } from "./ui";

interface Post { id: string; bodyMd: string; isTrainerAnswer: boolean; createdAt: string; authorName: string | null }
interface Thread { id: string; title: string; bodyMd: string | null }

/** Shared doubt thread: shows posts and a reply box. Used by students & trainers. */
export default function ThreadView({ threadId, onReplied }: { threadId: string; onReplied?: () => void }) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<{ thread: Thread; posts: Post[] }>(`/learn/threads/${threadId}`).then((d) => {
      setThread(d.thread);
      setPosts(d.posts);
    }).catch(() => {});
  useEffect(() => { load(); }, [threadId]);

  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api(`/learn/threads/${threadId}/posts`, { method: "POST", body: JSON.stringify({ bodyMd: reply }) });
      setReply("");
      load();
      onReplied?.();
    } finally {
      setBusy(false);
    }
  };

  if (!thread) return <div className="text-sm text-muted">Loading…</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-ink">{thread.title}</h3>
      <div className="space-y-2">
        {posts.map((p) => (
          <Card key={p.id} className={p.isTrainerAnswer ? "bg-container-blue" : ""}>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
              <span className="font-semibold text-ink">{p.authorName || "User"}</span>
              {p.isTrainerAnswer && <Chip tone="blue">trainer</Chip>}
              <span>· {new Date(p.createdAt).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink">{p.bodyMd}</p>
          </Card>
        ))}
        {posts.length === 0 && <p className="text-sm text-muted">No replies yet.</p>}
      </div>
      <div className="space-y-2">
        <Textarea placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
        <Button onClick={send} disabled={busy}>{busy ? "Sending…" : "Reply"}</Button>
      </div>
    </div>
  );
}
