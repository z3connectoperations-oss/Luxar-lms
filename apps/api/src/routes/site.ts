import { Hono } from "hono";
import { eq, desc, inArray, asc, and, isNull } from "drizzle-orm";
import {
  courses,
  categories,
  courseVariants,
  modules,
  lessons,
  toppers,
  leads,
  newsletterSubscribers,
  cmsBlocks,

  users,
  currentAffairsPosts,
  products,
} from "@luxar/db";
import type { AppEnv } from "../types";

const site = new Hono<AppEnv>();

// Landing CMS blocks (published only).
site.get("/cms", async (c) => {
  const blocks = await c.get("db")
    .select({ key: cmsBlocks.key, type: cmsBlocks.type, dataJson: cmsBlocks.dataJson, position: cmsBlocks.position })
    .from(cmsBlocks)
    .where(eq(cmsBlocks.published, true))
    .orderBy(cmsBlocks.position)
    .all();
  return c.json({ blocks });
});

// Published categories (for browsing).
site.get("/categories", async (c) => {
  const rows = await c.get("db").select().from(categories).where(eq(categories.status, "published")).orderBy(categories.position).all();
  return c.json({ categories: rows });
});

// Display price helper: discountPrice when set, else price (paise).
const effectivePrice = (co: { price: number | null; discountPrice: number | null }) =>
  co.discountPrice != null ? co.discountPrice : co.price ?? 0;

// Published course catalog with category name + price.
site.get("/courses", async (c) => {
  const db = c.get("db");
  const list = await db.select().from(courses)
    // Sub-courses (parent_course_id set) never appear in the catalogue — only
    // packages and standalone courses do.
    .where(and(inArray(courses.status, ["active", "coming_soon"]), isNull(courses.parentCourseId)))
    .orderBy(asc(courses.position))
    .all();
  const cats = await db.select().from(categories).all();
  const catOf = (id: string | null) => cats.find((x) => x.id === id) || null;
  return c.json({
    courses: list.map((co) => {
      const cat = catOf(co.categoryId);
      return {
        id: co.id, title: co.title, slug: co.slug, summary: co.summary,
        thumbnailR2Key: co.thumbnailR2Key, level: co.level, durationDays: co.durationDays,
        category: cat?.name ?? null, categorySlug: cat?.slug ?? null,
        price: co.price ?? 0, discountPrice: co.discountPrice ?? null,
        fromPrice: effectivePrice(co), // for legacy card compatibility
        isPackage: !!co.isPackage,
        status: co.status, position: co.position
      };
    }),
  });
});

// Course detail for the public sales page.
site.get("/courses/:slug", async (c) => {
  const db = c.get("db");
  const course = await db.select().from(courses).where(eq(courses.slug, c.req.param("slug"))).get();
  if (!course || course.status === "draft" || course.status === "hidden") return c.json({ error: "not found" }, 404);

  const cat = course.categoryId ? await db.select().from(categories).where(eq(categories.id, course.categoryId)).get() : null;
  const trainer = course.trainerId ? await db.select({ name: users.name }).from(users).where(eq(users.id, course.trainerId)).get() : null;
  const variants = await db.select().from(courseVariants).where(eq(courseVariants.courseId, course.id)).all();
  const mods = await db.select().from(modules).where(eq(modules.courseId, course.id)).orderBy(modules.position).all();
  const allLessons = await db.select().from(lessons).orderBy(lessons.position).all();

  const curriculum = mods.map((m) => {
    const ls = allLessons.filter((l) => l.moduleId === m.id);
    return {
      id: m.id, title: m.title, lessonCount: ls.length,
      lessons: ls.map((l) => ({ title: l.title, type: l.type, isFreePreview: l.isFreePreview })),
    };
  });

  // For a package, list the bundled sub-courses ("This package includes…").
  const subCourses = course.isPackage
    ? await db.select({ id: courses.id, title: courses.title, summary: courses.summary, thumbnailR2Key: courses.thumbnailR2Key })
        .from(courses).where(eq(courses.parentCourseId, course.id)).orderBy(asc(courses.position)).all()
    : [];

  return c.json({
    course: {
      id: course.id, title: course.title, slug: course.slug, summary: course.summary,
      descriptionMd: course.descriptionMd,
      introPdfR2Key: course.introPdfR2Key,
      level: course.level, durationDays: course.durationDays,
      price: course.price ?? 0, discountPrice: course.discountPrice ?? null,
      isPackage: !!course.isPackage,
    },
    category: cat ? { name: cat.name, slug: cat.slug } : null,
    trainer: trainer ? { name: trainer.name } : null,
    variants,
    curriculum,
    subCourses,
  });
});

site.get("/toppers", async (c) => {
  const list = await c.get("db").select().from(toppers).orderBy(desc(toppers.year)).all();
  return c.json({ toppers: list });
});

// Free counselling lead capture.
site.post("/leads", async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b?.name || !b?.phone) return c.json({ error: "name and phone required" }, 400);
  await c.get("db").insert(leads).values({
    id: crypto.randomUUID(),
    name: b.name,
    phone: b.phone,
    email: b.email,
    examInterest: b.examInterest,
    source: "website",
  });
  return c.json({ ok: true });
});

// Current affairs (public — free lead-gen content).
site.get("/current-affairs", async (c) => {
  const posts = await c.get("db")
    .select({ id: currentAffairsPosts.id, date: currentAffairsPosts.date, kind: currentAffairsPosts.kind, title: currentAffairsPosts.title, topic: currentAffairsPosts.topic })
    .from(currentAffairsPosts)
    .orderBy(desc(currentAffairsPosts.date))
    .all();
  return c.json({ posts });
});
site.get("/current-affairs/:id", async (c) => {
  const post = await c.get("db").select().from(currentAffairsPosts).where(eq(currentAffairsPosts.id, c.req.param("id"))).get();
  if (!post) return c.json({ error: "not found" }, 404);
  return c.json({ post });
});

// Store catalog (public).
site.get("/products", async (c) => {
  const list = await c.get("db").select().from(products).all();
  return c.json({ products: list });
});
site.get("/products/:slug", async (c) => {
  const p = await c.get("db").select().from(products).where(eq(products.slug, c.req.param("slug"))).get();
  if (!p) return c.json({ error: "not found" }, 404);
  return c.json({ product: p });
});

site.post("/newsletter", async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b?.email) return c.json({ error: "email required" }, 400);
  await c.get("db")
    .insert(newsletterSubscribers)
    .values({ id: crypto.randomUUID(), email: b.email })
    .onConflictDoNothing();
  return c.json({ ok: true });
});

export default site;
