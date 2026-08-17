import { NextRequest, NextResponse } from 'next/server';
import { tbHttp } from '@/app/lib/tb/client';
import { TBError } from '@/app/lib/tb/client';
import type { RPCMethod } from '@/app/lib/tb/types';

const VALID: RPCMethod[] = ['setStreamActive', 'setFlash', 'capture'];

export async function POST(request: NextRequest) {
  const deviceId = request.headers.get('x-device-id') ?? undefined;
  try {
    const body = await request.json().catch(() => ({}));
    const method = body?.method as RPCMethod | undefined;
    const params = (body?.params ?? {}) as Record<string, unknown>;

    if (!method || !VALID.includes(method)) {
      return NextResponse.json(
        { error: `invalid method: ${String(method)}`, allowed: VALID },
        { status: 400 },
      );
    }
    if (method === 'setStreamActive') {
      if (typeof params.active !== 'boolean') {
        return NextResponse.json({ error: 'params.active must be boolean' }, { status: 400 });
      }
    } else if (method === 'setFlash') {
      if (typeof params.state !== 'boolean') {
        return NextResponse.json({ error: 'params.state must be boolean' }, { status: 400 });
      }
    }

    const result = await tbHttp.rpcCall(method, params, deviceId!);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    if (e instanceof TBError) {
      if (e.status === 401) {
        return NextResponse.json(
          { error: 'TB: invalid username or password. Check TB_USERNAME/TB_PASSWORD on the server.' },
          { status: 502 },
        );
      }
      if (e.status === 403) {
        return NextResponse.json(
          { error: 'TB: token lacks permissions for this device.' },
          { status: 502 },
        );
      }
      if (e.status >= 500 && e.status < 600) {
        return NextResponse.json(
          { error: `TB not configured: ${e.message}. Check TB_BASE_URL/TB_USERNAME/TB_PASSWORD on the server and Device ID in Settings → Connection.` },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: `TB: ${e.message}` }, { status: 502 });
    }
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
// TODO(prod): enable selective CORS before public exposure.