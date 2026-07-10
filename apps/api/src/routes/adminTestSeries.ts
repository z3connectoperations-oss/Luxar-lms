import { Hono } from "hono";
import { eq, desc, sql } from "drizzle-orm";
import {
  testSeries,
  testSeriesTests,
  testSeriesQuestions,
  testSeriesEnrollments,
  testSeriesAttempts,
  users
} from "@luxar/db";
import { requireRole } from "../middleware";
import type { AppEnv } from "../types";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || crypto.randomUUID().slice(0, 8);

const adminTestSeries = new Hono<AppEnv>();
adminTestSeries.use("*", requireRole("admin"));

// ---- Test Series CRUD ----------------------------------------------------
adminTestSeries.get("/", async (c) => {
  const list = await c.get("db").select().from(testSeries).orderBy(desc(testSeries.createdAt)).all();
  return c.json({ testSeries: list });
});

adminTestSeries.get("/:id", async (c) => {
  const ts = await c.get("db").select().from(testSeries).where(eq(testSeries.id, c.req.param("id"))).get();
  if (!ts) return c.json({ error: "not found" }, 404);
  return c.json({ testSeries: ts });
});

adminTestSeries.post("/", async (c) => {
  const b = await c.req.json();
  if (!b?.title) return c.json({ error: "title required" }, 400);
  const id = crypto.randomUUID();
  await c.get("db").insert(testSeries).values({
    id,
    title: b.title,
    slug: b.slug || slugify(b.title),
    descriptionMd: b.descriptionMd,
    thumbnailR2Key: b.thumbnailR2Key,
    bannerR2Key: b.bannerR2Key,
    category: b.category ?? null,
    difficulty: b.difficulty ?? null,
    price: b.price ?? 0,
    discountPrice: b.discountPrice ?? null,
    validityDays: b.validityDays ?? 365,
    status: b.status || "draft",
    position: b.position ?? 0,
    isFeatured: b.isFeatured ?? false,
  });
  return c.json({ id });
});

adminTestSeries.patch("/:id", async (c) => {
  const b = await c.req.json();
  delete b.id;
  await c.get("db").update(testSeries).set(b).where(eq(testSeries.id, c.req.param("id")));
  return c.json({ ok: true });
});

adminTestSeries.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  // Cascade delete
  await db.run(sql`DELETE FROM test_series_attempt_answers WHERE attempt_id IN (SELECT id FROM test_series_attempts WHERE test_id IN (SELECT id FROM test_series_tests WHERE test_series_id = ${id}))`);
  await db.run(sql`DELETE FROM test_series_attempts WHERE test_id IN (SELECT id FROM test_series_tests WHERE test_series_id = ${id})`);
  await db.run(sql`DELETE FROM test_series_questions WHERE test_id IN (SELECT id FROM test_series_tests WHERE test_series_id = ${id})`);
  await db.run(sql`DELETE FROM test_series_tests WHERE test_series_id = ${id}`);
  await db.run(sql`DELETE FROM test_series_enrollments WHERE test_series_id = ${id}`);
  await db.delete(testSeries).where(eq(testSeries.id, id));
  return c.json({ ok: true });
});

// ---- Tests CRUD ----------------------------------------------------------
adminTestSeries.get("/:id/tests", async (c) => {
  const list = await c.get("db").select().from(testSeriesTests)
    .where(eq(testSeriesTests.testSeriesId, c.req.param("id")))
    .orderBy(testSeriesTests.position).all();
  return c.json({ tests: list });
});

adminTestSeries.post("/:id/tests", async (c) => {
  const b = await c.req.json();
  if (!b?.title) return c.json({ error: "title required" }, 400);
  const id = crypto.randomUUID();
  await c.get("db").insert(testSeriesTests).values({
    id,
    testSeriesId: c.req.param("id"),
    title: b.title,
    durationMin: b.durationMin ?? 60,
    passingMarks: b.passingMarks ?? 40,
    passingPct: b.passingPct ?? 40,
    maxAttempts: b.maxAttempts ?? 3,
    position: b.position ?? 0,
    status: b.status || "draft",
  });
  return c.json({ id });
});

adminTestSeries.patch("/tests/:testId", async (c) => {
  const b = await c.req.json();
  delete b.id;
  await c.get("db").update(testSeriesTests).set(b).where(eq(testSeriesTests.id, c.req.param("testId")));
  return c.json({ ok: true });
});

adminTestSeries.delete("/tests/:testId", async (c) => {
  const db = c.get("db");
  const testId = c.req.param("testId");
  await db.run(sql`DELETE FROM test_series_attempt_answers WHERE attempt_id IN (SELECT id FROM test_series_attempts WHERE test_id = ${testId})`);
  await db.run(sql`DELETE FROM test_series_attempts WHERE test_id = ${testId}`);
  await db.delete(testSeriesQuestions).where(eq(testSeriesQuestions.testId, testId));
  await db.delete(testSeriesTests).where(eq(testSeriesTests.id, testId));
  return c.json({ ok: true });
});

// ---- Questions CRUD ------------------------------------------------------
adminTestSeries.get("/tests/:testId/questions", async (c) => {
  const testId = c.req.param("testId");
  const t = await c.get("db").select().from(testSeriesTests).where(eq(testSeriesTests.id, testId)).get();
  const list = await c.get("db").select().from(testSeriesQuestions)
    .where(eq(testSeriesQuestions.testId, testId))
    .orderBy(testSeriesQuestions.position).all();
  return c.json({ test: t, questions: list });
});

adminTestSeries.post("/tests/:testId/questions", async (c) => {
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await c.get("db").insert(testSeriesQuestions).values({
    id,
    testId: c.req.param("testId"),
    prompt: b.prompt,
    optionA: b.optionA,
    optionB: b.optionB,
    optionC: b.optionC,
    optionD: b.optionD,
    correctAnswer: b.correctAnswer,
    explanation: b.explanation,
    marks: b.marks ?? 1,
    position: b.position ?? 0,
  });
  return c.json({ id });
});

adminTestSeries.post("/tests/:testId/questions/import", async (c) => {
  const db = c.get("db");
  const testId = c.req.param("testId");

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const questions = body?.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    return c.json({ error: "Invalid questions payload" }, 400);
  }

  // Ensure the target test exists (a bad testId would otherwise fail obscurely).
  const test = await db.select().from(testSeriesTests).where(eq(testSeriesTests.id, testId)).get();
  if (!test) return c.json({ error: "Test not found" }, 404);

  const existing = await db.select().from(testSeriesQuestions).where(eq(testSeriesQuestions.testId, testId)).orderBy(desc(testSeriesQuestions.position)).get();
  let nextPos = existing ? (existing.position ?? 0) + 1 : 0;

  const str = (v: any) => (v == null ? "" : String(v).trim());
  const toInsert = questions
    .map((q: any) => {
      let correctAnswer = str(q.correctAnswer).toUpperCase().charAt(0);
      if (!["A", "B", "C", "D"].includes(correctAnswer)) correctAnswer = "A";
      let marks = parseInt(String(q.marks ?? "1"), 10);
      if (!Number.isFinite(marks) || marks < 1) marks = 1;
      return {
        prompt: str(q.prompt),
        optionA: str(q.optionA),
        optionB: str(q.optionB),
        optionC: str(q.optionC),
        optionD: str(q.optionD),
        correctAnswer,
        explanation: str(q.explanation) || null,
        marks,
      };
    })
    // A question needs at least a prompt; drop blank/garbage rows.
    .filter((q) => q.prompt.length > 0)
    .map((q) => ({ id: crypto.randomUUID(), testId, position: nextPos++, ...q }));

  if (toInsert.length === 0) {
    return c.json({ error: "No valid questions found. Each question needs a prompt/question text." }, 400);
  }

  // D1 allows at most 100 bound parameters per query. Each row binds 11 columns,
  // so insert in chunks of 8 rows (88 params) to stay safely under the limit.
  try {
    const BATCH = 8;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      await db.insert(testSeriesQuestions).values(toInsert.slice(i, i + BATCH));
    }
  } catch (err: any) {
    console.error("question import insert failed", err);
    return c.json({ error: "Database insert failed: " + (err?.message || String(err)) }, 500);
  }

  return c.json({ ok: true, imported: toInsert.length });
});

adminTestSeries.delete("/questions/:questionId", async (c) => {
  const db = c.get("db");
  const questionId = c.req.param("questionId");
  try {
    // Remove attempt answers that reference this question first, otherwise the
    // foreign key (test_series_attempt_answers.question_id) blocks the delete.
    await db.run(sql`DELETE FROM test_series_attempt_answers WHERE question_id = ${questionId}`);
    await db.delete(testSeriesQuestions).where(eq(testSeriesQuestions.id, questionId));
  } catch (err: any) {
    console.error("question delete failed", err);
    return c.json({ error: "Delete failed: " + (err?.message || String(err)) }, 500);
  }
  return c.json({ ok: true });
});

adminTestSeries.patch("/questions/:questionId", async (c) => {
  const b = await c.req.json();
  delete b.id;
  await c.get("db").update(testSeriesQuestions).set(b).where(eq(testSeriesQuestions.id, c.req.param("questionId")));
  return c.json({ ok: true });
});

export default adminTestSeries;
