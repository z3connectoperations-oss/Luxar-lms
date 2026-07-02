import { PhonePeProvider } from "./PhonePeProvider";
import type { PaymentProvider } from "./PaymentProvider";

export class PaymentFactory {
  static getProvider(name: string): PaymentProvider {
    if (name === "phonepe") {
      return new PhonePeProvider();
    }
    // Future support: if (name === "razorpay") return new RazorpayProvider();
    throw new Error(`Payment provider ${name} not supported`);
  }
}
