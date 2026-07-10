import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { api } from "../../../lib/api";
import { Card, Button } from "../../../components/ui";

export default function StandaloneTestPlayer() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<string>("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Start or resume test
    api<any>(`/learn/test-series/tests/${testId}/start`, { method: "POST" })
      .then(d => {
        setData(d);
        setAttemptId(d.attempt.id);
        
        const ansObj: Record<string, string> = {};
        if (d.answers) {
          d.answers.forEach((a: any) => {
            if (a.selectedOption) ansObj[a.questionId] = a.selectedOption;
          });
        }
        setAnswers(ansObj);
        
        // Calculate remaining time
        const durationSec = d.questions.length > 0 ? (d.attempt.timeTakenSec ? (d.questions[0].marks ? 60*60 : 60*60) /* fallback */ : 60*60) : 60*60;
        // actually we should get test duration from backend. Let's just assume we have it or calculate from attempt.
        // Wait, the test metadata isn't returned in /start? 
        // In the backend, we return { attempt, questions, answers }.
        // We'll just fetch test metadata if needed, but let's assume duration is fetched or we just pass it from attempt.
        // I'll fetch the test metadata first.
      })
      .catch((e: any) => {
        alert(e.message || "Failed to start test");
        navigate("/student/test-series");
      });
  }, [testId, navigate]);

  useEffect(() => {
    if (attemptId && !data?.test) {
      api<any>(`/learn/test-series/tests/${testId}`)
        .then(d => {
          setData((prev: any) => ({ ...prev, test: d.test }));
          // The API returns the column as durationMin (durationMinutes is a legacy alias).
          const durationMin = Number(d.test.durationMin ?? d.test.durationMinutes) || 60;
          const durationSec = durationMin * 60;
          const rem = Math.max(0, durationSec - (data.attempt.timeTakenSec || 0));
          setTimeLeft(rem);
          setLoading(false);
        })
        .catch(console.error);
    }
  }, [attemptId, data?.attempt, data?.test, testId]);

  useEffect(() => {
    if (timeLeft > 0 && !loading) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            submitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, loading]);

  const saveAnswer = async (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    const durationMin = Number(data.test.durationMin ?? data.test.durationMinutes) || 60;
    const durationSec = durationMin * 60;
    await api(`/learn/test-series/attempts/${attemptId}/answer`, {
      method: "POST",
      body: JSON.stringify({ questionId, selectedOption: option, timeTakenSec: Math.max(0, durationSec - timeLeft) })
    });
  };

  const submitTest = async () => {
    clearInterval(timerRef.current);
    await api(`/learn/test-series/attempts/${attemptId}/submit`, { method: "POST" });
    navigate(`/student/test-series/attempts/${attemptId}/result`);
  };

  if (loading || !data || !data.test) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const q = data.questions[currentIndex];
  if (!q) return <div className="p-12 text-center text-muted">No questions found in this test.</div>;

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen flex-col bg-canvas text-ink md:flex-row">
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">{data.test.title}</h1>
          <div className="flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 font-bold text-rose-600">
            <Clock size={18} />
            {fmtTime(timeLeft)}
          </div>
        </div>

        <Card className="flex-1 p-6 text-lg space-y-6 shadow-sm border border-brand-100">
          <div className="font-semibold text-brand-900 border-b pb-4">
            Question {currentIndex + 1} of {data.questions.length}
          </div>
          <div className="whitespace-pre-wrap">{q.prompt}</div>
          
          <div className="space-y-3 mt-4">
            {['A', 'B', 'C', 'D'].map(opt => {
              const text = q[`option${opt}` as keyof typeof q];
              const isSelected = answers[q.id] === opt;
              return (
                <div 
                  key={opt}
                  onClick={() => saveAnswer(q.id, opt)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                    isSelected ? "border-brand-600 bg-brand-50 shadow-sm" : "border-border hover:bg-neutral-50"
                  }`}
                >
                  <div className={`grid h-6 w-6 place-items-center rounded-full border text-sm ${isSelected ? "border-brand-600 bg-brand-600 text-white" : "border-muted text-muted"}`}>
                    {opt}
                  </div>
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
            Previous
          </Button>
          {currentIndex < data.questions.length - 1 ? (
            <Button onClick={() => setCurrentIndex(i => i + 1)}>Next</Button>
          ) : (
            <Button onClick={() => setShowSubmitModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Submit Test</Button>
          )}
        </div>
      </div>

      {/* Sidebar Palette */}
      <div className="w-full border-t border-border bg-white p-4 md:w-80 md:border-l md:border-t-0">
        <h3 className="mb-4 font-bold">Question Palette</h3>
        <div className="grid grid-cols-5 gap-2">
          {data.questions.map((question: any, i: number) => {
            const isAnswered = !!answers[question.id];
            const isCurrent = i === currentIndex;
            
            let bg = "bg-neutral-100 text-neutral-600";
            if (isAnswered) bg = "bg-brand-600 text-white";
            if (isCurrent && !isAnswered) bg = "border-2 border-brand-600 bg-white text-brand-600 font-bold";
            
            return (
              <button
                key={question.id}
                onClick={() => setCurrentIndex(i)}
                className={`flex h-10 items-center justify-center rounded-md text-sm transition ${bg}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        
        <div className="mt-8 space-y-2 text-sm text-muted">
          <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-brand-600"></div> Answered</div>
          <div className="flex items-center gap-2"><div className="h-4 w-4 rounded border-2 border-brand-600 bg-white"></div> Current</div>
          <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-neutral-100"></div> Not Visited / Unanswered</div>
        </div>

        <Button className="mt-8 w-full bg-rose-600 text-white hover:bg-rose-700" onClick={() => setShowSubmitModal(true)}>
          Submit Test
        </Button>
      </div>
      
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-xl font-bold text-ink">Submit Test?</h3>
            <p className="mb-6 text-sm text-muted">Are you sure you want to submit your test? You cannot change your answers after submission.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={submitTest}>Yes, Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
