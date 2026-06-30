import { api } from "./api";

interface OrderResp {
  orderId: string;
  amount: number;
  mock: boolean;
  razorpay?: { orderId: string; keyId: string };
}

function loadScript(src: string) {
  return new Promise<boolean>((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Shared payment completion: Razorpay when configured, else mock confirm.
async function completePayment(order: OrderResp, user: { name: string; email: string }): Promise<void> {
  if (order.mock || !order.razorpay) {
    await api("/checkout/confirm-mock", { method: "POST", body: JSON.stringify({ orderId: order.orderId }) });
    return;
  }
  const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!ok) throw new Error("Failed to load Razorpay");
  await new Promise<void>((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.razorpay!.keyId,
      amount: order.amount,
      currency: "INR",
      name: "Luxaar Institute",
      order_id: order.razorpay!.orderId,
      prefill: { name: user.name, email: user.email },
      theme: { color: "#16130F" },
      handler: async (resp: any) => {
        try {
          await api("/checkout/verify", {
            method: "POST",
            body: JSON.stringify({
              orderId: order.orderId,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }),
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
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
