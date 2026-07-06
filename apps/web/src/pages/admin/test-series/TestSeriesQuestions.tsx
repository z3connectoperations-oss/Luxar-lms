import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Target, Plus, Edit2, Trash2, Search, Upload, Save } from "lucide-react";
import { api } from "../../../lib/api";
import { Input, Button, Textarea } from "../../../components/ui";
import Papa from "papaparse";

interface Question {
  id: string;
  testId: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string | null;
  marks: number;
  position: number;
}

interface Test {
  id: string;
  title: string;
}

export default function AdminTestSeriesQuestions() {
  const { id, testId } = useParams();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api<{ test: Test; questions: Question[] }>(`/admin/test-series/tests/${testId}/questions`)
      .then((d) => {
        setTest(d.test);
        setQuestions(d.questions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id, testId]);

  const openNew = () => {
    setEditingQuestion({
      prompt: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      explanation: "",
      marks: 1,
      position: questions.length,
    });
    setIsEditing(true);
  };

  const openEdit = (q: Question) => {
    setEditingQuestion({ ...q });
    setIsEditing(true);
  };

  const save = async (addAnother = false) => {
    if (!editingQuestion.prompt || !editingQuestion.correctAnswer) return alert("Prompt and correct answer required.");
    try {
      if (editingQuestion.id) {
        await api(`/admin/test-series/questions/${editingQuestion.id}`, {
          method: "PATCH",
          body: JSON.stringify(editingQuestion),
        });
      } else {
        await api(`/admin/test-series/tests/${testId}/questions`, {
          method: "POST",
          body: JSON.stringify(editingQuestion),
        });
      }
      
      load();
      
      if (addAnother) {
        setEditingQuestion({
          prompt: "",
          optionA: "",
          optionB: "",
          optionC: "",
          optionD: "",
          correctAnswer: "A",
          explanation: "",
          marks: 1,
          position: questions.length + 1,
        });
      } else {
        setIsEditing(false);
      }
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
  };

  const del = async (qId: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await api(`/admin/test-series/questions/${qId}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      alert(e.message || "Delete failed");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsed = results.data as any[];
        const qs = parsed.map((row, i) => ({
          prompt: row.prompt || row.Question || row.Prompt || "",
          optionA: row.optionA || row.OptionA || row.A || "",
          optionB: row.optionB || row.OptionB || row.B || "",
          optionC: row.optionC || row.OptionC || row.C || "",
          optionD: row.optionD || row.OptionD || row.D || "",
          correctAnswer: (row.correctAnswer || row.CorrectAnswer || row.Correct || "A").toUpperCase(),
          explanation: row.explanation || row.Explanation || "",
          marks: parseInt(row.marks || row.Marks || "1", 10),
          position: questions.length + i,
        }));

        try {
          // Send bulk insert request
          await api(`/admin/test-series/tests/${testId}/questions/import`, {
            method: "POST",
            body: JSON.stringify({ questions: qs }),
          });
          alert("Imported successfully");
          load();
        } catch (err: any) {
          alert("Import failed: " + err.message);
        }
      },
      error: (err) => {
        alert("CSV Parse Error: " + err.message);
      }
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = questions.filter((question) => question.prompt.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/test-series/${id}/tests`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:bg-canvas hover:text-ink"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink">Manage Questions</h1>
            <p className="text-sm text-muted">For Test: {test?.title || "..."}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload size={16} /> Import CSV
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus size={16} /> Add Question
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-2 shadow-card">
        <Search size={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search questions..."
          className="flex-1 bg-transparent text-sm text-ink outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-card">
          <Target size={40} className="mx-auto mb-3 text-gold-300" />
          <h3 className="font-semibold text-ink">No questions found</h3>
          <p className="text-sm text-muted">Add a question manually or import via CSV.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((q, idx) => (
            <div key={q.id} className="rounded-xl border border-border bg-white p-5 shadow-card relative pl-12">
              <div className="absolute left-4 top-5 font-display text-sm font-bold text-muted">
                Q{idx + 1}
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-ink mb-3">{q.prompt}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <div 
                        key={opt} 
                        className={`rounded-lg p-2 border ${q.correctAnswer === opt ? "border-emerald-500 bg-emerald-50" : "border-border bg-canvas"}`}
                      >
                        <span className="font-bold mr-2 text-muted">{opt}.</span> 
                        {(q as any)[`option${opt}`]}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openEdit(q)} className="rounded p-1 text-muted hover:bg-canvas hover:text-ink">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => del(q.id)} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <h2 className="mb-4 text-xl font-bold text-ink">
              {editingQuestion.id ? "Edit Question" : "Create Question"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted">Prompt</label>
                <Textarea
                  value={editingQuestion.prompt || ""}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, prompt: e.target.value })}
                  placeholder="Question text..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted">Option A</label>
                  <Input value={editingQuestion.optionA || ""} onChange={(e) => setEditingQuestion({ ...editingQuestion, optionA: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted">Option B</label>
                  <Input value={editingQuestion.optionB || ""} onChange={(e) => setEditingQuestion({ ...editingQuestion, optionB: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted">Option C</label>
                  <Input value={editingQuestion.optionC || ""} onChange={(e) => setEditingQuestion({ ...editingQuestion, optionC: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted">Option D</label>
                  <Input value={editingQuestion.optionD || ""} onChange={(e) => setEditingQuestion({ ...editingQuestion, optionD: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted">Correct Answer</label>
                  <select
                    value={editingQuestion.correctAnswer || "A"}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value as any })}
                    className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted">Marks</label>
                  <Input
                    type="number"
                    value={editingQuestion.marks || ""}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted">Explanation (Optional)</label>
                <Textarea
                  value={editingQuestion.explanation || ""}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  placeholder="Explanation of the answer..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:bg-canvas"
              >
                Cancel
              </button>
              <Button variant="outline" onClick={() => save(true)}>
                Save & Add Another
              </Button>
              <Button onClick={() => save(false)} className="gap-2">
                <Save size={16}/> Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
