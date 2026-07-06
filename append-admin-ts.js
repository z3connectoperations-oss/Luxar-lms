import fs from 'fs';
import path from 'path';

const file = path.resolve('apps/api/src/routes/admin.ts');
let code = fs.readFileSync(file, 'utf8');

const insertionPoint = code.indexOf('export default admin;');

const newRoutes = `
// ---- Enrolled test series -------------------
admin.get("/enrollments/test-series", async (c) => {
  const db = c.get("db");
  const ts = await db.select().from(testSeries).orderBy(desc(testSeries.createdAt)).all();
  const enrs = await db.select({ testSeriesId: testSeriesEnrollments.testSeriesId }).from(testSeriesEnrollments).all();
  const counts = new Map<string, number>();
  for (const e of enrs) counts.set(e.testSeriesId, (counts.get(e.testSeriesId) || 0) + 1);
  return c.json({
    testSeries: ts.map((t) => ({ ...t, enrollmentCount: counts.get(t.id) || 0 })),
  });
});

admin.get("/enrollments/test-series/:id", async (c) => {
  const db = c.get("db");
  const tsId = c.req.param("id");
  const ts = await db.select().from(testSeries).where(eq(testSeries.id, tsId)).get();
  if (!ts) return c.json({ error: "not found" }, 404);

  const enrs = await db.select().from(testSeriesEnrollments).where(eq(testSeriesEnrollments.testSeriesId, tsId)).orderBy(desc(testSeriesEnrollments.purchaseDate)).all();
  const userIds = enrs.map((e) => e.userId);
  const usersList = userIds.length ? await db.select().from(users).where(inArray(users.id, userIds)).all() : [];
  const userById = new Map(usersList.map((u) => [u.id, u]));

  const attempts = userIds.length ? await db.select({
    userId: testSeriesAttempts.userId,
    testId: testSeriesAttempts.testId,
    score: testSeriesAttempts.score,
    correctCount: testSeriesAttempts.correctCount,
    submittedAt: testSeriesAttempts.submittedAt,
    testTitle: testSeriesTests.title,
    durationMin: testSeriesTests.durationMin,
  })
    .from(testSeriesAttempts)
    .innerJoin(testSeriesTests, eq(testSeriesAttempts.testId, testSeriesTests.id))
    .where(and(eq(testSeriesTests.testSeriesId, tsId), eq(testSeriesAttempts.status, "submitted"), inArray(testSeriesAttempts.userId, userIds)))
    .orderBy(desc(testSeriesAttempts.submittedAt))
    .all() : [];
    
  // Get all questions to calculate total marks for each test
  const tests = await db.select().from(testSeriesTests).where(eq(testSeriesTests.testSeriesId, tsId)).all();
  const testIds = tests.map(t => t.id);
  const questions = testIds.length ? await db.select({ testId: testSeriesQuestions.testId, marks: testSeriesQuestions.marks }).from(testSeriesQuestions).where(inArray(testSeriesQuestions.testId, testIds)).all() : [];
  
  const totalMarksByTest = new Map<string, number>();
  for (const q of questions) {
    totalMarksByTest.set(q.testId, (totalMarksByTest.get(q.testId) || 0) + (q.marks || 0));
  }
  
  const attemptsByUser = new Map<string, any[]>();
  for (const a of attempts) {
    if (!attemptsByUser.has(a.userId)) attemptsByUser.set(a.userId, []);
    attemptsByUser.get(a.userId)!.push({
      ...a,
      totalMarks: totalMarksByTest.get(a.testId) || 0,
    });
  }

  const totalTests = tests.length;

  return c.json({
    testSeries: ts,
    users: enrs.map((e) => {
      const u = userById.get(e.userId);
      const userAttempts = attemptsByUser.get(e.userId) || [];
      const completedTests = new Set(userAttempts.map(a => a.testId)).size;
      return {
        id: u?.id,
        name: u?.name || "Unknown",
        email: u?.email || "",
        phone: u?.phone || "",
        enrolledAt: e.purchaseDate,
        testsCompleted: completedTests,
        totalTests,
        progressPct: totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0,
        attempts: userAttempts,
      };
    }),
  });
});

`;

code = code.slice(0, insertionPoint) + newRoutes + code.slice(insertionPoint);
fs.writeFileSync(file, code);
