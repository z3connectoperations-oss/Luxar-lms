import { z } from "zod";

/** User roles. `visitor` is implicit (unauthenticated); stored roles are below. */
export const ROLES = ["student", "trainer", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Authenticated user shape returned by GET /auth/me. */
export interface MeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
}

/** Body the web app sends to exchange a Firebase ID token for a session. */
export const sessionRequestSchema = z.object({
  idToken: z.string().min(10),
});
export type SessionRequest = z.infer<typeof sessionRequestSchema>;

/** Course publish status + certificate completion rule (used across surfaces). */
export const COURSE_STATUS = ["draft", "published"] as const;
export const COMPLETION_RULES = ["allLessons", "finalTestPass", "manual"] as const;
export type CompletionRule = (typeof COMPLETION_RULES)[number];

export const LESSON_TYPES = ["video", "pdf", "quiz", "live"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

/** Helper: is a role allowed to manage course content. */
export const canManageContent = (role: Role) => role === "admin" || role === "trainer";
export const isAdmin = (role: Role) => role === "admin";
