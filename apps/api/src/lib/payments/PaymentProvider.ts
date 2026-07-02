import type { AppEnv } from "../../types";

export interface PaymentRequest {
  merchantTransactionId: string;
  orderId: string;
  userId: string;
  amount: number;
  mobileNumber?: string;
}

export interface PaymentProvider {
  name: string;

  /**
   * Initializes a payment request with the gateway.
   * Returns a redirect URL or a payment session ID.
   */
  createPayment(req: PaymentRequest, env: AppEnv["Bindings"]): Promise<{ redirectUrl: string } | null>;

  /**
   * Checks the real-time status of a payment directly with the gateway.
   */
  getPaymentStatus(merchantTransactionId: string, env: AppEnv["Bindings"]): Promise<{
    status: "PENDING" | "SUCCESS" | "FAILED";
    providerTransactionId?: string;
    rawResponse?: string;
  } | null>;

  /**
   * Validates a webhook payload and signature.
   */
  verifyWebhook(payload: any, signature: string, env: AppEnv["Bindings"]): Promise<{
    isValid: boolean;
    merchantTransactionId?: string;
    status?: "SUCCESS" | "FAILED";
    providerTransactionId?: string;
    rawResponse?: string;
  }>;
}
