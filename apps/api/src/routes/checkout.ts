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
  invoices,
  testSeries,
  testSeriesEnrollments
} from "@luxar/db";
import { requireAuth } from "../middleware";
import { createNotification } from "../notify";
import type { AppEnv } from "../types";
import type { Db } from "@luxar/db";

import { PaymentFactory } from "../lib/payments";

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

  const merchantTransactionId = `MT_${crypto.randomUUID().replace(/-/g, "").substring(0, 20)}`;
  const orderId = crypto.randomUUID();
  
  // Check for duplicate pending order for same variant and user
  const existingPending = await db.select().from(orders).innerJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(and(
      eq(orders.userId, user.id),
      eq(orders.status, "created"),
      eq(orderItems.courseVariantId, variant.id)
    )).get();
    
  let activeOrderId = orderId;
  let activeMerchantTransactionId = merchantTransactionId;
  
  if (existingPending && existingPending.orders.paymentProvider === "phonepe") {
    activeOrderId = existingPending.orders.id;
    // Always send a FRESH merchantTransactionId to PhonePe — reusing a previously
    // submitted merchantOrderId is rejected with INVALID_TRANSACTION_ID.
    activeMerchantTransactionId = merchantTransactionId;
    await db.update(orders).set({ merchantTransactionId: activeMerchantTransactionId, paymentStatus: "INITIATED" }).where(eq(orders.id, activeOrderId));
  } else {
    await db.insert(orders).values({ 
      id: orderId, userId: user.id, status: "created", 
      subtotal, discount, total, couponId,
      paymentProvider: "phonepe",
      merchantTransactionId,
      paymentStatus: "INITIATED"
    });
    await db.insert(orderItems).values({ id: crypto.randomUUID(), orderId, kind: "course", courseVariantId: variant.id, qty: 1, price: total });
    const paymentId = crypto.randomUUID();
    await db.insert(payments).values({ id: paymentId, orderId, status: "created", amount: total });
  }

  const provider = PaymentFactory.getProvider("phonepe");
  const paymentRes = await provider.createPayment({
    merchantTransactionId: activeMerchantTransactionId,
    orderId: activeOrderId,
    userId: user.id,
    amount: total,
    mobileNumber: "9999999999" // TODO: get from user profile if available
  }, c.env);

  if (paymentRes?.redirectUrl) {
    return c.json({ orderId: activeOrderId, amount: total, phonepeUrl: paymentRes.redirectUrl });
  }

  // MOCK MODE FALLBACK FOR LOCAL TESTING
  if (!c.env.PHONEPE_CLIENT_ID) {
    return c.json({ orderId: activeOrderId, amount: total, phonepeUrl: `/payment/result?transactionId=MOCK_${activeMerchantTransactionId}` });
  }

  return c.json({ error: "Failed to initialize payment" }, 500);
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

  const merchantTransactionId = `MT_${crypto.randomUUID().replace(/-/g, "").substring(0, 20)}`;
  const orderId = crypto.randomUUID();
  
  await db.insert(orders).values({ 
    id: orderId, userId: user.id, status: "created", 
    subtotal, discount, total, couponId,
    paymentProvider: "phonepe",
    merchantTransactionId,
    paymentStatus: "INITIATED"
  });
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

  const provider = PaymentFactory.getProvider("phonepe");
  const paymentRes = await provider.createPayment({
    merchantTransactionId,
    orderId,
    userId: user.id,
    amount: total,
    mobileNumber: "9999999999"
  }, c.env);

  if (paymentRes?.redirectUrl) {
    return c.json({ orderId, amount: total, phonepeUrl: paymentRes.redirectUrl });
  }

  // MOCK MODE FALLBACK FOR LOCAL TESTING
  if (!c.env.PHONEPE_CLIENT_ID) {
    return c.json({ orderId, amount: total, phonepeUrl: `/payment/result?transactionId=MOCK_${merchantTransactionId}` });
  }

  return c.json({ error: "Failed to initialize payment" }, 500);
});

// Fulfilment: mark paid + create enrollment(s) + notify.
export async function fulfill(db: Db, env: Env, userId: string, orderId: string) {
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
    } else if (item.kind === "test-series" && item.productId) {
      // Test Series fulfillment
      const ts = await db.select().from(testSeries).where(eq(testSeries.id, item.productId)).get();
      if (!ts) continue;
      const alreadyTs = await db.select().from(testSeriesEnrollments)
        .where(and(eq(testSeriesEnrollments.userId, userId), eq(testSeriesEnrollments.testSeriesId, ts.id))).get();
      if (!alreadyTs) {
        await db.insert(testSeriesEnrollments).values({
          id: crypto.randomUUID(), userId, testSeriesId: ts.id,
          expiryDate: new Date(Date.now() + ts.validityDays * 86400000)
        });
        await createNotification(db, env, {
          userId, type: "enrollment", title: "Test Series Enrollment confirmed",
          body: "You now have access to your test series. Good luck!", link: "/student/test-series",
        });
      }
      continue;
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
  // Free course → enroll instantly.
  if (total === 0) {
    const orderId = crypto.randomUUID();
    await db.insert(orders).values({ id: orderId, userId: user.id, status: "paid", subtotal, discount, total, couponId });
    await db.insert(orderItems).values({ id: crypto.randomUUID(), orderId, kind: "course-direct", productId: course.id, qty: 1, price: total });
    const paymentId = crypto.randomUUID();
    await db.insert(payments).values({ id: paymentId, orderId, status: "paid", amount: total });
    await fulfill(db, c.env, user.id, orderId);
    return c.json({ orderId, amount: 0, free: true, enrolled: true });
  }

  const merchantTransactionId = `MT_${crypto.randomUUID().replace(/-/g, "").substring(0, 20)}`;
  const orderId = crypto.randomUUID();

  // Check for duplicate pending order for same course and user
  const existingPending = await db.select().from(orders).innerJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(and(
      eq(orders.userId, user.id),
      eq(orders.status, "created"),
      eq(orderItems.productId, course.id),
      eq(orderItems.kind, "course-direct")
    )).get();

  let activeOrderId = orderId;
  let activeMerchantTransactionId = merchantTransactionId;

  if (existingPending && existingPending.orders.paymentProvider === "phonepe") {
    activeOrderId = existingPending.orders.id;
    // Always send a FRESH merchantTransactionId to PhonePe — reusing a previously
    // submitted merchantOrderId is rejected with INVALID_TRANSACTION_ID.
    activeMerchantTransactionId = merchantTransactionId;
    await db.update(orders).set({ merchantTransactionId: activeMerchantTransactionId, paymentStatus: "INITIATED" }).where(eq(orders.id, activeOrderId));
  } else {
    await db.insert(orders).values({ 
      id: orderId, userId: user.id, status: "created", 
      subtotal, discount, total, couponId,
      paymentProvider: "phonepe",
      merchantTransactionId,
      paymentStatus: "INITIATED"
    });
    await db.insert(orderItems).values({ id: crypto.randomUUID(), orderId, kind: "course-direct", productId: course.id, qty: 1, price: total });
    const paymentId = crypto.randomUUID();
    await db.insert(payments).values({ id: paymentId, orderId, status: "created", amount: total });
  }

  const provider = PaymentFactory.getProvider("phonepe");
  const paymentRes = await provider.createPayment({
    merchantTransactionId: activeMerchantTransactionId,
    orderId: activeOrderId,
    userId: user.id,
    amount: total,
    mobileNumber: "9999999999"
  }, c.env);

  if (paymentRes?.redirectUrl) {
    return c.json({ orderId: activeOrderId, amount: total, phonepeUrl: paymentRes.redirectUrl });
  }

  // MOCK MODE FALLBACK FOR LOCAL TESTING
  if (!c.env.PHONEPE_CLIENT_ID) {
    return c.json({ orderId: activeOrderId, amount: total, phonepeUrl: `/payment/result?transactionId=MOCK_${activeMerchantTransactionId}` });
  }

  return c.json({ error: "Failed to initialize payment" }, 500);
});

// Enroll directly in a Test Series (standalone).
checkout.post("/test-series-order", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const b = await c.req.json().catch(() => null);
  if (!b?.testSeriesId) return c.json({ error: "testSeriesId required" }, 400);

  const ts = await db.select().from(testSeries).where(eq(testSeries.id, b.testSeriesId)).get();
  if (!ts) return c.json({ error: "test series not found" }, 404);

  const subtotal = ts.discountPrice != null ? ts.discountPrice : (ts.price ?? 0);
  let discount = 0;
  // If global coupons were to be added for test series, handle here. We omit for now.
  const total = Math.max(0, subtotal - discount);

  // Free test series -> instant enroll
  if (total === 0) {
    const orderId = crypto.randomUUID();
    await db.insert(orders).values({ id: orderId, userId: user.id, status: "paid", subtotal, discount, total });
    await db.insert(orderItems).values({ id: crypto.randomUUID(), orderId, kind: "test-series", productId: ts.id, qty: 1, price: total });
    const paymentId = crypto.randomUUID();
    await db.insert(payments).values({ id: paymentId, orderId, status: "paid", amount: total });
    await fulfill(db, c.env, user.id, orderId);
    return c.json({ orderId, amount: 0, free: true, enrolled: true });
  }

  const merchantTransactionId = `MT_${crypto.randomUUID().replace(/-/g, "").substring(0, 20)}`;
  const orderId = crypto.randomUUID();

  const existingPending = await db.select().from(orders).innerJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(and(
      eq(orders.userId, user.id),
      eq(orders.status, "created"),
      eq(orderItems.productId, ts.id),
      eq(orderItems.kind, "test-series")
    )).get();

  let activeOrderId = orderId;
  let activeMerchantTransactionId = merchantTransactionId;

  if (existingPending && existingPending.orders.paymentProvider === "phonepe") {
    activeOrderId = existingPending.orders.id;
    // Always send a FRESH merchantTransactionId to PhonePe — reusing a previously
    // submitted merchantOrderId is rejected with INVALID_TRANSACTION_ID.
    activeMerchantTransactionId = merchantTransactionId;
    await db.update(orders).set({ merchantTransactionId: activeMerchantTransactionId, paymentStatus: "INITIATED" }).where(eq(orders.id, activeOrderId));
  } else {
    await db.insert(orders).values({ 
      id: orderId, userId: user.id, status: "created", 
      subtotal, discount, total,
      paymentProvider: "phonepe", merchantTransactionId, paymentStatus: "INITIATED"
    });
    await db.insert(orderItems).values({ id: crypto.randomUUID(), orderId, kind: "test-series", productId: ts.id, qty: 1, price: total });
    const paymentId = crypto.randomUUID();
    await db.insert(payments).values({ id: paymentId, orderId, status: "created", amount: total });
  }

  const provider = PaymentFactory.getProvider("phonepe");
  const paymentRes = await provider.createPayment({
    merchantTransactionId: activeMerchantTransactionId,
    orderId: activeOrderId,
    userId: user.id,
    amount: total,
    mobileNumber: "9999999999"
  }, c.env);

  if (paymentRes?.redirectUrl) {
    return c.json({ orderId: activeOrderId, amount: total, phonepeUrl: paymentRes.redirectUrl });
  }

  // MOCK MODE FALLBACK
  if (!c.env.PHONEPE_CLIENT_ID) {
    return c.json({ orderId: activeOrderId, amount: total, phonepeUrl: `/payment/result?transactionId=MOCK_${activeMerchantTransactionId}` });
  }

  return c.json({ error: "Failed to initialize payment" }, 500);
});



// Confirm payment and enroll
checkout.post("/confirm-mock", async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const b = await c.req.json().catch(() => null);
  if (!b?.orderId) return c.json({ error: "orderId required" }, 400);
  const order = await db.select().from(orders).where(eq(orders.id, b.orderId)).get();
  if (!order || order.userId !== user.id) return c.json({ error: "order not found" }, 404);
  await fulfill(db, c.env, user.id, b.orderId);
  return c.json({ ok: true });
});

checkout.post("/phonepe-webhook", async (c) => {
  const db = c.get("db");
  const body = await c.req.json().catch(() => null);
  const signature = c.req.header("X-VERIFY");

  if (!body || !signature) {
    return c.json({ error: "Invalid webhook payload or signature missing" }, 400);
  }

  const provider = PaymentFactory.getProvider("phonepe");
  const verification = await provider.verifyWebhook(body, signature, c.env);

  if (!verification.isValid || !verification.merchantTransactionId) {
    return c.json({ error: "Invalid signature" }, 400);
  }

  const mId = verification.merchantTransactionId;
  
  // Verify idempotency / duplicate webhook
  const order = await db.select().from(orders).where(eq(orders.merchantTransactionId, mId)).get();
  if (!order) return c.json({ error: "Order not found" }, 404);

  if (order.paymentVerified) {
    return c.json({ ok: true, message: "Already processed" }, 200); // Idempotency
  }

  const isSuccess = verification.status === "SUCCESS";
  const newStatus = isSuccess ? "SUCCESS" : "FAILED";

  await db.update(orders).set({
    paymentStatus: newStatus,
    status: isSuccess ? "paid" : "failed",
    phonepeTransactionId: verification.providerTransactionId,
    paymentResponseJson: verification.rawResponse,
    paymentCompletedAt: new Date(),
    paymentVerified: isSuccess,
    webhookReceived: true,
  }).where(eq(orders.id, order.id));

  // Log
  // Assuming paymentLogs is imported
  // await db.insert(paymentLogs).values({...}) // skipped for brevity, should be added if needed

  // Generate Invoice if successful
  if (isSuccess && !order.paymentVerified) {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
    // Assuming invoices is exported from db
    try {
      await db.insert(invoices).values({
        id: crypto.randomUUID(),
        orderId: order.id,
        userId: order.userId,
        invoiceNumber,
        amount: order.total,
        businessDetails: "Luxaar Institute (A unit of sabisha s)",
      });
    } catch (e) {
      console.error("Failed to generate invoice", e);
    }
  }

  if (isSuccess && !order.paymentVerified) {
    await fulfill(db, c.env, order.userId, order.id);
  }

  return c.json({ ok: true });
});

checkout.get("/status/:merchantTransactionId", async (c) => {
  const db = c.get("db");
  const paramId = c.req.param("merchantTransactionId");
  
  const isMock = paramId.startsWith("MOCK_") && !c.env.PHONEPE_CLIENT_ID;
  const dbQueryId = isMock ? paramId.replace("MOCK_", "") : paramId;
  
  const order = await db.select().from(orders).where(eq(orders.merchantTransactionId, dbQueryId)).get();
  if (!order) return c.json({ error: "Order not found" }, 404);

  const firstItem = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).get();
  const kind = firstItem?.kind || "course";

  if (order.paymentVerified) {
    return c.json({ status: "SUCCESS", kind });
  }

  // MOCK MODE FALLBACK
  if (isMock) {
    await db.update(orders).set({
      paymentStatus: "SUCCESS",
      status: "paid",
      paymentCompletedAt: new Date(),
      paymentVerified: true
    }).where(eq(orders.id, order.id));
    
    if (!order.paymentVerified) {
      await fulfill(db, c.env, order.userId, order.id);
    }
    return c.json({ status: "SUCCESS", kind });
  }

  const provider = PaymentFactory.getProvider("phonepe");
  const statusRes = await provider.getPaymentStatus(paramId, c.env);

  if (statusRes) {
    const isSuccess = statusRes.status === "SUCCESS";
    
    await db.update(orders).set({
      paymentStatus: statusRes.status,
      status: isSuccess ? "paid" : order.status,
      phonepeTransactionId: statusRes.providerTransactionId,
      paymentResponseJson: statusRes.rawResponse,
      paymentCompletedAt: isSuccess ? new Date() : order.paymentCompletedAt,
      paymentVerified: isSuccess || order.paymentVerified
    }).where(eq(orders.id, order.id));

    if (isSuccess && !order.paymentVerified) {
      await fulfill(db, c.env, order.userId, order.id);
    }
    
    return c.json({ status: statusRes.status, kind });
  }

  return c.json({ status: order.paymentStatus, kind });
});

export default checkout;
