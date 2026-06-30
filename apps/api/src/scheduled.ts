import { and, eq, gte, lte } from "drizzle-orm";
import { createDb, scheduleEvents, enrollments } from "@luxar/db";
import { createNotification } from "./notify";
import type { AppEnv } from "./types";

type Env = AppEnv["Bindings"];

/**
 * Cron handler — runs on the schedule in wrangler.toml.
 * Sends "class starting soon" reminders for events beginning within the next
 * 30 minutes, to every enrolled student of that course. Dedupes via reminderSent.
 */
export async function handleScheduled(env: Env) {
  const db = createDb(env.DB);
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 60 * 1000);

  const upcoming = await db
    .select()
    .from(scheduleEvents)
    .where(and(gte(scheduleEvents.startsAt, now), lte(scheduleEvents.startsAt, soon), eq(scheduleEvents.reminderSent, false)))
    .all();

  for (const ev of upcoming) {
    const students = await db.select({ userId: enrollments.userId }).from(enrollments).where(eq(enrollments.courseId, ev.courseId)).all();
    for (const s of students) {
      await createNotification(db, env, {
        userId: s.userId,
        type: "reminder",
        title: `Starting soon: ${ev.title}`,
        body: `Your ${ev.type} begins at ${new Date(ev.startsAt).toLocaleString()}.`,
        link: "/student/schedule",
      });
    }
    await db.update(scheduleEvents).set({ reminderSent: true }).where(eq(scheduleEvents.id, ev.id));
  }
}
