import { Hono } from "hono";
import { eq, desc, inArray, gte, and } from "drizzle-orm";
import { enrollments, courses, orders, orderItems, notifications, notificationPrefs, scheduleEvents, products, mentorshipSlots, bookings, interviewSessions, users } from "@luxar/db";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";

const me = new Hono<AppEnv>();
me.use("*", requireAuth);

// Enrolled courses with validity + progress.
me.get("/enrollments", async (c) => {
  const db = c.get("db");
  const rows = await db
    .select({
      id: enrollments.id,
      courseId: enrollments.courseId,
      title: courses.title,
      slug: courses.slug,
      image: courses.thumbnailR2Key,
      expiryDate: enrollments.expiryDate,
      progressPct: enrollments.progressPct,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, c.get("user")!.id))
    .all();
  return c.json({ enrollments: rows });
});

// Upcoming schedule events across the student's enrolled courses.
me.get("/schedule", async (c) => {
  const db = c.get("db");
  const myCourses = await db.select({ courseId: enrollments.courseId }).from(enrollments).where(eq(enrollments.userId, c.get("user")!.id)).all();
  const ids = myCourses.map((m) => m.courseId);
  if (ids.length === 0) return c.json({ events: [] });
  const events = await db
    .select({
      id: scheduleEvents.id,
      courseId: scheduleEvents.courseId,
      title: scheduleEvents.title,
      type: scheduleEvents.type,
      startsAt: scheduleEvents.startsAt,
      endsAt: scheduleEvents.endsAt,
      courseTitle: courses.title,
    })
    .from(scheduleEvents)
    .innerJoin(courses, eq(scheduleEvents.courseId, courses.id))
    .where(and(inArray(scheduleEvents.courseId, ids), gte(scheduleEvents.startsAt, new Date(Date.now() - 86400000))))
    .orderBy(scheduleEvents.startsAt)
    .all();
  return c.json({ events });
});

me.get("/orders", async (c) => {
  const rows = await c.get("db")
    .select()
    .from(orders)
    .where(eq(orders.userId, c.get("user")!.id))
    .orderBy(desc(orders.createdAt))
    .all();
  return c.json({ orders: rows });
});

// Purchased store products (from paid orders).
me.get("/products", async (c) => {
  const db = c.get("db");
  const rows = await db
    .select({ id: products.id, title: products.title, type: products.type, hasDownload: products.digitalR2Key })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(and(eq(orders.userId, c.get("user")!.id), eq(orders.status, "paid")))
    .all();
  // de-dupe
  const seen = new Set<string>();
  const list = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .map((r) => ({ id: r.id, title: r.title, type: r.type, hasDownload: !!r.hasDownload }));
  return c.json({ products: list });
});

// Download a purchased digital product from R2.
me.get("/products/:id/download", async (c) => {
  const db = c.get("db");
  const userId = c.get("user")!.id;
  const owns = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, userId), eq(orders.status, "paid"), eq(orderItems.productId, c.req.param("id"))))
    .get();
  if (!owns) return c.json({ error: "not purchased" }, 403);
  const product = await db.select().from(products).where(eq(products.id, c.req.param("id"))).get();
  if (!product?.digitalR2Key) return c.json({ error: "no file" }, 404);
  const obj = await c.env.BUCKET.get(product.digitalR2Key);
  if (!obj) return c.json({ error: "file missing" }, 404);
  return new Response(obj.body, {
    headers: { "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream", "Content-Length": String(obj.size) },
  });
});

// ---- Mentorship ----------------------------------------------------------
me.get("/mentorship/slots", async (c) => {
  const db = c.get("db");
  const now = new Date();
  const slots = await db
    .select({ id: mentorshipSlots.id, startTime: mentorshipSlots.startTime, capacity: mentorshipSlots.capacity, booked: mentorshipSlots.booked, mentorName: users.name })
    .from(mentorshipSlots)
    .leftJoin(users, eq(mentorshipSlots.mentorId, users.id))
    .where(gte(mentorshipSlots.startTime, now))
    .orderBy(mentorshipSlots.startTime)
    .all();
  return c.json({ slots: slots.filter((s) => (s.booked ?? 0) < (s.capacity ?? 1)) });
});

me.post("/mentorship/book/:slotId", async (c) => {
  const db = c.get("db");
  const userId = c.get("user")!.id;
  const slot = await db.select().from(mentorshipSlots).where(eq(mentorshipSlots.id, c.req.param("slotId"))).get();
  if (!slot) return c.json({ error: "not found" }, 404);
  if ((slot.booked ?? 0) >= (slot.capacity ?? 1)) return c.json({ error: "slot full" }, 400);
  const already = await db.select().from(bookings).where(and(eq(bookings.slotId, slot.id), eq(bookings.userId, userId))).get();
  if (already) return c.json({ error: "already booked" }, 400);
  await db.insert(bookings).values({ id: crypto.randomUUID(), slotId: slot.id, userId, status: "booked" });
  await db.update(mentorshipSlots).set({ booked: (slot.booked ?? 0) + 1 }).where(eq(mentorshipSlots.id, slot.id));
  return c.json({ ok: true });
});

me.get("/bookings", async (c) => {
  const rows = await c.get("db")
    .select({ id: bookings.id, status: bookings.status, startTime: mentorshipSlots.startTime, mentorName: users.name })
    .from(bookings)
    .innerJoin(mentorshipSlots, eq(bookings.slotId, mentorshipSlots.id))
    .leftJoin(users, eq(mentorshipSlots.mentorId, users.id))
    .where(eq(bookings.userId, c.get("user")!.id))
    .all();
  return c.json({ bookings: rows });
});

// ---- Interview prep ------------------------------------------------------
me.get("/interview", async (c) => {
  const rows = await c.get("db").select().from(interviewSessions).where(eq(interviewSessions.userId, c.get("user")!.id)).orderBy(desc(interviewSessions.scheduledAt)).all();
  return c.json({ sessions: rows });
});
me.post("/interview/request", async (c) => {
  const b = await c.req.json().catch(() => ({}));
  await c.get("db").insert(interviewSessions).values({
    id: crypto.randomUUID(), userId: c.get("user")!.id,
    scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null, status: "requested",
  });
  return c.json({ ok: true });
});


me.get("/notifications", async (c) => {
  const rows = await c.get("db")
    .select()
    .from(notifications)
    .where(eq(notifications.userId, c.get("user")!.id))
    .orderBy(desc(notifications.createdAt))
    .all();
  return c.json({ notifications: rows });
});

me.post("/notifications/:id/read", async (c) => {
  await c.get("db").update(notifications).set({ read: true }).where(eq(notifications.id, c.req.param("id")));
  return c.json({ ok: true });
});

// Notification preferences (in-app always on; email/push toggle).
me.get("/notification-prefs", async (c) => {
  const db = c.get("db");
  const userId = c.get("user")!.id;
  let prefs = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).get();
  if (!prefs) {
    await db.insert(notificationPrefs).values({ id: crypto.randomUUID(), userId, email: true, push: false, inApp: true });
    prefs = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).get();
  }
  return c.json({ prefs });
});

me.put("/notification-prefs", async (c) => {
  const db = c.get("db");
  const userId = c.get("user")!.id;
  const b = await c.req.json().catch(() => ({}));
  const existing = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).get();
  if (existing) {
    await db.update(notificationPrefs).set({ email: !!b.email, push: !!b.push, inApp: true }).where(eq(notificationPrefs.userId, userId));
  } else {
    await db.insert(notificationPrefs).values({ id: crypto.randomUUID(), userId, email: !!b.email, push: !!b.push, inApp: true });
  }
  return c.json({ ok: true });
});

export default me;
