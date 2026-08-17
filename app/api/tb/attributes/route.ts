import { NextRequest, NextResponse } from 'next/server';
import { tbDevice, validateSharedAttributes } from '@/app/lib/tb/device';
import { TBError } from '@/app/lib/tb/client';

export async function GET(request: NextRequest) {
  const caller =
    request.headers.get('x-debug-caller') ??
    request.headers.get('referer') ??
    'unknown';
  const deviceId = request.headers.get('x-device-id') ?? undefined;
  try {
    const [sharedR, serverR, clientR] = await Promise.allSettled([
      tbDevice.getSharedAttributes(deviceId!),
      tbDevice.getServerAttributes(deviceId!),
      tbDevice.getClientAttributes(deviceId!),
    ]);

    const shared = sharedR.status === 'fulfilled' ? sharedR.value : {};
    const server = serverR.status === 'fulfilled' ? serverR.value : {};
    const client = clientR.status === 'fulfilled' ? clientR.value : {};

    const upstreamErrors: Record<string, string> = {};
    if (sharedR.status === 'rejected') upstreamErrors.shared = String(sharedR.reason);
    if (serverR.status === 'rejected') upstreamErrors.server = String(serverR.reason);
    if (clientR.status === 'rejected') upstreamErrors.client = String(clientR.reason);

    const upstreamOk = Object.keys(upstreamErrors).length === 0;

    if (!upstreamOk) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[attributes] ${caller} upstream failed: ${formatUpstreamError(upstreamErrors)}`);
      }
      return NextResponse.json(
        {
          shared, server, client,
          upstreamOk: false,
          upstreamErrors,
          error: formatUpstreamError(upstreamErrors),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      shared, server, client,
      upstreamOk: true,
      upstreamErrors: {},
    });
  } catch (e) {
    console.error(`[attributes] ${caller} unexpected error:`, e);
    return NextResponse.json({ error: 'unknown' }, { status: 502 });
  }
}

function formatUpstreamError(errs: Record<string, string>): string {
  const first = Object.values(errs)[0] ?? '';
  if (first.includes('401') || /invalid username or password/i.test(first)) {
    return 'TB: invalid username or password. Check TB_USERNAME/TB_PASSWORD in .env.local.';
  }
  if (first.includes('403')) {
    return 'TB: token lacks permissions for this device. Check the user role in TB.';
  }
  if (first.includes('TB_USERNAME/TB_PASSWORD not configured')) {
    return 'TB: TB_USERNAME/TB_PASSWORD are not configured on the server.';
  }
  if (first.includes('TB_DEVICE_ID not configured')) {
    return 'TB: Device ID not configured. Set it in Settings → Connection.';
  }
  return `TB upstream error: ${first}`;
}

export async function POST(request: NextRequest) {
  const deviceId = request.headers.get('x-device-id') ?? undefined;
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'body must be object' }, { status: 400 });
    }
    const result = validateSharedAttributes(body as Record<string, unknown>);
    if (!result.ok) {
      return NextResponse.json(
        { error: `invalid ${result.field}: ${result.reason}`, field: result.field },
        { status: 400 },
      );
    }
    await tbDevice.setAttributes(result.value, deviceId!);
    return NextResponse.json({ ok: true });
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
    const status = message.startsWith('invalid') ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
// TODO(prod): enable selective CORS before public exposure.