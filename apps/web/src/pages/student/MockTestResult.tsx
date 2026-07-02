import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Button, Progress } from "../../components/ui";

export default function MockTestResult() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>(`/learn/mock-attempts/${id}/result`)
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading || !data) return <div className="p-8 text-center">Loading results...</div>;

  const { attempt, test, questions, answers, totalMarks } = data;
  const pct = totalMarks > 0 ? Math.round((attempt.score / totalMarks) * 100) : 0;
  const passed = pct >= test.passingPct;

  const getAnswer = (qId: string) => answers.find((a: any) => a.questionId === qId);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 py-8">
      <Link to="/student/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft size={16} /> Back to Courses
      </Link>

      <Card className="text-center p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">{test.title} - Results</h1>
          <p className="text-muted mt-1">Submitted on {new Date(attempt.submittedAt).toLocaleString()}</p>
        </div>

        <div className="flex justify-center">
          <div className="relative h-40 w-40 flex items-center justify-center rounded-full border-8 border-neutral-100">
            <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                className={passed ? "text-emerald-500" : "text-rose-500"}
                strokeWidth="8" stroke="currentColor" fill="transparent" r="46" cx="50" cy="50"
                strokeDasharray="289" strokeDashoffset={289 - (289 * pct) / 100}
              />
            </svg>
            <div className="text-3xl font-bold text-ink">{pct}%</div>
          </div>
        </div>

        <div>
          {passed ? (
            <div className="inline-flex items-center gap-2 text-lg font-bold text-emerald-600">
              <CheckCircle2 size={24} /> Congratulations, you passed!
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-lg font-bold text-rose-600">
              <XCircle size={24} /> You did not pass. Keep practicing!
            </div>
          )}
          <div className="text-sm text-muted mt-1">Passing requirement: {test.passingPct}%</div>
        </div>

        <div className="grid grid-cols-4 gap-4 border-t pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-ink">{attempt.score} / {totalMarks}</div>
            <div className="text-xs uppercase text-muted font-semibold">Total Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{attempt.correctCount}</div>
            <div className="text-xs uppercase text-muted font-semibold">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-rose-600">{attempt.wrongCount}</div>
            <div className="text-xs uppercase text-muted font-semibold">Incorrect</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-500">{attempt.skippedCount}</div>
            <div className="text-xs uppercase text-muted font-semibold">Skipped</div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-ink">Review Answers</h2>
        {questions.map((q: any, i: number) => {
          const ans = getAnswer(q.id);
          const selected = ans?.selectedOption;
          const isCorrect = selected === q.correctAnswer;
          
          return (
            <Card key={q.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="font-semibold">Q{i + 1}. {q.prompt}</div>
                <div>
                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-sm font-bold text-emerald-600"><CheckCircle2 size={16} /> Correct</span>
                  ) : selected ? (
                    <span className="flex items-center gap-1 text-sm font-bold text-rose-600"><XCircle size={16} /> Incorrect</span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-bold text-neutral-500"><AlertCircle size={16} /> Skipped</span>
                  )}
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const text = q[`option${opt}` as keyof typeof q];
                  const isThisSelected = selected === opt;
                  const isThisCorrect = q.correctAnswer === opt;
                  
                  let bg = "bg-white border-border";
                  if (isThisCorrect) bg = "bg-emerald-50 border-emerald-200 font-medium text-emerald-800";
                  else if (isThisSelected && !isThisCorrect) bg = "bg-rose-50 border-rose-200 text-rose-800";
                  
                  return (
                    <div key={opt} className={`rounded p-3 border ${bg}`}>
                      <span className="font-bold mr-2">{opt})</span> {text}
                      {isThisSelected && <span className="ml-2 text-[10px] uppercase font-bold text-muted">(Your answer)</span>}
                      {isThisCorrect && <span className="ml-2 text-[10px] uppercase font-bold text-emerald-600">(Correct Answer)</span>}
                    </div>
                  );
                })}
              </div>
              
              {q.explanation && (
                <div className="mt-4 p-3 bg-brand-50 border border-brand-100 rounded text-sm text-brand-900">
                  <span className="font-bold block mb-1">Explanation:</span>
                  {q.explanation}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
