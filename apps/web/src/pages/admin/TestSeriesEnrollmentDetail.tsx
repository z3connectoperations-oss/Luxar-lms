import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, FileText, CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Chip } from "../../components/ui";

interface TestSeriesUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  enrolledAt: string;
  testsCompleted: number;
  totalTests: number;
  progressPct: number;
  attempts: any[];
}

export default function TestSeriesEnrollmentDetail() {
  const { id } = useParams();
  const [data, setData] = useState<{ testSeries: any; users: TestSeriesUser[] } | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    api<{ testSeries: any; users: TestSeriesUser[] }>(`/admin/enrollments/test-series/${id}`)
      .then(setData)
      .catch(() => {});
  }, [id]);

  if (!data) return <div className="p-10 text-center text-muted">Loading...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link to="/admin/enrollments" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <ChevronLeft size={16} /> All enrolled courses & test series
        </Link>
        <h1 className="text-2xl font-bold text-ink">{data.testSeries.title}</h1>
        <p className="text-muted">
          {data.users.length} enrolled student{data.users.length === 1 ? "" : "s"}
        </p>
      </div>

      <Card className="overflow-hidden">
        {data.users.length === 0 ? (
          <div className="p-8 text-center text-muted">No students enrolled yet.</div>
        ) : (
          <div className="divide-y divide-divider">
            {data.users.map((u) => {
              const isExpanded = expandedUser === u.id;
              return (
                <div key={u.id} className="flex flex-col">
                  <div 
                    className="flex cursor-pointer items-center justify-between gap-4 p-4 hover:bg-neutral-50 transition"
                    onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                  >
                    <div>
                      <div className="font-semibold text-ink">{u.name}</div>
                      <div className="text-sm text-muted">{u.email} · {u.phone}</div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm font-medium text-ink">Progress: {u.progressPct}%</div>
                        <div className="text-xs text-muted">{u.testsCompleted} / {u.totalTests} tests</div>
                      </div>
                      <div className="text-xs text-muted">
                        Enrolled {new Date(u.enrolledAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-divider bg-neutral-50 p-4">
                      <h4 className="mb-3 font-semibold text-sm">Test Scores</h4>
                      {u.attempts && u.attempts.length > 0 ? (
                        <div className="space-y-2">
                          {u.attempts.map(attempt => (
                            <div key={attempt.id || attempt.testId} className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="grid h-8 w-8 place-items-center rounded bg-brand-100 text-brand-700">
                                  <FileText size={16} />
                                </div>
                                <div>
                                  <div className="font-semibold text-sm text-ink">{attempt.testTitle || "Unknown Test"}</div>
                                  <div className="text-xs text-muted flex items-center gap-1">
                                    <CheckCircle2 size={12} className="text-emerald-500" /> {attempt.correctCount} correct
                                    <span className="mx-1">•</span>
                                    Submitted {new Date(attempt.submittedAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg text-ink">
                                  {attempt.score} <span className="text-xs font-normal text-muted">/ {attempt.totalMarks}</span>
                                </div>
                                <div className="text-xs font-medium uppercase text-muted tracking-wider">Score</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted py-2">No tests completed yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
