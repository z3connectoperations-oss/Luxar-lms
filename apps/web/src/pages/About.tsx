import { Link } from "react-router-dom";
import { Target, Users, Trophy, BookOpen, GraduationCap, Award, Compass, PlayCircle } from "lucide-react";
import { Card, Button } from "../components/ui";

export default function About() {
  return (
    <div className="bg-canvas pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-900/40 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-5 text-center">
          <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-200">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
            Discover Luxaar Institute
          </span>
          <h1 className="mx-auto mt-8 max-w-3xl font-display text-5xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
            Shaping the <span className="bg-gradient-to-r from-gold-300 to-brand-300 bg-clip-text text-transparent">Future of Learning</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70 sm:text-xl">
            Luxaar Institute is a premier educational platform dedicated to guiding aspirants toward success in competitive exams. We transform ambition into achievement through expert mentorship and structured learning.
          </p>
        </div>
      </section>

      {/* Stats Section (Overlapping Hero) */}
      <div className="relative z-10 mx-auto -mt-10 max-w-5xl px-5">
        <div className="grid gap-4 rounded-2xl bg-card p-6 shadow-xl shadow-ink/5 sm:grid-cols-3 md:p-8">
          {[
            { icon: Users, k: "10,000+", v: "Aspirants Guided", color: "text-blue-600", bg: "bg-blue-50" },
            { icon: Trophy, k: "Top Ranks", v: "Consistent Results", color: "text-gold-600", bg: "bg-gold-50" },
            { icon: BookOpen, k: "500+", v: "Hours of Content", color: "text-brand-600", bg: "bg-brand-50" },
          ].map((s, i) => (
            <div key={i} className="group flex items-center gap-4 rounded-xl p-4 transition-all hover:bg-neutral-50/50">
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${s.bg} ${s.color} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                <s.icon size={26} />
              </span>
              <div>
                <div className="text-2xl font-extrabold text-ink">{s.k}</div>
                <div className="text-sm font-medium text-muted">{s.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-24 px-5 py-20">
        
        {/* What We Do Section */}
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">What We Do</h2>
            <div className="h-1.5 w-12 rounded-full bg-brand-500" />
            <p className="text-lg leading-relaxed text-muted">
              At Luxaar Institute, we provide comprehensive, exam-focused training programs designed by industry experts and top educators. Our goal is to make high-quality exam preparation accessible, structured, and highly effective.
            </p>
            <p className="text-lg leading-relaxed text-muted">
              Whether you are aiming for Engineering, Medical, Civil Services, or Banking sectors, our meticulously crafted courses provide the exact roadmap you need to succeed.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "TNPSC AE Civil", desc: "Assistant Engineer preparation" },
              { title: "UPSC CSE", desc: "Civil Services foundation" },
              { title: "GATE Civil", desc: "Masterclass for engineering" },
              { title: "NEET", desc: "Medical entrance coaching" },
              { title: "Banking", desc: "Complete banking exams prep" },
            ].map((course, i) => (
              <div key={i} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <GraduationCap size={20} className="mb-3 text-brand-500" />
                <h3 className="font-bold text-ink">{course.title}</h3>
                <p className="mt-1 text-xs text-muted">{course.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Our Mission & Values */}
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: "Our Mission",
              desc: "To democratize high-quality education and empower students with the right tools, knowledge, and mentorship to crack the toughest exams.",
            },
            {
              icon: Award,
              title: "Excellence",
              desc: "We never compromise on the quality of our content. Every video, mock test, and study material is curated to meet the highest standards.",
            },
            {
              icon: Compass,
              title: "Guidance",
              desc: "Beyond just teaching, we provide 1:1 mentorship and continuous support to keep our aspirants motivated and on the right track.",
            },
          ].map((val, i) => (
            <Card key={i} className="group relative overflow-hidden p-8 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-50 opacity-50 transition-transform group-hover:scale-150" />
              <span className="relative mb-6 grid h-12 w-12 place-items-center rounded-xl bg-ink text-white shadow-md">
                <val.icon size={22} />
              </span>
              <h3 className="relative text-xl font-bold text-ink">{val.title}</h3>
              <p className="relative mt-3 leading-relaxed text-muted">{val.desc}</p>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-16 text-center shadow-2xl sm:px-12 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-800/40 via-ink to-ink" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Ready to begin your journey?</h2>
            <p className="mt-4 text-lg text-white/70">
              Join thousands of aspirants preparing the smart way. Take the first step towards your dream career today with Luxaar Institute.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/courses">
                <Button className="min-w-[160px] border-none !bg-white font-bold !text-ink hover:!bg-neutral-200">
                  Explore Courses
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="cta" className="min-w-[160px]">
                  Sign Up for Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
