import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../../lib/api";
import { ArrowLeft, Target, Clock, Award, PlayCircle, Lock, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "../../../lib/cn";

interface Test {
  id: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  maxAttempts: number;
  position: number;
}

interface TestSeries {
  id: string;
  title: string;
  descriptionMd: string | null;
}

interface Attempt {
  id: string;
  testId: string;
  status: "in_progress" | "submitted";
  score: number | null;
  submittedAt: string | null;
}

export default function TestSeriesPathway() {
  const { id } = useParams();
  const [testSeries, setTestSeries] = useState<TestSeries | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ testSeries: TestSeries; tests: Test[]; attempts: Attempt[] }>(`/learn/test-series/${id}/pathway`)
      .then((d) => {
        setTestSeries(d.testSeries);
        setTests(d.tests || []);
        setAttempts(d.attempts || []);
      })
      .catch((e: any) => setError(e.message || "Failed to load test series"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center p-12 text-muted">Loading tests...</div>;
  if (error || !testSeries) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="text-red-500 font-bold mb-4">{error || "Test series not found"}</div>
        <Link to="/student/test-series" className="text-brand-600 hover:underline">Back to My Test Series</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/student/test-series"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:bg-canvas hover:text-ink"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink">{testSeries.title}</h1>
          <p className="text-sm text-muted">Complete these tests to master the subject.</p>
        </div>
      </div>

      <div className="space-y-4 mt-8">
        {tests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-card">
            <Target size={40} className="mx-auto mb-3 text-gold-300" />
            <h3 className="font-semibold text-ink">No tests available</h3>
            <p className="text-sm text-muted">Tests will be added to this series soon.</p>
          </div>
        ) : (
          tests.map((test, index) => {
            const testAttempts = attempts.filter(a => a.testId === test.id);
            const isCompleted = testAttempts.some(a => a.status === "submitted");
            const inProgressAttempt = testAttempts.find(a => a.status === "in_progress");
            const bestAttempt = [...testAttempts].filter(a => a.status === "submitted").sort((a, b) => (b.score || 0) - (a.score || 0))[0];
            const attemptsLeft = test.maxAttempts - testAttempts.length;
            const canAttempt = attemptsLeft > 0 || inProgressAttempt;

            return (
              <div key={test.id} className={cn("rounded-2xl border bg-white p-5 shadow-card transition-all", isCompleted ? "border-emerald-200" : "border-border hover:shadow-lux")}>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold", isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-700")}>
                      {isCompleted ? <CheckCircle2 size={20} /> : index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-ink text-lg">{test.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                        <span className="flex items-center gap-1"><Clock size={14}/> {test.durationMinutes}m</span>
                        <span className="flex items-center gap-1"><Award size={14}/> {test.totalMarks} Marks</span>
                        <span className="flex items-center gap-1"><Target size={14}/> {testAttempts.length}/{test.maxAttempts} Attempts</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {bestAttempt && (
                      <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        Best Score: {bestAttempt.score}/{test.totalMarks}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {bestAttempt && (
                        <Link
                          to={`/student/test-series/attempts/${bestAttempt.id}/result`}
                          className="text-xs font-semibold text-brand-600 hover:underline px-2 py-2"
                        >
                          View Results
                        </Link>
                      )}
                      
                      {canAttempt ? (
                        <Link
                          to={`/student/test-series/tests/${test.id}/take`}
                          className={cn("flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-soft transition", inProgressAttempt ? "bg-amber-500 hover:bg-amber-600" : "bg-ink hover:bg-gold-500 hover:text-ink")}
                        >
                          {inProgressAttempt ? "Resume Test" : "Start Test"} <PlayCircle size={16} />
                        </Link>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-xl bg-canvas px-4 py-2 text-sm font-semibold text-muted">
                          <Lock size={16} /> Max Attempts Reached
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
