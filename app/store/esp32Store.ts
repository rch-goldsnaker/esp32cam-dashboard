import { create } from 'zustand';
import type { FrameSizeNum, SharedAttributes } from '@/app/lib/tb/types';
import {
  setDeviceId as saveDeviceId,
  clearDeviceId as clearStorageDeviceId,
} from '@/app/lib/deviceId';

type FlashState = 'on' | 'off';

interface RangeOk {
  ok: boolean;
  reason?: string;
}

interface ESP32State {
  deviceId: string | null;
  error: string | null;

  streamEnabled: boolean;
  flashLedOn: boolean;

  streamUrl: string;
  streamFps: number;
  frameSize: FrameSizeNum;
  imageQuality: number;
  vflip: boolean;
  hmirror: boolean;
  brightness: number;
  contrast: number;
  saturation: number;

  recording: boolean;
  recordProgress: number;
  recordedBlobUrl: string | null;
  recordedAt: number | null;
}

interface ESP32Actions {
  setDeviceId(id: string): void;
  clearDeviceId(): void;
  syncFromTB(): Promise<void>;
  setError(e: string | null): void;

  setStreamEnabled(b: boolean): Promise<void>;
  setStreamUrl(url: string): Promise<void>;
  setStreamFps(n: number): Promise<void>;
  setFrameSize(n: FrameSizeNum): Promise<void>;
  setImageQuality(n: number): Promise<void>;
  setVflip(b: boolean): Promise<void>;
  setHmirror(b: boolean): Promise<void>;
  setBrightness(n: number): Promise<void>;
  setContrast(n: number): Promise<void>;
  setSaturation(n: number): Promise<void>;

  toggleFlash(): Promise<void>;
  captureNow(): Promise<void>;

  startRecording(): void;
  stopRecording(): void;
  setRecordProgress(p: number): void;
  setRecordedBlob(url: string, at: number): void;
  clearRecording(): void;

  canStreamFps(n: number): RangeOk;
  canFrameSize(n: number): RangeOk;
  canImageQuality(n: number): RangeOk;
  canTriInt(n: number): RangeOk;
  isStreamUrlValid(s: string): RangeOk;
}

const initial: ESP32State = {
  deviceId: null,
  error: null,

  streamEnabled: false,
  flashLedOn: false,

  streamUrl: '',
  streamFps: 5,
  frameSize: 8,
  imageQuality: 12,
  vflip: false,
  hmirror: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,

  recording: false,
  recordProgress: 0,
  recordedBlobUrl: null,
  recordedAt: null,
};

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

async function postAttributes(payload: Partial<SharedAttributes>, deviceId: string | null): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (deviceId) headers['x-device-id'] = deviceId;
    const res = await fetch('/api/tb/attributes', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? `http ${res.status}`);
    }
    return true;
  } catch {
    return false;
  }
}

async function postRpc(method: string, params: Record<string, unknown>, deviceId: string | null): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (deviceId) headers['x-device-id'] = deviceId;
    const res = await fetch('/api/tb/rpc', {
      method: 'POST',
      headers,
      body: JSON.stringify({ method, params }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const useESP32Store = create<ESP32State & ESP32Actions>((set, get) => ({
  ...initial,

  setDeviceId: (id) => {
    saveDeviceId(id);
    set({ deviceId: id, error: null });
  },

  clearDeviceId: () => {
    clearStorageDeviceId();
    set({ deviceId: null, error: null });
  },

  setError: (e) => set({ error: e }),

  async syncFromTB() {
    const { deviceId } = get();
    set({ error: null });
    try {
      const headers: Record<string, string> = {
        'x-debug-caller': 'Dashboard.syncFromTB',
      };
      if (deviceId) headers['x-device-id'] = deviceId;
      const res = await fetch('/api/tb/attributes', {
        cache: 'no-store',
        headers,
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let errorMessage = `sync failed: ${res.status}`;
        try {
          const errorData = JSON.parse(errorText) as { error?: string };
          if (errorData.error) errorMessage = errorData.error;
        } catch {
          // ignore parse error
        }
        set({ error: errorMessage });
        return;
      }
      const data = (await res.json()) as {
        shared?: SharedAttributes;
        server?: SharedAttributes;
        upstreamOk?: boolean;
        error?: string;
      };
      if (data.upstreamOk === false) {
        set({ error: data.error ?? 'TB upstream error' });
        return;
      }
      const merged: Partial<SharedAttributes> = { ...(data.server ?? {}), ...(data.shared ?? {}) };
      set((s) => ({
        ...s,
        streamEnabled: merged.streamEnabled ?? s.streamEnabled,
        streamUrl: merged.streamUrl ?? s.streamUrl,
        streamFps: merged.streamFps ?? s.streamFps,
        frameSize: (merged.frameSize ?? s.frameSize) as FrameSizeNum,
        imageQuality: merged.imageQuality ?? s.imageQuality,
        vflip: merged.vflip ?? s.vflip,
        hmirror: merged.hmirror ?? s.hmirror,
        brightness: merged.brightness ?? s.brightness,
        contrast: merged.contrast ?? s.contrast,
        saturation: merged.saturation ?? s.saturation,
        error: null,
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'sync error';
      set({ error: message });
    }
  },

  async setStreamEnabled(b) {
    const { deviceId } = get();
    set({ streamEnabled: b, error: null });
    const ok = await postAttributes({ streamEnabled: b }, deviceId);
    if (!ok) {
      set({ error: 'Could not save streamEnabled' });
    }
  },

  async setStreamUrl(url) {
    const check = get().isStreamUrlValid(url);
    if (!check.ok) {
      set({ error: check.reason ?? 'Invalid URL' });
      return;
    }
    const { deviceId } = get();
    set({ streamUrl: url, error: null });
    const ok = await postAttributes({ streamUrl: url }, deviceId);
    if (!ok) set({ error: 'Could not save streamUrl' });
  },

  async setStreamFps(n) {
    const check = get().canStreamFps(n);
    if (!check.ok) {
      set({ error: check.reason });
      return;
    }
    const { deviceId } = get();
    set({ streamFps: n, error: null });
    const ok = await postAttributes({ streamFps: n }, deviceId);
    if (!ok) set({ error: 'Could not save streamFps' });
  },

  async setFrameSize(n) {
    const check = get().canFrameSize(n);
    if (!check.ok) {
      set({ error: check.reason });
      return;
    }
    const { deviceId } = get();
    set({ frameSize: n as FrameSizeNum, error: null });
    const ok = await postAttributes({ frameSize: n as FrameSizeNum }, deviceId);
    if (!ok) set({ error: 'Could not save frameSize' });
  },

  async setImageQuality(n) {
    const check = get().canImageQuality(n);
    if (!check.ok) {
      set({ error: check.reason });
      return;
    }
    const { deviceId } = get();
    set({ imageQuality: n, error: null });
    const ok = await postAttributes({ imageQuality: n }, deviceId);
    if (!ok) set({ error: 'Could not save imageQuality' });
  },

  async setVflip(b) {
    const { deviceId } = get();
    set({ vflip: b, error: null });
    const ok = await postAttributes({ vflip: b }, deviceId);
    if (!ok) set({ error: 'Could not save vflip' });
  },

  async setHmirror(b) {
    const { deviceId } = get();
    set({ hmirror: b, error: null });
    const ok = await postAttributes({ hmirror: b }, deviceId);
    if (!ok) set({ error: 'Could not save hmirror' });
  },

  async setBrightness(n) {
    const check = get().canTriInt(n);
    if (!check.ok) {
      set({ error: check.reason });
      return;
    }
    const { deviceId } = get();
    set({ brightness: n, error: null });
    const ok = await postAttributes({ brightness: n }, deviceId);
    if (!ok) set({ error: 'Could not save brightness' });
  },

  async setContrast(n) {
    const check = get().canTriInt(n);
    if (!check.ok) {
      set({ error: check.reason });
      return;
    }
    const { deviceId } = get();
    set({ contrast: n, error: null });
    const ok = await postAttributes({ contrast: n }, deviceId);
    if (!ok) set({ error: 'Could not save contrast' });
  },

  async setSaturation(n) {
    const check = get().canTriInt(n);
    if (!check.ok) {
      set({ error: check.reason });
      return;
    }
    const { deviceId } = get();
    set({ saturation: n, error: null });
    const ok = await postAttributes({ saturation: n }, deviceId);
    if (!ok) set({ error: 'Could not save saturation' });
  },

  async toggleFlash() {
    const { deviceId } = get();
    const next: FlashState = get().flashLedOn ? 'off' : 'on';
    set({ flashLedOn: next === 'on', error: null });
    const ok = await postRpc('setFlash', { state: next === 'on' }, deviceId);
    if (!ok) {
      set({ flashLedOn: !get().flashLedOn, error: 'Could not send RPC setFlash' });
    }
  },

  async captureNow() {
    const { deviceId } = get();
    const ok = await postRpc('capture', {}, deviceId);
    if (!ok) set({ error: 'Could not send RPC capture' });
  },

  startRecording() {
    set({ recording: true, recordProgress: 0, recordedBlobUrl: null, recordedAt: null });
  },

  stopRecording() {
    set({ recording: false });
  },

  setRecordProgress(p) {
    set({ recordProgress: p });
  },

  setRecordedBlob(url, at) {
    set({ recordedBlobUrl: url, recordedAt: at, recording: false, recordProgress: 100 });
  },

  clearRecording() {
    const { recordedBlobUrl } = get();
    if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
    set({ recordedBlobUrl: null, recordedAt: null, recordProgress: 0 });
  },

  canStreamFps(n) {
    if (!isInt(n)) return { ok: false, reason: 'streamFps must be an integer' };
    if (n < 1 || n > 15) return { ok: false, reason: 'streamFps out of range (1..15)' };
    return { ok: true };
  },
  canFrameSize(n) {
    if (!isInt(n)) return { ok: false, reason: 'frameSize must be an integer' };
    if (n < 0 || n > 13) return { ok: false, reason: 'frameSize out of range (0..13)' };
    return { ok: true };
  },
  canImageQuality(n) {
    if (!isInt(n)) return { ok: false, reason: 'imageQuality must be an integer' };
    if (n < 0 || n > 63) return { ok: false, reason: 'imageQuality out of range (0..63)' };
    return { ok: true };
  },
  canTriInt(n) {
    if (!isInt(n)) return { ok: false, reason: 'value must be an integer' };
    if (n < -2 || n > 2) return { ok: false, reason: 'out of range (-2..2)' };
    return { ok: true };
  },
  isStreamUrlValid(s) {
    if (typeof s !== 'string' || s.length === 0) return { ok: false, reason: 'Empty URL' };
    try {
      new URL(s);
    } catch {
      return { ok: false, reason: 'Invalid URL' };
    }
    return { ok: true };
  },
}));