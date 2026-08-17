import { NextRequest, NextResponse } from 'next/server';
import { setLatestCapture } from '../frameStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 512 * 1024;
const DEBUG = process.env.NODE_ENV !== 'production';

export async function POST(request: NextRequest) {
  if (DEBUG) {
    console.log(`[capture] ← ${request.method} ${request.url}`);
    console.log(
      `[capture] headers: content-type=${request.headers.get('content-type')} ` +
        `content-length=${request.headers.get('content-length')} ` +
        `user-agent=${request.headers.get('user-agent')} ` +
        `connection=${request.headers.get('connection')}`,
    );
  }

  try {
    if (!request.body) {
      if (DEBUG) console.log('[capture] ✗ no_body');
      return NextResponse.json({ error: 'no_body' }, { status: 400 });
    }

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    let idx = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (DEBUG) console.log(`[capture] stream done, ${idx} chunks, total=${total}B`);
        break;
      }
      idx++;
      total += value.length;
      if (DEBUG) console.log(`[capture] chunk#${idx} len=${value.length} total=${total}`);
      if (total > MAX_BYTES) {
        if (DEBUG) console.log(`[capture] ✗ too_large ${total} > ${MAX_BYTES}`);
        try { await reader.cancel(); } catch {}
        return NextResponse.json(
          { error: 'too_large', max: MAX_BYTES },
          { status: 413 },
        );
      }
      chunks.push(value);
    }

    if (total === 0) {
      if (DEBUG) console.log('[capture] ✗ empty body');
      return NextResponse.json({ error: 'empty' }, { status: 400 });
    }

    const buffer = Buffer.concat(chunks);

    if (DEBUG) {
      const hex = Array.from(buffer.subarray(0, 12))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log(`[capture] body first 12 bytes: ${hex}`);
    }

    if (!(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
      if (DEBUG) console.log('[capture] ✗ bad_magic (no JPEG)');
      return NextResponse.json({ error: 'bad_magic' }, { status: 400 });
    }

    const ts = Date.now();
    setLatestCapture(buffer, ts);
    if (DEBUG) console.log(`[capture] → 200 ok size=${buffer.length}`);
    return NextResponse.json({ ok: true, ts });
  } catch (e) {
    console.error('[capture] ✗ error:', e);
    return NextResponse.json({ error: 'fail' }, { status: 500 });
  }
}
// TODO(prod): enable selective CORS before public exposure.