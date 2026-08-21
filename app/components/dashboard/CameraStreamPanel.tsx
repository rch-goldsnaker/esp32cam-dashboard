'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Maximize2, Minimize2, Download, Square } from 'lucide-react';
import { useESP32Store } from '@/app/store/esp32Store';
import { RES_MAP } from '@/app/lib/constants';

function getAspect(size: number): { w: number; h: number } {
  const res = RES_MAP[size] ?? '640x480';
  const [w, h] = res.split('x').map(Number);
  return { w, h };
}

interface Props {
  streaming: boolean;
  frameSize: number;
  quality: number;
}

export default function CameraStreamPanel({ streaming, frameSize, quality }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);
  const sseRef = useRef<EventSource | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fps, setFps] = useState(0);
  const [capturePreview, setCapturePreview] = useState<{ url: string; ts: number } | null>(null);
  const fpsCounter = useRef<{ frames: number; lastTime: number }>({ frames: 0, lastTime: 0 });
  const streamingRef = useRef(streaming);
  const [streamDismissed, setStreamDismissed] = useState(false);
  const [captureDismissed, setCaptureDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const recording = useESP32Store((s) => s.recording);
  const recordProgress = useESP32Store((s) => s.recordProgress);
  const recordedBlobUrl = useESP32Store((s) => s.recordedBlobUrl);
  const recordedAt = useESP32Store((s) => s.recordedAt);
  const stopRecording = useESP32Store((s) => s.stopRecording);
  const setRecordProgress = useESP32Store((s) => s.setRecordProgress);
  const setRecordedBlob = useESP32Store((s) => s.setRecordedBlob);
  const clearRecording = useESP32Store((s) => s.clearRecording);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordAutoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recordDismissed, setRecordDismissed] = useState(false);

  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  useEffect(() => {
    return () => {
      if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.src = '';
      }
    };
  }, []);

  const drawFrame = useCallback((base64: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!imgRef.current) imgRef.current = new Image();
    const img = imgRef.current;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      fpsCounter.current.frames++;
      const now = performance.now();
      if (now - fpsCounter.current.lastTime >= 1000) {
        setFps(fpsCounter.current.frames);
        fpsCounter.current = { frames: 0, lastTime: now };
      }
    };
    img.src = `data:image/jpeg;base64,${base64}`;
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryDelay = 1000;
    const MAX_DELAY = 10000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!mounted) return;
      const es = new EventSource('/api/stream/sse');
      sseRef.current = es;

      es.addEventListener('frame', (e) => {
        if (!streamingRef.current) return;
        drawFrame((e as MessageEvent).data);
      });

      es.addEventListener('connected', () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = 640;
          canvas.height = 480;
        }
      });

      es.addEventListener('capture', (e) => {
        try {
          const { b64, ts } = JSON.parse((e as MessageEvent).data) as { b64: string; ts: number };
          const url = `data:image/jpeg;base64,${b64}`;
          setCapturePreview({ url, ts });
          setCaptureDismissed(false);
          if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
          captureTimerRef.current = setTimeout(() => {
            setCapturePreview((current) => (current?.ts === ts ? null : current));
            captureTimerRef.current = null;
          }, 4000);
        } catch {}
      });

      es.onopen = () => {
        retryDelay = 1000;
      };

      es.onerror = () => {
        es.close();
        sseRef.current = null;
        if (!mounted) return;
        timer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
          connect();
        }, retryDelay);
      };
    }

    connect();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      sseRef.current?.close();
      sseRef.current = null;
    };
  }, [drawFrame]);

  useEffect(() => {
    if (streaming) return;
    cancelAnimationFrame(animRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 480;
    frameRef.current = 0;

    const draw = () => {
      frameRef.current++;
      const t = frameRef.current * 0.02;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);

      const barWidth = w / 7;
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
      for (let i = 0; i < 7; i++) {
        const offset = ((t * 30 + i * 20) % (w + barWidth)) - barWidth;
        ctx.fillStyle = colors[i];
        ctx.fillRect(offset, 0, barWidth, h * 0.5);
      }

      const gradient = ctx.createLinearGradient(0, h * 0.5, 0, h);
      gradient.addColorStop(0, '#2a2a4e');
      gradient.addColorStop(0.5, '#3a3a6e');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, h * 0.5, w, h * 0.25);

      for (let x = 0; x < w; x += 16) {
        for (let y = h * 0.5; y < h * 0.75; y += 16) {
          const b = Math.sin(x * 0.05 + t) * Math.cos(y * 0.03 + t) * 0.3 + 0.3;
          ctx.fillStyle = `rgba(100, 120, 220, ${b})`;
          ctx.fillRect(x, y, 16, 16);
        }
      }

      ctx.fillStyle = '#10101e';
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      ctx.font = '11px monospace';
      ctx.fillStyle = '#ffffff88';
      ctx.fillText('ESP32-CAM LIVE', 8, 16);
      ctx.fillText(`${new Date().toISOString().slice(11, 19)}`, 8, 30);
      ctx.strokeStyle = '#ffffff22';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);

      ctx.fillStyle = '#00ff00';
      ctx.fillText(`FPS: 30  |  ${RES_MAP[frameSize] || '640x480'}  |  JPEG Q:${quality}`, 8, h - 8);

      ctx.font = '14px monospace';
      ctx.fillStyle = '#ffffff44';
      ctx.textAlign = 'center';
      ctx.fillText('SIMULATED FEED', w / 2, h * 0.875);
      ctx.textAlign = 'start';

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [streaming, frameSize, quality]);

  useEffect(() => {
    if (!recording) return;
    const canvas = canvasRef.current;
    if (!canvas) { stopRecording(); return; }

    setRecordDismissed(false);

    let stream: MediaStream;
    try {
      stream = canvas.captureStream(15);
    } catch {
      stopRecording();
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(url, Date.now());
      recorderRef.current = null;
    };

    recorderRef.current = recorder;
    recorder.start(100);

    const startTime = Date.now();
    const MAX_MS = 30000;
    recordTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setRecordProgress(Math.min((elapsed / MAX_MS) * 100, 100));
    }, 100);

    recordAutoStopRef.current = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (recordAutoStopRef.current) clearTimeout(recordAutoStopRef.current);
    }, MAX_MS);

    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (recordAutoStopRef.current) clearTimeout(recordAutoStopRef.current);
      if (recorder.state === 'recording') recorder.stop();
      recorderRef.current = null;
    };
  }, [recording, stopRecording, setRecordProgress, setRecordedBlob]);

  const showStream = streaming && !streamDismissed;
  const showCapture = capturePreview && !captureDismissed;
  const showRecorded = recordedBlobUrl && !recordDismissed;
  const aspect = getAspect(frameSize);

  function formatRecordTime(pct: number): string {
    const totalSec = Math.floor((pct / 100) * 30);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  if (!showStream && !showCapture && !recording && !showRecorded) return null;

  return (
    <>
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-4 pointer-events-auto">
        {showStream && (
          <div className="hud-panel-strong hud-edge-top rounded-xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04] border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_2px_rgba(74,222,128,0.7)] animate-pulse" />
                <span className="text-xs font-semibold text-zinc-300 font-mono">LIVE STREAM</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan-400/70 font-mono">
                  FPS: {fps} | {RES_MAP[frameSize] ?? '640x480'}
                </span>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-cyan-300"
                  title={expanded ? 'Original' : 'Ampliar'}
                >
                  {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  onClick={() => setStreamDismissed(true)}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              className={`${expanded ? 'w-[640px] h-[480px]' : 'w-full'} block transition-all duration-300`}
              style={expanded ? undefined : { aspectRatio: `${aspect.w} / ${aspect.h}`, maxWidth: 320 }}
              width={640}
              height={480}
            />
          </div>
        )}
      </div>
    </div>

    {showCapture && (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="hud-panel rounded-xl overflow-hidden animate-in fade-in zoom-in-95 pointer-events-auto shadow-[0_0_24px_-6px_rgba(34,211,238,0.4)]">
          <div className="flex items-center justify-between px-2 py-1 bg-white/[0.04] border-b border-cyan-500/20">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_2px_rgba(34,211,238,0.8)] animate-pulse" />
              <span className="text-[10px] font-semibold text-cyan-300 font-mono">CAPTURE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-500 font-mono">
                {new Date(capturePreview!.ts).toISOString().slice(11, 19)}
              </span>
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = capturePreview!.url;
                  a.download = `capture-${capturePreview!.ts}.jpg`;
                  a.click();
                }}
                className="p-0.5 rounded hover:bg-white/10 transition-colors text-cyan-400 hover:text-cyan-300"
                title="Download"
              >
                <Download size={12} />
              </button>
              <button
                onClick={() => setCaptureDismissed(true)}
                className="p-0.5 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-200"
              >
                <X size={12} />
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capturePreview!.url}
            alt="capture"
            className="w-60 h-44 block object-cover"
          />
        </div>
      </div>
    )}

    {recording && (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="hud-panel rounded-xl overflow-hidden animate-in fade-in zoom-in-95 pointer-events-auto shadow-[0_0_24px_-6px_rgba(239,68,68,0.45)]">
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.8)] animate-pulse" />
            <span className="text-[10px] font-semibold text-red-300 font-mono">REC</span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {formatRecordTime(recordProgress)} / 0:30
            </span>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-100"
                style={{ width: `${recordProgress}%` }}
              />
            </div>
            <button
              onClick={stopRecording}
              className="p-0.5 rounded hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
              title="Stop recording"
            >
              <Square size={12} />
            </button>
          </div>
        </div>
      </div>
    )}

    {showRecorded && (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="hud-panel rounded-xl overflow-hidden animate-in fade-in zoom-in-95 pointer-events-auto shadow-[0_0_24px_-6px_rgba(239,68,68,0.35)]">
          <div className="flex items-center justify-between px-2 py-1 bg-white/[0.04] border-b border-red-500/20">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] font-semibold text-red-300 font-mono">RECORDED</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-500 font-mono">
                {recordedAt ? new Date(recordedAt).toISOString().slice(11, 19) : ''}
              </span>
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = recordedBlobUrl!;
                  a.download = `recording-${recordedAt}.webm`;
                  a.click();
                }}
                className="p-0.5 rounded hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
                title="Download"
              >
                <Download size={12} />
              </button>
              <button
                onClick={() => { setRecordDismissed(true); clearRecording(); }}
                className="p-0.5 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-200"
              >
                <X size={12} />
              </button>
            </div>
          </div>
          <video
            src={recordedBlobUrl!}
            controls
            className="w-60 h-44 block"
          />
        </div>
      </div>
    )}
    </>
  );
}
