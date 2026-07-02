import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"LOADING" | "SUCCESS" | "FAILED">("LOADING");
  const merchantTransactionId = searchParams.get("transactionId");

  useEffect(() => {
    if (!merchantTransactionId) {
      setStatus("FAILED");
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;

    const checkStatus = async () => {
      try {
        const res = await api<{ status: string }>(`/checkout/status/${merchantTransactionId}`);
        if (res.status === "SUCCESS") {
          setStatus("SUCCESS");
          setTimeout(() => navigate("/student"), 3000);
        } else if (res.status === "PENDING" && attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, attempts === 1 ? 5000 : 10000);
        } else {
          setStatus("FAILED");
        }
      } catch (e) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000);
        } else {
          setStatus("FAILED");
        }
      }
    };

    checkStatus();
  }, [merchantTransactionId, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center">
        {status === "LOADING" && (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-xl font-bold text-ink">Verifying Payment...</h2>
            <p className="text-muted">Please do not close or refresh this page.</p>
          </div>
        )}
        
        {status === "SUCCESS" && (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-ink">Payment Successful!</h2>
            <p className="text-muted">Your course has been unlocked. Redirecting you to the dashboard...</p>
          </div>
        )}

        {status === "FAILED" && (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-ink">Payment Failed</h2>
            <p className="text-muted">We could not verify your payment. If money was deducted, it will be refunded automatically by your bank.</p>
            <Link to="/courses" className="inline-block mt-4 px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Try Again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
