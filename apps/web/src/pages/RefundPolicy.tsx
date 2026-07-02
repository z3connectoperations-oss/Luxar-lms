import React from "react";

export default function RefundPolicy() {
  const supportEmail = "luxaarinstitute@gmail.com";
  const supportPhone = "+91 9443241572";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-5 py-14 text-ink">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Refunds & Cancellation Policy</h1>
      
      <div className="space-y-6 text-muted leading-relaxed">
        <p>
          Refunds are only issued in the event that you mistakenly purchased the course. 
          If you have accessed, watched, or used the course content for any duration (for example, if you have been enrolled for a few days), you will not be eligible for a refund.
        </p>
        
        <p>
          To request a refund for a mistaken purchase, please contact us at <strong>{supportEmail}</strong> or <strong>{supportPhone}</strong> with your registered mobile number and order/transaction ID immediately after the purchase.
        </p>
        
        <p>
          Once your refund request is approved, it will be processed within <strong>5 (five) business days</strong>. The refunded amount will be credited back to your original payment method via our payment gateway partner (PhonePe). Depending on your bank, it may take a few additional days for the amount to reflect in your account after we process it.
        </p>
        
        <p>You are also entitled to a refund if:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>The purchased course was not assigned/activated in your account within the expected timeframe from your date of purchase, or</li>
          <li>You have been charged twice for the same course due to a technical or payment error.</li>
        </ul>
        
        <p>
          In the rare event that Luxaar Institute cancels a course or batch, you will be offered a full refund or the option to switch to an equivalent course.
        </p>
        
        <p>
          All refunds are credited only to the original mode of payment used at the time of purchase.
        </p>
        
        <hr className="my-8 border-gray-200" />
        
        <p>For any refund-related queries, please contact us at <strong>{supportEmail}</strong> or <strong>{supportPhone}</strong>.</p>
      </div>
    </div>
  );
}
