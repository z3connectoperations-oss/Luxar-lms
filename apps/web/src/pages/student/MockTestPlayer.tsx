import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { api } from "../../lib/api";
import { Card, Button } from "../../components/ui";

export default function MockTestPlayer() {
  const { id } = useParams(); // attemptId
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    api<any>(`/learn/mock-attempts/${id}`)
      .then(d => {
        setData(d);
        setAnswers(d.answers || {});
        
        // Calculate remaining time
        const startedAt = new Date(d.attempt.startedAt).getTime();
        const durationSec = d.test.durationMin * 60;
        const now = Date.now();
        const elapsed = Math.floor((now - startedAt) / 1000);
        const rem = Math.max(0, durationSec - elapsed);
        
        if (d.attempt.status === "submitted" || rem <= 0) {
          navigate(`/student/mock-attempts/${id}/result`);
        } else {
          setTimeLeft(rem);
        }
        setLoading(false);
      })
      .catch(() => navigate("/student/courses"));
  }, [id, navigate]);

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
    const durationSec = data.test.durationMin * 60;
    await api(`/learn/mock-attempts/${id}/save`, {
      method: "PATCH",
      body: JSON.stringify({ questionId, selectedOption: option, timeTakenSec: durationSec - timeLeft })
    });
  };

  const submitTest = async () => {
    clearInterval(timerRef.current);
    if (!confirm("Are you sure you want to submit?")) {
      return;
    }
    await api(`/learn/mock-attempts/${id}/submit`, { method: "POST" });
    navigate(`/student/mock-attempts/${id}/result`);
  };

  if (loading || !data) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const q = data.questions[currentIndex];
  if (!q) return null;

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
            <Button onClick={submitTest} className="bg-emerald-600 hover:bg-emerald-700 text-white">Submit Test</Button>
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

        <Button className="mt-8 w-full bg-rose-600 text-white hover:bg-rose-700" onClick={submitTest}>
          Submit Test
        </Button>
      </div>
    </div>
  );
}
