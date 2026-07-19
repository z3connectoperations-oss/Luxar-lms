import { useEffect, useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { api } from "../../lib/api";
import { Card, Button, Input, Textarea, Select, Label } from "../../components/ui";

export default function MockTestQuestions({ testId }: { testId: string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  
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

  // ---- Import (same engine as the Test Series importer) ---------------------

  const importQuestions = async (parsed: any[]) => {
    if (parsed.length === 0) return alert("No valid questions found in the uploaded file.");
    setImporting(true);
    try {
      const res = await api<{ imported: number }>(`/admin/mock-tests/${testId}/questions/import`, {
        method: "POST",
        body: JSON.stringify({ questions: parsed }),
      });
      alert(`Imported ${res.imported ?? parsed.length} questions successfully!`);
      load();
    } catch (err: any) {
      alert("Import failed: " + (err?.message || "unknown error"));
    } finally {
      setImporting(false);
    }
  };

  const processParsedData = async (parsed: any[]) => {
    // Match columns by a normalized header (case/space/punctuation-insensitive),
    // so "Option A", "optionA", "OPTION_A" and "A" all resolve to the same field.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const pick = (row: any, ...aliases: string[]): string => {
      const map: Record<string, any> = {};
      for (const k of Object.keys(row)) map[norm(k)] = row[k];
      for (const a of aliases) {
        const v = map[norm(a)];
        if (v != null && String(v).trim() !== "") return String(v).trim();
      }
      return "";
    };

    const qs = parsed.map((row) => ({
      prompt: pick(row, "prompt", "question", "questions", "ques"),
      optionA: pick(row, "optionA", "option1", "A", "a)"),
      optionB: pick(row, "optionB", "option2", "B", "b)"),
      optionC: pick(row, "optionC", "option3", "C", "c)"),
      optionD: pick(row, "optionD", "option4", "D", "d)"),
      correctAnswer: (pick(row, "correctAnswer", "correct", "answer", "ans", "correctoption") || "A").toUpperCase(),
      explanation: pick(row, "explanation", "explain", "solution", "reason"),
      marks: parseInt(pick(row, "marks", "mark", "score") || "1", 10) || 1,
    })).filter((q) => q.prompt || q.optionA || q.optionB);

    await importQuestions(qs);
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
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = xlsx.utils.sheet_to_json(worksheet) as any[];
        await processParsedData(parsed);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => { await processParsedData(results.data as any[]); },
        error: (err) => { alert("CSV Parse Error: " + err.message); },
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Turn raw document text into question objects.
  // Expects a "1. <prompt> A) .. B) .. C) .. D) .." style layout (A. / A) both ok).
  const parseTextToQuestions = (fullText: string) => {
    const questionsRegex = /(\d+)[.)]\s*(.*?)\s*A[).]\s*(.*?)\s*B[).]\s*(.*?)\s*C[).]\s*(.*?)\s*D[).]\s*(.*?)(?=(?:\d+[.)]\s*)|$)/gs;
    const extracted: any[] = [];
    let match;
    while ((match = questionsRegex.exec(fullText)) !== null) {
      const prompt = match[2].trim();
      const optionA = match[3].trim();
      const optionB = match[4].trim();
      const optionC = match[5].trim();
      let optionD = match[6].trim();

      // Detect a marked answer at the tail (e.g. "Answer: B", "Ans - C", "Correct: D").
      let correctAnswer = "A";
      const ansMatch = optionD.match(/(?:answer|ans|correct)\s*[:\-)]?\s*([ABCD])\b/i);
      if (ansMatch && ansMatch.index !== undefined) {
        correctAnswer = ansMatch[1].toUpperCase();
        optionD = optionD.slice(0, ansMatch.index).trim();
      }

      // Strip trailing Tamil text (bilingual docs) from the last option.
      const tamilMatch = /[஀-௿]/.exec(optionD);
      if (tamilMatch) optionD = optionD.substring(0, tamilMatch.index).trim();

      if (!prompt) continue;
      extracted.push({ prompt, optionA, optionB, optionC, optionD, correctAnswer, marks: 1 });
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

  // Handles both PDF and Word (.docx) — extracts text, parses questions, imports.
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const name = file.name.toLowerCase();
      let text = "";
      if (name.endsWith(".pdf")) text = await extractPdfText(file);
      else if (name.endsWith(".docx") || name.endsWith(".doc")) text = await extractDocxText(file);
      else throw new Error("Unsupported file type. Please upload a PDF or Word (.docx) file.");

      const extractedQs = parseTextToQuestions(text);
      if (extractedQs.length === 0) {
        alert("Could not extract any questions.\n\nExpected a format like:\n1. Question text  A) option  B) option  C) option  D) option\n\nOptionally add 'Answer: B' after the options.");
        return;
      }
      await importQuestions(extractedQs);
    } catch (err: any) {
      alert("Document parsing failed: " + (err?.message || err));
    } finally {
      setImporting(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    // Canonical import template. Headers are matched case/space-insensitively, and
    // "Correct Answer" must be the letter A/B/C/D of the right option. Written as
    // UTF-8 with a BOM so Excel opens Tamil/other scripts correctly.
    const headers = ["Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Explanation", "Marks"];
    const rows = [
      ["What is the capital of India?", "Mumbai", "Chennai", "New Delhi", "Kolkata", "C", "New Delhi is the capital of India.", "1"],
      ["தமிழ்நாட்டின் தலைநகரம் எது?", "மதுரை", "சென்னை", "கோயம்புத்தூர்", "திருச்சி", "B", "சென்னை தமிழ்நாட்டின் தலைநகரம் ஆகும்.", "1"],
    ];
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Loading questions...</div>;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-ink">Questions ({questions.length})</h2>
        <div className="flex flex-wrap gap-2">
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={importing} />
          <input type="file" accept=".pdf,.docx,.doc" className="hidden" ref={docInputRef} onChange={handleDocUpload} disabled={importing} />
          <Button size="sm" variant="outline" onClick={downloadTemplate}>CSV Format</Button>
          <Button size="sm" variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? "Importing..." : "Import CSV/Excel"}
          </Button>
          <Button size="sm" variant="outline" disabled={importing} onClick={() => docInputRef.current?.click()}>
            {importing ? "Importing..." : "Import PDF/Word"}
          </Button>
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
