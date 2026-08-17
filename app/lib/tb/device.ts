import 'server-only';
import { tbHttp, TBError } from './client';
import type { SharedAttributes } from './types';

interface AttributeEntry {
  key: string;
  value: unknown;
  lastUpdateTs?: number;
  ts?: number;
  scope?: string;
}

let cachedAll: { data: AttributeEntry[]; ts: number } | null = null;
const CACHE_MS = 1000;

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

function inRange(n: number, min: number, max: number) {
  return n >= min && n <= max;
}

export function validateSharedAttributes(
  attrs: Record<string, unknown>,
): { ok: true; value: SharedAttributes } | { ok: false; field: string; reason: string } {
  for (const [k, v] of Object.entries(attrs)) {
    switch (k) {
      case 'streamEnabled':
      case 'vflip':
      case 'hmirror':
        if (typeof v !== 'boolean') {
          return { ok: false, field: k, reason: 'must be boolean' };
        }
        break;
      case 'streamUrl':
        if (typeof v !== 'string' || v.length === 0) {
          return { ok: false, field: k, reason: 'must be non-empty string' };
        }
        try {
          new URL(v);
        } catch {
          return { ok: false, field: k, reason: 'must be a valid URL' };
        }
        break;
      case 'streamFps':
        if (!isInt(v) || !inRange(v, 1, 15)) {
          return { ok: false, field: k, reason: 'must be integer 1..15' };
        }
        break;
      case 'frameSize':
        if (!isInt(v) || !inRange(v, 0, 13)) {
          return { ok: false, field: k, reason: 'must be integer 0..13' };
        }
        break;
      case 'imageQuality':
        if (!isInt(v) || !inRange(v, 0, 63)) {
          return { ok: false, field: k, reason: 'must be integer 0..63' };
        }
        break;
      case 'brightness':
      case 'contrast':
      case 'saturation':
        if (!isInt(v) || !inRange(v, -2, 2)) {
          return { ok: false, field: k, reason: 'must be integer -2..2' };
        }
        break;
      default:
        break;
    }
  }
  return { ok: true, value: attrs as SharedAttributes };
}

function pickShared(arr: Array<{ key: string; value: unknown }>): SharedAttributes {
  const out: SharedAttributes = {};
  for (const { key, value } of arr) {
    if (key in VALID_KEYS) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

const VALID_KEYS: Record<string, true> = {
  streamEnabled: true,
  streamUrl: true,
  streamFps: true,
  frameSize: true,
  imageQuality: true,
  vflip: true,
  hmirror: true,
  brightness: true,
  contrast: true,
  saturation: true,
};

const CLIENT_KEYS: Record<string, true> = {
  streamEnabled: true,
  frameSize: true,
  rssi: true,
  flashState: true,
  uptime: true,
  streamFramesSent: true,
  streamFailures: true,
  freeHeap: true,
  heapSize: true,
  heapMinFree: true,
  freePsram: true,
  psramTotal: true,
  psramUsedPct: true,
  lastJpegSize: true,
  cameraReady: true,
  macAddress: true,
};

function isClientKey(k: string): boolean {
  return k in CLIENT_KEYS;
}

export const tbDevice = {
  async _fetchAll(deviceId: string): Promise<AttributeEntry[]> {
    if (cachedAll && Date.now() - cachedAll.ts < CACHE_MS) {
      return cachedAll.data;
    }
    const arr = await tbHttp.getDeviceAttributes(deviceId);
    cachedAll = { data: arr, ts: Date.now() };
    return arr;
  },

  async getSharedAttributes(deviceId: string): Promise<SharedAttributes> {
    const arr = await this._fetchAll(deviceId);
    const filtered = arr.filter((a) => !a.scope || a.scope === 'SHARED' || a.scope === 'SERVER');
    return pickShared(filtered);
  },

  async getServerAttributes(deviceId: string): Promise<SharedAttributes> {
    const arr = await this._fetchAll(deviceId);
    const filtered = arr.filter((a) => a.scope === 'SERVER');
    return pickShared(filtered);
  },

  async getClientAttributes(deviceId: string): Promise<Record<string, { value: unknown; lastUpdateTs: number }>> {
    const arr = await this._fetchAll(deviceId);
    const filtered = arr.filter((a) => a.scope === 'CLIENT' || (!a.scope && isClientKey(a.key)));
    const out: Record<string, { value: unknown; lastUpdateTs: number }> = {};
    for (const { key, value, lastUpdateTs, ts } of filtered) {
      out[key] = { value, lastUpdateTs: lastUpdateTs ?? ts ?? 0 };
    }
    return out;
  },

  async setAttributes(partial: Partial<SharedAttributes>, deviceId: string): Promise<void> {
    const result = validateSharedAttributes(partial as Record<string, unknown>);
    if (!result.ok) {
      throw new TBError(`invalid ${result.field}: ${result.reason}`, 400, result.field);
    }
    await tbHttp.setSharedAttributes(partial as Record<string, unknown>, deviceId);
  },
};