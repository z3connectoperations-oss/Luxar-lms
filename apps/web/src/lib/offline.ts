// Offline lesson storage: downloads a lesson's file into IndexedDB and plays it back
// with no network. Used for lessons flagged `downloadable`. Each record stores the
// Blob plus lightweight metadata so the Downloads page can list items while offline.

const DB_NAME = "LuxarOffline";
const STORE = "lessons";

export interface SavedLessonMeta {
  lessonId: string;
  title: string;
  courseId: string;
  courseTitle: string;
  type: string;
  size: number;
  savedAt: number;
}
interface SavedRecord extends Omit<SavedLessonMeta, "lessonId"> {
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction([STORE], mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export async function isSaved(lessonId: string): Promise<boolean> {
  const v = await withStore<SavedRecord | undefined>("readonly", (s) => s.get(lessonId));
  return !!v;
}

/** Download the lesson file (auth cookie included) and store the Blob + metadata offline. */
export async function saveLesson(
  lessonId: string,
  fileUrl: string,
  meta: { title: string; courseId: string; courseTitle: string; type: string }
): Promise<void> {
  const { authHeaders } = await import("./api");
  const res = await fetch(fileUrl, { credentials: "include", headers: authHeaders() });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const record: SavedRecord = {
    blob, title: meta.title, courseId: meta.courseId, courseTitle: meta.courseTitle,
    type: meta.type, size: blob.size, savedAt: Date.now(),
  };
  await withStore("readwrite", (s) => s.put(record, lessonId));
}

/** Object URL for offline playback, or null if not saved. Handles legacy bare-Blob records. */
export async function getOfflineUrl(lessonId: string): Promise<string | null> {
  const rec = await withStore<unknown>("readonly", (s) => s.get(lessonId));
  if (!rec) return null;
  const blob = rec instanceof Blob ? rec : (rec as Partial<SavedRecord>).blob;
  return blob ? URL.createObjectURL(blob) : null;
}

/** List all downloaded lessons (metadata only) — works fully offline. Tolerates
 *  legacy records that were stored as a bare Blob (before metadata existed). */
export async function listSaved(): Promise<SavedLessonMeta[]> {
  const db = await openDB();
  return new Promise<SavedLessonMeta[]>((resolve, reject) => {
    const tx = db.transaction([STORE], "readonly");
    const store = tx.objectStore(STORE);
    const out: SavedLessonMeta[] = [];
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cur = cursorReq.result;
      if (cur) {
        const v = cur.value as unknown;
        const isBlob = v instanceof Blob;
        const r = (isBlob ? {} : v) as Partial<SavedRecord>;
        const blob = isBlob ? (v as Blob) : r.blob;
        out.push({
          lessonId: String(cur.key),
          title: r.title || "Saved lesson",
          courseId: r.courseId || "_legacy",
          courseTitle: r.courseTitle || "Saved lessons",
          type: r.type || "video",
          size: r.size ?? blob?.size ?? 0,
          savedAt: r.savedAt ?? 0,
        });
        cur.continue();
      } else {
        resolve(out.sort((a, b) => b.savedAt - a.savedAt));
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

export async function removeLesson(lessonId: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(lessonId));
}
