import type { Db } from "@luxar/db";
import type { users } from "@luxar/db";

type UserRow = typeof users.$inferSelect;

export interface AppEnv {
  Bindings: {
    DB: D1Database;
    BUCKET: R2Bucket;
    WEB_ORIGIN: string;
    FIREBASE_PROJECT_ID: string;
    SESSION_SECRET: string;
    // Optional until Razorpay is configured (mock checkout used when absent).
    RAZORPAY_KEY_ID?: string;
    RAZORPAY_KEY_SECRET?: string;
    RAZORPAY_WEBHOOK_SECRET?: string;
    // Optional email (Resend). Email is skipped when absent.
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    // LiveKit Cloud (live classes). Token minting needs these.
    LIVEKIT_API_KEY?: string;
    LIVEKIT_API_SECRET?: string;
  };
  Variables: {
    db: Db;
    user: UserRow | null;
  };
}
