import React from "react";

export default function Terms() {
  const supportEmail = "luxaarinstitute@gmail.com";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-5 py-14 text-ink">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Terms and Conditions</h1>
      
      <div className="space-y-4 text-muted leading-relaxed">
        <p>
          Welcome to Luxaar Institute. By continuing to browse and use this website and application, you are agreeing to comply with and be bound by the following terms and conditions of use, which, together with our Privacy Policy, govern <strong>Luxaar Institute (A unit of sabisha s)</strong>'s relationship with you regarding this platform.
        </p>
        <p>
          The terms "Luxaar Institute," "sabisha s," "us," or "we" refer to the owner of the website and application. The term "you" refers to the user or viewer of our platform.
        </p>
        <p>The use of this platform is subject to the following terms:</p>
        
        <ul className="list-disc pl-6 space-y-2">
          <li>The content of the pages on this platform—including course videos, live classes, study materials, PDFs, and test series—is for your personal exam-preparation use only. It is subject to change without notice.</li>
          <li>Neither we nor any third parties provide any warranty or guarantee regarding the accuracy, timeliness, performance, completeness, or suitability of the information and materials found or offered here for any particular purpose, including selection in any competitive examination (such as TNPSC, Railways, Banking, UPSC, or otherwise).</li>
          <li>You acknowledge that such information and materials may contain inaccuracies or errors, and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</li>
          <li>Your use of any information or materials on this platform is entirely at your own risk, for which we shall not be liable.</li>
          <li>It shall be your own responsibility to ensure that any courses, services, or information available through this platform meet your specific exam-preparation requirements.</li>
          <li>This platform contains material which is owned by or licensed to us. This includes, but is not limited to, video lectures, live class recordings, study notes, test series, questions, design, layout, and graphics.</li>
          <li>The reproduction, downloading, screen recording, or redistribution of any paid content is strictly prohibited, except in accordance with the copyright notice, which forms part of these terms and conditions.</li>
          <li>All trademarks reproduced on this platform which are not the property of, or licensed to, Luxaar Institute are acknowledged.</li>
          <li>Unauthorized use of this platform, including the sharing of login credentials or course content, may give rise to a claim for damages and/or be a criminal offense, and may result in immediate account termination without a refund.</li>
          <li>From time to time, this platform may include links to other websites (including official exam authority websites). These links are provided for your convenience to provide further information. They do not signify that we endorse the website(s), and we bear no responsibility for the content of the linked website(s).</li>
          <li>You may not create a link to this platform from another website or document without Luxaar Institute's prior written consent.</li>
          <li>Your use of this platform and any dispute arising out of such use are subject to the laws of India.</li>
        </ul>

        <h2 className="text-2xl font-bold text-ink mt-8">Pricing, Shipping and Delivery Policy</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Pricing:</strong> All product and course pricing is listed in Indian Rupees (INR, ₹) on the platform. Prices are subject to change without prior notice, but any changes will not affect active subscriptions or already purchased courses.</li>
          <li><strong>Digital Delivery:</strong> Luxaar Institute offers digital educational content. There is no physical shipping of any goods, books, or materials unless explicitly stated.</li>
          <li><strong>Delivery Timeline:</strong> Upon successful payment processing through PhonePe or our accepted payment gateways, your purchased course will be activated and accessible in your account dashboard <strong>instantly (within 5 minutes)</strong>.</li>
          <li><strong>Access Issues:</strong> If you face any issues accessing your course after a successful payment, please contact our support team immediately at {supportEmail}.</li>
        </ul>

        <h2 className="text-2xl font-bold text-ink mt-8">Students Terms and Conditions (Live Class Guidelines)</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Respectful Environment:</strong> Students must maintain a respectful and professional demeanor towards the instructors and fellow students. Harassment, disruptive behavior, or inappropriate language will not be tolerated and may lead to immediate suspension from the course without a refund.</li>
          <li><strong>Punctuality:</strong> Students are expected to join live classes on time. The instructor reserves the right to lock the meeting room after a certain grace period to prevent disruptions.</li>
          <li><strong>Missed Classes:</strong> If a student misses a live class, it is their responsibility to catch up using the recorded sessions (if provided). We do not conduct makeup live classes for individual absences.</li>
          <li><strong>No Unauthorized Recording:</strong> Screen recording, photographing, or unauthorized capturing of live lectures by students is strictly prohibited and is a violation of copyright. Any material shared during the live class belongs to Luxaar Institute and cannot be shared publicly.</li>
          <li><strong>Technical Requirements:</strong> It is the student’s responsibility to ensure they have a stable internet connection, a working microphone, and a camera. Luxaar Institute is not liable for classes missed due to a student’s personal technical or network issues.</li>
          <li><strong>Rescheduling & Cancellations:</strong> Luxaar Institute reserves the right to reschedule or cancel a live class due to instructor unavailability, technical emergencies, or unforeseen circumstances. In such cases, students will be notified in advance and a makeup session will be arranged.</li>
        </ul>

        <p><strong>Payments:</strong> Orders will be confirmed only upon receiving successful authorization and confirmation from the payment gateway (PhonePe or other supported providers).</p>
        <p><strong>Educational Purpose Only:</strong> Luxaar Institute is designed solely for educational and exam-preparation purposes to help users build subject knowledge and exam skills. We do not guarantee selection, rank, marks, or any specific outcome in any competitive examination.</p>
        <p><strong>No Selection or Income Assurance:</strong> The content, classes, and test series provided are for learning and self-assessment purposes only. We do not promise or imply any job placement, exam selection, or similar outcomes.</p>
        <p><strong>Refunds:</strong> Refunds are governed by our separate <strong>Refunds & Cancellation Policy</strong>, which forms a part of these Terms.</p>
        <p><strong>User Responsibility:</strong> You are responsible for how you use the content and knowledge gained through this platform. Luxaar Institute is not liable for any outcomes resulting from your usage, including your exam performance.</p>
        
        <p>By continuing to use the platform, you accept and agree to these terms.</p>
        
        <hr className="my-8 border-gray-200" />
        
        <p>For any questions regarding these Terms, please contact us at <strong>{supportEmail}</strong>.</p>
      </div>
    </div>
  );
}
