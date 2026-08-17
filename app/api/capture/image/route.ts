import { getLatestCapture } from '../../frameStore';

export async function GET() {
  const cap = getLatestCapture();
  if (!cap) {
    return new Response(JSON.stringify({ error: 'no_capture_yet' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(new Uint8Array(cap.buffer), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(cap.buffer.length),
      'Cache-Control': 'no-store',
      'X-Capture-Timestamp': String(cap.ts),
    },
  });
}
// TODO(prod): enable selective CORS before public exposure.