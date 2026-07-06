import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { Card, Button, Input, Textarea, Select, Label } from "../../components/ui";

export default function MockTestQuestions({ testId }: { testId: string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const [form, setForm] = useState({
    prompt: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "", marks: 1
  });

  const load = useCallback(() => {
    api<{ questions: any[] }>(`/admin/mock-tests/${testId}/questions`)
      .then(d => {
        setQuestions(d.questions);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [testId]);

  useEffect(load, [load]);

  const set = (patch: any) => setForm(f => ({ ...f, ...patch }));

  const saveQuestion = async () => {
    if (!form.prompt || !form.optionA || !form.optionB) return alert("Prompt, Option A and B are required.");
    await api(`/admin/mock-tests/${testId}/questions`, {
      method: "POST",
      body: JSON.stringify(form)
    });
    setForm({ prompt: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "", marks: 1 });
    setShowForm(false);
    load();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await api(`/admin/mock-questions/${id}`, { method: "DELETE" });
    load();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      
      // Basic CSV Parser (assuming simple structure without escaped commas for now)
      const lines = text.split("\n").map(l => l.trim()).filter(l => l);
      if (lines.length < 2) return alert("Invalid CSV format or empty file.");
      
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ''));
        return {
          prompt: cols[0],
          optionA: cols[1],
          optionB: cols[2],
          optionC: cols[3],
          optionD: cols[4],
          correctAnswer: cols[5]?.toUpperCase(),
          explanation: cols[6],
          marks: parseInt(cols[7]) || 1
        };
      }).filter(q => q.prompt && q.optionA);

      if (parsed.length === 0) return alert("No valid questions found.");

      setImporting(true);
      try {
        await api(`/admin/mock-tests/${testId}/questions/import`, {
          method: "POST",
          body: JSON.stringify({ questions: parsed })
        });
        alert(`Successfully imported ${parsed.length} questions!`);
        load();
      } catch (err) {
        alert("Import failed.");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  const downloadTemplate = () => {
    const header = "Prompt,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Explanation,Marks\n";
    const example = '"What is 2+2?","3","4","5","6","B","4 is the correct answer",1\n';
    const blob = new Blob([header + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'mock_test_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) return <div>Loading questions...</div>;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">Questions ({questions.length})</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate}>Download Template</Button>
          <div>
            <input type="file" accept=".csv" id="csv-upload" className="hidden" onChange={handleFileUpload} disabled={importing} />
            <Button size="sm" variant="outline" disabled={importing} onClick={() => document.getElementById('csv-upload')?.click()}>
              {importing ? "Importing..." : "Import CSV"}
            </Button>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Question"}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 space-y-4">
          <div>
            <Label>Question Prompt</Label>
            <Textarea value={form.prompt} onChange={e => set({ prompt: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Option A</Label><Input value={form.optionA} onChange={e => set({ optionA: e.target.value })} /></div>
            <div><Label>Option B</Label><Input value={form.optionB} onChange={e => set({ optionB: e.target.value })} /></div>
            <div><Label>Option C</Label><Input value={form.optionC} onChange={e => set({ optionC: e.target.value })} /></div>
            <div><Label>Option D</Label><Input value={form.optionD} onChange={e => set({ optionD: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Correct Answer</Label>
              <Select value={form.correctAnswer} onChange={e => set({ correctAnswer: e.target.value })}>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
              </Select>
            </div>
            <div><Label>Marks</Label><Input type="number" value={form.marks} onChange={e => set({ marks: parseInt(e.target.value) || 1 })} /></div>
          </div>
          <div>
            <Label>Explanation (Optional)</Label>
            <Textarea value={form.explanation} onChange={e => set({ explanation: e.target.value })} />
          </div>
          <Button onClick={saveQuestion}>Save Question</Button>
        </div>
      )}

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-border p-3 text-sm flex justify-between">
            <div>
              <div className="font-semibold mb-1">Q{i + 1}. {q.prompt}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted">
                <div className={q.correctAnswer === 'A' ? "text-emerald-600 font-medium" : ""}>A) {q.optionA}</div>
                <div className={q.correctAnswer === 'B' ? "text-emerald-600 font-medium" : ""}>B) {q.optionB}</div>
                <div className={q.correctAnswer === 'C' ? "text-emerald-600 font-medium" : ""}>C) {q.optionC}</div>
                <div className={q.correctAnswer === 'D' ? "text-emerald-600 font-medium" : ""}>D) {q.optionD}</div>
              </div>
            </div>
            <button className="text-red-600 hover:underline" onClick={() => deleteQuestion(q.id)}>Delete</button>
          </div>
        ))}
        {questions.length === 0 && !showForm && (
          <div className="text-center text-muted py-4">No questions added yet.</div>
        )}
      </div>
    </Card>
  );
}
