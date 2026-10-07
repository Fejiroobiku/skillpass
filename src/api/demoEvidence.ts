/**
 * Demo mode only. For people with no camera (a supervisor reviewing on a laptop, say), these build a real image or
 * a short real video from a sample photo, so it goes through exactly the same upload checks as camera evidence.
 * The server marks it source=demo and refuses it unless ALLOW_DEMO_EVIDENCE is switched on.
 */
export const lastDemo: {blob: Blob | null;kind: 'photo' | 'video';} = { blob: null, kind: 'photo' };

const loadImage = (url: string) =>
new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Could not load the sample photo for the demo.'));
  img.src = url;
});

/** A sample photo stamped with the time and a random tag, so every demo photo is a different file. */
export async function demoPhoto(sampleUrl: string, label: string): Promise<Blob> {
  const img = await loadImage(sampleUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || 800;
  canvas.height = img.naturalHeight || 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot create the demo photo.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, canvas.height - 44, canvas.width, 44);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`${new Date().toLocaleString('en-GB')} · DEMO · ${label} · ${Math.random().toString(36).slice(2, 8)}`, 14, canvas.height - 16);
  return new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Could not create the demo photo.')), 'image/jpeg', 0.85));
}

/** A short video of the sample photo with the challenge code drawn on it, recorded from a canvas. */
export async function demoVideo(sampleUrl: string, code: string, seconds = 5): Promise<Blob> {
  const canvas = document.createElement('canvas');
  if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
    throw new Error('Demo video needs a browser that can record from a canvas, such as Chrome, Edge or Firefox.');
  }
  const img = await loadImage(sampleUrl);
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot create the demo video.');

  const draw = (t: number) => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(16, 16, 190, 70);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 40px monospace';
    ctx.fillText(code, 28, 66);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`DEMO · ${new Date().toLocaleString('en-GB')} · ${(t / 1000).toFixed(1)}s`, 12, canvas.height - 12);
  };

  const recorder = new MediaRecorder(canvas.captureStream(10));
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const started = performance.now();
  draw(0);
  const timer = window.setInterval(() => draw(performance.now() - started), 100);
  return new Promise((resolve, reject) => {
    recorder.onerror = () => {window.clearInterval(timer);reject(new Error('Could not record the demo video.'));};
    recorder.onstop = () => {window.clearInterval(timer);resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));};
    recorder.start(250);
    window.setTimeout(() => recorder.stop(), seconds * 1000);
  });
}
