'use client';

import { useEffect, useState } from 'react';
import { getDeviceId } from '@/app/lib/deviceId';

export interface DeviceAttrs {
  [key: string]: { value: unknown; lastUpdateTs: number };
}

export interface DeviceStatus {
  connected: boolean;
  lastSeen: number | null;
  attrs: DeviceAttrs;
  upstreamOk: boolean;
  upstreamError: string | null;
  deviceIdConfigured: boolean;
}

const STALE_MS = 10_000;

export function useDeviceStatus(intervalMs = 3000): DeviceStatus {
  const [state, setState] = useState<DeviceStatus>({
    connected: false,
    lastSeen: null,
    attrs: {},
    upstreamOk: true,
    upstreamError: null,
    deviceIdConfigured: false,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      const deviceId = getDeviceId();
      if (!deviceId) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            deviceIdConfigured: false,
            upstreamOk: false,
            upstreamError: null,
          }));
        }
        return;
      }

      try {
        const res = await fetch('/api/tb/attributes', {
          cache: 'no-store',
          headers: {
            'x-debug-caller': 'DeviceStatusBar',
            'x-device-id': deviceId,
          },
        });
        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          if (!cancelled) {
            setState((s) => ({
              ...s,
              deviceIdConfigured: true,
              upstreamOk: false,
              upstreamError: errorText || `HTTP ${res.status}`,
            }));
          }
          return;
        }
        const data = (await res.json()) as {
          client?: DeviceAttrs;
          shared?: DeviceAttrs;
          upstreamOk?: boolean;
          error?: string;
        };
        const client = { ...(data.shared ?? {}), ...(data.client ?? {}) };
        const upstreamOk = data.upstreamOk !== false;
        const tsValues = Object.values(client)
          .map((v) => v?.lastUpdateTs)
          .filter((v): v is number => typeof v === 'number');
        const lastSeen = tsValues.length ? Math.max(...tsValues) : null;
        const ageMs = lastSeen != null ? Date.now() - lastSeen : Number.POSITIVE_INFINITY;
        const connected = upstreamOk && lastSeen != null && ageMs < STALE_MS;
        if (!cancelled) {
          setState({
            connected,
            lastSeen,
            attrs: client,
            deviceIdConfigured: true,
            upstreamOk,
            upstreamError: upstreamOk ? null : data.error ?? 'unknown',
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            deviceIdConfigured: true,
            upstreamOk: false,
            upstreamError: e instanceof Error ? e.message : 'network',
          }));
        }
      }
    };

    fetchOnce();
    const id = setInterval(fetchOnce, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return state;
}