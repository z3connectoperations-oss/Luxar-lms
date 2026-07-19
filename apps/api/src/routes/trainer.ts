import { Hono } from "hono";
import { eq, and, inArray, desc } from "drizzle-orm";
import { courses, courseTrainers, modules, lessons, materials, scheduleEvents, forumThreads, users, tests, questions, testAttempts, descriptiveSubmissions, mentorshipSlots, interviewSessions, liveSessions, enrollments, subjects } from "@luxar/db";
import { requireRole } from "../middleware";
import { createNotification } from "../notify";
import type { AppEnv } from "../types";
import type { Db } from "@luxar/db";

const trainer = new Hono<AppEnv>();
trainer.use("*", requireRole("trainer", "admin"));

// Course ids this user may manage (admin → all). Includes both the assigned
// mentor (courses.trainerId) and the courseTrainers join table.
async function managedCourseIds(db: Db, userId: string, role: string): Promise<string[]> {
  if (role === "admin") return (await db.select({ id: courses.id }).from(courses).all()).map((r) => r.id);
  const assigned = await db.select({ id: courses.id }).from(courses).where(eq(courses.trainerId, userId)).all();
  const joined = await db.select({ courseId: courseTrainers.courseId }).from(courseTrainers).where(eq(courseTrainers.trainerId, userId)).all();
  return [...new Set([...assigned.map((r) => r.id), ...joined.map((r) => r.courseId)])];
}
async function canManage(db: Db, userId: string, role: string, courseId: string) {
  if (role === "admin") return true;
  const course = await db.select({ trainerId: courses.trainerId }).from(courses).where(eq(courses.id, courseId)).get();
  if (course?.trainerId === userId) return true;
  const t = await db.select().from(courseTrainers).where(and(eq(courseTrainers.trainerId, userId), eq(courseTrainers.courseId, courseId))).get();
  return !!t;
}

// Notify every enrolled student of a course (best-effort).
async function notifyEnrolled(db: Db, env: AppEnv["Bindings"], courseId: string, n: { type: string; title: string; body: string; link: string }) {
  const rows = await db.select({ userId: enrollments.userId }).from(enrollments).where(eq(enrollments.courseId, courseId)).all();
  await Promise.all(rows.map((r) => createNotification(db, env, { userId: r.userId, ...n }).catch(() => {})));
}
async function moduleCourse(db: Db, moduleId: string) {
  const m = await db.select().from(modules).where(eq(modules.id, moduleId)).get();
  return m?.courseId ?? null;
}

// ---- Assigned courses -----------------------------------------------------
trainer.get("/courses", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const ids = await managedCourseIds(db, user.id, user.role);
  const list = ids.length ? await db.select().from(courses).where(inArray(courses.id, ids)).all() : [];
  return c.json({ courses: list });
});

trainer.get("/courses/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const id = c.req.param("id");
  if (!(await canManage(db, user.id, user.role, id))) return c.json({ error: "forbidden" }, 403);
  const course = await db.select().from(courses).where(eq(courses.id, id)).get();
  if (!course) return c.json({ error: "not found" }, 404);
  const mods = await db.select().from(modules).where(eq(modules.courseId, id)).orderBy(modules.position).all();
  const modIds = mods.map((m) => m.id);
  const allLessons = modIds.length
    ? await db.select().from(lessons).where(inArray(lessons.moduleId, modIds)).orderBy(lessons.position).all()
    : [];
  const mats = await db.select().from(materials).where(eq(materials.courseId, id)).all();
  const subs = await db.select().from(subjects).where(eq(subjects.courseId, id)).orderBy(subjects.position).all();
  return c.json({
    course: { id: course.id, title: course.title, status: course.status },
    materials: mats,
    subjects: subs,
    modules: mods.map((m) => ({ ...m, lessons: allLessons.filter((l) => l.moduleId === m.id) })),
  });
});

// ---- Content CRUD (scoped to managed courses) -----------------------------
trainer.post("/courses/:id/modules", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  if (!(await canManage(db, user.id, user.role, c.req.param("id")))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await db.insert(modules).values({ id, courseId: c.req.param("id"), subjectId: b.subjectId || null, title: b.title || "Untitled module", position: b.position ?? 0 });
  return c.json({ id });
});
trainer.delete("/modules/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = await moduleCourse(db, c.req.param("id"));
  if (!courseId || !(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  await db.delete(modules).where(eq(modules.id, c.req.param("id")));
  return c.json({ ok: true });
});

trainer.post("/modules/:id/lessons", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = await moduleCourse(db, c.req.param("id"));
  if (!courseId || !(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await db.insert(lessons).values({
    id, moduleId: c.req.param("id"), type: b.type || "video", title: b.title || "Untitled lesson",
    position: b.position ?? 0, streamVideoId: b.streamVideoId, r2Key: b.r2Key,
    downloadable: !!b.downloadable, isFreePreview: !!b.isFreePreview, status: b.status || "published", uploadedBy: user.id,
  });
  return c.json({ id });
});
trainer.patch("/lessons/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const lesson = await db.select().from(lessons).where(eq(lessons.id, c.req.param("id"))).get();
  if (!lesson) return c.json({ error: "not found" }, 404);
  const courseId = await moduleCourse(db, lesson.moduleId);
  if (!courseId || !(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  await db.update(lessons).set(await c.req.json()).where(eq(lessons.id, c.req.param("id")));
  return c.json({ ok: true });
});
trainer.delete("/lessons/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const lesson = await db.select().from(lessons).where(eq(lessons.id, c.req.param("id"))).get();
  if (!lesson) return c.json({ error: "not found" }, 404);
  const courseId = await moduleCourse(db, lesson.moduleId);
  if (!courseId || !(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  await db.delete(lessons).where(eq(lessons.id, c.req.param("id")));
  return c.json({ ok: true });
});

trainer.post("/courses/:id/materials", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  if (!(await canManage(db, user.id, user.role, c.req.param("id")))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await db.insert(materials).values({ id, courseId: c.req.param("id"), title: b.title || "Material", kind: b.kind || "pdf", r2Key: b.r2Key, url: b.url, uploadedBy: user.id });
  return c.json({ id });
});
trainer.delete("/materials/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const mat = await db.select().from(materials).where(eq(materials.id, c.req.param("id"))).get();
  if (!mat || !(await canManage(db, user.id, user.role, mat.courseId))) return c.json({ error: "forbidden" }, 403);
  await db.delete(materials).where(eq(materials.id, c.req.param("id")));
  return c.json({ ok: true });
});

// Upload a file to R2 (same as admin, available to trainers).
trainer.put("/upload", async (c) => {
  const folder = (c.req.query("folder") || "uploads").replace(/[^a-z0-9/_-]/gi, "");
  const filename = (c.req.query("filename") || "file").replace(/[^a-z0-9._-]/gi, "_");
  const key = `${folder}/${crypto.randomUUID()}-${filename}`;
  await c.env.BUCKET.put(key, await c.req.arrayBuffer(), {
    httpMetadata: { contentType: c.req.header("content-type") || "application/octet-stream" },
  });
  return c.json({ key });
});

// ---- Scheduling -----------------------------------------------------------
trainer.get("/schedule", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const ids = await managedCourseIds(db, user.id, user.role);
  if (!ids.length) return c.json({ events: [] });
  const events = await db
    .select({ id: scheduleEvents.id, courseId: scheduleEvents.courseId, title: scheduleEvents.title, type: scheduleEvents.type, startsAt: scheduleEvents.startsAt, courseTitle: courses.title })
    .from(scheduleEvents)
    .innerJoin(courses, eq(scheduleEvents.courseId, courses.id))
    .where(inArray(scheduleEvents.courseId, ids))
    .orderBy(scheduleEvents.startsAt)
    .all();
  return c.json({ events });
});
trainer.post("/courses/:id/schedule", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  if (!(await canManage(db, user.id, user.role, c.req.param("id")))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json();
  if (!b?.title || !b?.startsAt) return c.json({ error: "title and startsAt required" }, 400);
  const id = crypto.randomUUID();
  await db.insert(scheduleEvents).values({
    id, courseId: c.req.param("id"), type: b.type || "class", title: b.title,
    startsAt: new Date(b.startsAt), endsAt: b.endsAt ? new Date(b.endsAt) : null, trainerId: user.id, notes: b.notes,
  });
  return c.json({ id });
});
trainer.delete("/schedule/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const ev = await db.select().from(scheduleEvents).where(eq(scheduleEvents.id, c.req.param("id"))).get();
  if (!ev || !(await canManage(db, user.id, user.role, ev.courseId))) return c.json({ error: "forbidden" }, 403);
  await db.delete(scheduleEvents).where(eq(scheduleEvents.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Doubts across assigned courses ---------------------------------------
trainer.get("/doubts", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const ids = await managedCourseIds(db, user.id, user.role);
  if (!ids.length) return c.json({ threads: [] });
  const threads = await db
    .select({ id: forumThreads.id, title: forumThreads.title, courseId: forumThreads.courseId, createdAt: forumThreads.createdAt, authorName: users.name, courseTitle: courses.title })
    .from(forumThreads)
    .leftJoin(users, eq(forumThreads.userId, users.id))
    .leftJoin(courses, eq(forumThreads.courseId, courses.id))
    .where(inArray(forumThreads.courseId, ids))
    .orderBy(desc(forumThreads.createdAt))
    .all();
  return c.json({ threads });
});

// ---- Tests & questions ----------------------------------------------------
async function testCourse(db: Db, testId: string) {
  const t = await db.select().from(tests).where(eq(tests.id, testId)).get();
  return t?.courseId ?? null;
}

trainer.get("/courses/:id/tests", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  if (!(await canManage(db, user.id, user.role, c.req.param("id")))) return c.json({ error: "forbidden" }, 403);
  const list = await db.select().from(tests).where(eq(tests.courseId, c.req.param("id"))).all();
  return c.json({ tests: list });
});

trainer.post("/courses/:id/tests", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  if (!(await canManage(db, user.id, user.role, c.req.param("id")))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await db.insert(tests).values({
    id, courseId: c.req.param("id"), title: b.title || "Untitled test", type: b.type || "objective",
    durationMin: b.durationMin ?? 30, negativeMarking: b.negativeMarking ?? 0, isFree: !!b.isFree, totalMarks: 0,
  });
  return c.json({ id });
});

trainer.get("/tests/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = await testCourse(db, c.req.param("id"));
  if (!courseId || !(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  const test = await db.select().from(tests).where(eq(tests.id, c.req.param("id"))).get();
  const qs = await db.select().from(questions).where(eq(questions.testId, c.req.param("id"))).orderBy(questions.position).all();
  return c.json({ test, questions: qs });
});

trainer.patch("/tests/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = await testCourse(db, c.req.param("id"));
  if (!courseId || !(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  await db.update(tests).set(await c.req.json()).where(eq(tests.id, c.req.param("id")));
  return c.json({ ok: true });
});

trainer.delete("/tests/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = await testCourse(db, c.req.param("id"));
  if (!courseId || !(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  await db.delete(tests).where(eq(tests.id, c.req.param("id")));
  return c.json({ ok: true });
});

// Recompute a test's totalMarks from its questions.
async function recomputeTotal(db: Db, testId: string) {
  const qs = await db.select({ marks: questions.marks }).from(questions).where(eq(questions.testId, testId)).all();
  const total = qs.reduce((s, q) => s + (q.marks ?? 0), 0);
  await db.update(tests).set({ totalMarks: total }).where(eq(tests.id, testId));
}

trainer.post("/tests/:id/questions", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = await testCourse(db, c.req.param("id"));
  if (!courseId || !(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json();
  const id = crypto.randomUUID();
  const count = (await db.select({ id: questions.id }).from(questions).where(eq(questions.testId, c.req.param("id"))).all()).length;
  await db.insert(questions).values({
    id, testId: c.req.param("id"), type: b.type || "mcq", promptMd: b.promptMd || "",
    optionsJson: b.options ? JSON.stringify(b.options) : null, correctAnswer: b.correctAnswer ?? null,
    solutionMd: b.solutionMd ?? null, topic: b.topic ?? null, marks: b.marks ?? 1, negativeMarks: b.negativeMarks ?? 0, position: count,
  });
  await recomputeTotal(db, c.req.param("id"));
  return c.json({ id });
});

trainer.delete("/questions/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const q = await db.select().from(questions).where(eq(questions.id, c.req.param("id"))).get();
  if (!q) return c.json({ error: "not found" }, 404);
  const courseId = await testCourse(db, q.testId);
  if (!courseId || !(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  await db.delete(questions).where(eq(questions.id, c.req.param("id")));
  await recomputeTotal(db, q.testId);
  return c.json({ ok: true });
});

// ---- Descriptive evaluation queue -----------------------------------------
trainer.get("/evaluations", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const ids = await managedCourseIds(db, user.id, user.role);
  if (!ids.length) return c.json({ submissions: [] });
  // Join submission → attempt → test → course, keep pending ones for managed courses.
  const rows = await db
    .select({
      id: descriptiveSubmissions.id, contentMd: descriptiveSubmissions.contentMd, status: descriptiveSubmissions.status,
      studentName: users.name, testTitle: tests.title, courseId: tests.courseId,
    })
    .from(descriptiveSubmissions)
    .innerJoin(testAttempts, eq(descriptiveSubmissions.attemptId, testAttempts.id))
    .innerJoin(tests, eq(testAttempts.testId, tests.id))
    .leftJoin(users, eq(descriptiveSubmissions.userId, users.id))
    .where(eq(descriptiveSubmissions.status, "pending"))
    .all();
  return c.json({ submissions: rows.filter((r) => ids.includes(r.courseId!)) });
});

trainer.post("/evaluations/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const sub = await db.select().from(descriptiveSubmissions).where(eq(descriptiveSubmissions.id, c.req.param("id"))).get();
  if (!sub) return c.json({ error: "not found" }, 404);
  const b = await c.req.json();
  await db.update(descriptiveSubmissions)
    .set({ status: "evaluated", marks: b.marks ?? 0, feedbackMd: b.feedbackMd, evaluatorId: user.id })
    .where(eq(descriptiveSubmissions.id, c.req.param("id")));
  await createNotification(db, c.env, {
    userId: sub.userId, type: "evaluation", title: "Your answer was evaluated",
    body: `You scored ${b.marks ?? 0} marks.`, link: "/student/tests",
  });
  return c.json({ ok: true });
});

// ---- Mentorship slots -----------------------------------------------------
trainer.get("/mentorship/slots", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const rows = user.role === "admin"
    ? await db.select().from(mentorshipSlots).orderBy(mentorshipSlots.startTime).all()
    : await db.select().from(mentorshipSlots).where(eq(mentorshipSlots.mentorId, user.id)).orderBy(mentorshipSlots.startTime).all();
  return c.json({ slots: rows });
});
trainer.post("/mentorship/slots", async (c) => {
  const b = await c.req.json();
  if (!b?.startTime) return c.json({ error: "startTime required" }, 400);
  const id = crypto.randomUUID();
  await c.get("db").insert(mentorshipSlots).values({ id, mentorId: c.get("user")!.id, startTime: new Date(b.startTime), capacity: b.capacity ?? 1, booked: 0 });
  return c.json({ id });
});
trainer.delete("/mentorship/slots/:id", async (c) => {
  await c.get("db").delete(mentorshipSlots).where(eq(mentorshipSlots.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Interview prep -------------------------------------------------------
trainer.get("/interviews", async (c) => {
  const rows = await c.get("db")
    .select({ id: interviewSessions.id, studentName: users.name, scheduledAt: interviewSessions.scheduledAt, status: interviewSessions.status, feedbackMd: interviewSessions.feedbackMd })
    .from(interviewSessions)
    .leftJoin(users, eq(interviewSessions.userId, users.id))
    .orderBy(desc(interviewSessions.scheduledAt))
    .all();
  return c.json({ sessions: rows });
});
trainer.post("/interviews/:id", async (c) => {
  const b = await c.req.json();
  const patch: any = {};
  if (b.scheduledAt) patch.scheduledAt = new Date(b.scheduledAt);
  if (b.feedbackMd !== undefined) patch.feedbackMd = b.feedbackMd;
  if (b.status) patch.status = b.status;
  const sub = await c.get("db").select().from(interviewSessions).where(eq(interviewSessions.id, c.req.param("id"))).get();
  await c.get("db").update(interviewSessions).set(patch).where(eq(interviewSessions.id, c.req.param("id")));
  if (sub && (b.feedbackMd || b.status)) {
    await createNotification(c.get("db"), c.env, {
      userId: sub.userId, type: "interview", title: "Interview prep update",
      body: b.status === "scheduled" ? "Your mock interview is scheduled." : "You have new interview feedback.", link: "/student/interview",
    });
  }
  return c.json({ ok: true });
});

// ---- Live classes ---------------------------------------------------------
// Sessions for one course (manager view).
trainer.get("/courses/:id/live", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  if (!(await canManage(db, user.id, user.role, c.req.param("id")))) return c.json({ error: "forbidden" }, 403);
  const sessions = await db.select().from(liveSessions).where(eq(liveSessions.courseId, c.req.param("id"))).orderBy(desc(liveSessions.scheduledStart)).all();
  return c.json({ sessions });
});

// All live classes across the courses this user manages (admin → all). Overview.
trainer.get("/live", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const ids = await managedCourseIds(db, user.id, user.role);
  if (!ids.length) return c.json({ sessions: [] });
  const sessions = await db
    .select({ id: liveSessions.id, courseId: liveSessions.courseId, moduleId: liveSessions.moduleId, title: liveSessions.title, status: liveSessions.status, scheduledStart: liveSessions.scheduledStart, courseTitle: courses.title, moduleTitle: modules.title })
    .from(liveSessions)
    .innerJoin(courses, eq(liveSessions.courseId, courses.id))
    .leftJoin(modules, eq(liveSessions.moduleId, modules.id))
    .where(inArray(liveSessions.courseId, ids))
    .orderBy(desc(liveSessions.scheduledStart))
    .all();
  return c.json({ sessions });
});

// Schedule a class for a future date/time. Notifies enrolled students.
trainer.post("/courses/:id/live/schedule", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = c.req.param("id");
  if (!(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json().catch(() => ({}));
  if (!b?.title || !b?.scheduledStart) return c.json({ error: "title and scheduledStart required" }, 400);
  if (!b?.moduleId) return c.json({ error: "moduleId required" }, 400);
  const id = crypto.randomUUID();
  const startsAt = new Date(b.scheduledStart);
  await db.insert(liveSessions).values({
    id, courseId, moduleId: b.moduleId, room: `c-${courseId}-m-${String(b.moduleId).slice(0, 6)}-${id.slice(0, 8)}`, title: b.title,
    scheduledStart: startsAt, status: "scheduled", hostId: user.id,
  });
  // Mirror onto the unified schedule so it shows for everyone + cron reminders.
  await db.insert(scheduleEvents).values({
    id: crypto.randomUUID(), courseId, type: "live", title: b.title,
    startsAt, endsAt: b.durationMin ? new Date(startsAt.getTime() + Number(b.durationMin) * 60000) : null,
    trainerId: user.id, liveSessionId: id, notes: b.notes,
  });
  const course = await db.select({ title: courses.title }).from(courses).where(eq(courses.id, courseId)).get();
  await notifyEnrolled(db, c.env, courseId, {
    type: "live", title: "📅 Live class scheduled",
    body: `${b.title} — ${startsAt.toLocaleString()} (${course?.title ?? "course"})`,
    link: `/student/courses/${courseId}`,
  });
  return c.json({ id });
});

// Go live now: end any running session, then start a fresh one.
trainer.post("/courses/:id/live/start", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const courseId = c.req.param("id");
  if (!(await canManage(db, user.id, user.role, courseId))) return c.json({ error: "forbidden" }, 403);
  const b = await c.req.json().catch(() => ({}));
  if (!b?.moduleId) return c.json({ error: "moduleId required" }, 400);
  await db.update(liveSessions).set({ status: "ended" }).where(and(eq(liveSessions.courseId, courseId), eq(liveSessions.status, "live")));
  const id = crypto.randomUUID();
  const room = `c-${courseId}-m-${String(b.moduleId).slice(0, 6)}-${id.slice(0, 8)}`;
  await db.insert(liveSessions).values({
    id, courseId, moduleId: b.moduleId, room, title: b.title || "Live class",
    scheduledStart: new Date(), status: "live", hostId: user.id,
  });
  await notifyEnrolled(db, c.env, courseId, {
    type: "live", title: "🔴 Class is live now", body: b.title || "Your trainer just went live.",
    link: `/student/courses/${courseId}/live`,
  });
  return c.json({ id, room });
});

// Start a previously scheduled session (turn it live).
trainer.post("/live/:id/start", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const s = await db.select().from(liveSessions).where(eq(liveSessions.id, c.req.param("id"))).get();
  if (!s || !(await canManage(db, user.id, user.role, s.courseId))) return c.json({ error: "forbidden" }, 403);
  // Only one live session per course.
  await db.update(liveSessions).set({ status: "ended" }).where(and(eq(liveSessions.courseId, s.courseId), eq(liveSessions.status, "live")));
  await db.update(liveSessions).set({ status: "live", hostId: user.id }).where(eq(liveSessions.id, s.id));
  await notifyEnrolled(db, c.env, s.courseId, {
    type: "live", title: "🔴 Class is live now", body: s.title,
    link: `/student/courses/${s.courseId}/live`,
  });
  return c.json({ ok: true, room: s.room });
});

trainer.post("/live/:id/end", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const s = await db.select().from(liveSessions).where(eq(liveSessions.id, c.req.param("id"))).get();
  if (!s || !(await canManage(db, user.id, user.role, s.courseId))) return c.json({ error: "forbidden" }, 403);
  await db.update(liveSessions).set({ status: "ended" }).where(eq(liveSessions.id, c.req.param("id")));
  return c.json({ ok: true });
});

// Save a recording for a live class: stores the R2 key on the session AND adds it to
// the session's MODULE as a titled video lesson (so students watch it under that module).
trainer.post("/live/:id/recording", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const s = await db.select().from(liveSessions).where(eq(liveSessions.id, c.req.param("id"))).get();
  if (!s || !(await canManage(db, user.id, user.role, s.courseId))) return c.json({ error: "forbidden" }, 403);
  if (!s.moduleId) return c.json({ error: "this live class has no module" }, 400);
  const b = await c.req.json().catch(() => ({}));
  if (!b?.r2Key) return c.json({ error: "r2Key required" }, 400);

  const modLessons = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.moduleId, s.moduleId)).all();
  const lessonId = crypto.randomUUID();
  await db.insert(lessons).values({
    id: lessonId, moduleId: s.moduleId, type: "video",
    title: `${s.title} — Recording`, r2Key: b.r2Key,
    position: modLessons.length, downloadable: false, status: "published", uploadedBy: user.id,
  });
  await db.update(liveSessions).set({ recordingUrl: b.r2Key }).where(eq(liveSessions.id, s.id));

  await notifyEnrolled(db, c.env, s.courseId, {
    type: "live", title: "🎥 Class recording available",
    body: `Recording of "${s.title}" is now available.`,
    link: `/student/courses/${s.courseId}`,
  });
  return c.json({ ok: true, lessonId });
});

// Cancel (delete) a scheduled session + its schedule event.
trainer.delete("/live/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const s = await db.select().from(liveSessions).where(eq(liveSessions.id, c.req.param("id"))).get();
  if (!s || !(await canManage(db, user.id, user.role, s.courseId))) return c.json({ error: "forbidden" }, 403);
  await db.delete(scheduleEvents).where(eq(scheduleEvents.liveSessionId, s.id));
  await db.delete(liveSessions).where(eq(liveSessions.id, s.id));
  return c.json({ ok: true });
});

export default trainer;
