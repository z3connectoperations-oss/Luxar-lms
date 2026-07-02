import { useState, useEffect, useMemo } from "react";
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Globe,
  Share2,
  AtSign,
  Mail,
  Phone,
  MapPin,
  X,
  ChevronRight,
  LayoutDashboard,
  Award,
  BookOpen,
  LogOut,
  AlertCircle,
  ChevronDown,
  Sparkles,
  Menu
} from "lucide-react";
import { useAuth, homeForRole } from "../auth/AuthContext";
import { api } from "../lib/api";
import { Button, Input } from "../components/ui";
import { cn } from "../lib/cn";

const navItems = [
  { to: "/courses", label: "Courses" },
  { to: "/about", label: "About" },
];

const DEFAULT_EXPLORE_CATEGORIES = [
  {
    title: "Emerging Technologies",
    categories: [
      "Artificial Intelligence",
      "Big Data Analytics",
      "Blockchain",
      "Cloud Computing",
      "Cybersecurity",
      "Internet Of Things",
      "Robotic Process Automation",
      "Semiconductors",
      "Augmented Reality & Virtual Reality",
      "Web, Mobile Development & Marketing",
      "3D Printing & Modeling"
    ]
  },
  {
    title: "Professional Skills",
    categories: [
      "Collaboration & Team Work",
      "Continuous Learning",
      "Creative Problem Solving & Critical Thinking",
      "Digital Leadership",
      "Effective Communication",
      "Innovation & Design Thinking",
      "Influencing & Negotiation",
      "Program Management",
      "Project Management",
      "Product Management"
    ]
  },
  {
    title: "Next-Gen Tech & Skills",
    categories: [
      "Edge Computing",
      "Green Tech",
      "Quantum Computing",
      "Digital Learning 101",
      "Adobe Creativity & Gen AI",
      "Digital Edge 101",
      "Digital 101 Journey"
    ]
  },
  {
    title: "Industry Courses",
    categories: [
      "Business Process Management",
      "Digital Engineering",
      "PM 101",
      "Experiential Learning",
      "Software Tools & Languages",
      "Bootcamp Programs",
      "Government Training Mocks"
    ]
  }
];

export default function PublicLayout() {
  const { user, loginWithGoogle, loginWithEmail, logout, configured } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  // Sidebar open/close states
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll state for floating navbar
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dynamic courses and categories fetching
  const [courses, setCourses] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [cmsExploreConfig, setCmsExploreConfig] = useState<any[]>(DEFAULT_EXPLORE_CATEGORIES);

  // Login form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    api<{ courses: any[] }>("/site/courses")
      .then((d) => setCourses(d.courses || []))
      .catch(() => {});

    api<{ categories: any[] }>("/site/categories")
      .then((d) => setDbCategories(d.categories || []))
      .catch(() => {});

    api<{ blocks: any[] }>("/site/cms")
      .then((d) => {
        const block = d.blocks?.find((b) => b.key === "explore_categories");
        if (block) {
          try {
            const parsed = JSON.parse(block.dataJson);
            if (Array.isArray(parsed)) {
              setCmsExploreConfig(parsed);
            }
          } catch (e) {
            console.error("Failed to parse explore_categories cms block", e);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Listen to ?login=true from URL
  useEffect(() => {
    if (searchParams.get("login") === "true") {
      setIsLoginOpen(true);
      const params = new URLSearchParams(searchParams);
      params.delete("login");
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Match category items against active database categories
  const activeDbCategoryMap = useMemo(() => {
    const map = new Map<string, any>();
    dbCategories.forEach((cat) => {
      if (cat.name) {
        map.set(cat.name.toLowerCase().trim(), cat);
      }
    });
    return map;
  }, [dbCategories]);

  const activeExploreColumns = useMemo(() => {
    return cmsExploreConfig
      .map((col) => {
        const activeCats = (col.categories || [])
          .map((cName: string) => {
            const dbCatObj = activeDbCategoryMap.get(cName.toLowerCase().trim());
            return dbCatObj ? { label: dbCatObj.name, to: `/courses?category=${encodeURIComponent(dbCatObj.name)}` } : null;
          })
          .filter(Boolean) as { label: string; to: string }[];

        return {
          title: col.title,
          items: activeCats,
        };
      })
      .filter((col) => col.items.length > 0);
  }, [cmsExploreConfig, activeDbCategoryMap]);

  const gridColsClass = useMemo(() => {
    const count = activeExploreColumns.length;
    if (count <= 1) return "grid-cols-1 max-w-md mx-auto";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto";
    if (count === 3) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto";
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
  }, [activeExploreColumns]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/courses${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr("");
    setLoginBusy(true);
    try {
      await loginWithEmail(loginEmail, loginPassword);
      setIsLoginOpen(false);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err: any) {
      setLoginErr(err?.message || "Invalid email or password");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginErr("");
    setLoginBusy(true);
    try {
      await loginWithGoogle();
      setIsLoginOpen(false);
    } catch (err: any) {
      setLoginErr(err?.message || "Google login failed");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
      {/* Spacer to prevent layout jump since header is fixed */}
      <div className="h-20 shrink-0" />

      {/* STICKY ACADEMIC HEADER */}
      <header
        className={cn(
          "fixed top-0 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ease-in-out",
          isScrolled
            ? "top-4 w-[95%] max-w-[1280px] rounded-full border border-white/40 glass shadow-lux"
            : "w-full max-w-none border-b border-border bg-white/95 backdrop-blur-md shadow-card"
        )}
      >
        {/* Main header row */}
        <div className={cn("relative", isScrolled ? "rounded-full" : "")}>
          <div
            className={
              "mx-auto flex h-20 w-full max-w-content items-center justify-between gap-6 px-6 lg:px-10"
            }
          >
            {/* Logo + nav */}
            <div className="flex items-center gap-10">
              <Link to="/" className="flex shrink-0 items-center gap-3">
                <img
                  src="/luxaar.png"
                  alt="Luxaar Institute"
                  className="h-10 w-10 rounded-lg object-cover ring-1 ring-ink/10"
                />
                <span className="font-display text-xl font-bold tracking-tighter text-ink">
                  Luxaar Institute
                </span>
              </Link>

              <nav className="hidden items-center gap-8 lg:flex">
                <button
                  onClick={() => {
                    setIsExploreOpen(!isExploreOpen);
                    setIsLoginOpen(false);
                    setIsProfileOpen(false);
                  }}
                  className="flex items-center gap-1 whitespace-nowrap pb-1 text-sm font-semibold tracking-wide text-muted transition-colors duration-200 hover:text-ink cursor-pointer"
                >
                  Explore Programs
                  <ChevronDown size={14} className={cn("transition-transform duration-200", isExploreOpen && "rotate-180")} />
                </button>
                {navItems.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) =>
                      cn(
                        "whitespace-nowrap border-b-2 pb-1 text-sm font-semibold tracking-wide transition-colors duration-200",
                        isActive ? "border-gold-500 text-ink" : "border-transparent text-muted hover:text-ink"
                      )
                    }
                  >
                    {n.label}
                  </NavLink>
                ))}
                {user && (
                  <NavLink
                    to={homeForRole(user.role)}
                    className={({ isActive }) =>
                      cn(
                        "whitespace-nowrap border-b-2 pb-1 text-sm font-semibold tracking-wide transition-colors duration-200",
                        isActive ? "border-gold-500 text-ink" : "border-transparent text-muted hover:text-ink"
                      )
                    }
                  >
                    My Dashboard
                  </NavLink>
                )}
              </nav>
            </div>

            {/* Search + Auth */}
            <div className="flex items-center gap-4">
              <form
                onSubmit={search}
                className="relative hidden items-center xl:flex"
              >
                <Search size={16} className="absolute left-3 text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search courses..."
                  className="w-48 rounded-full border border-border bg-white py-2 pl-10 pr-4 text-sm text-ink outline-none transition-all placeholder:text-faint focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                />
              </form>

              {user ? (
                <button
                  onClick={() => {
                    setIsProfileOpen(true);
                    setIsLoginOpen(false);
                    setIsExploreOpen(false);
                  }}
                  className="hidden md:flex items-center gap-2 rounded-full border border-border bg-white p-1 pr-3 transition-all duration-200 hover:border-gold-400 cursor-pointer"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-bold uppercase text-white">
                      {user.name ? user.name.slice(0, 2) : user.email.slice(0, 2)}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate text-sm font-semibold text-ink">
                    {user.name || user.email.split("@")[0]}
                  </span>
                  <ChevronDown size={14} className="text-muted" />
                </button>
              ) : (
                <div className="hidden md:flex items-center gap-4">
                  <button
                    onClick={() => {
                      setIsLoginOpen(true);
                      setIsProfileOpen(false);
                      setIsExploreOpen(false);
                    }}
                    className="whitespace-nowrap rounded-xl border border-ink bg-transparent px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-ink transition-all duration-200 hover:bg-ink hover:text-white"
                  >
                    Login
                  </button>
                  <Link
                    to="/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap rounded-full bg-ink px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lux transition-all duration-300 hover:bg-gold-500 hover:text-ink hover:animate-glow hover:-translate-y-0.5"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="lg:hidden grid h-10 w-10 place-items-center rounded-full bg-white border border-border text-ink hover:bg-gold-50 hover:border-gold-400 transition"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Explore Programs Mega Dropdown Panel */}
          <div
            className={cn(
              "absolute left-0 right-0 top-full z-30 origin-top overflow-hidden border-b border-border bg-white shadow-lux transition-all duration-200",
              isExploreOpen ? "max-h-[600px] scale-y-100 py-8 opacity-100" : "pointer-events-none max-h-0 scale-y-0 opacity-0"
            )}
          >
            {activeExploreColumns.length === 0 ? (
              <div className="py-4 text-center text-xs font-medium text-muted">
                No active programs available.
              </div>
            ) : (
              <div className={cn("mx-auto grid max-w-content gap-8 px-6 text-ink", gridColsClass)}>
                {activeExploreColumns.map((cat, idx) => (
                  <div key={idx} className="flex flex-col">
                    <h4 className="mb-3 flex items-center gap-1.5 border-b border-border pb-2 text-xs font-extrabold uppercase tracking-widest text-ink">
                      <Sparkles size={12} className="text-gold-500" />
                      {cat.title}
                    </h4>
                    <ul className="space-y-2">
                      {cat.items.map((item, itemIdx) => (
                        <li key={itemIdx}>
                          <Link
                            to={item.to}
                            onClick={() => setIsExploreOpen(false)}
                            className="block py-0.5 text-[13px] font-medium text-muted transition-colors hover:text-gold-600 hover:underline"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE NAVIGATION SIDEBAR */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs transition-opacity duration-300 pointer-events-none opacity-0 lg:hidden",
          isMobileMenuOpen && "pointer-events-auto opacity-100"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      {/* Sidebar container */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-xs flex-col overflow-y-auto border-l border-border bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <span className="font-display text-lg font-bold text-ink">Menu</span>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="rounded-lg p-2 text-muted transition hover:bg-gold-50 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <nav className="space-y-4 flex-1">
            <NavLink
              to="/courses"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => cn("block text-lg font-semibold", isActive ? "text-gold-600" : "text-ink")}
            >
              Courses
            </NavLink>
            <NavLink
              to="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => cn("block text-lg font-semibold", isActive ? "text-gold-600" : "text-ink")}
            >
              About
            </NavLink>
            {user && (
              <NavLink
                to={homeForRole(user.role)}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-lg font-semibold text-ink hover:text-gold-600"
              >
                My Dashboard
              </NavLink>
            )}
          </nav>

          <div className="mt-8 border-t border-border pt-8">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-bold uppercase text-white">
                      {user.name ? user.name.slice(0, 2) : user.email.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-ink">{user.name || user.email.split("@")[0]}</div>
                    <div className="text-xs text-muted">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 font-semibold text-ink hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                >
                  <LogOut size={18} />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsLoginOpen(true);
                  }}
                  className="w-full rounded-xl border border-ink py-3 font-semibold uppercase tracking-widest text-ink transition hover:bg-ink hover:text-white"
                >
                  Login
                </button>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex w-full justify-center rounded-xl bg-ink py-3 font-semibold uppercase tracking-widest text-white shadow-lux transition hover:bg-gold-500 hover:text-ink"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LOGIN SIDEBAR */}
      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs transition-opacity duration-300 pointer-events-none opacity-0",
          isLoginOpen && "pointer-events-auto opacity-100"
        )}
        onClick={() => setIsLoginOpen(false)}
      />
      {/* Sidebar container */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col justify-between border-l border-border bg-white shadow-2xl transition-transform duration-300 ease-in-out",
          isLoginOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="overflow-y-auto p-6">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">Welcome back</h3>
            <button
              onClick={() => setIsLoginOpen(false)}
              className="rounded-lg p-1 text-muted transition hover:bg-gold-50 hover:text-ink"
            >
              <X size={20} />
            </button>
          </div>

          {!configured && (
            <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-100">
              Firebase isn't configured. Add keys to enable login.
            </div>
          )}

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loginBusy || !configured}
            className="mb-6 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border bg-white font-bold text-ink shadow-card transition-all duration-200 hover:bg-gold-50 hover:border-gold-400 active:bg-gold-100 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.5a5.99 5.99 0 0 1 5.99-6.015c1.472 0 2.812.54 3.854 1.43l3.125-3.124A10.15 10.15 0 0 0 13.99 2 10.2 10.2 0 0 0 3.75 12.2a10.2 10.2 0 0 0 10.24 10.2 10.02 10.02 0 0 0 9.875-8.232c.114-.648.135-1.314.135-1.883H12.24Z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-faint">
            <div className="h-px flex-1 bg-border" />
            <span className="font-semibold uppercase tracking-wider">or login with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Email Address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            {loginErr && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-100">
                <AlertCircle size={18} className="shrink-0" />
                <span>{loginErr}</span>
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full rounded-xl font-bold shadow-soft transition-all duration-300"
              disabled={loginBusy || !configured}
            >
              {loginBusy ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border bg-canvas p-6">
          <p className="text-center text-sm text-muted">New to Luxaar Institute?</p>
          <Link
            to="/signup"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsLoginOpen(false)}
            className="mt-2.5 inline-flex h-11 w-full items-center justify-center rounded-xl border border-ink bg-white font-bold text-ink shadow-card transition-all duration-200 hover:bg-ink hover:text-white"
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* PROFILE SIDEBAR */}
      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs transition-opacity duration-300 pointer-events-none opacity-0",
          isProfileOpen && "pointer-events-auto opacity-100"
        )}
        onClick={() => setIsProfileOpen(false)}
      />
      {/* Sidebar container */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col justify-between border-l border-border bg-white shadow-2xl transition-transform duration-300 ease-in-out",
          isProfileOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-1 flex-col p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-end">
            <button
              onClick={() => setIsProfileOpen(false)}
              className="rounded-lg p-1 text-muted transition hover:bg-gold-50 hover:text-ink"
            >
              <X size={20} />
            </button>
          </div>

          {/* User profile info card */}
          {user && (
            <div className="mb-6 flex flex-col items-center border-b border-border pb-6 text-center">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="mb-3 h-20 w-20 rounded-full border-2 border-gold-400 object-cover p-0.5 shadow-soft" />
              ) : (
                <div className="mb-3 grid h-20 w-20 place-items-center rounded-full bg-ink text-2xl font-extrabold uppercase text-white shadow-soft">
                  {user.name ? user.name.slice(0, 2) : user.email.slice(0, 2)}
                </div>
              )}
              <h4 className="font-display text-lg font-extrabold tracking-tight text-ink">{user.name || user.email.split("@")[0]}</h4>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          )}

          {/* Nav List */}
          {user && (
            <nav className="flex-1 space-y-2">
              <Link
                to={homeForRole(user.role)}
                onClick={() => setIsProfileOpen(false)}
                className="group flex items-center justify-between rounded-xl border border-border bg-canvas/40 p-3.5 text-ink transition-all duration-200 hover:border-gold-400 hover:bg-gold-50"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={18} className="text-gold-600" />
                  <span className="text-sm font-semibold">My Dashboard</span>
                </div>
                <ChevronRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-gold-600" />
              </Link>


              <Link
                to="/student/courses"
                onClick={() => setIsProfileOpen(false)}
                className="group flex items-center justify-between rounded-xl border border-border bg-canvas/40 p-3.5 text-ink transition-all duration-200 hover:border-gold-400 hover:bg-gold-50"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-gold-600" />
                  <span className="text-sm font-semibold">My Courses</span>
                </div>
                <ChevronRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-gold-600" />
              </Link>
            </nav>
          )}
        </div>

        {/* Log Out button at the bottom */}
        {user && (
          <div className="border-t border-border bg-canvas p-6">
            <button
              onClick={handleLogout}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-red-200 bg-red-50 font-bold text-red-700 shadow-card transition duration-200 hover:border-red-300 hover:bg-red-100"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        )}
      </div>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function Footer() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/site/newsletter", { method: "POST", body: JSON.stringify({ email }) }).catch(() => {});
    setDone(true);
  };

  const linkCols = [
    { h: "Quick Links", items: [["Courses", "/courses"], ["About Us", "/about"]] },
    { h: "Exams", items: [["TNPSC AE Civil", "/courses?exam=TNPSC%20AE%20Civil"], ["UPSC", "/courses?exam=UPSC"], ["Banking", "/courses?exam=Banking"], ["GATE (Civil)", "/courses?exam=GATE%20(Civil)"], ["NEET", "/courses?exam=NEET"]] },
  ];
  return (
    <footer className="bg-ink pb-10 pt-16 text-white border-t border-white/10">
      <div className="mx-auto max-w-content px-6 lg:px-10">
        {/* Newsletter band */}
        <div className="mb-14 grid items-center gap-6 rounded-3xl bg-neutral-900 border border-white/10 p-8 shadow-lux md:grid-cols-2 md:p-10 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl"></div>
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-white">Subscribe to our newsletter</h3>
            <p className="mt-1 text-white/65">Weekly current affairs, exam updates and new course drops.</p>
          </div>
          {done ? (
            <p className="font-bold text-white">Subscribed! Thank you for joining.</p>
          ) : (
            <form onSubmit={subscribe} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-12 flex-grow rounded-xl border border-white/20 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-gold-500 focus:bg-white/10 focus:ring-4 focus:ring-gold-500/20"
              />
              <button type="submit" className="h-12 rounded-xl bg-gold-500 px-8 text-xs font-semibold uppercase tracking-widest text-white transition-all duration-200 hover:bg-gold-300 hover:text-ink">Subscribe</button>
            </form>
          )}
        </div>

        {/* Columns */}
        <div className="mb-12 grid grid-cols-2 gap-10 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/luxaar.png" alt="Luxaar Institute" className="h-10 w-10 object-cover ring-1 ring-white/20 rounded-xl" />
              <div className="font-display text-2xl font-extrabold tracking-tighter text-white">Luxaar Institute</div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              © {new Date().getFullYear()} Luxaar Institute. India's focused platform for competitive exam preparation — education that inspires every aspirant.
            </p>
            <div className="mt-5 flex gap-4">
              {[Globe, Share2, AtSign].map((Icon, i) => (
                <span key={i} className="cursor-pointer text-white/50 transition hover:text-gold-400">
                  <Icon size={18} />
                </span>
              ))}
            </div>
          </div>
          {linkCols.map((col) => (
            <div key={col.h}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gold-400">{col.h}</h4>
              <ul className="mt-5 space-y-3 text-sm">
                {col.items.map(([label, to]) => (
                  <li key={label}><Link to={to} className="text-white/60 underline-offset-4 transition hover:text-gold-400 hover:underline hover:decoration-2">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gold-400">Contact</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/60">
              <li className="flex items-center gap-2"><Mail size={16} className="shrink-0 text-gold-400" /> <a href="mailto:luxaarinstitute@gmail.com" className="transition hover:text-gold-400">luxaarinstitute@gmail.com</a></li>
              <li className="flex items-center gap-2"><Phone size={16} className="shrink-0 text-gold-400" /> <a href="tel:+919443472954" className="transition hover:text-gold-400">+91 9443472954</a></li>
              <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-gold-400" /> <span>Kanyakumari, Tamilnadu</span></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-white/40">© {new Date().getFullYear()} Luxaar Institute. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
            <Link to="/privacy" className="underline-offset-4 hover:text-white hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="underline-offset-4 hover:text-white hover:underline">Terms of Service</Link>
            <Link to="/refund-policy" className="underline-offset-4 hover:text-white hover:underline">Refund Policy</Link>
            <Link to="/contact" className="underline-offset-4 hover:text-white hover:underline">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
