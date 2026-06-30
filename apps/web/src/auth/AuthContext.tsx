import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, firebaseConfigured } from "../lib/firebase";
import { api, setToken } from "../lib/api";
import type { MeUser } from "@luxar/shared";

interface AuthState {
  user: MeUser | null;
  loading: boolean;
  configured: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

// Cache the last-known user so the app stays usable offline (e.g. to play
// downloaded lessons) when the backend session can't be re-verified.
const CACHE_KEY = "luxar_user";
function loadCachedUser(): MeUser | null {
  try { const v = localStorage.getItem(CACHE_KEY); return v ? (JSON.parse(v) as MeUser) : null; }
  catch { return null; }
}
function cacheUser(u: MeUser | null) {
  try { u ? localStorage.setItem(CACHE_KEY, JSON.stringify(u)) : localStorage.removeItem(CACHE_KEY); }
  catch { /* ignore quota/privacy errors */ }
}

// Exchange the current Firebase ID token for a backend session + MeUser.
async function establishSession(): Promise<MeUser> {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("no firebase user");
  const idToken = await fbUser.getIdToken(true);
  const { user, token } = await api<{ user: MeUser; token: string }>("/auth/session", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
  setToken(token); // Bearer token for cross-domain API calls
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hydrate from cache immediately so a returning user is "logged in" even before
  // (or without) a network round-trip.
  const [user, setUserState] = useState<MeUser | null>(() => loadCachedUser());
  const [loading, setLoading] = useState(true);

  const setUser = (u: MeUser | null) => { setUserState(u); cacheUser(u); };

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    // When Firebase auth state resolves, establish a backend session.
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          // Offline: Firebase may report no user transiently — keep the cached
          // session instead of forcing a logout. Online: a real sign-out.
          if (navigator.onLine) setUser(null);
          return;
        }
        if (!navigator.onLine) {
          // Offline with a persisted Firebase user → trust the cached session
          // so downloaded content stays accessible.
          const cached = loadCachedUser();
          if (cached) setUserState(cached);
          return;
        }
        setUser(await establishSession());
      } catch {
        // Network failure ⇒ keep cached user (offline mode). Otherwise log out.
        const cached = loadCachedUser();
        if (!navigator.onLine && cached) setUserState(cached);
        else setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    // Popup sign-in. The same-origin-allow-popups COOP header (vite.config)
    // lets the popup close and communicate back to the app.
    await signInWithPopup(auth, googleProvider);
    setUser(await establishSession());
  };
  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    setUser(await establishSession());
  };
  const signupWithEmail = async (email: string, password: string, name?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (name && userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
    }
    setUser(await establishSession());
  };
  const logout = async () => {
    await signOut(auth).catch(() => {});
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        configured: firebaseConfigured,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Default landing route per role. */
export function homeForRole(role: MeUser["role"]) {
  return role === "admin" ? "/admin" : role === "trainer" ? "/trainer" : "/student";
}
