import type { AppEnv } from "../../types";
import type { PaymentProvider, PaymentRequest } from "./PaymentProvider";

type Env = AppEnv["Bindings"];

/**
 * PhonePe Standard Checkout v2 (OAuth) provider.
 *
 * Uses the current PhonePe PG API:
 *  - OAuth token:  POST {identity}/v1/oauth/token   (client_credentials)
 *  - Create pay:   POST {pg}/checkout/v2/pay         (Authorization: O-Bearer <token>)
 *  - Order status: GET  {pg}/checkout/v2/order/{merchantOrderId}/status
 *
 * Credentials come from Worker secrets: PHONEPE_CLIENT_ID / PHONEPE_CLIENT_SECRET /
 * PHONEPE_CLIENT_VERSION. Nothing is hardcoded. Webhooks are authenticated
 * separately in routes/paymentsWebhook.ts (SHA256(username:password)).
 */

// Access-token cache (per Worker isolate). Refreshed before expiry.
let cachedToken: { token: string; expiresAt: number } | null = null;

export class PhonePeProvider implements PaymentProvider {
  name = "phonepe";

  private bases(env: Env) {
    const sandbox = (env.PHONEPE_ENV || "production").toLowerCase() === "sandbox";
    return sandbox
      ? {
          identity: "https://api-preprod.phonepe.com/apis/pg-sandbox",
          pg: "https://api-preprod.phonepe.com/apis/pg-sandbox",
        }
      : {
          identity: "https://api.phonepe.com/apis/identity-manager",
          pg: "https://api.phonepe.com/apis/pg",
        };
  }

  private async getAccessToken(env: Env): Promise<string | null> {
    const clientId = env.PHONEPE_CLIENT_ID;
    const clientSecret = env.PHONEPE_CLIENT_SECRET;
    const clientVersion = env.PHONEPE_CLIENT_VERSION;
    if (!clientId || !clientSecret || !clientVersion) {
      console.error("PhonePe: client credentials missing.");
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;

    const url = `${this.bases(env).identity}/v1/oauth/token`;
    const form = new URLSearchParams({
      client_id: clientId,
      client_version: clientVersion,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: form.toString(),
      });
      // Read raw body first so failures can be logged (the error body carries no
      // secret of ours; the access_token is only present on success and never logged).
      const bodyText = await res.text();
      let data: any = {};
      try { data = JSON.parse(bodyText); } catch { /* non-JSON error body */ }
      if (!res.ok || !data?.access_token) {
        console.error(`PhonePe OAuth failed: ${res.status} ${bodyText.slice(0, 400)}`);
        return null;
      }
      cachedToken = {
        token: data.access_token,
        expiresAt: typeof data.expires_at === "number" ? data.expires_at : now + 3000,
      };
      return cachedToken.token;
    } catch {
      console.error("PhonePe OAuth request error.");
      return null;
    }
  }

  async createPayment(req: PaymentRequest, env: Env) {
    const token = await this.getAccessToken(env);
    if (!token) return null;

    // PhonePe returns the buyer here after the transaction; PaymentResult.tsx then
    // polls /checkout/status/:transactionId to verify and unlock.
    const resultBase = env.PHONEPE_REDIRECT_URL || "https://luxaarinstitute.luxaarcompany.com/payment/result";
    const redirectUrl = `${resultBase}?transactionId=${encodeURIComponent(req.merchantTransactionId)}`;

    const body = {
      merchantOrderId: req.merchantTransactionId,
      amount: req.amount, // already in paise; PhonePe minimum is 100 (₹1)
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: { redirectUrl },
      },
    };

    try {
      const res = await fetch(`${this.bases(env).pg}/checkout/v2/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as any;
      if (res.ok && data?.redirectUrl) {
        return { redirectUrl: data.redirectUrl as string };
      }
      console.error("PhonePe create-payment error:", res.status, JSON.stringify(data).slice(0, 300));
      return null;
    } catch {
      console.error("PhonePe create-payment request error.");
      return null;
    }
  }

  async getPaymentStatus(merchantTransactionId: string, env: Env) {
    const token = await this.getAccessToken(env);
    if (!token) return null;

    try {
      const res = await fetch(
        `${this.bases(env).pg}/checkout/v2/order/${encodeURIComponent(merchantTransactionId)}/status`,
        { method: "GET", headers: { Authorization: `O-Bearer ${token}` } }
      );
      const data = (await res.json()) as any;
      const rawResponse = JSON.stringify(data);
      const providerTransactionId = data?.paymentDetails?.[0]?.transactionId || data?.orderId;
      const state = data?.state;

      if (state === "COMPLETED") return { status: "SUCCESS" as const, providerTransactionId, rawResponse };
      if (state === "PENDING") return { status: "PENDING" as const, providerTransactionId, rawResponse };
      return { status: "FAILED" as const, providerTransactionId, rawResponse };
    } catch {
      return null;
    }
  }

  // Legacy interface member. v2 webhooks are authenticated in routes/paymentsWebhook.ts
  // (Authorization = SHA256(username:password)), so this salt-key path is unused.
  async verifyWebhook(_payload: any, _signature: string, _env: Env) {
    return { isValid: false as const };
  }
}
