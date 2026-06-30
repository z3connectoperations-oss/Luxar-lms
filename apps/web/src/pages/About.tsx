import { Link } from "react-router-dom";
import { Target, Users, Trophy, BookOpen } from "lucide-react";
import { Card, Button } from "../components/ui";

export default function About() {
  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-5 py-16 text-center">
          <span className="border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">About Luxaar Institute</span>
          <h1 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-extrabold tracking-tight md:text-5xl">Education that inspires every aspirant</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/65">
            Luxaar Institute is India’s focused platform for competitive exam preparation — RBI, SEBI, NABARD, UPSC, SSC and more.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Users, k: "4 Lakh+", v: "Aspirants guided" },
            { icon: BookOpen, k: "10+", v: "Exam tracks" },
            { icon: Trophy, k: "1000+", v: "Final selections" },
          ].map((s) => (
            <Card key={s.v} className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-50 text-gold-700"><s.icon size={22} /></span>
              <div><div className="text-2xl font-extrabold text-ink">{s.k}</div><div className="text-sm text-muted">{s.v}</div></div>
            </Card>
          ))}
        </div>

        <Card>
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cta-50 text-cta-600"><Target size={22} /></span>
            <div>
              <h2 className="text-xl font-bold text-ink">Our mission</h2>
              <p className="mt-2 text-muted">
                To make high-quality exam preparation accessible and affordable — combining structured video courses,
                realistic mock tests, daily current affairs, live classes and 1:1 mentorship in one platform, so every
                serious aspirant has a fair shot at success.
              </p>
            </div>
          </div>
        </Card>

        <div className="rounded-2xl bg-gold-50 p-8 text-center">
          <h2 className="text-2xl font-bold text-ink">Ready to begin your journey?</h2>
          <p className="mt-1 text-muted">Join thousands of aspirants preparing the smart way.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/courses"><Button>Explore Programs</Button></Link>
            <Link to="/login"><Button variant="cta">Sign Up Free</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
