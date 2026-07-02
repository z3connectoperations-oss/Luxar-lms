import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
import { users, auditLog, notificationPrefs } from "@luxar/db";
import { sessionRequestSchema, type MeUser, type Role } from "@luxar/shared";
import { verifyFirebaseToken } from "./firebase";
import { createSession, destroySession } from "./session";
import { withContext, requireAuth } from "./middleware";
import adminRouter from "./routes/admin";
import siteRouter from "./routes/site";
import checkoutRouter from "./routes/checkout";
import meRouter from "./routes/me";
import learnRouter from "./routes/learn";
import trainerRouter from "./routes/trainer";
import liveRouter from "./routes/live";
import { handleScheduled } from "./scheduled";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// CORS — allow the web app with credentials (cookies).
// In dev, accept any localhost origin (5173 dev, 4173 preview, etc.); in prod,
// fall back to the configured CORS_ORIGIN.
app.use("*", (c, next) =>
  cors({
    origin: (origin) => {
      if (!origin) return c.env.CORS_ORIGIN || "http://localhost:5173";
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin; // dev
      if (/\.pages\.dev$/.test(new URL(origin).hostname)) return origin; // Cloudflare Pages (prod + previews)
      if (origin === c.env.CORS_ORIGIN) return origin; // configured production origin / custom domain
      if (c.env.CORS_ORIGIN && origin === c.env.CORS_ORIGIN.replace("https://", "https://www.")) return origin; // allow www variant
      return c.env.CORS_ORIGIN || "http://localhost:5173";
    },
    credentials: true,
  })(c, next)
);

app.use("*", withContext);

// Surface unhandled errors (logged to `wrangler tail`) with a short detail so
// production failures are diagnosable instead of an opaque 500.
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "internal", detail: err instanceof Error ? err.message : String(err) }, 500);
});

app.get("/", (c) => c.json({ ok: true, service: "luxar-api" }));

/**
 * GET /files/*  — public passthrough for images stored in R2
 * (course thumbnails/banners, category covers, avatars). Keys are UUID-prefixed
 * and unguessable. Access-controlled media (lesson videos, paid downloads) is
 * served separately via /learn/lessons/:id/file and /me/products/:id/download.
 */
app.get("/files/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/files\//, ""));
  if (!key) return c.json({ error: "not found" }, 404);
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.json({ error: "not found" }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "Content-Length": String(obj.size),
      "Cache-Control": "public, max-age=86400",
    },
  });
});

// Owner / demo emails that are ALWAYS granted admin on sign-in (idempotent).
// Add or edit addresses here (lowercase, no spaces). Gmail ignores dots/case.
const ADMIN_EMAILS = new Set([
  "luxaarinstitute@gmail.com",
  "luxaarinstiture@gmail.com",
]);

// Shape a DB user row into the public MeUser.
const toMe = (u: typeof users.$inferSelect): MeUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role as Role,
  avatarUrl: u.avatarR2Key ? `/files/${u.avatarR2Key}` : null,
});

/**
 * POST /auth/session
 * Body: { idToken }. Verifies the Firebase token, provisions the user on first
 * sight (FIRST EVER user becomes admin), creates a cookie session, returns MeUser.
 */
app.post("/auth/session", async (c) => {
  const parsed = sessionRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "idToken required" }, 400);

  let claims;
  try {
    claims = await verifyFirebaseToken(parsed.data.idToken, c.env.FIREBASE_PROJECT_ID);
  } catch (err) {
    return c.json({ error: "invalid token", detail: String(err) }, 401);
  }

  const db = c.get("db");
  let user = await db.select().from(users).where(eq(users.firebaseUid, claims.uid)).get();

  // Link an admin-invited account (created with a placeholder firebaseUid) by email,
  // keeping its assigned role (admin/trainer).
  if (!user) {
    const invited = await db.select().from(users).where(eq(users.email, claims.email.toLowerCase())).get();
    if (invited) {
      await db.update(users)
        .set({ firebaseUid: claims.uid, name: invited.name || claims.name || claims.email.split("@")[0] })
        .where(eq(users.id, invited.id));
      user = { ...invited, firebaseUid: claims.uid };
    }
  }

  if (!user) {
    // First-ever user becomes admin; everyone after is a student.
    const existing = await db.select({ id: users.id }).from(users).limit(1).get();
    const role: Role = existing ? "student" : "admin";

    const id = crypto.randomUUID();
    await db.insert(users).values({
      id,
      firebaseUid: claims.uid,
      email: claims.email,
      name: claims.name ?? claims.email.split("@")[0],
      role,
    });
    await db.insert(notificationPrefs).values({ userId: id });
    await db.insert(auditLog).values({
      actorId: id,
      action: "user.created",
      entity: "users",
      entityId: id,
      metaJson: JSON.stringify({ role, via: "firebase" }),
    });
    user = await db.select().from(users).where(eq(users.id, id)).get();
  }

  if (!user) return c.json({ error: "provisioning failed" }, 500);
  if (user.status === "suspended") return c.json({ error: "account suspended" }, 403);

  // Force-admin for allowlisted owner emails (works on first or any sign-in).
  if (ADMIN_EMAILS.has(user.email.toLowerCase()) && user.role !== "admin") {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
    user = { ...user, role: "admin" };
  }

  const token = await createSession(c, db, user.id);
  return c.json({ user: toMe(user), token });
});

app.post("/auth/logout", async (c) => {
  await destroySession(c, c.get("db"));
  return c.json({ ok: true });
});

app.get("/auth/me", requireAuth, (c) => c.json({ user: toMe(c.get("user")!) }));

// Public website API (no auth).
app.route("/site", siteRouter);
// Authenticated student/checkout APIs.
app.route("/checkout", checkoutRouter);
app.route("/me", meRouter);
app.route("/learn", learnRouter);
// Live classes (LiveKit Cloud token + sessions).
app.route("/live", liveRouter);
// Trainer portal API (trainer + admin).
app.route("/trainer", trainerRouter);
// Admin master-root API (all routes require role=admin).
app.route("/admin", adminRouter);

// Worker entry: HTTP via Hono + Cron via scheduled().
export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledController, env: AppEnv["Bindings"]) => {
    await handleScheduled(env);
  },
};
