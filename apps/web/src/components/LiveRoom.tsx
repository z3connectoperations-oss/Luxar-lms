import { useCallback, useEffect, useRef, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { api, authHeaders, BASE } from "../lib/api";
import { Button, Card } from "./ui";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "wss://luxar-7we11ih0.livekit.cloud";

type RecState = "idle" | "recording" | "saving";

/**
 * Host recording bar. Uses the browser's native screen-capture (getDisplayMedia) +
 * microphone, mixed together, so it reliably records the REAL screen the host picks
 * (slides, document, etc.) and the host's voice — independent of LiveKit track timing.
 * On stop / class-end it uploads to R2 and attaches the recording to the session's
 * module as a titled video lesson. Requires one click + a screen-pick to start
 * (browsers don't allow silent screen capture).
 */
function useHostRecorder(sessionId: string) {
  const [state, setState] = useState<RecState>("idle");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cleanupRef = useRef<() => void>(() => {});

  const stopAndSave = useCallback(async () => {
    const rec = recRef.current;
    if (!rec || rec.state === "inactive") return;
    setState("saving");
    await new Promise<void>((resolve) => { rec.onstop = () => resolve(); rec.stop(); });
    cleanupRef.current();
    cleanupRef.current = () => {};
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    chunksRef.current = [];
    recRef.current = null;
    if (blob.size > 2048) {
      try {
        const res = await fetch(`${BASE}/admin/upload?folder=recordings&filename=class-${sessionId}.webm`, {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "video/webm", ...authHeaders() }, body: blob,
        });
        const { key } = await res.json();
        await api(`/trainer/live/${sessionId}/recording`, { method: "POST", body: JSON.stringify({ r2Key: key }) });
      } catch { /* upload failed */ }
    }
    setState("idle");
  }, [sessionId]);

  const start = useCallback(async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      alert("Screen recording isn't supported in this browser.");
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 24 }, audio: true });
      let mic: MediaStream | null = null;
      try { mic = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { /* no mic */ }

      // Mix system audio (from the shared screen) + microphone into one track.
      const ac = new AudioContext();
      const dest = ac.createMediaStreamDestination();
      if (display.getAudioTracks().length) ac.createMediaStreamSource(display).connect(dest);
      if (mic && mic.getAudioTracks().length) ac.createMediaStreamSource(mic).connect(dest);
      const audioTrack = dest.stream.getAudioTracks()[0];

      const tracks = [display.getVideoTracks()[0], audioTrack].filter(Boolean) as MediaStreamTrack[];
      const stream = new MediaStream(tracks);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.start(5000);
      recRef.current = rec;
      cleanupRef.current = () => {
        display.getTracks().forEach((t) => t.stop());
        mic?.getTracks().forEach((t) => t.stop());
        ac.close().catch(() => {});
      };
      // If the host clicks the browser's native "Stop sharing", finish the recording.
      display.getVideoTracks()[0].addEventListener("ended", () => { void stopAndSave(); });
      setState("recording");
    } catch { /* host cancelled the screen picker */ }
  }, [stopAndSave]);

  // Save automatically if the class ends (component unmounts) while still recording.
  useEffect(() => () => { if (recRef.current && recRef.current.state !== "inactive") void stopAndSave(); }, [stopAndSave]);

  return { state, start, stopAndSave };
}

function HostRecorderBar({ sessionId }: { sessionId: string }) {
  const { state, start, stopAndSave } = useHostRecorder(sessionId);
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <span className="text-muted">
        {state === "recording" ? <span className="font-semibold text-rose-600">● Recording the class…</span>
          : state === "saving" ? "Saving recording to the module…"
          : "Record this class to save it to the module (you'll pick the screen to capture)."}
      </span>
      {state === "recording"
        ? <Button size="sm" variant="outline" onClick={stopAndSave}>■ Stop & save</Button>
        : state === "saving"
          ? <span className="text-xs text-muted">Uploading…</span>
          : <Button size="sm" onClick={start}>● Record</Button>}
    </div>
  );
}

/**
 * Connects to a live LiveKit session. Fetches a join token from the API
 * (gated by enrollment), then renders the prebuilt conference UI.
 * Hosts (trainer/admin) join with camera+mic on; students start muted.
 */
export default function LiveRoom({ sessionId, onLeave }: { sessionId: string; onLeave: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ token: string; isHost: boolean }>("/live/token", { method: "POST", body: JSON.stringify({ sessionId }) })
      .then((d) => { setToken(d.token); setIsHost(d.isHost); })
      .catch((e) => setError(e.message || "Could not join the live class"));
  }, [sessionId]);

  if (error) {
    return (
      <Card className="text-center">
        <p className="text-red-700">{error}</p>
        {error.includes("not configured") && (
          <p className="mt-2 text-sm text-muted">Set LIVEKIT_API_KEY / LIVEKIT_API_SECRET as Worker secrets to enable live classes.</p>
        )}
        <Button className="mt-4" variant="outline" onClick={onLeave}>Back</Button>
      </Card>
    );
  }
  if (!token) return <div className="grid h-64 place-items-center text-muted">Connecting to live class…</div>;

  return (
    <div className="flex h-[78vh] flex-col">
      {isHost && <HostRecorderBar sessionId={sessionId} />}
      <div className="min-h-0 flex-1">
        <LiveKitRoom
          token={token}
          serverUrl={LIVEKIT_URL}
          connect
          video={isHost}
          audio={isHost}
          onDisconnected={onLeave}
          data-lk-theme="default"
          style={{ height: "100%", borderRadius: "0.875rem", overflow: "hidden" }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  );
}
