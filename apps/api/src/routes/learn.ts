import { Hono } from "hono";
import { eq, and, inArray, desc } from "drizzle-orm";
import { enrollments, courses, modules, lessons, lessonProgress, courseTrainers, forumThreads, forumPosts, users, notifications, tests, questions, testAttempts, attemptAnswers, descriptiveSubmissions } from "@luxar/db";
import { requireAuth } from "../middleware";
import { createNotification } from "../notify";
import type { AppEnv } from "../types";
import type { Db } from "@luxar/db";

type Env = AppEnv["Bindings"];

const learn = new Hono<AppEnv>();
learn.use("*", requireAuth);

const DAY = 86_400_000;

/** Can the current user access this course's content? (admin / enrolled / assigned trainer) */
async function hasCourseAccess(db: Db, userId: string, role: string, courseId: string) {
  if (role === "admin") return true;
  const enr = await db.select().from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))).get();
  if (enr && (!enr.expiryDate || enr.expiryDate.getTime() > Date.now())) return true;
  if (role === "trainer") {
    const t = await db.select().from(courseTrainers)
      .where(and(eq(courseTrainers.trainerId, userId), eq(courseTrainers.courseId, courseId))).get();
    if (t) return true;
  }
  return false;
}

// Resolve a lesson → its course (for access checks).
async function lessonCourse(db: Db, lessonId: string) {
  const lesson = await db.select().from(lessons).where(eq(lessons.id, lessonId)).get();
  if (!lesson) return null;
  const mod = await db.select().from(modules).where(eq(modules.id, lesson.moduleId)).get();
  if (!mod) return null;
  return { lesson, courseId: mod.courseId };
}

// Player payload for an enrolled course.
learn.get("/courses/:courseId", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = c.req.param("courseId");
  if (!(await hasCourseAccess(db, user.id, user.role, courseId)))
    return c.json({ error: "not enrolled" }, 403);

  const course = await db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course) return c.json({ error: "not found" }, 404);

  const mods = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(modules.position).all();
  const modIds = mods.map((m) => m.id);
  const allLessons = modIds.length ? await db.select().from(lessons).orderBy(lessons.position).all() : [];
  const courseLessons = allLessons.filter((l) => modIds.includes(l.moduleId));

  const progress = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, user.id)).all();
  const progressOf = (lid: string) => progress.find((p) => p.lessonId === lid);

  const isDone = (lid: string) => !!progressOf(lid)?.completed;
  // All lessons are unlocked — students may open any lesson in any order
  // (no sequential gating, no watch-tracking required to unlock).
  const ordered = mods.flatMap((m) => courseLessons.filter((l) => l.moduleId === m.id));
  const unlocked = new Set<string>(ordered.map((l) => l.id));

  const curriculum = mods.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: courseLessons
      .filter((l) => l.moduleId === m.id)
      .map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type,
        downloadable: l.downloadable,
        durationSec: l.durationSec ?? 0,
        // Content hints for the client:
        hasFile: !!l.r2Key, // served via /learn/lessons/:id/file
        externalVideoUrl: l.streamVideoId && /^https?:\/\//.test(l.streamVideoId) ? l.streamVideoId : null,
        completed: isDone(l.id),
        unlocked: unlocked.has(l.id),
        lastPositionSec: progressOf(l.id)?.lastPositionSec ?? 0,
        watchedSec: progressOf(l.id)?.watchedSec ?? 0,
      })),
  }));

  const total = courseLessons.length;
  const done = courseLessons.filter((l) => progressOf(l.id)?.completed).length;
  const progressPct = total ? Math.round((done / total) * 100) : 0;

  const enr = await db.select({ expiryDate: enrollments.expiryDate }).from(enrollments)
    .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, courseId))).get();

  return c.json({
    course: { id: course.id, title: course.title, thumbnailR2Key: course.thumbnailR2Key },
    curriculum,
    progressPct,
    totalLessons: total,
    completedLessons: done,
    enrollmentExpiry: enr?.expiryDate ?? null,
  });
});

// Mark lesson progress, then recompute course %.
learn.post("/lessons/:lessonId/progress", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const lc = await lessonCourse(db, c.req.param("lessonId"));
  if (!lc) return c.json({ error: "not found" }, 404);
  if (!(await hasCourseAccess(db, user.id, user.role, lc.courseId))) return c.json({ error: "forbidden" }, 403);

  const b = await c.req.json().catch(() => ({}));
  const lesson = lc.lesson;
  const existing = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id))).get();

  // Skip-resistant watch tracking: watchedSec is the client's running total of
  // forward-played seconds. Keep it monotonic (max of stored vs incoming).
  const watchedSec = Math.max(existing?.watchedSec ?? 0, Math.round(Number(b.watchedSec ?? 0)));
  const lastPositionSec = Math.round(Number(b.lastPositionSec ?? existing?.lastPositionSec ?? 0));
  const duration = Math.round(Number(b.durationSec ?? lesson.durationSec ?? 0));

  // Persist the video's real duration once known (used for the 90%-watched rule + reporting).
  if (duration > 0 && !lesson.durationSec) {
    await db.update(lessons).set({ durationSec: duration }).where(eq(lessons.id, lesson.id));
  }

  // Completion is allowed via an explicit "Mark as complete" (students may skip the
  // video). Videos still auto-complete once watched, but watching is not required.
  let completed: boolean;
  if (lesson.type === "video") {
    completed = (existing?.completed ?? false) || !!b.completed || (duration > 0 && watchedSec >= 0.9 * duration);
  } else {
    completed = b.completed ?? existing?.completed ?? false;
  }

  if (existing) {
    await db.update(lessonProgress)
      .set({ completed, lastPositionSec, watchedSec, updatedAt: new Date() })
      .where(eq(lessonProgress.id, existing.id));
  } else {
    await db.insert(lessonProgress).values({
      id: crypto.randomUUID(), userId: user.id, lessonId: lesson.id,
      completed, lastPositionSec, watchedSec, updatedAt: new Date(),
    });
  }

  // Recompute enrollment progress %.
  const mods = await db.select({ id: modules.id }).from(modules).where(eq(modules.courseId, lc.courseId)).all();
  const modIds = mods.map((m) => m.id);
  const courseLessonRows = modIds.length ? await db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.moduleId, modIds)).all() : [];
  const allProgress = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, user.id)).all();
  const total = courseLessonRows.length;
  const done = courseLessonRows.filter((l) => allProgress.find((p) => p.lessonId === l.id && p.completed)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  await db.update(enrollments).set({ progressPct: pct })
    .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, lc.courseId)));

  return c.json({ ok: true, progressPct: pct });
});

// Course pathway: Content → Mock Assessment → Final Assessment → Certificate.
// Each stage unlocks only when the previous is complete; certificate after Final pass.
learn.get("/courses/:courseId/pathway", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = c.req.param("courseId");
  if (!(await hasCourseAccess(db, user.id, user.role, courseId))) return c.json({ error: "not enrolled" }, 403);

  const course = await db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course) return c.json({ error: "not found" }, 404);

  // Content progress
  const mods = await db.select({ id: modules.id }).from(modules).where(eq(modules.courseId, courseId)).all();
  const modIds = mods.map((m) => m.id);
  const courseLessonRows = modIds.length ? await db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.moduleId, modIds)).all() : [];
  const allProgress = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, user.id)).all();
  const total = courseLessonRows.length;
  const done = courseLessonRows.filter((l) => allProgress.find((p) => p.lessonId === l.id && p.completed)).length;
  const contentPct = total ? Math.round((done / total) * 100) : 0;
  const contentDone = total > 0 && done >= total;

  const enr = await db.select().from(enrollments).where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, courseId))).get();
  const expiry = enr?.expiryDate ?? null;
  const now = Date.now();
  const bypass = user.role === "admin" || user.role === "trainer"; // staff can take anytime

  const attempts = await db.select().from(testAttempts).where(eq(testAttempts.userId, user.id)).all();
  const bestScore = (testId: string) => Math.max(0, ...attempts.filter((a) => a.testId === testId && a.submittedAt).map((a) => a.score ?? 0));
  const attemptCount = (testId: string) => attempts.filter((a) => a.testId === testId && a.submittedAt).length;

  // Build a scheduled assessment stage with the per-student exam window + state.
  const buildStage = (
    kind: "mock" | "final",
    test: typeof tests.$inferSelect | null | undefined,
    prereqDone: boolean,
    completed: boolean,
    opensBeforeEndDays: number,
    windowDays: number,
  ) => {
    if (!test) return null;
    // Window opens this many days before the student's enrollment expiry.
    // No window when the enrollment is lifetime (no expiry) or for staff.
    let openAt: number | null = null, closeAt: number | null = null;
    if (expiry && !bypass) {
      openAt = expiry.getTime() - opensBeforeEndDays * DAY;
      closeAt = openAt + windowDays * DAY;
    }
    const inWindow = openAt == null || (now >= openAt && now <= closeAt!);
    const canTake = prereqDone && inWindow;
    let state: "locked" | "scheduled" | "open" | "closed" | "completed";
    if (completed) state = "completed";
    else if (!prereqDone) state = "locked";
    else if (openAt != null && now < openAt) state = "scheduled";
    else if (closeAt != null && now > closeAt) state = "closed";
    else state = "open";
    return {
      kind, testId: test.id, title: test.title, type: test.type,
      durationMin: test.durationMin, totalMarks: test.totalMarks,
      attempts: attemptCount(test.id), bestScore: bestScore(test.id),
      completed, state, canTake,
      openAt: openAt != null ? new Date(openAt).toISOString() : null,
      closeAt: closeAt != null ? new Date(closeAt).toISOString() : null,
    };
  };

  const mock = course.mockTestId ? await db.select().from(tests).where(eq(tests.id, course.mockTestId)).get() : null;
  const mockDone = mock ? attemptCount(mock.id) > 0 : true; // no mock ⇒ not blocking
  const final = course.finalTestId ? await db.select().from(tests).where(eq(tests.id, course.finalTestId)).get() : null;
  const finalBest = final ? bestScore(final.id) : 0;
  const finalPass = final ? finalBest >= 0.4 * (final.totalMarks || 1) : false;

  const mockStage = buildStage("mock", mock, contentDone, mock ? attemptCount(mock.id) > 0 : false,
    course.mockOpensBeforeEndDays ?? 30, course.mockWindowDays ?? 7);
  const finalStage = buildStage("final", final, contentDone && mockDone, finalPass,
    course.finalOpensBeforeEndDays ?? 15, course.finalWindowDays ?? 7);
  if (finalStage) (finalStage as Record<string, unknown>).passed = finalPass;

  return c.json({
    course: { id: course.id, title: course.title, thumbnailR2Key: course.thumbnailR2Key },
    enrollmentExpiry: expiry ? expiry.toISOString() : null,
    stages: {
      content: { kind: "content", title: course.title, progressPct: contentPct, completed: contentDone, locked: false, totalLessons: total },
      mock: mockStage,
      final: finalStage,
    },
  });
});

// Enforce assessment prerequisites + per-student exam window server-side.
// Returns an error message if the student may NOT take this test right now, else null.
async function examGate(db: Db, user: { id: string; role: string }, test: typeof tests.$inferSelect): Promise<string | null> {
  if (user.role === "admin" || user.role === "trainer") return null;
  if (!test.courseId) return null;
  const course = await db.select().from(courses).where(eq(courses.id, test.courseId)).get();
  if (!course) return null;
  const isMock = course.mockTestId === test.id;
  const isFinal = course.finalTestId === test.id;
  if (!isMock && !isFinal) return null; // ordinary course test — no scheduling

  // Prerequisites: content first; final also requires the mock.
  const mods = await db.select({ id: modules.id }).from(modules).where(eq(modules.courseId, course.id)).all();
  const modIds = mods.map((m) => m.id);
  const lessonRows = modIds.length ? await db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.moduleId, modIds)).all() : [];
  const progress = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, user.id)).all();
  const contentDone = lessonRows.length > 0 && lessonRows.every((l) => progress.find((p) => p.lessonId === l.id && p.completed));
  if (!contentDone) return "Finish all course content first.";
  if (isFinal && course.mockTestId) {
    const ma = await db.select().from(testAttempts).where(and(eq(testAttempts.userId, user.id), eq(testAttempts.testId, course.mockTestId))).all();
    if (!ma.some((a) => a.submittedAt)) return "Complete the mock assessment first.";
  }

  // Per-student window.
  const enr = await db.select().from(enrollments).where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, course.id))).get();
  const expiry = enr?.expiryDate ?? null;
  if (expiry) {
    const before = isMock ? (course.mockOpensBeforeEndDays ?? 30) : (course.finalOpensBeforeEndDays ?? 15);
    const win = isMock ? (course.mockWindowDays ?? 7) : (course.finalWindowDays ?? 7);
    const openAt = expiry.getTime() - before * DAY;
    const closeAt = openAt + win * DAY;
    if (Date.now() < openAt) return `This exam opens on ${new Date(openAt).toDateString()}.`;
    if (Date.now() > closeAt) return `The exam window closed on ${new Date(closeAt).toDateString()}.`;
  }
  return null;
}

// Serve a lesson's R2 file (PDF / downloadable video), access-checked.
learn.get("/lessons/:lessonId/file", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const lc = await lessonCourse(db, c.req.param("lessonId"));
  if (!lc || !lc.lesson.r2Key) return c.json({ error: "not found" }, 404);
  if (!(await hasCourseAccess(db, user.id, user.role, lc.courseId))) return c.json({ error: "forbidden" }, 403);

  const obj = await c.env.BUCKET.get(lc.lesson.r2Key);
  if (!obj) return c.json({ error: "file missing" }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "Content-Length": String(obj.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
});

// ---- Tests ----------------------------------------------------------------
async function testAccess(db: Db, userId: string, role: string, test: typeof tests.$inferSelect) {
  if (test.isFree) return true;
  return test.courseId ? hasCourseAccess(db, userId, role, test.courseId) : false;
}

// List tests for an enrolled course.
learn.get("/courses/:courseId/tests", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  if (!(await hasCourseAccess(db, user.id, user.role, c.req.param("courseId")))) return c.json({ error: "forbidden" }, 403);
  const list = await db.select().from(tests).where(eq(tests.courseId, c.req.param("courseId"))).all();
  const attempts = await db.select().from(testAttempts).where(eq(testAttempts.userId, user.id)).all();
  return c.json({
    tests: list.map((t) => ({
      id: t.id, title: t.title, type: t.type, durationMin: t.durationMin, totalMarks: t.totalMarks, isFree: t.isFree,
      attempts: attempts.filter((a) => a.testId === t.id).length,
      bestScore: Math.max(0, ...attempts.filter((a) => a.testId === t.id).map((a) => a.score ?? 0)),
    })),
  });
});

// Free mock tests (any logged-in user).
learn.get("/free-tests", async (c) => {
  const list = await c.get("db").select().from(tests).where(eq(tests.isFree, true)).all();
  return c.json({ tests: list.map((t) => ({ id: t.id, title: t.title, type: t.type, durationMin: t.durationMin, totalMarks: t.totalMarks })) });
});

// Fetch a test to take — questions WITHOUT correct answers/solutions.
learn.get("/tests/:id/take", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const test = await db.select().from(tests).where(eq(tests.id, c.req.param("id"))).get();
  if (!test) return c.json({ error: "not found" }, 404);
  if (!(await testAccess(db, user.id, user.role, test))) return c.json({ error: "forbidden" }, 403);
  const gate = await examGate(db, user, test);
  if (gate) return c.json({ error: gate }, 403);
  const qs = await db.select().from(questions).where(eq(questions.testId, test.id)).orderBy(questions.position).all();
  return c.json({
    test: { id: test.id, title: test.title, type: test.type, durationMin: test.durationMin, totalMarks: test.totalMarks },
    questions: qs.map((q) => ({ id: q.id, type: q.type, promptMd: q.promptMd, options: q.optionsJson ? JSON.parse(q.optionsJson) : [], marks: q.marks, topic: q.topic })),
  });
});

// Submit a test → auto-grade MCQ, or queue descriptive for evaluation.
learn.post("/tests/:id/submit", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const test = await db.select().from(tests).where(eq(tests.id, c.req.param("id"))).get();
  if (!test) return c.json({ error: "not found" }, 404);
  if (!(await testAccess(db, user.id, user.role, test))) return c.json({ error: "forbidden" }, 403);
  const gate = await examGate(db, user, test);
  if (gate) return c.json({ error: gate }, 403);

  const b = await c.req.json().catch(() => ({}));
  const answers: Record<string, string> = b.answers || {};
  const timeTakenSec = b.timeTakenSec ?? 0;
  const qs = await db.select().from(questions).where(eq(questions.testId, test.id)).orderBy(questions.position).all();

  const attemptId = crypto.randomUUID();

  if (test.type === "descriptive") {
    await db.insert(testAttempts).values({
      id: attemptId, userId: user.id, testId: test.id, submittedAt: new Date(), timeTakenSec,
      correctCount: 0, incorrectCount: 0, unattempted: 0,
    });
    await db.insert(descriptiveSubmissions).values({
      id: crypto.randomUUID(), attemptId, userId: user.id, contentMd: b.contentMd || "", status: "pending",
    });
    return c.json({ attemptId, pendingEvaluation: true });
  }

  // Objective grading
  let score = 0, correct = 0, incorrect = 0, unattempted = 0;
  const perTopic: Record<string, { correct: number; total: number }> = {};
  for (const q of qs) {
    const ans = answers[q.id];
    const topic = q.topic || "General";
    perTopic[topic] = perTopic[topic] || { correct: 0, total: 0 };
    perTopic[topic].total++;
    if (ans == null || ans === "") { unattempted++; continue; }
    const isCorrect = String(ans) === String(q.correctAnswer);
    const awarded = isCorrect ? (q.marks ?? 0) : -(q.negativeMarks ?? 0);
    score += awarded;
    if (isCorrect) { correct++; perTopic[topic].correct++; } else incorrect++;
    await db.insert(attemptAnswers).values({ id: crypto.randomUUID(), attemptId, questionId: q.id, answer: ans, isCorrect, marksAwarded: awarded });
  }

  // Rank vs other attempts on this test.
  const others = await db.select({ score: testAttempts.score }).from(testAttempts).where(eq(testAttempts.testId, test.id)).all();
  const higher = others.filter((o) => (o.score ?? 0) > score).length;

  await db.insert(testAttempts).values({
    id: attemptId, userId: user.id, testId: test.id, submittedAt: new Date(), score, timeTakenSec,
    correctCount: correct, incorrectCount: incorrect, unattempted, rank: higher + 1, perTopicJson: JSON.stringify(perTopic),
  });

  return c.json({ attemptId, score, correct, incorrect, unattempted });
});

// Result with solutions.
learn.get("/attempts/:id/result", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const attempt = await db.select().from(testAttempts).where(eq(testAttempts.id, c.req.param("id"))).get();
  if (!attempt || attempt.userId !== user.id) return c.json({ error: "not found" }, 404);
  const test = await db.select().from(tests).where(eq(tests.id, attempt.testId)).get();
  const qs = await db.select().from(questions).where(eq(questions.testId, attempt.testId)).orderBy(questions.position).all();
  const ans = await db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, attempt.id)).all();
  const desc = await db.select().from(descriptiveSubmissions).where(eq(descriptiveSubmissions.attemptId, attempt.id)).get();

  return c.json({
    attempt: {
      score: attempt.score, correctCount: attempt.correctCount, incorrectCount: attempt.incorrectCount,
      unattempted: attempt.unattempted, rank: attempt.rank, timeTakenSec: attempt.timeTakenSec,
      perTopic: attempt.perTopicJson ? JSON.parse(attempt.perTopicJson) : {},
    },
    test: { title: test?.title, type: test?.type, totalMarks: test?.totalMarks },
    descriptive: desc ? { contentMd: desc.contentMd, status: desc.status, marks: desc.marks, feedbackMd: desc.feedbackMd } : null,
    questions: qs.map((q) => {
      const a = ans.find((x) => x.questionId === q.id);
      return {
        promptMd: q.promptMd, options: q.optionsJson ? JSON.parse(q.optionsJson) : [],
        correctAnswer: q.correctAnswer, solutionMd: q.solutionMd, topic: q.topic,
        yourAnswer: a?.answer ?? null, isCorrect: a?.isCorrect ?? null, marksAwarded: a?.marksAwarded ?? null,
      };
    }),
  });
});

// ---- Doubts / forum (shared by students & trainers) ----------------------

// List doubts for a course.
learn.get("/courses/:courseId/doubts", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = c.req.param("courseId");
  if (!(await hasCourseAccess(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  const threads = await db
    .select({ id: forumThreads.id, title: forumThreads.title, bodyMd: forumThreads.bodyMd, createdAt: forumThreads.createdAt, authorName: users.name })
    .from(forumThreads)
    .leftJoin(users, eq(forumThreads.userId, users.id))
    .where(eq(forumThreads.courseId, courseId))
    .orderBy(desc(forumThreads.createdAt))
    .all();
  return c.json({ threads });
});

// Post a new doubt.
learn.post("/courses/:courseId/doubts", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = c.req.param("courseId");
  if (!(await hasCourseAccess(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json().catch(() => ({}));
  if (!b?.title) return c.json({ error: "title required" }, 400);
  const id = crypto.randomUUID();
  await db.insert(forumThreads).values({ id, courseId, userId: user.id, title: b.title, bodyMd: b.bodyMd });
  if (b.bodyMd) {
    await db.insert(forumPosts).values({ id: crypto.randomUUID(), threadId: id, userId: user.id, bodyMd: b.bodyMd, isTrainerAnswer: false });
  }
  return c.json({ id });
});

async function threadCourse(db: Db, threadId: string) {
  const t = await db.select().from(forumThreads).where(eq(forumThreads.id, threadId)).get();
  return t ? { thread: t, courseId: t.courseId } : null;
}

// Thread detail with posts.
learn.get("/threads/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const tc = await threadCourse(db, c.req.param("id"));
  if (!tc || !tc.courseId) return c.json({ error: "not found" }, 404);
  if (!(await hasCourseAccess(db, user.id, user.role, tc.courseId))) return c.json({ error: "forbidden" }, 403);
  const posts = await db
    .select({ id: forumPosts.id, bodyMd: forumPosts.bodyMd, isTrainerAnswer: forumPosts.isTrainerAnswer, createdAt: forumPosts.createdAt, authorName: users.name })
    .from(forumPosts)
    .leftJoin(users, eq(forumPosts.userId, users.id))
    .where(eq(forumPosts.threadId, tc.thread.id))
    .orderBy(forumPosts.createdAt)
    .all();
  return c.json({ thread: tc.thread, posts });
});

// Reply to a thread (trainer/admin replies are flagged as answers).
learn.post("/threads/:id/posts", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const tc = await threadCourse(db, c.req.param("id"));
  if (!tc || !tc.courseId) return c.json({ error: "not found" }, 404);
  if (!(await hasCourseAccess(db, user.id, user.role, tc.courseId))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json().catch(() => ({}));
  if (!b?.bodyMd) return c.json({ error: "bodyMd required" }, 400);
  const isTrainer = user.role === "trainer" || user.role === "admin";
  await db.insert(forumPosts).values({ id: crypto.randomUUID(), threadId: tc.thread.id, userId: user.id, bodyMd: b.bodyMd, isTrainerAnswer: isTrainer });
  // Notify the thread author when a trainer answers.
  if (isTrainer && tc.thread.userId !== user.id) {
    await createNotification(db, c.env, {
      userId: tc.thread.userId, type: "doubt", title: "Your doubt was answered",
      body: tc.thread.title, link: "/student/courses/" + tc.courseId,
    });
  }
  return c.json({ ok: true });
});

export default learn;
