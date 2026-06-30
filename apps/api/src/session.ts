import type { Context } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { sessions, users } from "@luxar/db";
import type { Db } from "@luxar/db";

export const SESSION_COOKIE = "luxar_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/** Pull the session id from the Authorization header, ?token= query, or cookie.
 *  Header/query are used because the web app (Pages) and API (Worker) are on
 *  different domains, where third-party cookies are unreliable/blocked. */
function readSessionId(c: Context): string | null {
  const auth = c.req.header("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  const q = c.req.query("token"); // for browser-loaded media (<video>/<iframe> can't set headers)
  if (q) return q;
  return getCookie(c, SESSION_COOKIE) ?? null;
}

/** Create a session row + set the cookie. Returns the session id (also used as a Bearer token). */
export async function createSession(c: Context, db: Db, userId: string): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });

  const isHttps = new URL(c.req.url).protocol === "https:";
  setCookie(c, SESSION_COOKIE, id, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "None" : "Lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return id;
}

/** Resolve the current user from the Bearer token / cookie, or null. */
export async function getSessionUser(c: Context, db: Db) {
  const sid = readSessionId(c);
  if (!sid) return null;

  const row = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sid))
    .get();

  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sid));
    return null;
  }
  return row.user;
}

/** Destroy the current session + clear the cookie. */
export async function destroySession(c: Context, db: Db) {
  const sid = readSessionId(c);
  if (sid) await db.delete(sessions).where(eq(sessions.id, sid));
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
