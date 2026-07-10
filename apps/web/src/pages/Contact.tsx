import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, Phone, MapPin, ChevronDown } from "lucide-react";
import { api } from "../lib/api";
import { Input, Button } from "../components/ui";

export default function Contact() {
  const [searchParams] = useSearchParams();
  const [formName, setFormName] = useState(searchParams.get("name") || "");
  const [formPhone, setFormPhone] = useState(searchParams.get("phone") || "");
  const [formEmail, setFormEmail] = useState("");
  const [formExam, setFormExam] = useState(searchParams.get("exam") || "");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/site/leads", {
        method: "POST",
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          email: formEmail,
          examInterest: formExam,
        }),
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit enquiry. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-canvas min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-content px-6 py-20 lg:px-10">
        <div className="mb-16 text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            Get in <span className="text-gold-500">Touch</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Have questions about our courses or need guidance? We're here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Contact Details */}
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Contact Information</h2>
              <p className="mt-2 text-muted">
                Reach out to our academic counsellors directly through our official channels.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-50 text-gold-600">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-ink">Email Us</h3>
                  <p className="mt-1 text-muted">luxaarinstitute@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-50 text-gold-600">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-ink">Call Us</h3>
                  <p className="mt-1 text-muted">+91 9443472954</p>
                  <p className="mt-1 text-xs text-muted">Mon - Sat (9:00 AM to 6:00 PM)</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-50 text-gold-600">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-ink">Registered Office</h3>
                  <p className="mt-1 text-muted text-sm leading-relaxed">
                    <strong>Luxaar Institute (A unit of sabisha s)</strong><br />
                    14/2/5, 14, 5F-3 MOOLACHEL,<br />
                    VERKILAMBI, KANYAKUMARI,<br />
                    TAMIL NADU, 629166
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enquiry Form */}
          <div className="rounded-3xl border border-border bg-white p-8 shadow-lux md:p-10">
            <h3 className="font-display text-2xl font-bold text-ink">Request an Enquiry</h3>
            <p className="mt-2 text-sm text-muted">
              Book a free counselling session with our academic experts.
            </p>

            {done ? (
              <div className="mt-8 rounded-2xl bg-green-50 p-6 text-center text-green-800 ring-1 ring-green-100">
                <h4 className="font-bold text-lg">Request Received!</h4>
                <p className="mt-2 text-sm">
                  Thank you for your interest. Our academic counsellors will reach out to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Mobile Number
                  </label>
                  <Input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 99999 00000"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Email (Optional)
                  </label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Target Exam
                  </label>
                  <div className="relative">
                    <select
                      value={formExam}
                      onChange={(e) => setFormExam(e.target.value)}
                      required
                      className="h-11 w-full appearance-none rounded-xl border border-border bg-white px-4 text-sm text-ink outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                    >
                      <option value="" disabled>Select an option</option>
                      <option value="TNPSC AE Civil">TNPSC AE Civil</option>
                      <option value="UPSC">UPSC</option>
                      <option value="Banking">Banking</option>
                      <option value="GATE (Civil)">GATE (Civil)</option>
                      <option value="NEET">NEET</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full pt-3 pb-3 mt-4"
                >
                  {busy ? "Submitting..." : "Submit Enquiry"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
