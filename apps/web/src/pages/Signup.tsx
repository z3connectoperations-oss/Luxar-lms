import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Sparkles, User, BookOpen, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth, homeForRole } from "../auth/AuthContext";
import { Button, Input } from "../components/ui";

export default function Signup() {
  const { user, loading, configured, loginWithGoogle, signupWithEmail } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // If already logged in, go to role home
  if (!loading && user) return <Navigate to={homeForRole(user.role)} replace />;

  const handleValidateEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      setErr("Please enter your email address first");
      return;
    }
    setErr("");
    setOtpLoading(true);
    setTimeout(() => {
      setOtpLoading(false);
      setOtpSent(true);
      setSuccessMsg("A validation OTP has been simulated and sent to your email!");
    }, 800);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");
    
    if (!name.trim()) {
      setErr("Full Name is required");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setErr("Password should be at least 6 characters");
      return;
    }

    setBusy(true);
    try {
      await signupWithEmail(email, password, name);
    } catch (e: any) {
      setErr(e?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr("");
    setSuccessMsg("");
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      setErr(e?.message || "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-gold-200">
      {/* Top Header */}
      <header className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/luxaar.png" alt="Luxaar Institute" className="h-11 w-11 rounded-xl object-cover shadow-soft ring-1 ring-ink/10" />
          <span className="font-display text-xl font-bold tracking-tight text-ink">Luxaar Institute</span>
        </Link>
        <div className="text-sm">
          <span className="text-muted">Already have an account? </span>
          <Link to="/" className="font-semibold text-gold-700 hover:text-gold-600 transition-colors">
            Log in
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-12 shadow-card">
          <h1 className="text-3xl font-extrabold text-ink tracking-tight mb-2">Create Account</h1>
          {/* Gold accent line */}
          <div className="mb-1 h-0.5 w-12 rounded-full bg-gold-500" />
          <p className="text-sm text-muted mb-8">Join Luxaar Institute to start your learning journey and prepare for excellence.</p>

          {!configured && (
            <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
              Firebase isn't configured. Add keys to <code>apps/web/.env.local</code> to enable registration.
            </div>
          )}



          <form onSubmit={submit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Full Name</label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            {/* Email ID with Validation Button */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Email ID</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl flex-1"
                />
                <button
                  type="button"
                  onClick={handleValidateEmail}
                  disabled={otpLoading}
                  className="px-4 py-2 border border-gold-400 text-sm font-semibold rounded-xl text-ink bg-white hover:bg-gold-50 active:bg-gold-100 transition-all duration-200 disabled:opacity-50"
                >
                  {otpLoading ? "Sending..." : "Validate Email"}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted">A validation OTP will be simulated and sent to your email ID.</p>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Password</label>
              <Input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-100">
                <AlertCircle size={18} className="shrink-0" />
                <span>{err}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
                <CheckCircle size={18} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <p className="text-xs text-muted">
              By creating your account, you accept Luxaar Institute{" "}
              <Link to="/about" className="text-gold-700 font-semibold underline hover:text-gold-600">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link to="/about" className="text-gold-700 font-semibold underline hover:text-gold-600">
                Privacy Policy
              </Link>
              .
            </p>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-bold shadow-soft transition-all duration-300"
              disabled={busy || !configured}
            >
              {busy ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="my-8 flex items-center gap-3 text-xs text-faint">
            <div className="h-px flex-1 bg-border" />
            <span className="font-semibold uppercase tracking-wider">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google Sign Up */}
          <button
            onClick={google}
            disabled={busy || !configured}
            className="flex w-full h-11 items-center justify-center gap-3 rounded-xl border border-border bg-white font-bold text-ink hover:bg-gold-50 hover:border-gold-400 active:bg-gold-100 transition-all duration-200 shadow-card disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.5a5.99 5.99 0 0 1 5.99-6.015c1.472 0 2.812.54 3.854 1.43l3.125-3.124A10.15 10.15 0 0 0 13.99 2 10.2 10.2 0 0 0 3.75 12.2a10.2 10.2 0 0 0 10.24 10.2 10.02 10.02 0 0 0 9.875-8.232c.114-.648.135-1.314.135-1.883H12.24Z"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      </main>
    </div>
  );
}
