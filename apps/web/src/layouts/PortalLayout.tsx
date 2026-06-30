import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap, LayoutDashboard, BookOpen, CalendarDays, ClipboardCheck,
  Award, Users, Mic, ShoppingBag, MessageSquare, Globe, Download,
  Bell, LogOut, LayoutGrid, Menu, X, type LucideIcon,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { cn } from "../lib/cn";

type Item = { label: string; to: string; icon: LucideIcon };

const NAV: Record<string, Item[]> = {
  student: [
    { label: "Dashboard", to: "/student", icon: LayoutDashboard },
    { label: "My Courses", to: "/student/courses", icon: BookOpen },
    { label: "Downloads", to: "/student/downloads", icon: Download },
    { label: "Schedule", to: "/student/schedule", icon: CalendarDays },
    { label: "Purchases", to: "/student/purchases", icon: ShoppingBag },
  ],
  trainer: [
    { label: "Dashboard", to: "/trainer", icon: LayoutDashboard },
    { label: "My Courses", to: "/trainer/courses", icon: BookOpen },
    { label: "Schedule", to: "/trainer/schedule", icon: CalendarDays },
    { label: "Doubts", to: "/trainer/doubts", icon: MessageSquare },
    { label: "Evaluations", to: "/trainer/evaluations", icon: ClipboardCheck },
    { label: "Mentorship", to: "/trainer/mentorship", icon: Users },
    { label: "Interviews", to: "/trainer/interviews", icon: Mic },
  ],
  admin: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Categories", to: "/admin/categories", icon: LayoutGrid },
    { label: "Courses", to: "/admin/courses", icon: BookOpen },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Enrolled Courses", to: "/admin/enrollments", icon: GraduationCap },
    { label: "Website (CMS)", to: "/admin/cms", icon: Globe },
  ],
};

const SCOPE_LABEL = { student: "Student", trainer: "Trainer", admin: "Admin" };

export default function PortalLayout({ scope }: { scope: "student" | "trainer" | "admin" }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Offline: only the Downloads page works without a network, so show only it.
  const items = online ? NAV[scope] : NAV[scope].filter((it) => it.to === "/student/downloads");

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // While offline, keep students on the Downloads page (the only thing that works).
  useEffect(() => {
    if (!online && scope === "student" && loc.pathname !== "/student/downloads") {
      navigate("/student/downloads", { replace: true });
    }
  }, [online, scope, loc.pathname, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    if (!online) return;
    api<{ notifications: { read: boolean }[] }>("/me/notifications")
      .then((d) => setUnread(d.notifications.filter((n) => !n.read).length))
      .catch(() => {});
  }, [loc.pathname, online]);

  const initials = (user?.name || "U").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  // Student Page gets the horizontal top navbar
  if (scope === "student") {
    return (
      <div className="flex h-full flex-col bg-canvas">
        {/* White top nav with minimal shadow */}
        <header className="sticky top-0 z-30 border-b border-border bg-white shadow-card">
          <div className="mx-auto flex h-14 max-w-content items-center gap-5 px-5">
            {/* Brand */}
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <img src="/luxaar.png" alt="Luxaar Institute" className="h-8 w-8 rounded-lg object-cover ring-1 ring-ink/10" />
              <span className="font-display text-base font-bold text-ink">Luxaar Institute</span>
              {!online && (
                <span className="hidden text-[11px] text-faint sm:inline">Offline</span>
              )}
            </Link>

            {/* Nav links */}
            <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
              {items.map((it) => {
                const active = loc.pathname === it.to || (it.to !== `/${scope}` && loc.pathname.startsWith(it.to));
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={cn(
                      "shrink-0 border-b-2 px-2.5 py-1.5 text-sm transition-all duration-200",
                      active ? "border-gold-500 font-medium text-ink" : "border-transparent text-muted hover:text-ink hover:border-gold-300"
                    )}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right */}
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to={`/${scope}/notifications`}
                className="relative grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-gold-50 hover:text-ink"
              >
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute right-0.5 top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-gold-500 px-1 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-semibold text-white">{initials}</span>
              <div className="hidden leading-tight md:block">
                <div className="text-xs font-semibold text-ink">{user?.name}</div>
                <div className="text-[11px] capitalize text-muted">{user?.role}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-gold-50 hover:text-ink"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="scroll-thin flex-1 overflow-auto">
          <div className="mx-auto max-w-content px-5 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  // Admin & Trainer Pages get the dark vertical sidebar layout
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      {/* Desktop Sidebar — Dark Black */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar shrink-0 h-full">
        {/* Logo/Brand Section */}
        <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-5 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <img src="/luxaar.png" alt="Luxaar Institute" className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/20" />
            <span className="font-display text-base font-bold text-white">Luxaar Institute</span>
          </Link>
          <span className="text-[10px] font-semibold text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded-full capitalize">
            {scope}
          </span>
          {!online && (
            <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/20 px-1.5 py-0.5 rounded">
              Offline
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scroll-thin">
          {items.map((it) => {
            const active = loc.pathname === it.to || (it.to !== `/${scope}` && loc.pathname.startsWith(it.to));
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 font-medium",
                  active
                    ? "bg-gold-500/15 text-gold-400 font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={18} className={active ? "text-gold-500" : "text-gray-500"} />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Profile section at bottom */}
        <div className="border-t border-white/10 p-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-600 text-xs font-semibold text-white shrink-0">
                {initials}
              </span>
              <div className="leading-tight overflow-hidden">
                <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
                <div className="text-[10px] capitalize text-gray-500">{user?.role}</div>
              </div>
            </div>

            <Link
              to={`/${scope}/notifications`}
              className="relative grid h-8 w-8 place-items-center rounded-md text-gray-400 transition hover:bg-white/5 hover:text-white"
              title="Notifications"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-gold-500 px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
          >
            <LogOut size={14} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Right Container */}
      <div className="flex flex-1 flex-col overflow-hidden h-full">
        {/* Mobile Header */}
        <header className="md:hidden flex h-14 items-center justify-between border-b border-border bg-white shadow-card px-5 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-gold-50 hover:text-ink"
              title="Open Menu"
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <img src="/luxaar.png" alt="Luxaar Institute" className="h-8 w-8 rounded-lg object-cover ring-1 ring-ink/10" />
              <span className="font-display text-base font-bold text-ink">Luxaar Institute</span>
            </Link>
            <span className="text-[10px] font-semibold text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full capitalize">
              {scope}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/${scope}/notifications`}
              className="relative grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-gold-50 hover:text-ink"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-gold-500 px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-semibold text-white">
              {initials}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="scroll-thin flex-1 overflow-auto bg-canvas">
          <div className="mx-auto max-w-content px-5 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Panel — Dark */}
          <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-sidebar h-full">
            {/* Close Button & Brand */}
            <div className="flex h-14 items-center justify-between px-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <img src="/luxaar.png" alt="Luxaar Institute" className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/20" />
                <span className="font-display text-base font-bold text-white">Luxaar Institute</span>
                <span className="text-[10px] font-semibold text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded-full capitalize">
                  {scope}
                </span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1 scroll-thin">
              {items.map((it) => {
                const active = loc.pathname === it.to || (it.to !== `/${scope}` && loc.pathname.startsWith(it.to));
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setIsMobileOpen(false)} // Close sidebar when navigating
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 font-medium",
                      active
                        ? "bg-gold-500/15 text-gold-400 font-semibold"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon size={18} className={active ? "text-gold-500" : "text-gray-500"} />
                    <span>{it.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer Profile */}
            <div className="border-t border-white/10 p-4 shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden mb-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-600 text-xs font-semibold text-white shrink-0">
                  {initials}
                </span>
                <div className="leading-tight overflow-hidden">
                  <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
                  <div className="text-[10px] capitalize text-gray-500">{user?.role}</div>
                </div>
              </div>
              <button
                onClick={async () => {
                  setIsMobileOpen(false);
                  await handleLogout();
                }}
                className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
              >
                <LogOut size={14} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
