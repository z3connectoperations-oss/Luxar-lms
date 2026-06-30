import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import {
  coupons,
  courses,
  courseVariants,
  orders,
  orderItems,
  payments,
  enrollments,
  products,
  shippingAddresses,
} from "@luxar/db";
import { requireAuth } from "../middleware";
import { createNotification } from "../notify";
import type { AppEnv } from "../types";
import type { Db } from "@luxar/db";

type Env = AppEnv["Bindings"];

const checkout = new Hono<AppEnv>();
checkout.use("*", requireAuth);

// Validate a coupon for a course (or global). Returns percentOff if usable.
async function findCoupon(db: Db, code: string, courseId: string | null) {
  const row = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).get();
  if (!row || !row.active) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
  if (row.courseId && row.courseId !== courseId) return null;
  return row;
}

checkout.post("/coupon/validate", async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b?.code) return c.json({ error: "code required" }, 400);
  const row = await findCoupon(c.get("db"), b.code, b.courseId ?? null);
  if (!row) return c.json({ valid: false });
  return c.json({ valid: true, percentOff: row.percentOff, code: row.code });
});

// Create an order for a course variant. Returns Razorpay handoff, or mock mode.
checkout.post("/order", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const b = await c.req.json().catch(() => null);
  if (!b?.variantId) return c.json({ error: "variantId required" }, 400);

  const variant = await db.select().from(courseVariants).where(eq(courseVariants.id, b.variantId)).get();
  if (!variant) return c.json({ error: "variant not found" }, 404);

  const subtotal = variant.priceFinal;
  let discount = 0;
  let couponId: string | null = null;
  if (b.couponCode) {
    const coupon = await findCoupon(db, b.couponCode, variant.courseId);
    if (coupon) {
      discount = Math.floor((subtotal * coupon.percentOff) / 100);
      couponId = coupon.id;
    }
  }
  const total = Math.max(0, subtotal - discount);

  const orderId = crypto.randomUUID();
  await db.insert(orders).values({ id: orderId, userId: user.id, status: "created", subtotal, discount, total, couponId });
  await db.insert(orderItems).values({ id: crypto.randomUUID(), orderId, kind: "course", courseVariantId: variant.id, qty: 1, price: total });
  const paymentId = crypto.randomUUID();
  await db.insert(payments).values({ id: paymentId, orderId, status: "created", amount: total });

  const keyId = c.env.RAZORPAY_KEY_ID;
  const keySecret = c.env.RAZORPAY_KEY_SECRET;
  if (keyId && keySecret) {
    // Real Razorpay order
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total, currency: "INR", receipt: orderId }),
    });
    if (!res.ok) return c.json({ error: "razorpay order failed" }, 502);
    const rp = (await res.json()) as { id: string };
    await db.update(payments).set({ razorpayOrderId: rp.id }).where(eq(payments.id, paymentId));
    return c.json({ orderId, amount: total, mock: false, razorpay: { orderId: rp.id, keyId, name: user.name, email: user.email } });
  }

  // Mock mode (no Razorpay keys configured yet)
  return c.json({ orderId, amount: total, mock: true });
});

// Create an order for a STORE PRODUCT (physical or digital).
checkout.post("/product-order", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const b = await c.req.json().catch(() => null);
  if (!b?.productId) return c.json({ error: "productId required" }, 400);

  const product = await db.select().from(products).where(eq(products.id, b.productId)).get();
  if (!product) return c.json({ error: "product not found" }, 404);

  const subtotal = product.price;
  let discount = 0;
  let couponId: string | null = null;
  if (b.couponCode) {
    const coupon = await findCoupon(db, b.couponCode, null); // only global coupons apply to store
    if (coupon) { discount = Math.floor((subtotal * coupon.percentOff) / 100); couponId = coupon.id; }
  }
  const total = Math.max(0, subtotal - discount);

  const orderId = crypto.randomUUID();
  await db.insert(orders).values({ id: orderId, userId: user.id, status: "created", subtotal, discount, total, couponId });
  await db.insert(orderItems).values({ id: crypto.randomUUID(), orderId, kind: "product", productId: product.id, qty: 1, price: total });
  const paymentId = crypto.randomUUID();
  await db.insert(payments).values({ id: paymentId, orderId, status: "created", amount: total });

  // Capture shipping for physical goods.
  if (product.type === "physical" && b.shipping) {
    const s = b.shipping;
    await db.insert(shippingAddresses).values({
      id: crypto.randomUUID(), userId: user.id, name: s.name, phone: s.phone,
      line1: s.line1, line2: s.line2, city: s.city, state: s.state, pincode: s.pincode,
    });
  }

  const keyId = c.env.RAZORPAY_KEY_ID;
  const keySecret = c.env.RAZORPAY_KEY_SECRET;
  if (keyId && keySecret) {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total, currency: "INR", receipt: orderId }),
    });
    if (!res.ok) return c.json({ error: "razorpay order failed" }, 502);
    const rp = (await res.json()) as { id: string };
    await db.update(payments).set({ razorpayOrderId: rp.id }).where(eq(payments.id, paymentId));
    return c.json({ orderId, amount: total, mock: false, razorpay: { orderId: rp.id, keyId, name: user.name, email: user.email } });
  }
  return c.json({ orderId, amount: total, mock: true });
});

// Fulfilment: mark paid + create enrollment(s) + notify.
async function fulfill(db: Db, env: Env, userId: string, orderId: string) {
  await db.update(orders).set({ status: "paid" }).where(eq(orders.id, orderId));
  await db.update(payments).set({ status: "paid" }).where(eq(payments.orderId, orderId));

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
  for (const item of items) {
    // Determine the course + validity window for this item.
    let courseId: string | null = null;
    let validityDays = 365;
    let variantId: string | null = null;
    if (item.kind === "course" && item.courseVariantId) {
      const variant = await db.select().from(courseVariants).where(eq(courseVariants.id, item.courseVariantId)).get();
      if (!variant) continue;
      courseId = variant.courseId; validityDays = variant.validityDays; variantId = variant.id;
    } else if (item.kind === "course-direct" && item.productId) {
      // course-direct stores the courseId in productId; validity = course.durationDays
      const course = await db.select().from(courses).where(eq(courses.id, item.productId)).get();
      if (!course) continue;
      courseId = course.id; validityDays = course.durationDays ?? 365;
    } else continue;

    const already = await db.select().from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))).get();
    if (already) continue;
    await db.insert(enrollments).values({
      id: crypto.randomUUID(), userId, courseId, variantId,
      expiryDate: new Date(Date.now() + validityDays * 86400000), progressPct: 0,
    });
    await createNotification(db, env, {
      userId, type: "enrollment", title: "Enrollment confirmed",
      body: "You now have access to your course. Happy learning!", link: "/student",
    });
  }
}

// Enroll directly in a course (course-level price + duration). Free → instant.
checkout.post("/course-order", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const b = await c.req.json().catch(() => null);
  if (!b?.courseId) return c.json({ error: "courseId required" }, 400);

  const course = await db.select().from(courses).where(eq(courses.id, b.courseId)).get();
  if (!course) return c.json({ error: "course not found" }, 404);

  const subtotal = course.discountPrice != null ? course.discountPrice : (course.price ?? 0);
  let discount = 0;
  let couponId: string | null = null;
  if (b.couponCode) {
    const coupon = await findCoupon(db, b.couponCode, course.id);
    if (coupon) { discount = Math.floor((subtotal * coupon.percentOff) / 100); couponId = coupon.id; }
  }
  const total = Math.max(0, subtotal - discount);

  const orderId = crypto.randomUUID();
  await db.insert(orders).values({ id: orderId, userId: user.id, status: "created", subtotal, discount, total, couponId });
  await db.insert(orderItems).values({ id: crypto.randomUUID(), orderId, kind: "course-direct", productId: course.id, qty: 1, price: total });
  const paymentId = crypto.randomUUID();
  await db.insert(payments).values({ id: paymentId, orderId, status: "created", amount: total });

  // Free course → enroll instantly.
  if (total === 0) {
    await fulfill(db, c.env, user.id, orderId);
    return c.json({ orderId, amount: 0, free: true, enrolled: true });
  }

  const keyId = c.env.RAZORPAY_KEY_ID;
  const keySecret = c.env.RAZORPAY_KEY_SECRET;
  if (keyId && keySecret) {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total, currency: "INR", receipt: orderId }),
    });
    if (!res.ok) return c.json({ error: "razorpay order failed" }, 502);
    const rp = (await res.json()) as { id: string };
    await db.update(payments).set({ razorpayOrderId: rp.id }).where(eq(payments.id, paymentId));
    return c.json({ orderId, amount: total, mock: false, razorpay: { orderId: rp.id, keyId, name: user.name, email: user.email } });
  }
  return c.json({ orderId, amount: total, mock: true });
});

// Verify a real Razorpay payment signature, then fulfil.
checkout.post("/verify", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const b = await c.req.json().catch(() => null);
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = b || {};
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return c.json({ error: "missing fields" }, 400);

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order || order.userId !== user.id) return c.json({ error: "order not found" }, 404);

  const secret = c.env.RAZORPAY_KEY_SECRET!;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${razorpay_order_id}|${razorpay_payment_id}`));
  const expected = [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
  if (expected !== razorpay_signature) return c.json({ error: "invalid signature" }, 400);

  await db.update(payments).set({ razorpayPaymentId: razorpay_payment_id, signature: razorpay_signature }).where(eq(payments.orderId, orderId));
  await fulfill(db, c.env, user.id, orderId);
  return c.json({ ok: true });
});

// Mock confirm — only allowed when Razorpay is not configured (dev/demo).
checkout.post("/confirm-mock", async (c) => {
  if (c.env.RAZORPAY_KEY_ID) return c.json({ error: "mock disabled when Razorpay is configured" }, 400);
  const db = c.get("db");
  const user = c.get("user")!;
  const b = await c.req.json().catch(() => null);
  if (!b?.orderId) return c.json({ error: "orderId required" }, 400);
  const order = await db.select().from(orders).where(eq(orders.id, b.orderId)).get();
  if (!order || order.userId !== user.id) return c.json({ error: "order not found" }, 404);
  await fulfill(db, c.env, user.id, b.orderId);
  return c.json({ ok: true });
});

export default checkout;
