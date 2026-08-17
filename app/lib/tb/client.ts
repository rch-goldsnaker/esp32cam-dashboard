import 'server-only';

export class TBError extends Error {
  status: number;
  field?: string;
  constructor(message: string, status: number, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

interface CachedToken {
  token: string;
  refreshToken: string | null;
  expiresAt: number;
}

let cached: CachedToken | null = null;

function getBaseUrl(): string {
  const url = process.env.TB_BASE_URL;
  if (!url) {
    throw new TBError('TB_BASE_URL not configured', 500);
  }
  return url.replace(/\/$/, '');
}

function requireDeviceId(deviceId?: string): string {
  if (!deviceId) {
    throw new TBError('TB_DEVICE_ID not configured', 500);
  }
  return deviceId;
}

async function login(): Promise<string> {
  const username = process.env.TB_USERNAME;
  const password = process.env.TB_PASSWORD;
  if (!username || !password) {
    throw new TBError('TB_USERNAME/TB_PASSWORD not configured', 500);
  }
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new TBError(`TB login failed: ${res.status} ${text}`, res.status);
  }
  const data = (await res.json()) as {
    token: string;
    refreshToken?: string;
    ttl?: number;
  };
  cached = {
    token: data.token,
    refreshToken: data.refreshToken ?? null,
    expiresAt: Date.now() + (data.ttl ?? 3600) * 1000,
  };
  return cached.token;
}

async function refreshAccessToken(): Promise<string> {
  if (!cached?.refreshToken) {
    return login();
  }
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/auth/refreshToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: cached.refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) {
    return login();
  }
  const data = (await res.json()) as {
    token: string;
    refreshToken?: string;
    ttl?: number;
  };
  cached = {
    token: data.token,
    refreshToken: data.refreshToken ?? cached.refreshToken,
    expiresAt: Date.now() + (data.ttl ?? 3600) * 1000,
  };
  return cached.token;
}

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) {
    return cached.token;
  }
  if (cached?.refreshToken) {
    try {
      return await refreshAccessToken();
    } catch {
      // fall through to login
    }
  }
  return login();
}

async function tbFetch(
  path: string,
  init: RequestInit = {},
  opts: { tolerate404?: boolean; retryOn401?: boolean } = {},
): Promise<unknown> {
  const base = getBaseUrl();
  const method = init.method ?? 'GET';

  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set('X-Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const start = Date.now();
  const logPrefix = `[tb] ${method} ${path}`;

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });
  } catch (e) {
    const ms = Date.now() - start;
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error(`${logPrefix} ✗ network error after ${ms}ms: ${msg}`);
    throw new TBError(`network: ${msg}`, 0);
  }

  if (res.status === 401 && opts.retryOn401 !== false) {
    cached = null;
    const fresh = await getToken();
    const headers2 = new Headers(init.headers);
    headers2.set('X-Authorization', `Bearer ${fresh}`);
    if (init.body && !headers2.has('Content-Type')) {
      headers2.set('Content-Type', 'application/json');
    }
    try {
      res = await fetch(`${base}${path}`, {
        ...init,
        headers: headers2,
        cache: 'no-store',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      console.error(`${logPrefix} ✗ retry network error: ${msg}`);
      throw new TBError(`network: ${msg}`, 0);
    }
  }

  const ms = Date.now() - start;

  if (!res.ok) {
    if (opts.tolerate404 && res.status === 404) {
      return [];
    }
    const text = await res.text().catch(() => '');
    console.error(`${logPrefix} ✗ ${res.status} ${ms}ms ${text.slice(0, 200)}`);
    throw new TBError(
      `TB ${method} ${path} → ${res.status}: ${text}`,
      res.status,
    );
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const tbHttp = {
  baseUrl: () => getBaseUrl(),

  getDeviceAttributes(deviceId: string) {
    const id = requireDeviceId(deviceId);
    const allKeys = [
      'streamEnabled',
      'streamUrl',
      'streamFps',
      'frameSize',
      'imageQuality',
      'vflip',
      'hmirror',
      'brightness',
      'contrast',
      'saturation',
      'rssi',
      'flashState',
      'uptime',
      'streamFramesSent',
      'streamFailures',
      'freeHeap',
      'heapSize',
      'heapMinFree',
      'freePsram',
      'psramTotal',
      'psramUsedPct',
      'lastJpegSize',
      'cameraReady',
      'macAddress',
    ];
    const qs = new URLSearchParams({ keys: allKeys.join(',') });
    return tbFetch(
      `/api/plugins/telemetry/DEVICE/${id}/values/attributes?${qs.toString()}`,
    ) as Promise<
      Array<{
        key: string;
        value: unknown;
        lastUpdateTs?: number;
        ts?: number;
        scope?: string;
      }>
    >;
  },

  setSharedAttributes(attrs: Record<string, unknown>, deviceId: string): Promise<void> {
    const id = requireDeviceId(deviceId);
    return tbFetch(`/api/plugins/telemetry/DEVICE/${id}/attributes/SHARED_SCOPE`, {
      method: 'POST',
      body: JSON.stringify(attrs),
    }) as Promise<void>;
  },

  rpcCall(method: string, params: Record<string, unknown> = {}, deviceId: string): Promise<unknown> {
    const id = requireDeviceId(deviceId);
    return tbFetch(`/api/plugins/rpc/oneway/${id}`, {
      method: 'POST',
      body: JSON.stringify({ method, params }),
    });
  },

  getLatestTelemetry(keys: string[], deviceId: string): Promise<Array<{ key: string; value: unknown; ts: number }>> {
    const id = requireDeviceId(deviceId);
    const qs = new URLSearchParams({ keys: keys.join(',') });
    return tbFetch(
      `/api/plugins/telemetry/DEVICE/${id}/values?${qs.toString()}`,
      {},
      { tolerate404: true },
    ) as Promise<Array<{ key: string; value: unknown; ts: number }>>;
  },
};