import { eq } from "drizzle-orm";
import { notifications, notificationPrefs, users } from "@luxar/db";
import type { Db } from "@luxar/db";
import type { AppEnv } from "./types";

type Env = AppEnv["Bindings"];

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Central notification dispatch: always writes an in-app row; additionally sends
 * an email via Resend when the user opted in AND RESEND_API_KEY is configured.
 * (Web push is a future channel — prefs.push is stored but not yet delivered.)
 */
export async function createNotification(db: Db, env: Env, n: NotifyInput) {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: false,
  });

  if (!env.RESEND_API_KEY) return; // email not configured — in-app only

  const prefs = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, n.userId)).get();
  if (prefs && prefs.email === false) return; // user opted out of email

  const user = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, n.userId)).get();
  if (!user?.email) return;

  await sendEmail(env, user.email, n.title, `${n.body || ""}\n\n— Luxar LMS`).catch(() => {});
}

async function sendEmail(env: Env, to: string, subject: string, text: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM || "Luxar LMS <onboarding@resend.dev>", to, subject, text }),
  });
}
