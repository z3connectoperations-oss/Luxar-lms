import { api } from "./api";

interface OrderResp {
  orderId: string;
  amount: number;
  phonepeUrl?: string;
  free?: boolean;
}

// Complete checkout
async function completePayment(order: OrderResp): Promise<void> {
  if (order.phonepeUrl) {
    window.location.href = order.phonepeUrl;
    return new Promise(() => {}); // block execution while redirecting
  }
}

/** Enroll in a course variant (creates order + pays + grants access). */
export async function enrollInVariant(variantId: string, couponCode: string | undefined) {
  const order = await api<OrderResp>("/checkout/order", { method: "POST", body: JSON.stringify({ variantId, couponCode }) });
  await completePayment(order);
}

/** Buy a store product (optional shipping for physical goods). */
export async function buyProduct(productId: string, shipping: any | undefined) {
  const order = await api<OrderResp>("/checkout/product-order", { method: "POST", body: JSON.stringify({ productId, shipping }) });
  await completePayment(order);
}

/** Enroll directly in a course (course-level price + duration). Free courses enroll instantly. */
export async function enrollInCourse(courseId: string, couponCode: string | undefined) {
  const order = await api<OrderResp>("/checkout/course-order", {
    method: "POST",
    body: JSON.stringify({ courseId, couponCode }),
  });
  if (order.free) return; // server already created the enrollment
  await completePayment(order);
}
