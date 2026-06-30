import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Award, ChevronDown, X } from "lucide-react";
import { api } from "../lib/api";
import CourseCard from "../components/CourseCard";
import { cn } from "../lib/cn";

interface CmsBlock { type: string; dataJson: string }
interface Course { id: string; title: string; slug: string; summary: string | null; category: string | null; fromPrice: number | null; thumbnailR2Key?: string | null }
interface Topper { id: string; name: string; exam: string | null; year: number | null; quoteMd: string | null; imageUrl?: string }

const FALLBACK_TOPPERS: Topper[] = [
  { id: "f1", name: "Nithya Raman", exam: "TNPSC AE Civil", year: 2025, quoteMd: null, imageUrl: "/images/toppers/t1.png" },
  { id: "f2", name: "Karthik Subramaniam", exam: "UPSC", year: 2025, quoteMd: null, imageUrl: "/images/toppers/t2.png" },
  { id: "f3", name: "Divya Venkat", exam: "Banking", year: 2024, quoteMd: null, imageUrl: "/images/toppers/t3.png" },
  { id: "f4", name: "Suresh Kumar", exam: "GATE (Civil)", year: 2024, quoteMd: null, imageUrl: "/images/toppers/t4.png" },
  { id: "f5", name: "Meena Lakshmi", exam: "NEET", year: 2025, quoteMd: null, imageUrl: "/images/toppers/t5.png" },
];

export default function Landing() {
  const [hero, setHero] = useState<any>({ title: "Where Ambition Meets Expert Preparation", subtitle: "Prepare confidently for TNPSC AE Civil, UPSC, Banking, GATE (Civil), and NEET through expert-led courses, mock tests, mentorship, current affairs, and structured learning pathways designed for long-term success." });
  const [courses, setCourses] = useState<Course[]>([]);
  const [toppers, setToppers] = useState<Topper[]>([]);

  useEffect(() => {
    api<{ blocks: CmsBlock[] }>("/site/cms").then((d) => {
      const h = d.blocks?.find((b) => b.type === "hero");
      if (h) { try { setHero(JSON.parse(h.dataJson)); } catch { /* keep default */ } }
    }).catch(() => {});
    api<{ courses: Course[] }>("/site/courses").then((d) => setCourses(d.courses || [])).catch(() => {});
    api<{ toppers: Topper[] }>("/site/toppers").then((d) => setToppers(d.toppers || [])).catch(() => {});
  }, []);

  return (
    <div>
      <Hero hero={hero} />
      <StatsBand />
      <CuratedDisciplines courses={courses} />
      <StudyLibrary />
      <WallOfHonor toppers={toppers.length ? toppers : FALLBACK_TOPPERS} />
      <NeedGuidance />
    </div>
  );
}

/* Split the CMS headline so the last word renders italic + accent (reference style). */
function SplitHeadline({ title }: { title: string }) {
  const words = (title || "").trim().split(/\s+/);
  if (words.length < 2) return <>{title}</>;
  // For "Where Ambition Meets Expert Preparation", we want "Expert Preparation" to be italicized
  // We can just hardcode the split for the default, or fallback to the generic last-word split
  if (title === "Where Ambition Meets Expert Preparation") {
    return (
      <>
        Where Ambition Meets <br />
        <span className="font-light italic text-ink/80">Expert Preparation</span>
      </>
    );
  }
  const head = words.slice(0, -1).join(" ");
  const tail = words[words.length - 1];
  return (
    <>
      {head} <br />
      <span className="font-light italic text-ink/80">{tail}</span>
    </>
  );
}

/* ---------- Hero ---------- */
function Hero({ hero }: { hero: any }) {
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formExam, setFormExam] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (formName) params.set("name", formName);
    if (formPhone) params.set("phone", formPhone);
    if (formExam) params.set("exam", formExam);
    navigate(`/contact?${params.toString()}`);
  };

  const [showMobileBanner, setShowMobileBanner] = useState(false);
  const [hasClosedBanner, setHasClosedBanner] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300 && !hasClosedBanner && window.innerWidth < 1024) {
        setShowMobileBanner(true);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasClosedBanner]);

  const MobileForm = (
    <div className="rounded-t-3xl sm:rounded-3xl glass-dark p-6 sm:p-8 shadow-lux relative overflow-hidden w-full max-w-md mx-auto">
      {/* Subtle gold glow behind form */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/20 blur-3xl pointer-events-none"></div>
      
      <h3 className="font-display text-2xl font-bold text-white relative z-10">Apply for Coaching</h3>
      <p className="mt-1 text-sm text-white/60 relative z-10 mb-5">Book a free counselling session.</p>
      
      <form onSubmit={handleCallback} className="space-y-4 relative z-10">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gold-200">Full Name</label>
          <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="John Doe" required className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-gold-400 focus:bg-white/10 focus:ring-2 focus:ring-gold-400/20" />
        </div>
        
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gold-200">Mobile Number</label>
          <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+91 99999 00000" required className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-gold-400 focus:bg-white/10 focus:ring-2 focus:ring-gold-400/20" />
        </div>
        
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gold-200">Target Exam</label>
          <div className="relative">
            <select value={formExam} onChange={(e) => setFormExam(e.target.value)} required className="w-full appearance-none rounded-xl border border-white/20 bg-ink/50 px-4 py-3 text-sm text-white outline-none transition focus:border-gold-400 focus:bg-white/10 focus:ring-2 focus:ring-gold-400/20">
              <option value="" disabled className="text-ink">Select an option</option>
              <option value="TNPSC AE Civil" className="text-ink">TNPSC AE Civil</option>
              <option value="UPSC" className="text-ink">UPSC</option>
              <option value="Banking" className="text-ink">Banking</option>
              <option value="GATE (Civil)" className="text-ink">GATE (Civil)</option>
              <option value="NEET" className="text-ink">NEET</option>
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50" />
          </div>
        </div>
        
        <button type="submit" className="mt-2 w-full rounded-xl bg-gold-500 py-4 text-sm font-bold uppercase tracking-wider text-ink shadow-lux transition-all duration-300 hover:bg-gold-400 hover:shadow-[0_0_20px_rgba(199,167,91,0.4)] active:scale-95">
          Request Callback
        </button>
      </form>
    </div>
  );

  return (
    <section className="relative flex min-h-[calc(100vh-80px)] flex-col justify-end overflow-hidden pt-20">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover origin-center"
          src="/video/luxaarback.mp4"
        />
        {/* Dark overlay to make the hero feel premium and text readable */}
        <div className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-content flex-1 flex-col justify-center px-6 lg:px-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          
          {/* Left Content */}
          <div className="col-span-1 lg:col-span-7 xl:col-span-8 text-white">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-widest text-gold-200 shadow-sm backdrop-blur-md">
              <Award size={14} className="text-gold-400" />
              INDIA'S PREMIER COMPETITIVE EXAM LEARNING PLATFORM
            </div>
            
            <h2 className="mb-2 font-display text-xl font-bold text-gold-400">Luxaar Institute</h2>
            
            <h1 className="font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-[72px]">
              <SplitHeadline title={hero.title} />
            </h1>
            
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-white/70">
              {hero.subtitle}
            </p>
            
            <div className="mt-8 flex flex-col gap-8">
              <div>
                <Link
                  to="/courses"
                  className="inline-flex items-center justify-center rounded-full bg-gold-500 px-8 py-4 text-sm font-bold uppercase tracking-wider text-ink shadow-lux transition-all duration-300 hover:bg-gold-400 hover:animate-glow active:scale-95"
                >
                  Explore Programs
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                {["TNPSC AE Civil", "UPSC", "Banking", "GATE (Civil)", "NEET"].map((tab) => (
                  <div key={tab} className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-white/70 shadow-sm backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white cursor-default">
                    {tab}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Lead Form (Desktop Only) */}
          <div className="hidden lg:block col-span-1 lg:col-span-5 xl:col-span-4">
            <div className="rounded-3xl glass-dark p-8 shadow-lux relative overflow-hidden">
              {/* Subtle gold glow behind form */}
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/20 blur-3xl pointer-events-none"></div>
              
              <h3 className="font-display text-2xl font-bold text-white relative z-10">Apply for Coaching</h3>
              <p className="mt-2 text-sm text-white/60 relative z-10">Book a free counselling session with our academic experts.</p>
              
              <form onSubmit={handleCallback} className="mt-6 space-y-4 relative z-10">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gold-200">Full Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-gold-400 focus:bg-white/10 focus:ring-2 focus:ring-gold-400/20"
                  />
                </div>
                
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gold-200">Mobile Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 99999 00000"
                    required
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-gold-400 focus:bg-white/10 focus:ring-2 focus:ring-gold-400/20"
                  />
                </div>
                
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gold-200">Target Exam</label>
                  <div className="relative">
                    <select
                      value={formExam}
                      onChange={(e) => setFormExam(e.target.value)}
                      required
                      className="w-full appearance-none rounded-xl border border-white/20 bg-ink/50 px-4 py-3 text-sm text-white outline-none transition focus:border-gold-400 focus:bg-white/10 focus:ring-2 focus:ring-gold-400/20"
                    >
                      <option value="" disabled className="text-ink">Select an option</option>
                      <option value="TNPSC AE Civil" className="text-ink">TNPSC AE Civil</option>
                      <option value="UPSC" className="text-ink">UPSC</option>
                      <option value="Banking" className="text-ink">Banking</option>
                      <option value="GATE (Civil)" className="text-ink">GATE (Civil)</option>
                      <option value="NEET" className="text-ink">NEET</option>
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50" />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="mt-2 w-full rounded-xl bg-gold-500 py-4 text-sm font-bold uppercase tracking-wider text-ink shadow-lux transition-all duration-300 hover:bg-gold-400 hover:shadow-[0_0_20px_rgba(199,167,91,0.4)] active:scale-95"
                >
                  Request Callback
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Pop-up Lead Banner */}
      <div 
        className={cn(
          "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/80 backdrop-blur-sm transition-all duration-300 lg:hidden",
          showMobileBanner ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div 
          className={cn(
            "relative w-full max-w-md transition-transform duration-500",
            showMobileBanner ? "translate-y-0" : "translate-y-full sm:translate-y-10"
          )}
        >
          <button 
            onClick={() => {
              setShowMobileBanner(false);
              setHasClosedBanner(true);
            }}
            className="absolute -top-12 right-4 sm:-right-12 sm:top-0 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 z-[60]"
          >
            <X size={20} />
          </button>
          {MobileForm}
        </div>
      </div>

    </section>
  );
}

/* ---------- Stats band (tonal layering) ---------- */
function StatsBand() {
  const stats = [
    { k: "200+", v: "Specialized Courses" },
    { k: "12K+", v: "Active Aspirants" },
    { k: "15+", v: "Exams Covered" },
    { k: "1:5", v: "Mentor-Student Ratio" },
  ];
  return (
    <section className="border-y border-white/10 bg-neutral-900 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 via-transparent to-gold-500/5"></div>
      <div className="relative z-10 mx-auto grid max-w-content grid-cols-2 gap-6 px-6 text-center md:grid-cols-4 lg:px-10">
        {stats.map((s) => (
          <div key={s.v} className="group">
            <h3 className="font-display text-3xl font-extrabold text-gold-400 drop-shadow-sm transition-transform duration-300 group-hover:scale-105">{s.k}</h3>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.15em] text-white/60">{s.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Curated Disciplines (featured courses) ---------- */
function CuratedDisciplines({ courses }: { courses: Course[] }) {
  if (courses.length === 0) return null;
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="mb-16 flex items-end justify-between">
          <div className="max-w-xl">
            <h2 className="mb-4 font-display text-3xl font-bold tracking-tight text-ink">Curated Disciplines</h2>
            <p className="text-muted">Our courses are built by mentors who have cleared the exams themselves, using a rigorous evidence-based framework.</p>
          </div>
          <Link
            to="/courses"
            className="shrink-0 border-b-2 border-gold-500 pb-1 text-sm font-semibold uppercase tracking-wider text-ink transition-all hover:border-gold-300 hover:text-muted"
          >
            Browse All
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {courses.slice(0, 8).map((c) => (
            <CourseCard key={c.id} title={c.title} slug={c.slug} exam={c.category} summary={c.summary} fromPrice={c.fromPrice} image={c.thumbnailR2Key} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- The Study Library ---------- */
function StudyLibrary() {
  const cols = [
    { h: "Exam Tracks", items: [["TNPSC AE Civil", "/courses?category=TNPSC%20AE%20Civil"], ["UPSC", "/courses?category=UPSC"], ["Banking", "/courses?category=Banking"], ["GATE (Civil)", "/courses?category=GATE%20(Civil)"], ["NEET", "/courses?category=NEET"]] },
    { h: "Formats", items: [["Video Lectures", "/courses"], ["PDF Notes & E-books", "/courses"], ["Mock Test Series", "/courses"], ["Live Classes", "/courses"]] },
    { h: "Support", items: [["24h Doubt Forum", "/courses"], ["1:1 Mentorship", "/courses"], ["Interview Prep", "/courses"], ["Verified Certification", "/certification"]] },
  ];
  return (
    <section className="border-y border-border bg-canvas py-24">
      <div className="mx-auto grid max-w-content grid-cols-12 gap-6 px-6 lg:px-10">
        <div className="col-span-12 lg:col-span-4 lg:pr-12">
          <h2 className="mb-6 font-display text-3xl font-bold tracking-tight text-ink">The Study Library</h2>
          <p className="mb-8 leading-relaxed text-muted">Structured video courses, downloadable notes, daily current affairs and exam-grade mock tests — curated by Luxaar's mentor board.</p>
          <Link
            to="/courses"
            className="inline-flex w-full items-center justify-center rounded-xl bg-ink py-4 text-sm font-semibold uppercase tracking-wider text-white shadow-soft transition-all duration-300 hover:bg-gold-300 hover:text-ink"
          >
            Access Library
          </Link>
        </div>
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
            {cols.map((col) => (
              <div key={col.h} className="space-y-4">
                <h4 className="inline-block border-b-2 border-gold-500 pb-2 text-sm font-semibold uppercase tracking-wider text-ink">{col.h}</h4>
                <ul className="space-y-2">
                  {col.items.map(([label, to]) => (
                    <li key={label}>
                      <Link to={to} className="text-ink transition-colors hover:text-gold-600">• {label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center gap-8 rounded-2xl border border-gold-200 bg-gold-50 p-8">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-ink">
              <BookOpen size={30} className="text-white" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-ink">New: Monthly Current Affairs Compendium</p>
              <p className="text-muted">Available to all enrolled aspirants. Includes daily quizzes and a downloadable PDF.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Wall of Honor (toppers) ---------- */
function TopperCard({ t }: { t: Topper }) {
  return (
    <div className="flex h-full w-full flex-col justify-between space-y-4 rounded-2xl border border-border bg-white p-6 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-gold-400 hover:shadow-soft whitespace-normal">
      <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-gold-300 bg-gold-50 shrink-0">
        {t.imageUrl ? (
          <img 
            src={t.imageUrl} 
            alt={t.name} 
            className="h-full w-full object-cover" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = 'block';
              }
            }} 
          />
        ) : null}
        <span className={cn("font-display text-2xl font-bold text-ink", t.imageUrl ? "hidden" : "block")}>
          {t.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <p className="font-display text-lg font-semibold text-ink">{t.name}</p>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{t.exam || "Competitive Exams"}</p>
      </div>
      <div>
        <div className="inline-block rounded-full bg-ink px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          Cleared{t.year ? ` · ${t.year}` : ""}
        </div>
      </div>
    </div>
  );
}

function WallOfHonor({ toppers }: { toppers: Topper[] }) {
  const top5 = toppers.slice(0, 5);
  
  return (
    <section className="overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="mb-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Wall of Honor</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">Recognizing the exceptional dedication of our top-performing aspirants across India's toughest examinations.</p>
        </div>
        
        {/* Mobile Marquee View */}
        <div className="relative flex overflow-hidden md:hidden -mx-6 px-6">
          <div className="flex animate-marquee gap-6 hover:pause-on-hover">
            {/* Double the array for seamless loop */}
            {[...top5, ...top5].map((t, idx) => (
              <div key={`${t.id}-${idx}`} className="w-[280px] shrink-0">
                <TopperCard t={t} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {top5.map((t) => (
            <div key={t.id} className="h-full">
              <TopperCard t={t} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Need Guidance (lead gen) ---------- */
function NeedGuidance() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/site/newsletter", { method: "POST", body: JSON.stringify({ email }) }).catch(() => {});
    setDone(true);
  };
  return (
    <section className="bg-ink py-20 text-white">
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="flex flex-col items-center justify-between gap-12 lg:flex-row">
          <div className="max-w-xl">
            <h2 className="mb-4 font-display text-3xl font-bold tracking-tight text-white">Need Guidance?</h2>
            <p className="text-lg leading-relaxed text-white/70">Our academic counsellors are available for one-on-one strategy sessions to help you define your preparation path and exam goals.</p>
          </div>
          {done ? (
            <p className="text-lg font-semibold text-white">Request received — our counsellors will reach out shortly.</p>
          ) : (
            <form onSubmit={submit} className="flex w-full flex-col gap-4 md:flex-row lg:w-auto">
              <div className="flex flex-col">
                <label className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/50">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-b-2 border-white/20 bg-transparent px-0 py-3 text-white outline-none transition-all placeholder:text-white/30 focus:border-gold-500 md:w-80"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="rounded-xl bg-gold-500 px-10 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-all duration-300 hover:bg-gold-300 hover:text-ink active:scale-95"
                >
                  Request Counselling
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
