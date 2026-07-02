import React from "react";

export default function Terms() {
  const supportEmail = "luxaarinstitute@gmail.com";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-5 py-14 text-ink">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Terms and Conditions</h1>
      
      <div className="space-y-4 text-muted leading-relaxed">
        <p>
          Welcome. If you continue to browse and use this website/app, you are agreeing to comply with and be bound by the following terms and conditions of use, which, together with our Privacy Policy, govern <strong>Luxaar Institute</strong>'s relationship with you in relation to this website/app.
        </p>
        <p>
          The term "Luxaar Institute", "us", or "we" refers to the owner of the website/app. The term "you" refers to the user or viewer of our website/app.
        </p>
        <p>The use of this website/app is subject to the following terms of use:</p>
        
        <ul className="list-disc pl-6 space-y-2">
          <li>The content of the pages of this website/app — including course videos, live classes, study material, PDFs, and test series — is for your personal exam-preparation use only. It is subject to change without notice.</li>
          <li>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness, or suitability of the information and materials found or offered on this website/app for any particular purpose, including selection in any competitive examination (TNPSC, Railways, Banking, UPSC, or otherwise).</li>
          <li>You acknowledge that such information and materials may contain inaccuracies or errors, and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</li>
          <li>Your use of any information or materials on this website/app is entirely at your own risk, for which we shall not be liable.</li>
          <li>It shall be your own responsibility to ensure that any courses, services, or information available through this website/app meet your specific exam-preparation requirements.</li>
          <li>This website/app contains material which is owned by or licensed to us. This includes, but is not limited to, video lectures, live class recordings, study notes, test series, questions, design, layout, and graphics.</li>
          <li>Reproduction, downloading, screen-recording, or redistribution of any paid content is strictly prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.</li>
          <li>All trademarks reproduced on this website/app which are not the property of, or licensed to, Luxaar Institute are acknowledged.</li>
          <li>Unauthorized use of this website/app, including sharing of login credentials or course content, may give rise to a claim for damages and/or be a criminal offense, and may result in immediate account termination without refund.</li>
          <li>From time to time, this website/app may include links to other websites (including official exam authority websites). These links are provided for your convenience. They do not signify that we endorse the website(s), and we take no responsibility for the content of the linked website(s).</li>
          <li>You may not create a link to this website/app from another website or document without Luxaar Institute's prior consent.</li>
          <li>Your use of this website/app and any dispute arising out of such use is subject to the laws of India.</li>
        </ul>

        <p><strong>Payments:</strong> Orders will be confirmed only upon receiving successful authorization/confirmation from the payment gateway (PhonePe or other supported providers).</p>
        <p><strong>Educational Purpose Only:</strong> Luxaar Institute is designed solely for educational and exam-preparation purposes to help users build subject knowledge and exam skills. We do not guarantee selection, rank, marks, or any specific outcome in any competitive examination.</p>
        <p><strong>No Selection/Income Assurance:</strong> The content, classes, and test series provided are for learning and self-assessment purposes only. We do not promise or imply any job placement, exam selection, or similar outcome.</p>
        <p><strong>Refunds:</strong> Refunds are governed by our separate <strong>Refund & Cancellation Policy</strong>, which forms part of these Terms.</p>
        <p><strong>User Responsibility:</strong> You are responsible for how you use the content and knowledge gained through this website/app. Luxaar Institute is not liable for any outcomes resulting from your usage, including exam performance.</p>
        
        <p>By continuing to use the website/app, you accept and agree to these terms.</p>
        
        <hr className="my-8 border-gray-200" />
        
        <p>For any questions regarding these Terms, please contact us at <strong>{supportEmail}</strong>.</p>
      </div>
    </div>
  );
}
