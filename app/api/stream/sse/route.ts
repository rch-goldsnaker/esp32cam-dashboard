import { subscribe, subscribeCapture } from '../../frameStore';

export const dynamic = 'force-dynamic';

const DEAD_TIMEOUT_MS = 30_000;

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;
  let unsubscribe: (() => void) | null = null;
  let unsubCap: (() => void) | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let lastEnqueueOk = Date.now();

  function cleanup() {
    closed = true;
    if (interval) clearInterval(interval);
    interval = null;
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    if (unsubCap) unsubCap();
    unsubCap = null;
  }

  const stream = new ReadableStream({
    start(controller) {
      const enq = (data: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(data);
          lastEnqueueOk = Date.now();
        } catch {
          console.warn('[sse] enqueue failed, closing');
          cleanup();
        }
      };

      enq(encoder.encode('event: connected\ndata: {}\n\n'));

      unsubscribe = subscribe((buffer) => {
        enq(encoder.encode(`event: frame\ndata: ${buffer.toString('base64')}\n\n`));
      });

      unsubCap = subscribeCapture((buffer, ts) => {
        enq(
          encoder.encode(
            `event: capture\ndata: ${JSON.stringify({ b64: buffer.toString('base64'), ts })}\n\n`,
          ),
        );
      });

      interval = setInterval(() => {
        if (Date.now() - lastEnqueueOk > DEAD_TIMEOUT_MS) {
          console.warn('[sse] no successful enqueues in 30s, self-healing');
          cleanup();
          return;
        }
        enq(encoder.encode(': keepalive\n\n'));
      }, 15000);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
// TODO(prod): enable selective CORS before public exposure.
