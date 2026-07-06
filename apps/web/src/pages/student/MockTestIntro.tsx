import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Button } from "../../components/ui";

export default function MockTestIntro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // We can just fetch the test details directly using the admin route, 
    // Wait, students can't hit admin route. I need a GET /learn/mock-tests/:id endpoint.
    // Actually, I can just create the attempt, and it will give me the attempt ID.
    // If it's already in progress, it will return the attemptId.
  }, [id]);

  const startTest = async () => {
    setStarting(true);
    try {
      const res = await api<{ attemptId: string; error?: string }>(`/learn/mock-tests/${id}/attempt`, { method: "POST" });
      if (res.error) {
        alert(res.error);
        return;
      }
      navigate(`/student/mock-attempts/${res.attemptId}`);
    } catch (err: any) {
      alert("Failed to start test. " + err.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10 space-y-6 text-center">
      <h1 className="text-2xl font-bold text-ink">Mock Test Instructions</h1>
      <div className="text-left text-muted space-y-3 p-4 bg-brand-50 rounded-lg">
        <p>1. The timer will start immediately once you click "Start Test".</p>
        <p>2. Your progress is auto-saved. If you disconnect, you can resume.</p>
        <p>3. You can review and change your answers before final submission.</p>
        <p>4. Once the timer ends, the test will be automatically submitted.</p>
      </div>
      <Button onClick={startTest} disabled={starting} className="w-full py-3">
        {starting ? "Starting..." : "Start Test"}
      </Button>
    </Card>
  );
}
