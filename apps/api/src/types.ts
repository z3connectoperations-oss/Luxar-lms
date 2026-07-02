import type { Db } from "@luxar/db";
import type { users } from "@luxar/db";

type UserRow = typeof users.$inferSelect;

export interface AppEnv {
  Bindings: {
    DB: D1Database;
    BUCKET: R2Bucket;
    CORS_ORIGIN: string;
    FIREBASE_PROJECT_ID: string;
    JWT_SECRET: string;
    // Optional email (Resend). Email is skipped when absent.
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    // LiveKit Cloud (live classes). Token minting needs these.
    LIVEKIT_API_KEY?: string;
    LIVEKIT_API_SECRET?: string;
    // PhonePe Configuration
    PHONEPE_ENV?: string;
    PHONEPE_BASE_URL?: string;
    PHONEPE_MERCHANT_ID?: string;
    PHONEPE_SALT_KEY?: string;
    PHONEPE_SALT_INDEX?: string;
    PHONEPE_REDIRECT_URL?: string;
    PHONEPE_CALLBACK_URL?: string;
  };
  Variables: {
    db: Db;
    user: UserRow | null;
  };
}
