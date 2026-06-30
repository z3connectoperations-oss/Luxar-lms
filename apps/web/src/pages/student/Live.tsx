import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";
import LiveRoom from "../../components/LiveRoom";

interface Session { id: string; title: string; status: string }

export default function Live() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    api<{ session: Session | null }>(`/live/course/${courseId}/active`).then((d) => setSession(d.session)).catch(() => setSession(null));
  }, [courseId]);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-canvas grid place-items-center text-muted text-sm font-medium">
        Checking for live class…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas p-6 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-7xl flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between shrink-0">
          <Link to={`/student/courses/${courseId}`} className="text-sm font-bold text-brand-600 hover:text-brand-800 transition">
            ← Back to course
          </Link>
          {session && (
            <div className="flex items-center gap-2">
              <Chip tone="neutral">● LIVE</Chip>
              <h1 className="text-base font-extrabold text-ink tracking-tight">{session.title}</h1>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {session ? (
            <LiveRoom sessionId={session.id} onLeave={() => navigate(`/student/courses/${courseId}`)} />
          ) : (
            <Card className="text-muted text-center py-16">
              <p className="font-semibold text-ink text-base mb-1">No live class is running right now.</p>
              <p className="text-xs text-muted mb-4">You’ll get a notification when a class starts.</p>
              <Link to={`/student/courses/${courseId}`}>
                <button className="px-4 py-2 bg-ink hover:bg-gold-600 hover:text-ink text-white rounded-xl text-xs font-bold transition-all duration-300">
                  Return to Dashboard
                </button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
