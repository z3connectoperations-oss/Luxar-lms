import type { Context, Next } from "hono";
import type { Role } from "@luxar/shared";
import { createDb } from "@luxar/db";
import { getSessionUser } from "./session";
import type { AppEnv } from "./types";

/** Attaches `db` and (if logged in) `user` to the context. */
export async function withContext(c: Context<AppEnv>, next: Next) {
  const db = createDb(c.env.DB);
  c.set("db", db);
  const user = await getSessionUser(c, db);
  c.set("user", user ?? null);
  await next();
}

/** Require an authenticated user. */
export async function requireAuth(c: Context<AppEnv>, next: Next) {
  if (!c.get("user")) return c.json({ error: "unauthenticated" }, 401);
  await next();
}

/** Require one of the given roles (server-side; client role is never trusted). */
export function requireRole(...roles: Role[]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "unauthenticated" }, 401);
    if (!roles.includes(user.role as Role)) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  };
}
