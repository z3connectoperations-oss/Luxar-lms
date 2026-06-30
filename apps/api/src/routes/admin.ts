import { Hono } from "hono";
import { eq, desc, and, or, inArray, sql } from "drizzle-orm";
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
  const list = await db.select().from(courses).orderBy(desc(courses.createdAt)).all();
  const cats = await db.select().from(categories).all();
  const catName = (id: string | null) => cats.find((x) => x.id === id)?.name ?? null;
  return c.json({ courses: list.map((co) => ({ ...co, categoryName: catName(co.categoryId) })) });
});

admin.get("/courses/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const course = await db.select().from(courses).where(eq(courses.id, id)).get();
  if (!course) return c.json({ error: "not found" }, 404);
  const [variants, mods, mats] = await Promise.all([
    db.select().from(courseVariants).where(eq(courseVariants.courseId, id)).all(),
    db.select().from(modules).where(eq(modules.courseId, id)).orderBy(modules.position).all(),
    db.select().from(materials).where(eq(materials.courseId, id)).all(),
  ]);
  const moduleIds = mods.map((m) => m.id);
  const allLessons = moduleIds.length
    ? await db.select().from(lessons).orderBy(lessons.position).all()
    : [];
  const lessonsByModule = (mid: string) => allLessons.filter((l) => l.moduleId === mid);
  return c.json({
    course,
    variants,
    materials: mats,
    modules: mods.map((m) => ({ ...m, lessons: lessonsByModule(m.id) })),
  });
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
    completionRule: b.completionRule || "allLessons",
    minProgressPct: b.minProgressPct ?? 100,
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
    };
  });

  const totalRevenuePaise = rows.reduce((s, r) => s + (r.paymentStatus === "paid" ? r.amountPaise : 0), 0);
  return c.json({
    course: { id: course.id, title: course.title, slug: course.slug, thumbnailR2Key: course.thumbnailR2Key, price: course.price, discountPrice: course.discountPrice },
    totalRevenuePaise,
    rows,
  });
});

// ---- File upload to R2 ----------------------------------------------------
// PUT /admin/upload?folder=materials&filename=notes.pdf  (raw body = file)
admin.put("/upload", async (c) => {
  const folder = (c.req.query("folder") || "uploads").replace(/[^a-z0-9/_-]/gi, "");
  const filename = (c.req.query("filename") || "file").replace(/[^a-z0-9._-]/gi, "_");
  const key = `${folder}/${crypto.randomUUID()}-${filename}`;
  const body = await c.req.arrayBuffer();
  await c.env.BUCKET.put(key, body, {
    httpMetadata: { contentType: c.req.header("content-type") || "application/octet-stream" },
  });
  return c.json({ key });
});

export default admin;
