const BASE = import.meta.env.VITE_API_URL || "http://localhost:8787";

/**
 * Resolve a stored image reference to a displayable URL.
 * - Absolute URLs (http/https, e.g. seeded Unsplash links) are returned as-is.
 * - R2 object keys (e.g. "courses/uuid-file.png") are served via the API's /files route.
 */
export function mediaUrl(keyOrUrl: string | null | undefined): string | null {
  if (!keyOrUrl) return null;
  if (/^https?:\/\//.test(keyOrUrl)) return keyOrUrl;
  return `${BASE}/files/${keyOrUrl}`;
}
