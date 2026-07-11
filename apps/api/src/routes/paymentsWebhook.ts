import { Hono } from "hono";
import { sql, eq } from "drizzle-orm";
import { orders } from "@luxar/db";
import { fulfill } from "./checkout";
import type { AppEnv } from "../types";

/**
 * PhonePe Standard Checkout webhook receiver.
 *
 * Mounted at /api/payments → exposes POST /api/payments/phonepe/webhook.
 *
 * Authentication (per PhonePe Business Dashboard configuration):
 *   PhonePe sends an `Authorization` header whose value is the hex SHA-256 of
 *   the string "<username>:<password>", where username/password are the webhook
 *   credentials configured in the PhonePe Business Dashboard. We recompute that
 *   hash from our stored secrets and compare (timing-safe, case-insensitive).
 *
 * Flow: authenticate → parse → record idempotently → log non-sensitive metadata →
 * on payload.state === "COMPLETED", fulfil the matching order (enrol the student),
 * guarded by order.paymentVerified so duplicate deliveries never double-enrol → 200.
 */
const paymentsWebhook = new Hono<AppEnv>();

async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison to avoid leaking match position via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

paymentsWebhook.post("/phonepe/webhook", async (c) => {
  const username = c.env.PHONEPE_WEBHOOK_USERNAME;
  const password = c.env.PHONEPE_WEBHOOK_PASSWORD;

  // Never proceed (and never leak details) if the endpoint isn't configured yet.
  if (!username || !password) {
    console.error("[phonepe-webhook] credentials not configured (secrets missing)");
    return c.json({ error: "webhook not configured" }, 503);
  }

  // --- 1. Authenticate: Authorization header == SHA256(username:password) ---
  const authHeader = (c.req.header("authorization") || "").trim();
  // PhonePe sends the raw hash as the value. Be tolerant of an optional scheme
  // prefix ("<scheme> <hash>") by taking the last whitespace-delimited token.
  const received = (authHeader.split(/\s+/).pop() || "").toLowerCase();
  const expected = (await sha256Hex(`${username}:${password}`)).toLowerCase();

  if (!received || !timingSafeEqual(received, expected)) {
    // Do NOT log the header value or credentials.
    console.warn("[phonepe-webhook] rejected: authorization mismatch");
    return c.json({ error: "unauthorized" }, 401);
  }

  // --- 2. Parse the event body ---
  let body: any;
  try {
    body = JSON.parse(await c.req.text());
  } catch {
    console.warn("[phonepe-webhook] rejected: invalid JSON body");
    return c.json({ error: "invalid body" }, 400);
  }

  const event: string = typeof body?.event === "string" ? body.event : "unknown";
  const payload = body?.payload ?? {};
  const state: string | null = typeof payload?.state === "string" ? payload.state : null;
  const orderId: string | null = typeof payload?.orderId === "string" ? payload.orderId : null;
  const merchantOrderId: string | null = typeof payload?.merchantOrderId === "string" ? payload.merchantOrderId : null;

  // --- 3. Idempotency: record each unique delivery; skip duplicates ---
  // Dedup on event + PhonePe orderId (falling back to merchantOrderId) + state.
  const dedupKey = `${event}:${orderId ?? merchantOrderId ?? "na"}:${state ?? "na"}`;
  let isDuplicate = false;
  try {
    const res: any = await c.get("db").run(
      sql`INSERT OR IGNORE INTO phonepe_webhook_events (id, dedup_key, event, order_id, merchant_order_id, state, received_at)
          VALUES (${crypto.randomUUID()}, ${dedupKey}, ${event}, ${orderId}, ${merchantOrderId}, ${state}, ${Math.floor(Date.now() / 1000)})`
    );
    const changes = res?.meta?.changes ?? res?.changes ?? 0;
    isDuplicate = changes === 0;
  } catch (e) {
    // If the ledger write fails we still ack (PhonePe would otherwise retry),
    // but we surface it in logs for investigation.
    console.error("[phonepe-webhook] idempotency ledger write failed:", e instanceof Error ? e.message : String(e));
  }

  if (isDuplicate) {
    console.log(`[phonepe-webhook] duplicate ignored event=${event} state=${state ?? "-"}`);
    return c.json({ success: true, duplicate: true }, 200);
  }

  // --- 4. Log ONLY non-sensitive metadata (identifiers, not payment details) ---
  console.log(
    `[phonepe-webhook] received event=${event} state=${state ?? "-"} orderId=${orderId ?? "-"} merchantOrderId=${merchantOrderId ?? "-"}`
  );

  // --- 5. Fulfil on a COMPLETED payment (idempotent) ---
  // This is the authoritative server-to-server confirmation; the redirect
  // status-check does the same and both are guarded by order.paymentVerified,
  // so an enrolment can never be created twice.
  if (state === "COMPLETED" && merchantOrderId) {
    try {
      const db = c.get("db");
      const order = await db.select().from(orders).where(eq(orders.merchantTransactionId, merchantOrderId)).get();
      if (order && !order.paymentVerified) {
        await db.update(orders).set({
          status: "paid",
          paymentStatus: "SUCCESS",
          paymentVerified: true,
          webhookReceived: true,
          paymentCompletedAt: new Date(),
          phonepeTransactionId: orderId,
        }).where(eq(orders.id, order.id));
        await fulfill(db, c.env, order.userId, order.id);
        console.log(`[phonepe-webhook] fulfilled order merchantOrderId=${merchantOrderId}`);
      }
    } catch (e) {
      console.error("[phonepe-webhook] fulfilment error:", e instanceof Error ? e.message : String(e));
    }
  }

  // --- 6. Acknowledge ---
  return c.json({ success: true }, 200);
});

export default paymentsWebhook;
