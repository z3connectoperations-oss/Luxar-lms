import { Hono } from "hono";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import {
  testSeries,
  testSeriesTests,
  testSeriesQuestions,
  testSeriesEnrollments,
  testSeriesAttempts,
  testSeriesAttemptAnswers,
} from "@luxar/db";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";

export const publicTestSeries = new Hono<AppEnv>();
export const studentTestSeries = new Hono<AppEnv>();

studentTestSeries.use("*", requireAuth);

// ---- Public Endpoints ----------------------------------------------------
// Returns both active (published) and coming_soon series so the catalog can
// render them in separate sections. Each series is enriched with aggregate
// question count / duration / marks summed across its published child tests.
publicTestSeries.get("/", async (c) => {
  const db = c.get("db");
  const list = await db
    .select()
    .from(testSeries)
    .where(inArray(testSeries.status, ["published", "coming_soon"]))
    .orderBy(testSeries.position)
    .all();

  const seriesIds = list.map((s) => s.id);
  const tests = seriesIds.length
    ? await db
        .select()
        .from(testSeriesTests)
        .where(and(inArray(testSeriesTests.testSeriesId, seriesIds), eq(testSeriesTests.status, "published")))
        .all()
    : [];
  const testIds = tests.map((t) => t.id);
  const qs = testIds.length
    ? await db
        .select({ testId: testSeriesQuestions.testId, marks: testSeriesQuestions.marks })
        .from(testSeriesQuestions)
        .where(inArray(testSeriesQuestions.testId, testIds))
        .all()
    : [];

  const enriched = list.map((s) => {
    const myTests = tests.filter((t) => t.testSeriesId === s.id);
    const myTestIds = myTests.map((t) => t.id);
    const myQs = qs.filter((q) => myTestIds.includes(q.testId));
    return {
      ...s,
      testCount: myTests.length,
      questionCount: myQs.length,
      totalMarks: myQs.reduce((sum, q) => sum + (q.marks || 0), 0),
      durationMin: myTests.reduce((sum, t) => sum + (t.durationMin || 0), 0),
    };
  });

  return c.json({ testSeries: enriched });
});

publicTestSeries.get("/:slug", async (c) => {
  const db = c.get("db");
  const ts = await db.select().from(testSeries).where(eq(testSeries.slug, c.req.param("slug"))).get();
  if (!ts || ts.status === "draft") return c.json({ error: "not found" }, 404);
  
  const tests = await db.select().from(testSeriesTests)
    .where(and(eq(testSeriesTests.testSeriesId, ts.id), eq(testSeriesTests.status, "published")))
    .orderBy(testSeriesTests.position).all();
    
  const testIds = tests.map(t => t.id);
  const allQs = testIds.length > 0 
    ? await db.select({ testId: testSeriesQuestions.testId, marks: testSeriesQuestions.marks }).from(testSeriesQuestions).where(inArray(testSeriesQuestions.testId, testIds)).all()
    : [];
    
  const mappedTests = tests.map(t => {
    const qs = allQs.filter(q => q.testId === t.id);
    return {
      id: t.id,
      title: t.title,
      durationMinutes: t.durationMin,
      totalMarks: qs.reduce((sum, q) => sum + (q.marks || 0), 0),
      questionCount: qs.length,
      passingPct: t.passingPct,
      maxAttempts: t.maxAttempts,
      position: t.position
    };
  });

  return c.json({ testSeries: ts, tests: mappedTests });
});

// ---- Student Endpoints ---------------------------------------------------
studentTestSeries.get("/", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  // Get purchased test series
  const enrollments = await db.select().from(testSeriesEnrollments).where(eq(testSeriesEnrollments.userId, user.id)).all();
  if (!enrollments.length) return c.json({ testSeries: [] });
  
  const tsIds = enrollments.map(e => e.testSeriesId);
  const list = await db.select().from(testSeries).where(inArray(testSeries.id, tsIds)).all();
  return c.json({ testSeries: list, enrollments });
});

studentTestSeries.get("/:id/pathway", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const tsId = c.req.param("id");
  
  const enrollment = await db.select().from(testSeriesEnrollments).where(and(eq(testSeriesEnrollments.userId, user.id), eq(testSeriesEnrollments.testSeriesId, tsId))).get();
  if (!enrollment) return c.json({ error: "not enrolled" }, 403);
  
  const ts = await db.select().from(testSeries).where(eq(testSeries.id, tsId)).get();
  const tests = await db.select().from(testSeriesTests)
    .where(and(eq(testSeriesTests.testSeriesId, tsId), eq(testSeriesTests.status, "published")))
    .orderBy(testSeriesTests.position).all();
    
  const testIds = tests.map(t => t.id);
  const attempts = testIds.length > 0 
    ? await db.select().from(testSeriesAttempts).where(and(eq(testSeriesAttempts.userId, user.id), inArray(testSeriesAttempts.testId, testIds))).all()
    : [];
    
  const allQs = testIds.length > 0
    ? await db.select({ testId: testSeriesQuestions.testId, marks: testSeriesQuestions.marks }).from(testSeriesQuestions).where(inArray(testSeriesQuestions.testId, testIds)).all()
    : [];

  const mappedTests = tests.map(t => {
    const qs = allQs.filter(q => q.testId === t.id);
    return {
      id: t.id,
      title: t.title,
      durationMinutes: t.durationMin,
      totalMarks: qs.reduce((sum, q) => sum + (q.marks || 0), 0),
      maxAttempts: t.maxAttempts,
      position: t.position
    };
  });
    
  return c.json({ testSeries: ts, tests: mappedTests, attempts });
});

studentTestSeries.get("/tests/:testId", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const testId = c.req.param("testId");
  
  const test = await db.select().from(testSeriesTests).where(eq(testSeriesTests.id, testId)).get();
  if (!test) return c.json({ error: "not found" }, 404);
  
  const enrollment = await db.select().from(testSeriesEnrollments).where(and(eq(testSeriesEnrollments.userId, user.id), eq(testSeriesEnrollments.testSeriesId, test.testSeriesId))).get();
  if (!enrollment) return c.json({ error: "not enrolled" }, 403);
  
  // Get active attempt
  let activeAttempt = await db.select().from(testSeriesAttempts).where(and(eq(testSeriesAttempts.userId, user.id), eq(testSeriesAttempts.testId, testId), eq(testSeriesAttempts.status, "in_progress"))).get();
  
  return c.json({ test, activeAttempt });
});

studentTestSeries.post("/tests/:testId/start", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const testId = c.req.param("testId");
  
  const test = await db.select().from(testSeriesTests).where(eq(testSeriesTests.id, testId)).get();
  if (!test) return c.json({ error: "not found" }, 404);
  
  const enrollment = await db.select().from(testSeriesEnrollments).where(and(eq(testSeriesEnrollments.userId, user.id), eq(testSeriesEnrollments.testSeriesId, test.testSeriesId))).get();
  if (!enrollment) return c.json({ error: "not enrolled" }, 403);
  
  let activeAttempt = await db.select().from(testSeriesAttempts).where(and(eq(testSeriesAttempts.userId, user.id), eq(testSeriesAttempts.testId, testId), eq(testSeriesAttempts.status, "in_progress"))).get();
  
  if (!activeAttempt) {
    // Check max attempts
    const previousAttempts = await db.select().from(testSeriesAttempts).where(and(eq(testSeriesAttempts.userId, user.id), eq(testSeriesAttempts.testId, testId))).all();
    if (previousAttempts.length >= test.maxAttempts) {
      return c.json({ error: "max attempts reached" }, 400);
    }
    
    const id = crypto.randomUUID();
    await db.insert(testSeriesAttempts).values({
      id,
      userId: user.id,
      testId,
      status: "in_progress"
    });
    activeAttempt = await db.select().from(testSeriesAttempts).where(eq(testSeriesAttempts.id, id)).get();
  }
  
  const questions = await db.select({
    id: testSeriesQuestions.id,
    prompt: testSeriesQuestions.prompt,
    optionA: testSeriesQuestions.optionA,
    optionB: testSeriesQuestions.optionB,
    optionC: testSeriesQuestions.optionC,
    optionD: testSeriesQuestions.optionD,
    marks: testSeriesQuestions.marks,
    position: testSeriesQuestions.position,
  }).from(testSeriesQuestions).where(eq(testSeriesQuestions.testId, testId)).orderBy(testSeriesQuestions.position).all();
  
  const answers = await db.select().from(testSeriesAttemptAnswers).where(eq(testSeriesAttemptAnswers.attemptId, activeAttempt!.id)).all();
  
  return c.json({ attempt: activeAttempt, questions, answers });
});

studentTestSeries.post("/attempts/:attemptId/answer", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const attemptId = c.req.param("attemptId");
  const b = await c.req.json();
  
  const attempt = await db.select().from(testSeriesAttempts).where(eq(testSeriesAttempts.id, attemptId)).get();
  if (!attempt || attempt.userId !== user.id || attempt.status !== "in_progress") {
    return c.json({ error: "invalid attempt" }, 400);
  }
  
  if (b.questionId) {
    const existing = await db.select().from(testSeriesAttemptAnswers).where(and(eq(testSeriesAttemptAnswers.attemptId, attemptId), eq(testSeriesAttemptAnswers.questionId, b.questionId))).get();
    if (existing) {
      await db.update(testSeriesAttemptAnswers).set({ selectedOption: b.selectedOption }).where(eq(testSeriesAttemptAnswers.id, existing.id));
    } else {
      await db.insert(testSeriesAttemptAnswers).values({
        id: crypto.randomUUID(),
        attemptId,
        questionId: b.questionId,
        selectedOption: b.selectedOption,
      });
    }
  }
  
  if (b.timeTakenSec !== undefined) {
    await db.update(testSeriesAttempts).set({ timeTakenSec: b.timeTakenSec }).where(eq(testSeriesAttempts.id, attemptId));
  }
  
  return c.json({ ok: true });
});

studentTestSeries.post("/attempts/:attemptId/submit", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const attemptId = c.req.param("attemptId");
  const b = await c.req.json().catch(() => ({}));
  
  const attempt = await db.select().from(testSeriesAttempts).where(eq(testSeriesAttempts.id, attemptId)).get();
  if (!attempt || attempt.userId !== user.id || attempt.status !== "in_progress") {
    return c.json({ error: "invalid attempt" }, 400);
  }
  
  const questions = await db.select().from(testSeriesQuestions).where(eq(testSeriesQuestions.testId, attempt.testId)).all();
  const answers = await db.select().from(testSeriesAttemptAnswers).where(eq(testSeriesAttemptAnswers.attemptId, attemptId)).all();
  
  let score = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  
  for (const q of questions) {
    const ans = answers.find(a => a.questionId === q.id);
    if (!ans || !ans.selectedOption) {
      skippedCount++;
    } else {
      const isCorrect = ans.selectedOption === q.correctAnswer;
      await db.update(testSeriesAttemptAnswers).set({ isCorrect }).where(eq(testSeriesAttemptAnswers.id, ans.id));
      if (isCorrect) {
        correctCount++;
        score += q.marks;
      } else {
        wrongCount++;
      }
    }
  }
  
  await db.update(testSeriesAttempts).set({
    status: "submitted",
    submittedAt: new Date(),
    score,
    correctCount,
    wrongCount,
    skippedCount,
    timeTakenSec: b.timeTakenSec ?? attempt.timeTakenSec,
  }).where(eq(testSeriesAttempts.id, attemptId));
  
  return c.json({ ok: true, attemptId });
});

studentTestSeries.get("/attempts/:attemptId/result", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const attemptId = c.req.param("attemptId");
  
  const attempt = await db.select().from(testSeriesAttempts).where(eq(testSeriesAttempts.id, attemptId)).get();
  if (!attempt || attempt.userId !== user.id) return c.json({ error: "not found" }, 404);
  
  const test = await db.select().from(testSeriesTests).where(eq(testSeriesTests.id, attempt.testId)).get();
  const testSeriesObj = await db.select().from(testSeries).where(eq(testSeries.id, test!.testSeriesId)).get();
  const questions = await db.select().from(testSeriesQuestions).where(eq(testSeriesQuestions.testId, test!.id)).orderBy(testSeriesQuestions.position).all();
  const answers = await db.select().from(testSeriesAttemptAnswers).where(eq(testSeriesAttemptAnswers.attemptId, attemptId)).all();
  
  return c.json({ attempt, test, testSeries: testSeriesObj, questions, answers });
});
