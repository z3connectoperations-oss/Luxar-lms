export const BASE = import.meta.env.VITE_API_URL || "http://localhost:8787";
const TOKEN_KEY = "luxar_token";

/** Session token (also stored as a cookie, but Pages↔Worker are different domains
 *  so cross-site cookies are unreliable — we send it as a Bearer token instead). */
export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}
/** Auth headers for raw fetch() calls made outside the api() helper (uploads, etc.). */
export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
/** Tokenized URL for browser-loaded protected media (<video>/<iframe> can't set headers). */
export function lessonFileUrl(lessonId: string): string {
  const t = getToken();
  return `${BASE}/learn/lessons/${lessonId}/file${t ? `?token=${encodeURIComponent(t)}` : ""}`;
}

/** fetch wrapper: sends the Bearer token (and cookie) on every call. */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const { headers: initHeaders, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...rest,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(initHeaders || {}) },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as any)?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
