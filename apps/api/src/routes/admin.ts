import { Hono } from "hono";
import { eq, desc, and, or, inArray, sql, isNull } from "drizzle-orm";
import {
  exams,
  courses,
  courseVariants,
  courseTrainers,
  modules,
  lessons,
  materials,
  coupons,
  cmsBlocks,
  announcements,
  users,
  auditLog,
  currentAffairsPosts,
  products,
  categories,
  notificationPrefs,
  enrollments,
  orders,
  orderItems,
  leads,
  mockTests,
  mockQuestions,
  mockAttempts,
  testSeries,
  testSeriesEnrollments,
  testSeriesTests,
  testSeriesQuestions,
  testSeriesAttempts,
  packageTestSeries,
  lessonProgress,
  certificates,
  interviewSessions,
} from "@luxar/db";
import { requireRole } from "../middleware";
import type { AppEnv } from "../types";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || crypto.randomUUID().slice(0, 8);

const admin = new Hono<AppEnv>();
admin.use("*", requireRole("admin"));

const audit = (c: any, action: string, entity: string, entityId: string) =>
  c.get("db").insert(auditLog).values({
    actorId: c.get("user")!.id,
    action,
    entity,
    entityId,
  });

// ---- Dashboard stats ------------------------------------------------------
admin.get("/stats", async (c) => {
  const db = c.get("db");
  const [courseCount, studentCount, trainerCount, orderCount] = await Promise.all([
    db.$count(courses),
    db.$count(users, eq(users.role, "student")),
    db.$count(users, eq(users.role, "trainer")),
    db.$count(courseVariants),
  ]);
  return c.json({
    courses: courseCount,
    students: studentCount,
    trainers: trainerCount,
    variants: orderCount,
  });
});

// ---- Dashboard analytics (revenue, payments, activity) ---------------------
admin.get("/dashboard", async (c) => {
  const db = c.get("db");

  const [courseCount, studentCount, trainerCount, variantCount, courseEnrollCount, tsEnrollCount] = await Promise.all([
    db.$count(courses),
    db.$count(users, eq(users.role, "student")),
    db.$count(users, eq(users.role, "trainer")),
    db.$count(courseVariants),
    db.$count(enrollments),
    db.$count(testSeriesEnrollments),
  ]);

  // Reference maps (small tables) to resolve names.
  const [allCourses, allVariants, allSeries] = await Promise.all([
    db.select({ id: courses.id, title: courses.title }).from(courses).all(),
    db.select({ id: courseVariants.id, courseId: courseVariants.courseId }).from(courseVariants).all(),
    db.select({ id: testSeries.id, title: testSeries.title }).from(testSeries).all(),
  ]);
  const courseTitle = new Map(allCourses.map((x) => [x.id, x.title]));
  const variantCourse = new Map(allVariants.map((x) => [x.id, x.courseId]));
  const seriesTitle = new Map(allSeries.map((x) => [x.id, x.title]));

  // Paid orders → revenue metrics.
  const paidOrders = await db.select().from(orders).where(eq(orders.status, "paid")).orderBy(desc(orders.createdAt)).all();
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0);
  const verifiedRevenue = paidOrders.filter((o) => o.paymentVerified).reduce((s, o) => s + (o.total || 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthRevenue = paidOrders
    .filter((o) => o.createdAt && o.createdAt.getTime() >= monthStart)
    .reduce((s, o) => s + (o.total || 0), 0);

  // Revenue for the last 6 months (for the mini chart).
  const revenueByMonth: { label: string; revenue: number }[] = [];
  const buckets: { start: number; end: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    buckets.push({ start: d.getTime(), end, revenue: 0 });
    revenueByMonth.push({ label: d.toLocaleString("en-IN", { month: "short" }), revenue: 0 });
  }
  for (const o of paidOrders) {
    const t = o.createdAt?.getTime();
    if (!t) continue;
    const idx = buckets.findIndex((b) => t >= b.start && t < b.end);
    if (idx >= 0) revenueByMonth[idx].revenue += o.total || 0;
  }

  // Recent payments (last 8 paid orders) with buyer + item title.
  const recentPaid = paidOrders.slice(0, 8);
  const rpUserIds = [...new Set(recentPaid.map((o) => o.userId))];
  const rpUsers = rpUserIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, rpUserIds)).all() : [];
  const userById = new Map(rpUsers.map((u) => [u.id, u]));
  const rpItems = recentPaid.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, recentPaid.map((o) => o.id))).all() : [];
  const itemName = (orderId: string) => {
    const it = rpItems.find((i) => i.orderId === orderId);
    if (!it) return "—";
    if (it.kind === "course" && it.courseVariantId) return courseTitle.get(variantCourse.get(it.courseVariantId) || "") || "Course";
    if (it.kind === "course-direct" && it.productId) return courseTitle.get(it.productId) || "Course";
    if (it.kind === "test-series" && it.productId) return seriesTitle.get(it.productId) || "Test Series";
    return it.kind === "product" ? "Store product" : "Order";
  };
  const recentPayments = recentPaid.map((o) => ({
    id: o.id,
    userName: userById.get(o.userId)?.name || "—",
    userEmail: userById.get(o.userId)?.email || "",
    item: itemName(o.id),
    amount: o.total || 0,
    provider: o.paymentProvider || "—",
    verified: !!o.paymentVerified,
    date: o.createdAt,
  }));

  // Recent student activity: latest course + test-series enrolments merged.
  const [recentCourseEnr, recentTsEnr] = await Promise.all([
    db.select().from(enrollments).orderBy(desc(enrollments.purchaseDate)).limit(8).all(),
    db.select().from(testSeriesEnrollments).orderBy(desc(testSeriesEnrollments.purchaseDate)).limit(8).all(),
  ]);
  const actUserIds = [...new Set([...recentCourseEnr.map((e) => e.userId), ...recentTsEnr.map((e) => e.userId)])];
  const actUsers = actUserIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, actUserIds)).all() : [];
  const actUserName = new Map(actUsers.map((u) => [u.id, u.name]));
  const activity = [
    ...recentCourseEnr.map((e) => ({ type: "course" as const, userName: actUserName.get(e.userId) || "—", item: courseTitle.get(e.courseId) || "Course", date: e.purchaseDate })),
    ...recentTsEnr.map((e) => ({ type: "test-series" as const, userName: actUserName.get(e.userId) || "—", item: seriesTitle.get(e.testSeriesId) || "Test Series", date: e.purchaseDate })),
  ]
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
    .slice(0, 8);

  // Top courses by enrolment count.
  const allEnr = await db.select({ courseId: enrollments.courseId }).from(enrollments).all();
  const enrByCourse = new Map<string, number>();
  for (const e of allEnr) enrByCourse.set(e.courseId, (enrByCourse.get(e.courseId) || 0) + 1);
  const topCourses = [...enrByCourse.entries()]
    .map(([id, count]) => ({ title: courseTitle.get(id) || "Course", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return c.json({
    counts: {
      courses: courseCount,
      students: studentCount,
      trainers: trainerCount,
      variants: variantCount,
      enrollments: courseEnrollCount + tsEnrollCount,
      courseEnrollments: courseEnrollCount,
      testSeriesEnrollments: tsEnrollCount,
      paidOrders: paidOrders.length,
    },
    revenue: { total: totalRevenue, verified: verifiedRevenue, thisMonth: monthRevenue },
    revenueByMonth,
    recentPayments,
    activity,
    topCourses,
  });
});

// ---- Leads / Enquiries ----------------------------------------------------
admin.get("/leads", async (c) => {
  const list = await c.get("db").select().from(leads).orderBy(desc(leads.createdAt)).all();
  return c.json({ leads: list });
});

// ---- Exams ----------------------------------------------------------------
admin.get("/exams", async (c) => c.json({ exams: await c.get("db").select().from(exams).all() }));
admin.post("/exams", async (c) => {
  const b = await c.req.json();
  if (!b?.name) return c.json({ error: "name required" }, 400);
  const id = crypto.randomUUID();
  await c.get("db").insert(exams).values({ id, name: b.name, slug: b.slug || slugify(b.name), description: b.description });
  return c.json({ id });
});
admin.patch("/exams/:id", async (c) => {
  const b = await c.req.json();
  await c.get("db").update(exams).set(b).where(eq(exams.id, c.req.param("id")));
  return c.json({ ok: true });
});
admin.delete("/exams/:id", async (c) => {
  await c.get("db").delete(exams).where(eq(exams.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Categories -----------------------------------------------------------
admin.get("/categories", async (c) =>
  c.json({ categories: await c.get("db").select().from(categories).orderBy(categories.position).all() })
);
admin.post("/categories", async (c) => {
  const b = await c.req.json();
  if (!b?.name) return c.json({ error: "name required" }, 400);
  const id = crypto.randomUUID();
  await c.get("db").insert(categories).values({
    id, name: b.name, slug: b.slug || slugify(b.name), description: b.description,
    thumbnailR2Key: b.thumbnailR2Key, status: b.status || "published", position: b.position ?? 0,
  });
  await audit(c, "category.create", "categories", id);
  return c.json({ id });
});
admin.patch("/categories/:id", async (c) => {
  const b = await c.req.json();
  delete b.id;
  await c.get("db").update(categories).set(b).where(eq(categories.id, c.req.param("id")));
  return c.json({ ok: true });
});
admin.delete("/categories/:id", async (c) => {
  await c.get("db").delete(categories).where(eq(categories.id, c.req.param("id")));
  return c.json({ ok: true });
});

// Trainers (users with role=trainer) — for course assignment dropdowns.
admin.get("/trainers", async (c) => {
  const list = await c.get("db")
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users).where(eq(users.role, "trainer")).all();
  return c.json({ trainers: list });
});

// ---- Courses --------------------------------------------------------------
admin.get("/courses", async (c) => {
  const db = c.get("db");
  // Only top-level courses (packages + standalone). Sub-courses live inside their
  // package's "Sub-courses" tab, never as separate cards in this list.
  const list = await db.select().from(courses).where(isNull(courses.parentCourseId)).orderBy(desc(courses.createdAt)).all();
  const cats = await db.select().from(categories).all();
  const catName = (id: string | null) => cats.find((x) => x.id === id)?.name ?? null;
  return c.json({ courses: list.map((co) => ({ ...co, categoryName: catName(co.categoryId) })) });
});

admin.get("/courses/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  // None of these depend on the course row (all keyed by the URL param), so fire
  // them in one parallel batch — one round-trip instead of two.
  const [course, variants, mods, mats, children, pkgTs] = await Promise.all([
    db.select().from(courses).where(eq(courses.id, id)).get(),
    db.select().from(courseVariants).where(eq(courseVariants.courseId, id)).all(),
    db.select().from(modules).where(eq(modules.courseId, id)).orderBy(modules.position).all(),
    db.select().from(materials).where(eq(materials.courseId, id)).all(),
    // Sub-courses (for a package). Empty for a normal course.
    db.select({ id: courses.id, title: courses.title, slug: courses.slug, status: courses.status, thumbnailR2Key: courses.thumbnailR2Key, position: courses.position })
      .from(courses).where(eq(courses.parentCourseId, id)).orderBy(courses.position).all(),
    // Test series bundled into this package (for a package). Empty otherwise.
    db.select({ linkId: packageTestSeries.id, id: testSeries.id, title: testSeries.title, slug: testSeries.slug, status: testSeries.status })
      .from(packageTestSeries)
      .innerJoin(testSeries, eq(packageTestSeries.testSeriesId, testSeries.id))
      .where(eq(packageTestSeries.courseId, id)).all(),
  ]);
  if (!course) return c.json({ error: "not found" }, 404);
  const moduleIds = mods.map((m) => m.id);
  // Only this course's lessons — never scan the whole lessons table.
  const allLessons = moduleIds.length
    ? await db.select().from(lessons).where(inArray(lessons.moduleId, moduleIds)).orderBy(lessons.position).all()
    : [];
  const lessonsByModule = (mid: string) => allLessons.filter((l) => l.moduleId === mid);
  return c.json({
    course,
    variants,
    materials: mats,
    modules: mods.map((m) => ({ ...m, lessons: lessonsByModule(m.id) })),
    children,
    packagedTestSeries: pkgTs,
  });
});

// Attach an existing test series to a package course.
admin.post("/courses/:id/test-series", async (c) => {
  const db = c.get("db");
  const courseId = c.req.param("id");
  const b = await c.req.json().catch(() => null);
  if (!b?.testSeriesId) return c.json({ error: "testSeriesId required" }, 400);
  const existing = await db.select().from(packageTestSeries)
    .where(and(eq(packageTestSeries.courseId, courseId), eq(packageTestSeries.testSeriesId, b.testSeriesId))).get();
  if (existing) return c.json({ id: existing.id });
  const id = crypto.randomUUID();
  await db.insert(packageTestSeries).values({ id, courseId, testSeriesId: b.testSeriesId });
  await audit(c, "course.testseries.attach", "courses", courseId);
  return c.json({ id });
});

// Detach a test series from a package course.
admin.delete("/courses/:id/test-series/:tsId", async (c) => {
  const db = c.get("db");
  const courseId = c.req.param("id");
  const tsId = c.req.param("tsId");
  await db.delete(packageTestSeries)
    .where(and(eq(packageTestSeries.courseId, courseId), eq(packageTestSeries.testSeriesId, tsId)));
  await audit(c, "course.testseries.detach", "courses", courseId);
  return c.json({ ok: true });
});

admin.post("/courses", async (c) => {
  const b = await c.req.json();
  if (!b?.title) return c.json({ error: "title required" }, 400);
  const id = crypto.randomUUID();
  await c.get("db").insert(courses).values({
    id,
    title: b.title,
    slug: b.slug || slugify(b.title),
    categoryId: b.categoryId || null,
    trainerId: b.trainerId || null,
    summary: b.summary,
    descriptionMd: b.descriptionMd,
    thumbnailR2Key: b.thumbnailR2Key,
    bannerR2Key: b.bannerR2Key,
    introVideo: b.introVideo,
    introPdfR2Key: b.introPdfR2Key,
    level: b.level || "beginner",
    tags: b.tags,
    durationDays: b.durationDays ?? 365,
    price: b.price ?? 0,
    discountPrice: b.discountPrice ?? null,
    enrollmentLimit: b.enrollmentLimit ?? null,
    downloadableEnabled: b.downloadableEnabled ?? true,
    liveClassesEnabled: b.liveClassesEnabled ?? true,
    status: b.status || "draft",
    position: b.position ?? 0,
    completionRule: b.completionRule || "allLessons",
    minProgressPct: b.minProgressPct ?? 100,
    isPackage: b.isPackage ?? false,
    parentCourseId: b.parentCourseId || null,
  });
  await audit(c, "course.create", "courses", id);
  return c.json({ id });
});

admin.patch("/courses/:id", async (c) => {
  const b = await c.req.json();
  delete b.id;
  await c.get("db").update(courses).set(b).where(eq(courses.id, c.req.param("id")));
  await audit(c, "course.update", "courses", c.req.param("id"));
  return c.json({ ok: true });
});

admin.delete("/courses/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  // A package must be emptied first — refuse while sub-courses still point to it.
  const childCount = await db.$count(courses, eq(courses.parentCourseId, id));
  if (childCount > 0) return c.json({ error: "This package still has sub-courses. Delete them first." }, 400);
  // Cascade-delete everything that references this course (children first) so the
  // delete always succeeds and leaves no orphan rows. Financial records (orders /
  // order_items) are intentionally kept; only the course-side data is removed.
  await db.run(sql`DELETE FROM attempt_answers WHERE attempt_id IN (SELECT id FROM test_attempts WHERE test_id IN (SELECT id FROM tests WHERE course_id = ${id}))`);
  await db.run(sql`DELETE FROM descriptive_submissions WHERE attempt_id IN (SELECT id FROM test_attempts WHERE test_id IN (SELECT id FROM tests WHERE course_id = ${id}))`);
  await db.run(sql`DELETE FROM test_attempts WHERE test_id IN (SELECT id FROM tests WHERE course_id = ${id})`);
  await db.run(sql`DELETE FROM questions WHERE test_id IN (SELECT id FROM tests WHERE course_id = ${id})`);
  await db.run(sql`DELETE FROM tests WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = ${id}))`);
  await db.run(sql`DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = ${id})`);
  await db.run(sql`DELETE FROM modules WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM live_participants WHERE session_id IN (SELECT id FROM live_sessions WHERE course_id = ${id})`);
  await db.run(sql`DELETE FROM live_sessions WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM forum_posts WHERE thread_id IN (SELECT id FROM forum_threads WHERE course_id = ${id})`);
  await db.run(sql`DELETE FROM forum_threads WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM certificates WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM enrollments WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM materials WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM schedule_events WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM announcements WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM course_variants WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM course_trainers WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM coupons WHERE course_id = ${id}`);
  await db.run(sql`DELETE FROM package_test_series WHERE course_id = ${id}`);
  await db.delete(courses).where(eq(courses.id, id));
  await audit(c, "course.delete", "courses", id);
  return c.json({ ok: true });
});

// ---- Variants -------------------------------------------------------------
admin.post("/courses/:id/variants", async (c) => {
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await c.get("db").insert(courseVariants).values({
    id,
    courseId: c.req.param("id"),
    label: b.label || "Standard",
    format: b.format || "ebook",
    priceMrp: b.priceMrp ?? 0,
    priceFinal: b.priceFinal ?? 0,
    validityDays: b.validityDays ?? 365,
  });
  return c.json({ id });
});
admin.patch("/variants/:id", async (c) => {
  const b = await c.req.json();
  await c.get("db").update(courseVariants).set(b).where(eq(courseVariants.id, c.req.param("id")));
  return c.json({ ok: true });
});
admin.delete("/variants/:id", async (c) => {
  await c.get("db").delete(courseVariants).where(eq(courseVariants.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Modules & lessons ----------------------------------------------------
admin.post("/courses/:id/modules", async (c) => {
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await c.get("db").insert(modules).values({ id, courseId: c.req.param("id"), title: b.title || "Untitled module", position: b.position ?? 0 });
  return c.json({ id });
});
admin.patch("/modules/:id", async (c) => {
  const b = await c.req.json();
  await c.get("db").update(modules).set(b).where(eq(modules.id, c.req.param("id")));
  return c.json({ ok: true });
});
admin.delete("/modules/:id", async (c) => {
  await c.get("db").delete(modules).where(eq(modules.id, c.req.param("id")));
  return c.json({ ok: true });
});

admin.post("/modules/:id/lessons", async (c) => {
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await c.get("db").insert(lessons).values({
    id,
    moduleId: c.req.param("id"),
    type: b.type || "video",
    title: b.title || "Untitled lesson",
    description: b.description,
    durationSec: b.durationSec ?? null,
    position: b.position ?? 0,
    streamVideoId: b.streamVideoId,
    r2Key: b.r2Key,
    downloadable: !!b.downloadable,
    isFreePreview: !!b.isFreePreview,
    status: b.status || "draft",
    uploadedBy: c.get("user")!.id,
  });
  return c.json({ id });
});
admin.patch("/lessons/:id", async (c) => {
  const b = await c.req.json();
  await c.get("db").update(lessons).set(b).where(eq(lessons.id, c.req.param("id")));
  return c.json({ ok: true });
});
admin.delete("/lessons/:id", async (c) => {
  await c.get("db").delete(lessons).where(eq(lessons.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Materials ------------------------------------------------------------
admin.post("/courses/:id/materials", async (c) => {
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await c.get("db").insert(materials).values({
    id,
    courseId: c.req.param("id"),
    title: b.title || "Material",
    kind: b.kind || "pdf",
    r2Key: b.r2Key,
    url: b.url,
    uploadedBy: c.get("user")!.id,
  });
  return c.json({ id });
});
admin.delete("/materials/:id", async (c) => {
  await c.get("db").delete(materials).where(eq(materials.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Coupons --------------------------------------------------------------
admin.get("/coupons", async (c) => c.json({ coupons: await c.get("db").select().from(coupons).all() }));
admin.post("/coupons", async (c) => {
  const b = await c.req.json();
  if (!b?.code) return c.json({ error: "code required" }, 400);
  const id = crypto.randomUUID();
  await c.get("db").insert(coupons).values({
    id,
    code: String(b.code).toUpperCase(),
    percentOff: b.percentOff ?? 0,
    courseId: b.courseId || null,
    maxRedemptions: b.maxRedemptions || null,
    active: b.active ?? true,
  });
  return c.json({ id });
});
admin.patch("/coupons/:id", async (c) => {
  const b = await c.req.json();
  await c.get("db").update(coupons).set(b).where(eq(coupons.id, c.req.param("id")));
  return c.json({ ok: true });
});
admin.delete("/coupons/:id", async (c) => {
  await c.get("db").delete(coupons).where(eq(coupons.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Website CMS ----------------------------------------------------------
admin.get("/cms", async (c) => c.json({ blocks: await c.get("db").select().from(cmsBlocks).orderBy(cmsBlocks.position).all() }));
admin.put("/cms/:key", async (c) => {
  const db = c.get("db");
  const key = c.req.param("key");
  const b = await c.req.json();
  const existing = await db.select().from(cmsBlocks).where(eq(cmsBlocks.key, key)).get();
  const dataJson = typeof b.dataJson === "string" ? b.dataJson : JSON.stringify(b.dataJson ?? {});
  if (existing) {
    await db.update(cmsBlocks).set({ type: b.type ?? existing.type, dataJson, position: b.position ?? existing.position, published: b.published ?? existing.published }).where(eq(cmsBlocks.key, key));
  } else {
    await db.insert(cmsBlocks).values({ id: crypto.randomUUID(), key, type: b.type || "custom", dataJson, position: b.position ?? 0, published: b.published ?? false });
  }
  await audit(c, "cms.upsert", "cms_blocks", key);
  return c.json({ ok: true });
});
admin.delete("/cms/:id", async (c) => {
  await c.get("db").delete(cmsBlocks).where(eq(cmsBlocks.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Announcements --------------------------------------------------------
admin.get("/announcements", async (c) => c.json({ announcements: await c.get("db").select().from(announcements).orderBy(desc(announcements.createdAt)).all() }));
admin.post("/announcements", async (c) => {
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await c.get("db").insert(announcements).values({ id, courseId: b.courseId || null, title: b.title || "Announcement", bodyMd: b.bodyMd });
  return c.json({ id });
});
admin.delete("/announcements/:id", async (c) => {
  await c.get("db").delete(announcements).where(eq(announcements.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Current Affairs ------------------------------------------------------
admin.get("/current-affairs", async (c) =>
  c.json({ posts: await c.get("db").select().from(currentAffairsPosts).orderBy(desc(currentAffairsPosts.date)).all() })
);
admin.post("/current-affairs", async (c) => {
  const b = await c.req.json();
  if (!b?.title) return c.json({ error: "title required" }, 400);
  const id = crypto.randomUUID();
  await c.get("db").insert(currentAffairsPosts).values({
    id, date: b.date || new Date().toISOString().slice(0, 10), kind: b.kind || "daily",
    title: b.title, bodyMd: b.bodyMd, topic: b.topic, pdfR2Key: b.pdfR2Key,
  });
  return c.json({ id });
});
admin.delete("/current-affairs/:id", async (c) => {
  await c.get("db").delete(currentAffairsPosts).where(eq(currentAffairsPosts.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Store products -------------------------------------------------------
admin.get("/products", async (c) => c.json({ products: await c.get("db").select().from(products).all() }));
admin.post("/products", async (c) => {
  const b = await c.req.json();
  if (!b?.title) return c.json({ error: "title required" }, 400);
  const id = crypto.randomUUID();
  await c.get("db").insert(products).values({
    id, type: b.type || "physical", title: b.title, slug: b.slug || slugify(b.title),
    price: b.price ?? 0, stock: b.stock ?? null, digitalR2Key: b.digitalR2Key, shipWeightG: b.shipWeightG,
  });
  return c.json({ id });
});
admin.patch("/products/:id", async (c) => {
  const b = await c.req.json();
  delete b.id;
  await c.get("db").update(products).set(b).where(eq(products.id, c.req.param("id")));
  return c.json({ ok: true });
});
admin.delete("/products/:id", async (c) => {
  await c.get("db").delete(products).where(eq(products.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- Users, roles & trainer assignment ------------------------------------
admin.get("/users", async (c) => {
  const list = await c.get("db").select({ id: users.id, email: users.email, name: users.name, phone: users.phone, role: users.role, status: users.status, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).all();
  return c.json({ users: list });
});

// Create a team member (admin or trainer only). They sign in later with this email
// (Google/email-password) and get linked to this row via /auth/session.
admin.post("/users", async (c) => {
  const db = c.get("db");
  const b = await c.req.json();
  const email = String(b.email || "").trim().toLowerCase();
  const name = String(b.name || "").trim();
  const role = b.role === "admin" ? "admin" : "trainer"; // students are never created here
  const phone = b.phone ? String(b.phone).trim() : null;
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: "Valid name and email are required" }, 400);

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    // Promote/refresh an existing account instead of duplicating the email.
    await db.update(users).set({ name, phone: phone ?? existing.phone, role }).where(eq(users.id, existing.id));
    await audit(c, "user.upsert", "users", existing.id);
    return c.json({ id: existing.id, updated: true });
  }
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, firebaseUid: `pending:${id}`, email, name, phone, role });
  await db.insert(notificationPrefs).values({ userId: id });
  await audit(c, "user.create", "users", id);
  return c.json({ id });
});

// Edit a team member's name/phone/role.
admin.patch("/users/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const b = await c.req.json();
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim();
  if (typeof b.phone === "string") patch.phone = b.phone.trim() || null;
  if (b.role && ["student", "trainer", "admin"].includes(b.role)) {
    if (b.role !== "admin") {
      const adminCount = await db.$count(users, eq(users.role, "admin"));
      const target = await db.select().from(users).where(eq(users.id, id)).get();
      if (target?.role === "admin" && adminCount <= 1) return c.json({ error: "cannot demote the only admin" }, 400);
    }
    patch.role = b.role;
  }
  if (Object.keys(patch).length) await db.update(users).set(patch).where(eq(users.id, id));
  await audit(c, "user.update", "users", id);
  return c.json({ ok: true });
});

admin.get("/users/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const user = await db.select().from(users).where(eq(users.id, id)).get();
  if (!user) return c.json({ error: "not found" }, 404);
  const assigned = await db.select({ courseId: courseTrainers.courseId }).from(courseTrainers).where(eq(courseTrainers.trainerId, id)).all();
  return c.json({ user, assignedCourseIds: assigned.map((a) => a.courseId) });
});

admin.patch("/users/:id/role", async (c) => {
  const b = await c.req.json();
  if (!["student", "trainer", "admin"].includes(b?.role)) return c.json({ error: "invalid role" }, 400);
  // Guard: don't allow removing the last admin.
  if (b.role !== "admin") {
    const adminCount = await c.get("db").$count(users, eq(users.role, "admin"));
    const target = await c.get("db").select().from(users).where(eq(users.id, c.req.param("id"))).get();
    if (target?.role === "admin" && adminCount <= 1) return c.json({ error: "cannot demote the only admin" }, 400);
  }
  await c.get("db").update(users).set({ role: b.role }).where(eq(users.id, c.req.param("id")));
  await audit(c, "user.role", "users", c.req.param("id"));
  return c.json({ ok: true });
});

admin.post("/users/:id/trainer-courses", async (c) => {
  const b = await c.req.json();
  if (!b?.courseId) return c.json({ error: "courseId required" }, 400);
  const db = c.get("db");
  const exists = await db.select().from(courseTrainers).where(and(eq(courseTrainers.trainerId, c.req.param("id")), eq(courseTrainers.courseId, b.courseId))).get();
  if (!exists) await db.insert(courseTrainers).values({ id: crypto.randomUUID(), trainerId: c.req.param("id"), courseId: b.courseId });
  return c.json({ ok: true });
});

admin.delete("/users/:id/trainer-courses/:courseId", async (c) => {
  await c.get("db").delete(courseTrainers).where(and(eq(courseTrainers.trainerId, c.req.param("id")), eq(courseTrainers.courseId, c.req.param("courseId"))));
  return c.json({ ok: true });
});

// ---- Enrolled courses (admin view of who paid for what) -------------------
// List each course with its enrollment count + total revenue.
admin.get("/enrollments/courses", async (c) => {
  const db = c.get("db");
  const cs = await db.select({
    id: courses.id, title: courses.title, slug: courses.slug,
    thumbnailR2Key: courses.thumbnailR2Key, categoryId: courses.categoryId,
    price: courses.price, discountPrice: courses.discountPrice, status: courses.status,
  }).from(courses).orderBy(desc(courses.createdAt)).all();
  const enrs = await db.select({ courseId: enrollments.courseId }).from(enrollments).all();
  const counts = new Map<string, number>();
  for (const e of enrs) counts.set(e.courseId, (counts.get(e.courseId) || 0) + 1);
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).all();
  const catName = (id: string | null) => cats.find((x) => x.id === id)?.name ?? null;
  return c.json({
    courses: cs.map((co) => ({ ...co, categoryName: catName(co.categoryId), enrollmentCount: counts.get(co.id) || 0 })),
  });
});

// Per-course enrollment detail rows (student + amount + dates).
admin.get("/enrollments/courses/:courseId", async (c) => {
  const db = c.get("db");
  const courseId = c.req.param("courseId");
  const course = await db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course) return c.json({ error: "not found" }, 404);

  const enrs = await db.select().from(enrollments).where(eq(enrollments.courseId, courseId)).orderBy(desc(enrollments.purchaseDate)).all();
  const userIds = enrs.map((e) => e.userId);
  const usersList = userIds.length ? await db.select().from(users).where(inArray(users.id, userIds)).all() : [];
  const userById = new Map(usersList.map((u) => [u.id, u]));

  // Find paid-order line prices for this course (direct course purchase OR any variant of it).
  const vs = await db.select({ id: courseVariants.id }).from(courseVariants).where(eq(courseVariants.courseId, courseId)).all();
  const variantIds = vs.map((v) => v.id);
  const itemRows = await db.select({
    orderId: orderItems.orderId, price: orderItems.price,
    courseVariantId: orderItems.courseVariantId, productId: orderItems.productId,
  })
    .from(orderItems)
    .where(or(eq(orderItems.productId, courseId), variantIds.length ? inArray(orderItems.courseVariantId, variantIds) : sql`0=1`))
    .all();
  const orderIds = itemRows.map((i) => i.orderId);
  const ords = orderIds.length ? await db.select().from(orders).where(inArray(orders.id, orderIds)).all() : [];
  const orderById = new Map(ords.map((o) => [o.id, o]));

  // userId → { amount, status, paidAt } from the most recent matching paid order.
  const paymentByUser = new Map<string, { amount: number; status: string; paidAt: Date | null }>();
  for (const it of itemRows) {
    const ord = orderById.get(it.orderId);
    if (!ord) continue;
    const existing = paymentByUser.get(ord.userId);
    if (!existing || (ord.createdAt && existing.paidAt && ord.createdAt.getTime() > existing.paidAt.getTime())) {
      paymentByUser.set(ord.userId, { amount: it.price ?? 0, status: ord.status, paidAt: ord.createdAt });
    }
  }

  const mockAttemptsData = userIds.length ? await db.select({
    userId: mockAttempts.userId,
    status: mockAttempts.status
  })
  .from(mockAttempts)
  .innerJoin(mockTests, eq(mockAttempts.mockTestId, mockTests.id))
  .innerJoin(modules, eq(mockTests.moduleId, modules.id))
  .where(and(eq(modules.courseId, courseId), eq(mockAttempts.status, "submitted"), inArray(mockAttempts.userId, userIds)))
  .all() : [];

  const mocksCompletedByUser = new Map<string, number>();
  for (const ma of mockAttemptsData) {
    mocksCompletedByUser.set(ma.userId, (mocksCompletedByUser.get(ma.userId) || 0) + 1);
  }

  const rows = enrs.map((e, i) => {
    const u = userById.get(e.userId);
    const pay = paymentByUser.get(e.userId);
    return {
      sl: i + 1,
      enrollmentId: e.id,
      userId: e.userId,
      name: u?.name || "—",
      email: u?.email || "—",
      phone: u?.phone || null,
      enrolledAt: e.purchaseDate,
      expiryDate: e.expiryDate,
      progressPct: e.progressPct ?? 0,
      amountPaise: pay?.amount ?? 0,
      paymentStatus: pay?.status ?? (e.variantId ? "unpaid" : "free"),
      mockTestsCompleted: mocksCompletedByUser.get(e.userId) || 0,
    };
  });

  const totalRevenuePaise = rows.reduce((s, r) => s + (r.paymentStatus === "paid" ? r.amountPaise : 0), 0);
  return c.json({
    course: { id: course.id, title: course.title, slug: course.slug, thumbnailR2Key: course.thumbnailR2Key, price: course.price, discountPrice: course.discountPrice },
    totalRevenuePaise,
    rows,
  });
});

// ---- Students (unified per-student view) -----------------------------------
// List of student users with their enrollment/attempt counts.
admin.get("/students", async (c) => {
  const db = c.get("db");
  const studentUsers = await db.select().from(users).where(eq(users.role, "student")).orderBy(desc(users.createdAt)).all();

  const courseEnr = await db.select({ userId: enrollments.userId }).from(enrollments).all();
  const tsEnr = await db.select({ userId: testSeriesEnrollments.userId }).from(testSeriesEnrollments).all();
  const tsAtt = await db.select({ userId: testSeriesAttempts.userId, status: testSeriesAttempts.status }).from(testSeriesAttempts).all();
  const mockAtt = await db.select({ userId: mockAttempts.userId, status: mockAttempts.status }).from(mockAttempts).all();

  const countBy = (rows: { userId: string }[], uid: string) => rows.filter((r) => r.userId === uid).length;

  const students = studentUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    createdAt: u.createdAt,
    courseCount: countBy(courseEnr, u.id),
    testSeriesCount: countBy(tsEnr, u.id),
    testsAttempted:
      tsAtt.filter((a) => a.userId === u.id && a.status === "submitted").length +
      mockAtt.filter((a) => a.userId === u.id && a.status === "submitted").length,
  }));
  return c.json({ students });
});

// Full profile for one student: courses (+lesson completion, mock attempts, cert),
// test series (+attempts/scores) and interview sessions.
admin.get("/users/:id/profile", async (c) => {
  const db = c.get("db");
  const userId = c.req.param("id");
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: "not found" }, 404);

  const emptyIn = sql`0=1`;

  // ---- Courses ----
  const enrs = await db.select().from(enrollments).where(eq(enrollments.userId, userId)).orderBy(desc(enrollments.purchaseDate)).all();
  const courseIds = enrs.map((e) => e.courseId);
  const courseRows = courseIds.length ? await db.select().from(courses).where(inArray(courses.id, courseIds)).all() : [];
  const mods = courseIds.length ? await db.select({ id: modules.id, courseId: modules.courseId }).from(modules).where(inArray(modules.courseId, courseIds)).all() : [];
  const modIds = mods.map((m) => m.id);
  const lsns = modIds.length ? await db.select({ id: lessons.id, moduleId: lessons.moduleId }).from(lessons).where(inArray(lessons.moduleId, modIds)).all() : [];
  const lprog = await db.select({ lessonId: lessonProgress.lessonId, completed: lessonProgress.completed }).from(lessonProgress).where(eq(lessonProgress.userId, userId)).all();
  const doneLessonIds = new Set(lprog.filter((p) => p.completed).map((p) => p.lessonId));
  const mockTestRows = courseIds.length ? await db.select({ id: mockTests.id, courseId: mockTests.courseId }).from(mockTests).where(inArray(mockTests.courseId, courseIds)).all() : [];
  const userMockAtts = await db.select().from(mockAttempts).where(eq(mockAttempts.userId, userId)).all();
  const certs = await db.select({ courseId: certificates.courseId, status: certificates.status }).from(certificates).where(eq(certificates.userId, userId)).all();

  const coursesOut = enrs.map((e) => {
    const co = courseRows.find((x) => x.id === e.courseId);
    const cModIds = mods.filter((m) => m.courseId === e.courseId).map((m) => m.id);
    const cLessons = lsns.filter((l) => cModIds.includes(l.moduleId));
    const lessonsTotal = cLessons.length;
    const lessonsCompleted = cLessons.filter((l) => doneLessonIds.has(l.id)).length;
    const cMockTestIds = mockTestRows.filter((mt) => mt.courseId === e.courseId).map((mt) => mt.id);
    const cMockAtts = userMockAtts.filter((a) => cMockTestIds.includes(a.mockTestId) && a.status === "submitted");
    return {
      courseId: e.courseId,
      title: co?.title ?? "Course",
      slug: co?.slug ?? null,
      thumbnailR2Key: co?.thumbnailR2Key ?? null,
      progressPct: e.progressPct ?? 0,
      lessonsCompleted,
      lessonsTotal,
      enrolledAt: e.purchaseDate,
      expiryDate: e.expiryDate,
      certified: certs.some((ct) => ct.courseId === e.courseId && ct.status === "issued"),
      mockAttempts: cMockAtts.map((a) => ({ score: a.score ?? 0, correctCount: a.correctCount ?? 0, submittedAt: a.submittedAt })),
    };
  });

  // ---- Test series ----
  const tsEnrs = await db.select().from(testSeriesEnrollments).where(eq(testSeriesEnrollments.userId, userId)).orderBy(desc(testSeriesEnrollments.purchaseDate)).all();
  const tsIds = tsEnrs.map((e) => e.testSeriesId);
  const tsRows = tsIds.length ? await db.select().from(testSeries).where(inArray(testSeries.id, tsIds)).all() : [];
  const tsTests = tsIds.length ? await db.select().from(testSeriesTests).where(inArray(testSeriesTests.testSeriesId, tsIds)).all() : [];
  const tsTestIds = tsTests.map((t) => t.id);
  const tsAtts = await db.select().from(testSeriesAttempts).where(and(eq(testSeriesAttempts.userId, userId), tsTestIds.length ? inArray(testSeriesAttempts.testId, tsTestIds) : emptyIn)).all();
  const tsQs = tsTestIds.length ? await db.select({ testId: testSeriesQuestions.testId, marks: testSeriesQuestions.marks }).from(testSeriesQuestions).where(inArray(testSeriesQuestions.testId, tsTestIds)).all() : [];
  const marksByTest = new Map<string, number>();
  for (const q of tsQs) marksByTest.set(q.testId, (marksByTest.get(q.testId) || 0) + (q.marks || 0));

  const testSeriesOut = tsEnrs.map((e) => {
    const ts = tsRows.find((x) => x.id === e.testSeriesId);
    const seriesTestIds = tsTests.filter((t) => t.testSeriesId === e.testSeriesId).map((t) => t.id);
    const attempts = tsAtts
      .filter((a) => seriesTestIds.includes(a.testId) && a.status === "submitted")
      .map((a) => {
        const t = tsTests.find((x) => x.id === a.testId);
        return { testId: a.testId, testTitle: t?.title ?? "Test", score: a.score ?? 0, correctCount: a.correctCount ?? 0, totalMarks: marksByTest.get(a.testId) ?? 0, submittedAt: a.submittedAt };
      });
    return {
      testSeriesId: e.testSeriesId,
      title: ts?.title ?? "Test Series",
      slug: ts?.slug ?? null,
      thumbnailR2Key: ts?.thumbnailR2Key ?? null,
      enrolledAt: e.purchaseDate,
      expiryDate: e.expiryDate,
      testsCompleted: new Set(attempts.map((a) => a.testId)).size,
      totalTests: seriesTestIds.length,
      attempts,
    };
  });

  // ---- Interviews ----
  const interviews = await db.select().from(interviewSessions).where(eq(interviewSessions.userId, userId)).all();

  return c.json({
    user: {
      id: user.id, name: user.name, email: user.email, phone: user.phone,
      status: user.status, role: user.role, createdAt: user.createdAt, avatarR2Key: user.avatarR2Key,
    },
    courses: coursesOut,
    testSeries: testSeriesOut,
    interviews: interviews.map((i) => ({ id: i.id, scheduledAt: i.scheduledAt, status: i.status, feedbackMd: i.feedbackMd })),
    summary: {
      courseCount: coursesOut.length,
      testSeriesCount: testSeriesOut.length,
      testsAttempted:
        testSeriesOut.reduce((s, t) => s + t.attempts.length, 0) +
        coursesOut.reduce((s, cc) => s + cc.mockAttempts.length, 0),
    },
  });
});

// ---- Enterprise Mock Tests --------------------------------------------------
admin.get("/courses/:courseId/mock-tests", async (c) => {
  const db = c.get("db");
  const courseId = c.req.param("courseId");
  
  // Get all modules for this course
  const mods = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(modules.position).all();
  
  // Get all mock tests for these modules
  const tests = await db.select().from(mockTests).where(eq(mockTests.courseId, courseId)).all();
  const testByModule = new Map(tests.map(t => [t.moduleId, t]));

  // Combine
  const result = mods.map(m => ({
    module: m,
    mockTest: testByModule.get(m.id) || null
  }));

  return c.json({ modules: result });
});

admin.get("/mock-tests/:id", async (c) => {
  const test = await c.get("db").select().from(mockTests).where(eq(mockTests.id, c.req.param("id"))).get();
  if (!test) return c.json({ error: "Not found" }, 404);
  return c.json({ mockTest: test });
});

admin.get("/modules/:moduleId/mock-tests", async (c) => {
  const db = c.get("db");
  const moduleId = c.req.param("moduleId");
  
  const mod = await db.select().from(modules).where(eq(modules.id, moduleId)).get();
  if (!mod) return c.json({ error: "Module not found" }, 404);

  const test = await db.select().from(mockTests).where(eq(mockTests.moduleId, moduleId)).get();
  return c.json({ module: mod, mockTest: test || null });
});

admin.post("/modules/:moduleId/mock-tests", async (c) => {
  const db = c.get("db");
  const moduleId = c.req.param("moduleId");
  const b = await c.req.json();
  
  const mod = await db.select().from(modules).where(eq(modules.id, moduleId)).get();
  if (!mod) return c.json({ error: "Module not found" }, 404);

  const existing = await db.select().from(mockTests).where(eq(mockTests.moduleId, moduleId)).get();
  
  if (existing) {
    await db.update(mockTests).set({
      title: b.title,
      description: b.description,
      durationMin: b.durationMin,
      passingMarks: b.passingMarks,
      passingPct: b.passingPct,
      maxAttempts: b.maxAttempts,
      status: b.status,
    }).where(eq(mockTests.id, existing.id));
    return c.json({ id: existing.id });
  } else {
    const id = crypto.randomUUID();
    await db.insert(mockTests).values({
      id,
      courseId: mod.courseId,
      moduleId,
      title: b.title,
      description: b.description,
      durationMin: b.durationMin,
      passingMarks: b.passingMarks,
      passingPct: b.passingPct,
      maxAttempts: b.maxAttempts,
      status: b.status || "draft",
    });
    return c.json({ id });
  }
});

admin.get("/mock-tests/:id/questions", async (c) => {
  const qs = await c.get("db").select().from(mockQuestions)
    .where(eq(mockQuestions.mockTestId, c.req.param("id")))
    .orderBy(mockQuestions.position).all();
  return c.json({ questions: qs });
});

admin.post("/mock-tests/:id/questions", async (c) => {
  const b = await c.req.json();
  const id = crypto.randomUUID();
  await c.get("db").insert(mockQuestions).values({
    id,
    mockTestId: c.req.param("id"),
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

admin.post("/mock-tests/:id/questions/import", async (c) => {
  const db = c.get("db");
  const testId = c.req.param("id");
  const { questions } = await c.req.json();
  
  if (!Array.isArray(questions) || questions.length === 0) {
    return c.json({ error: "Invalid questions payload" }, 400);
  }

  // Get current max position
  const existing = await db.select().from(mockQuestions).where(eq(mockQuestions.mockTestId, testId)).orderBy(desc(mockQuestions.position)).get();
  let nextPos = existing ? existing.position + 1 : 0;

  const toInsert = questions.map(q => ({
    id: crypto.randomUUID(),
    mockTestId: testId,
    prompt: q.prompt,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation || null,
    marks: q.marks ? parseInt(q.marks) : 1,
    position: nextPos++,
  }));

  for (let i = 0; i < toInsert.length; i += 50) {
    await db.insert(mockQuestions).values(toInsert.slice(i, i + 50));
  }
  return c.json({ ok: true, imported: toInsert.length });
});

admin.delete("/mock-questions/:id", async (c) => {
  await c.get("db").delete(mockQuestions).where(eq(mockQuestions.id, c.req.param("id")));
  return c.json({ ok: true });
});


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

export default admin;
