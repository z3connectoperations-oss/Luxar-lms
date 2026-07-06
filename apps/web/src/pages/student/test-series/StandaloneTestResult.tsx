import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, BarChart3, Clock, Target } from "lucide-react";
import { api } from "../../../lib/api";
import { Card } from "../../../components/ui";

export default function StandaloneTestResult() {
  const { attemptId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>(`/learn/test-series/attempts/${attemptId}/result`)
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(console.error);
  }, [attemptId]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading results...</div>;
  if (!data) return <div className="p-12 text-center text-red-500">Failed to load results.</div>;

  const totalMarks = data.questions ? data.questions.reduce((s: number, q: any) => s + (q.marks || 0), 0) : 0;
  const pct = data.attempt.score != null && totalMarks > 0 ? Math.round((data.attempt.score / totalMarks) * 100) : 0;
  const passed = pct >= (data.test.passingPct || 40);

  return (
    <div className="mx-auto max-w-4xl p-6 pb-24">
      <Link to={`/student/test-series/${data.testSeries.id}`} className="mb-6 flex items-center gap-2 text-brand-600 hover:underline">
        <ArrowLeft size={16} /> Back to Test Series
      </Link>

      <Card className="p-8 text-center shadow-lg border-brand-100">
        <h1 className="mb-2 text-3xl font-bold">{data.test.title} - Results</h1>
        <p className="text-muted mb-8">Completed on {new Date(data.attempt.submittedAt).toLocaleDateString()}</p>
        
        <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full border-8 border-brand-100 bg-brand-50">
          <div className="text-center">
            <div className="text-3xl font-black text-brand-700">{pct}%</div>
            <div className="text-xs uppercase text-brand-600 font-semibold mt-1">Score</div>
          </div>
        </div>
        
        <div className="mb-8 text-xl font-bold">
          {passed ? (
            <span className="text-emerald-600">🎉 Congratulations, you passed!</span>
          ) : (
            <span className="text-rose-600">Need more practice. You didn't pass this time.</span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="rounded-xl border p-4 bg-slate-50">
            <div className="text-muted text-xs font-bold uppercase mb-1 flex items-center gap-1.5"><Target size={14}/> Score</div>
            <div className="text-xl font-bold">{data.attempt.score} / {totalMarks}</div>
          </div>
          <div className="rounded-xl border p-4 bg-slate-50">
            <div className="text-emerald-600 text-xs font-bold uppercase mb-1 flex items-center gap-1.5"><CheckCircle size={14}/> Correct</div>
            <div className="text-xl font-bold text-emerald-700">{data.attempt.correctCount}</div>
          </div>
          <div className="rounded-xl border p-4 bg-slate-50">
            <div className="text-rose-600 text-xs font-bold uppercase mb-1 flex items-center gap-1.5"><XCircle size={14}/> Wrong</div>
            <div className="text-xl font-bold text-rose-700">{data.attempt.wrongCount}</div>
          </div>
          <div className="rounded-xl border p-4 bg-slate-50">
            <div className="text-amber-600 text-xs font-bold uppercase mb-1 flex items-center gap-1.5"><BarChart3 size={14}/> Skipped</div>
            <div className="text-xl font-bold text-amber-700">{data.attempt.skippedCount}</div>
          </div>
        </div>
      </Card>

      <h2 className="mt-12 mb-6 text-2xl font-bold">Detailed Analysis</h2>
      <div className="space-y-6">
        {data.questions.map((q: any, i: number) => {
          const ans = data.answers.find((a: any) => a.questionId === q.id);
          const isCorrect = ans?.isCorrect;
          const skipped = !ans?.selectedOption;
          
          let borderColor = "border-amber-200 bg-amber-50";
          let Icon = BarChart3;
          let iconColor = "text-amber-500";
          
          if (!skipped) {
            if (isCorrect) {
              borderColor = "border-emerald-200 bg-emerald-50";
              Icon = CheckCircle;
              iconColor = "text-emerald-500";
            } else {
              borderColor = "border-rose-200 bg-rose-50";
              Icon = XCircle;
              iconColor = "text-rose-500";
            }
          }

          return (
            <Card key={q.id} className={`p-6 border-l-4 ${borderColor}`}>
              <div className="mb-4 flex items-start gap-3">
                <Icon size={24} className={`shrink-0 mt-0.5 ${iconColor}`} />
                <div>
                  <div className="font-semibold text-ink">Q{i + 1}. {q.prompt}</div>
                  <div className="mt-2 text-sm">Marks: {q.marks}</div>
                </div>
              </div>
              
              <div className="ml-9 grid gap-2 sm:grid-cols-2 text-sm">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const text = q[`option${opt}` as keyof typeof q];
                  const isUserSelected = ans?.selectedOption === opt;
                  const isActualCorrect = q.correctAnswer === opt;
                  
                  let style = "border-border bg-white text-ink";
                  if (isActualCorrect) style = "border-emerald-500 bg-emerald-100 font-bold text-emerald-900";
                  else if (isUserSelected && !isActualCorrect) style = "border-rose-500 bg-rose-100 text-rose-900";
                  
                  return (
                    <div key={opt} className={`rounded p-3 border ${style} flex items-center justify-between`}>
                      <span><span className="font-bold mr-2">{opt}.</span> {text}</span>
                      {isUserSelected && <span className="text-xs font-bold uppercase bg-white/50 px-2 py-0.5 rounded">Your Answer</span>}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="ml-9 mt-4 rounded-lg bg-white/60 p-4 text-sm text-muted border border-border">
                  <strong className="text-ink">Explanation:</strong> {q.explanation}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
