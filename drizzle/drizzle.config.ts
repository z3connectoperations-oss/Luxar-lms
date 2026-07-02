import type { Config } from "drizzle-kit";

// Generates SQL migrations from src/schema.ts into ./migrations.
// Applied to D1 via wrangler (see apps/api scripts), not by drizzle-kit directly.
export default {
  schema: "../database/src/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
} satisfies Config;
