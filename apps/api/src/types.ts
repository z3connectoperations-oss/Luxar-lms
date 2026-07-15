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
    EMAIL_REPLY_TO?: string; // e.g. luxaarinstitute@gmail.com — student replies land here
    // LiveKit Cloud (live classes). Token minting needs these.
    LIVEKIT_API_KEY?: string;
    LIVEKIT_API_SECRET?: string;
    // PhonePe Configuration
    PHONEPE_ENV?: string; // "production" (default) | "sandbox"
    PHONEPE_BASE_URL?: string;
    PHONEPE_REDIRECT_URL?: string; // where PhonePe returns the buyer (payment result page)
    PHONEPE_CALLBACK_URL?: string;
    // PhonePe Standard Checkout v2 (OAuth) credentials — set via `wrangler secret put`.
    PHONEPE_CLIENT_ID?: string;
    PHONEPE_CLIENT_SECRET?: string;
    PHONEPE_CLIENT_VERSION?: string;
    // Legacy v1 (salt-key) fields — kept optional for backward compatibility.
    PHONEPE_MERCHANT_ID?: string;
    PHONEPE_SALT_KEY?: string;
    PHONEPE_SALT_INDEX?: string;
    // PhonePe webhook credentials (configured in the PhonePe Business Dashboard).
    // Set via `wrangler secret put` — never commit real values.
    PHONEPE_WEBHOOK_USERNAME?: string;
    PHONEPE_WEBHOOK_PASSWORD?: string;
  };
  Variables: {
    db: Db;
    user: UserRow | null;
  };
}
