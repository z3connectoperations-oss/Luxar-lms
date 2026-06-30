import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { SignJWT } from "jose";
import { liveSessions, enrollments, courseTrainers, liveParticipants } from "@luxar/db";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";
import type { Db } from "@luxar/db";

const live = new Hono<AppEnv>();
live.use("*", requireAuth);

async function hasCourseAccess(db: Db, userId: string, role: string, courseId: string) {
  if (role === "admin") return true;
  const enr = await db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))).get();
  if (enr && (!enr.expiryDate || enr.expiryDate.getTime() > Date.now())) return true;
  if (role === "trainer") {
    const t = await db.select().from(courseTrainers).where(and(eq(courseTrainers.trainerId, userId), eq(courseTrainers.courseId, courseId))).get();
    if (t) return true;
  }
  return false;
}

// Mint a LiveKit access token (HS256 JWT with a video grant).
async function mintToken(apiKey: string, apiSecret: string, opts: { identity: string; name: string; room: string; canPublish: boolean }) {
  const secret = new TextEncoder().encode(apiSecret);
  return new SignJWT({
    name: opts.name,
    video: { room: opts.room, roomJoin: true, canPublish: opts.canPublish, canSubscribe: true, canPublishData: true },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(apiKey)
    .setSubject(opts.identity)
    .setIssuedAt()
    .setExpirationTime("3h")
    .sign(secret);
}

// Current active live session for a course (if any).
live.get("/course/:courseId/active", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  if (!(await hasCourseAccess(db, user.id, user.role, c.req.param("courseId")))) return c.json({ error: "forbidden" }, 403);
  const session = await db.select().from(liveSessions)
    .where(and(eq(liveSessions.courseId, c.req.param("courseId")), eq(liveSessions.status, "live")))
    .orderBy(desc(liveSessions.scheduledStart))
    .get();
  return c.json({ session: session || null });
});

// Upcoming + live sessions for a course (student-facing list).
live.get("/course/:courseId/sessions", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  if (!(await hasCourseAccess(db, user.id, user.role, c.req.param("courseId")))) return c.json({ error: "forbidden" }, 403);
  const all = await db.select().from(liveSessions)
    .where(eq(liveSessions.courseId, c.req.param("courseId")))
    .orderBy(liveSessions.scheduledStart).all();
  const sessions = all
    .filter((s) => s.status === "live" || s.status === "scheduled")
    .map((s) => ({ id: s.id, moduleId: s.moduleId, title: s.title, status: s.status, scheduledStart: s.scheduledStart }));
  return c.json({ sessions });
});

// Issue a join token for a live session.
live.post("/token", async (c) => {
  if (!c.env.LIVEKIT_API_KEY || !c.env.LIVEKIT_API_SECRET) {
    return c.json({ error: "LiveKit not configured (set LIVEKIT_API_KEY / LIVEKIT_API_SECRET)" }, 503);
  }
  const db = c.get("db");
  const user = c.get("user")!;
  const b = await c.req.json().catch(() => ({}));
  if (!b?.sessionId) return c.json({ error: "sessionId required" }, 400);

  const session = await db.select().from(liveSessions).where(eq(liveSessions.id, b.sessionId)).get();
  if (!session) return c.json({ error: "session not found" }, 404);
  if (session.status !== "live") return c.json({ error: "session not live" }, 409);
  if (!(await hasCourseAccess(db, user.id, user.role, session.courseId))) return c.json({ error: "forbidden" }, 403);

  const isHost = session.hostId === user.id || user.role === "admin" || user.role === "trainer";
  // Unique identity so two tabs don't clash.
  const identity = `${user.id}-${Math.floor(Math.random() * 100000)}`;
  const token = await mintToken(c.env.LIVEKIT_API_KEY, c.env.LIVEKIT_API_SECRET, {
    identity, name: user.name, room: session.room, canPublish: true, // everyone may publish; students start muted client-side
  });

  // Record participation (best-effort).
  try {
    await db.insert(liveParticipants).values({
      id: crypto.randomUUID(), sessionId: session.id, userId: user.id, role: isHost ? "host" : "student",
    });
  } catch { /* ignore */ }

  return c.json({ token, room: session.room, isHost });
});

export default live;
