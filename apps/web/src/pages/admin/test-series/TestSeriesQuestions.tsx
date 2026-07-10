import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Target, Plus, Edit2, Trash2, Search, Upload, Save, Download } from "lucide-react";
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
  const pdfInputRef = useRef<HTMLInputElement>(null);

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

  const processParsedData = async (parsed: any[]) => {
    const qs = parsed.map((row, i) => ({
      prompt: row.prompt || row.Question || row.Prompt || "",
      optionA: row.optionA || row.OptionA || row.A || "",
      optionB: row.optionB || row.OptionB || row.B || "",
      optionC: row.optionC || row.OptionC || row.C || "",
      optionD: row.optionD || row.OptionD || row.D || "",
      correctAnswer: String(row.correctAnswer || row.CorrectAnswer || row.Correct || "A").toUpperCase(),
      explanation: row.explanation || row.Explanation || "",
      marks: parseInt(String(row.marks || row.Marks || "1"), 10),
      position: questions.length + i,
    }));

    const filteredQs = qs.filter(q => q.prompt || q.optionA || q.optionB);

    if (filteredQs.length === 0) {
      alert("No valid questions found in the uploaded file.");
      return;
    }

    try {
      await api(`/admin/test-series/tests/${testId}/questions/import`, {
        method: "POST",
        body: JSON.stringify({ questions: filteredQs }),
      });
      alert(`Imported ${filteredQs.length} questions successfully`);
      load();
    } catch (err: any) {
      alert("Import failed: " + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const xlsx = await import("xlsx");
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = xlsx.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const parsed = xlsx.utils.sheet_to_json(worksheet) as any[];
        await processParsedData(parsed);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processParsedData(results.data as any[]);
        },
        error: (err) => {
          alert("CSV Parse Error: " + err.message);
        }
      });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Turn raw document text into question objects.
  // Expects a "1. <prompt> A) .. B) .. C) .. D) .." style layout (A. / A) both ok).
  const parseTextToQuestions = (fullText: string): Partial<Question>[] => {
    const questionsRegex = /(\d+)[.)]\s*(.*?)\s*A[).]\s*(.*?)\s*B[).]\s*(.*?)\s*C[).]\s*(.*?)\s*D[).]\s*(.*?)(?=(?:\d+[.)]\s*)|$)/gs;
    const extracted: Partial<Question>[] = [];
    let match;
    while ((match = questionsRegex.exec(fullText)) !== null) {
      const prompt = match[2].trim();
      const optionA = match[3].trim();
      const optionB = match[4].trim();
      const optionC = match[5].trim();
      let optionD = match[6].trim();

      // Detect a marked answer at the tail (e.g. "Answer: B", "Ans - C", "Correct: D").
      let correctAnswer: "A" | "B" | "C" | "D" = "A";
      const ansMatch = optionD.match(/(?:answer|ans|correct)\s*[:\-)]?\s*([ABCD])\b/i);
      if (ansMatch && ansMatch.index !== undefined) {
        correctAnswer = ansMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
        optionD = optionD.slice(0, ansMatch.index).trim();
      }

      // Strip trailing Tamil text (bilingual docs) from the last option.
      const tamilMatch = /[\u0B80-\u0BFF]/.exec(optionD);
      if (tamilMatch) optionD = optionD.substring(0, tamilMatch.index).trim();

      if (!prompt) continue;
      extracted.push({
        prompt,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        marks: 1,
        position: questions.length + extracted.length,
      });
    }
    return extracted;
  };

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(" ") + " ";
    }
    return fullText;
  };

  const extractDocxText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore - no type declarations for the browser build subpath
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result?.value || "";
  };

  // Handles both PDF and Word (.docx) \u2014 extracts text, parses questions, imports.
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const name = file.name.toLowerCase();
      let text = "";
      if (name.endsWith(".pdf")) {
        text = await extractPdfText(file);
      } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
        text = await extractDocxText(file);
      } else {
        throw new Error("Unsupported file type. Please upload a PDF or Word (.docx) file.");
      }

      const extractedQs = parseTextToQuestions(text);
      if (extractedQs.length === 0) {
        alert(
          "Could not extract any questions.\n\nExpected a format like:\n1. Question text  A) option  B) option  C) option  D) option\n\nOptionally add 'Answer: B' after the options."
        );
        return;
      }

      await api(`/admin/test-series/tests/${testId}/questions/import`, {
        method: "POST",
        body: JSON.stringify({ questions: extractedQs }),
      });
      alert(`Successfully extracted and imported ${extractedQs.length} questions!`);
      load();
    } catch (err: any) {
      console.error(err);
      alert("Document parsing failed: " + (err?.message || err));
    } finally {
      setLoading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const downloadFormat = () => {
    const csvContent = "data:text/csv;charset=utf-8,Prompt,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Explanation,Marks\nSample Question,Option 1,Option 2,Option 3,Option 4,A,Sample Explanation,1";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "question_import_format.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            ref={pdfInputRef}
            onChange={handlePdfUpload}
          />
          <Button variant="outline" onClick={() => pdfInputRef.current?.click()} className="w-full gap-2 sm:w-auto">
            <Upload size={16} /> Import PDF
          </Button>
          <Button variant="outline" onClick={downloadFormat} className="w-full gap-2 sm:w-auto">
            <Download size={16} /> CSV Format
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full gap-2 sm:w-auto">
            <Upload size={16} /> Import CSV/Excel
          </Button>
          <Button onClick={openNew} className="w-full gap-2 sm:w-auto">
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
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="order-last rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-canvas sm:order-none"
              >
                Cancel
              </button>
              <Button variant="outline" onClick={() => save(true)} className="w-full justify-center sm:w-auto">
                Save & Add Another
              </Button>
              <Button onClick={() => save(false)} className="w-full justify-center gap-2 sm:w-auto">
                <Save size={16}/> Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
