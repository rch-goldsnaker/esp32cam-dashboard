import { NextRequest, NextResponse } from 'next/server';
import { setLatestFrame } from '../frameStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 512 * 1024;

function isJpegMagic(b: Buffer): boolean {
  return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

export async function POST(request: NextRequest) {
  try {
    const buffer = Buffer.from(await request.arrayBuffer());

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'empty' }, { status: 400 });
    }
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: 'too_large', max: MAX_BYTES },
        { status: 413 },
      );
    }
    if (!isJpegMagic(buffer)) {
      return NextResponse.json({ error: 'bad_magic' }, { status: 400 });
    }

    setLatestFrame(buffer);

    return NextResponse.json({ ok: true, size: buffer.length });
  } catch (e) {
    console.error('[stream] error:', e);
    return NextResponse.json({ error: 'fail' }, { status: 500 });
  }
}
// TODO(prod): enable selective CORS before public exposure.