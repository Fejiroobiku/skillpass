import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CameraIcon, CameraOffIcon, CircleIcon, MapPinIcon, SquareIcon, XIcon } from 'lucide-react';
import type { Evidence, Place } from '../../types/skillpass';
import { hashBlob } from '../../utils/hash';
import { signPayload } from '../../utils/credentials';

interface CameraModalProps {
  mode: 'photo' | 'video' | null;
  code: string;
  workshop: Place;
  fallbackUrl: string;
  knownHashes: Set<string>;
  onCapture: (ev: Evidence) => void;
  onClose: () => void;
}

const MAX_SECONDS = 30;
const MIN_SECONDS = 5;

interface Loc {
  label: string;
  lat?: number;
  lng?: number;
}

export function CameraModal({ mode, code, workshop, fallbackUrl, knownHashes, onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [clock, setClock] = useState(new Date());
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mode) return;
    let cancelled = false;
    setReady(false);
    setError(null);
    setSeconds(0);
    setRecording(false);

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const stream = await navigator.mediaDevices.
        getUserMedia({ video: { facingMode: 'environment' }, audio: mode === 'video' }).
        catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        if (!cancelled) setError('Camera is not available here. On a phone, SkillPass opens the rear camera directly.');
      }
    };
    start();

    const fallback = { label: `${workshop.name} (workshop)`, lat: workshop.lat, lng: workshop.lng };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => !cancelled && setLoc({ label: `${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`, lat: p.coords.latitude, lng: p.coords.longitude }),
        () => !cancelled && setLoc(fallback),
        { timeout: 5000 }
      );
    } else setLoc(fallback);

    const tick = window.setInterval(() => setClock(new Date()), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
      recorderRef.current?.state === 'recording' && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode, workshop]);

  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);

  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) recorderRef.current?.stop();
  }, [recording, seconds]);

  const location = loc ?? { label: 'Locating…' };

  const snapshot = (): Promise<{blob: Blob;url: string;} | null> =>
  new Promise((resolve) => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return resolve(null);
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(null);
    ctx.drawImage(v, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - 44, canvas.width, 44);
    ctx.fillStyle = '#fff';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText(`${new Date().toLocaleString('en-GB')} · ${location.label}`, 14, canvas.height - 16);
    canvas.toBlob((blob) => resolve(blob ? { blob, url: URL.createObjectURL(blob) } : null), 'image/jpeg', 0.85);
  });

  const takePhoto = async () => {
    setBusy(true);
    const shot = await snapshot();
    if (shot) {
      onCapture({ id: `ev-${Date.now()}`, kind: 'photo', url: shot.url, caption: 'Live photo of finished work', capturedAt: new Date().toISOString(), locationLabel: location.label, lat: location.lat, lng: location.lng, hash: await hashBlob(shot.blob), source: 'camera' });
      onClose();
    }
    setBusy(false);
  };

  const startRecording = async () => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === 'undefined') return setError('Video recording is not supported on this browser.');
    const poster = await snapshot();
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      setRecording(false);
      const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' });
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      onCapture({ id: `ev-${Date.now()}`, kind: 'video', url: URL.createObjectURL(blob), poster: poster?.url, caption: 'Live video of apprentice performing the task', capturedAt: new Date().toISOString(), locationLabel: location.label, lat: location.lat, lng: location.lng, hash: await hashBlob(blob), challengeCode: code, durationSec: duration, source: 'camera' });
      onClose();
    };
    setSeconds(0);
    rec.start(500);
    setRecording(true);
  };

  const demoCapture = (reuse = false) => {
    const existing = Array.from(knownHashes)[0];
    onCapture({
      id: `ev-demo-${Date.now()}`,
      kind: mode === 'video' ? 'video' : 'photo',
      url: fallbackUrl,
      poster: fallbackUrl,
      caption: reuse ? 'Re-used file (duplicate test)' : mode === 'video' ? 'Live video of apprentice performing the task' : 'Live photo of finished work',
      capturedAt: new Date().toISOString(),
      locationLabel: location.label === 'Locating…' ? `${workshop.name} (workshop)` : location.label,
      lat: location.lat ?? workshop.lat,
      lng: location.lng ?? workshop.lng,
      hash: reuse && existing ? existing : signPayload(`${Date.now()}|${Math.random()}`) + signPayload(String(Math.random())),
      challengeCode: mode === 'video' ? code : undefined,
      durationSec: mode === 'video' ? 18 : undefined,
      source: 'demo'
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {mode &&
      <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'video' ? 'Record video evidence' : 'Take photo evidence'}
          className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-ink text-white sm:rounded-3xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}>
          
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold">{mode === 'video' ? 'Record task video' : 'Take photo'} · in-app camera</p>
              <button type="button" onClick={onClose} aria-label="Close camera" className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><XIcon className="h-5 w-5" /></button>
            </div>

            <div className="relative aspect-[3/4] w-full bg-black sm:aspect-video">
              <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${ready ? '' : 'invisible'}`} />
              {!ready && !error && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Opening camera…</p>}
              {error &&
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <CameraOffIcon className="h-8 w-8 text-white/60" />
                  <p className="text-sm text-white/80">{error}</p>
                </div>
            }
              {mode === 'video' &&
            <div className="absolute left-3 top-3 rounded-xl bg-white px-3 py-2 text-ink">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Show this code first</p>
                  <p className="font-mono text-2xl font-semibold tracking-[0.2em]">{code}</p>
                </div>
            }
              {recording &&
            <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-bad-600 px-2.5 py-1 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-white" /> {seconds}s / {MAX_SECONDS}s
                </span>
            }
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/50 px-3 py-2 text-xs">
                <span>{clock.toLocaleString('en-GB')}</span>
                <span className="flex min-w-0 items-center gap-1 truncate"><MapPinIcon className="h-3.5 w-3.5 shrink-0" />{location.label}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 px-4 py-5">
              {ready && mode === 'photo' &&
            <button type="button" onClick={takePhoto} disabled={busy} aria-label="Capture photo" className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink transition-transform duration-100 active:scale-95 disabled:opacity-50">
                  <CameraIcon className="h-7 w-7" />
                </button>
            }
              {ready && mode === 'video' && !recording &&
            <button type="button" onClick={startRecording} aria-label="Start recording" className="flex h-16 w-16 items-center justify-center rounded-full bg-white transition-transform duration-100 active:scale-95">
                  <CircleIcon className="h-8 w-8 fill-bad-600 text-bad-600" />
                </button>
            }
              {recording &&
            <button type="button" onClick={() => recorderRef.current?.stop()} disabled={seconds < MIN_SECONDS} aria-label="Stop recording" className="flex h-16 w-16 items-center justify-center rounded-full bg-white transition-transform duration-100 active:scale-95 disabled:opacity-50">
                  <SquareIcon className="h-6 w-6 fill-bad-600 text-bad-600" />
                </button>
            }
              <p className="text-center text-xs text-white/60">
                {mode === 'video' ? `Hold the code to the camera, then film the apprentice doing the task (${MIN_SECONDS}–${MAX_SECONDS}s).` : 'Photos are stamped with time and location. Gallery uploads are disabled.'}
              </p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-xs">
                <button type="button" onClick={() => demoCapture(false)} className="font-medium text-brand-200 hover:underline">Use demo capture</button>
                <button type="button" onClick={() => demoCapture(true)} className="font-medium text-white/50 hover:underline">Demo: re-used file</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}