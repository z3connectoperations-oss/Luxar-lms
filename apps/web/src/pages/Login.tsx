import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth, homeForRole } from "../auth/AuthContext";
import { Button, Input } from "../components/ui";

export default function Login() {
  const { user, loading, configured, loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={homeForRole(user.role)} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (mode === "login") await loginWithEmail(email, password);
      else await signupWithEmail(email, password);
    } catch (e: any) {
      setErr(e?.message || "Authentication failed");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setErr(""); setBusy(true);
    try { await loginWithGoogle(); }
    catch (e: any) { setErr(e?.message || "Google sign-in failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — Dark Black */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <img src="/luxaar.png" alt="Luxaar Institute" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/20" />
          <span className="font-display text-xl font-bold tracking-tight">Luxaar <span className="text-gold-400">Institute</span></span>
        </Link>
        <div className="relative">
          <Sparkles size={24} className="mb-4 text-gold-400" />
          <h2 className="max-w-sm font-display text-3xl font-extrabold leading-tight tracking-tight">Learn. Practice. Get Certified.</h2>
          <p className="mt-3 max-w-sm text-white/55">Video courses, mock tests, live classes and 1:1 mentorship — all in one place.</p>
        </div>
        <p className="relative text-sm text-white/40">© {new Date().getFullYear()} Luxaar Institute</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/luxaar.png" alt="Luxaar Institute" className="h-10 w-10 rounded-xl object-cover ring-1 ring-ink/10" />
            <span className="font-display text-xl font-bold tracking-tight text-ink">Luxaar Institute</span>
          </Link>

          <h1 className="text-2xl font-bold text-ink">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          {/* Gold accent line */}
          <div className="mt-2 mb-1 h-0.5 w-12 rounded-full bg-gold-500" />
          <p className="mt-1 text-sm text-muted">{mode === "login" ? "Log in to continue learning." : "Sign up to enroll and start learning."}</p>

          {!configured && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-100">
              Firebase isn't configured. Add keys to <code>apps/web/.env.local</code> to enable login.
            </div>
          )}

          <Button className="mt-6 w-full" variant="outline" onClick={google} disabled={busy || !configured}>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-faint">
            <div className="h-px flex-1 bg-border" /> or use email <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <Input type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" name="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={busy || !configured}>
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
            </Button>
          </form>

          {err && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">{err}</div>}

          <button className="mt-5 w-full text-center text-sm font-bold text-gold-700 underline-offset-4 hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">The first account created becomes the admin.</p>
        </div>
      </div>
    </div>
  );
}
