import type { AppEnv } from "../../types";
import type { PaymentProvider, PaymentRequest } from "./PaymentProvider";

export class PhonePeProvider implements PaymentProvider {
  name = "phonepe";

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async createPayment(req: PaymentRequest, env: AppEnv["Bindings"]) {
    const merchantId = env.PHONEPE_MERCHANT_ID;
    const saltKey = env.PHONEPE_SALT_KEY;
    const saltIndex = env.PHONEPE_SALT_INDEX;
    const baseUrl = env.PHONEPE_BASE_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";

    if (!merchantId || !saltKey || !saltIndex) {
      console.error("PhonePe credentials missing.");
      return null;
    }

    const payload = {
      merchantId,
      merchantTransactionId: req.merchantTransactionId,
      merchantUserId: req.userId,
      amount: req.amount * 100, // PhonePe expects amount in paise
      redirectUrl: env.PHONEPE_REDIRECT_URL || "http://localhost:5173/payment/result",
      redirectMode: "REDIRECT",
      callbackUrl: env.PHONEPE_CALLBACK_URL || "http://localhost:8787/checkout/phonepe-webhook",
      mobileNumber: req.mobileNumber || "9999999999",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const base64Payload = btoa(JSON.stringify(payload));
    const endpoint = "/pg/v1/pay";
    const checksum = (await this.sha256(base64Payload + endpoint + saltKey)) + "###" + saltIndex;

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const data = (await response.json()) as any;
      if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
        return { redirectUrl: data.data.instrumentResponse.redirectInfo.url };
      }
      console.error("PhonePe Pay Error:", JSON.stringify(data));
      return null;
    } catch (e) {
      console.error("PhonePe Request Error:", e);
      return null;
    }
  }

  async getPaymentStatus(merchantTransactionId: string, env: AppEnv["Bindings"]) {
    const merchantId = env.PHONEPE_MERCHANT_ID;
    const saltKey = env.PHONEPE_SALT_KEY;
    const saltIndex = env.PHONEPE_SALT_INDEX;
    const baseUrl = env.PHONEPE_BASE_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";

    if (!merchantId || !saltKey || !saltIndex) return null;

    const endpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
    const checksum = (await this.sha256(endpoint + saltKey)) + "###" + saltIndex;

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": merchantId,
        },
      });

      const data = (await response.json()) as any;
      const rawResponse = JSON.stringify(data);
      const providerTransactionId = data.data?.transactionId;

      if (data.code === "PAYMENT_SUCCESS") {
        return { status: "SUCCESS" as const, providerTransactionId, rawResponse };
      } else if (data.code === "PAYMENT_PENDING") {
        return { status: "PENDING" as const, providerTransactionId, rawResponse };
      } else {
        return { status: "FAILED" as const, providerTransactionId, rawResponse };
      }
    } catch (e) {
      return null;
    }
  }

  async verifyWebhook(payloadRaw: any, signature: string, env: AppEnv["Bindings"]) {
    const saltKey = env.PHONEPE_SALT_KEY;
    const saltIndex = env.PHONEPE_SALT_INDEX;

    if (!saltKey || !saltIndex) {
      return { isValid: false };
    }

    try {
      // payloadRaw is { response: "base64..." }
      const base64Response = payloadRaw.response;
      const calculatedChecksum = (await this.sha256(base64Response + saltKey)) + "###" + saltIndex;

      if (calculatedChecksum !== signature) {
        return { isValid: false };
      }

      const decoded = JSON.parse(atob(base64Response));
      const merchantTransactionId = decoded.data?.merchantTransactionId;
      const providerTransactionId = decoded.data?.transactionId;
      const rawResponse = JSON.stringify(decoded);

      if (decoded.code === "PAYMENT_SUCCESS") {
        return { isValid: true, status: "SUCCESS" as const, merchantTransactionId, providerTransactionId, rawResponse };
      }

      return { isValid: true, status: "FAILED" as const, merchantTransactionId, providerTransactionId, rawResponse };
    } catch (e) {
      return { isValid: false };
    }
  }
}
