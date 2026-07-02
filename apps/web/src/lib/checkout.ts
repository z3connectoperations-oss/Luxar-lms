import { api } from "./api";

interface OrderResp {
  orderId: string;
  amount: number;
  mock: boolean;
  razorpay?: { orderId: string; keyId: string };
}

// Complete checkout
async function completePayment(order: OrderResp, user: { name: string; email: string }): Promise<void> {
  await api("/checkout/confirm-mock", { method: "POST", body: JSON.stringify({ orderId: order.orderId }) });
}

/** Enroll in a course variant (creates order + pays + grants access). */
export async function enrollInVariant(variantId: string, couponCode: string | undefined, user: { name: string; email: string }) {
  const order = await api<OrderResp>("/checkout/order", { method: "POST", body: JSON.stringify({ variantId, couponCode }) });
  await completePayment(order, user);
}

/** Buy a store product (optional shipping for physical goods). */
export async function buyProduct(productId: string, shipping: any | undefined, user: { name: string; email: string }) {
  const order = await api<OrderResp>("/checkout/product-order", { method: "POST", body: JSON.stringify({ productId, shipping }) });
  await completePayment(order, user);
}

/** Enroll directly in a course (course-level price + duration). Free courses enroll instantly. */
export async function enrollInCourse(courseId: string, couponCode: string | undefined, user: { name: string; email: string }) {
  const order = await api<OrderResp & { free?: boolean }>("/checkout/course-order", {
    method: "POST",
    body: JSON.stringify({ courseId, couponCode }),
  });
  if (order.free) return; // server already created the enrollment
  await completePayment(order, user);
}
