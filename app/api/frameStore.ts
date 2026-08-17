type FrameListener = (buffer: Buffer) => void;
type CaptureListener = (buffer: Buffer, ts: number) => void;

interface FrameStoreState {
  latestFrame: Buffer | null;
  listeners: Set<FrameListener>;
  latestCapture: { buffer: Buffer; ts: number } | null;
  captureListeners: Set<CaptureListener>;
}

const g = globalThis as unknown as { __frameStore?: FrameStoreState };
if (!g.__frameStore) {
  g.__frameStore = {
    latestFrame: null,
    listeners: new Set(),
    latestCapture: null,
    captureListeners: new Set(),
  };
}
const state = g.__frameStore;

export function setLatestFrame(buffer: Buffer) {
  state.latestFrame = buffer;
  console.log(`[frameStore] setLatestFrame ${buffer.length}B, listeners: ${state.listeners.size}`);
  for (const cb of state.listeners) {
    try {
      cb(buffer);
    } catch {
      console.warn('[frameStore] removing dead frame listener');
      state.listeners.delete(cb);
    }
  }
}

export function subscribe(cb: FrameListener) {
  state.listeners.add(cb);
  console.log(`[frameStore] subscribe, total listeners: ${state.listeners.size}`);
  if (state.latestFrame) {
    try {
      cb(state.latestFrame);
    } catch {
      state.listeners.delete(cb);
    }
  }
  return () => {
    state.listeners.delete(cb);
  };
}

export function setLatestCapture(buffer: Buffer, ts: number) {
  state.latestCapture = { buffer, ts };
  console.log(`[frameStore] setLatestCapture ${buffer.length}B, listeners: ${state.captureListeners.size}`);
  for (const cb of state.captureListeners) {
    try {
      cb(buffer, ts);
    } catch {
      console.warn('[frameStore] removing dead capture listener');
      state.captureListeners.delete(cb);
    }
  }
}

export function getLatestCapture(): { buffer: Buffer; ts: number } | null {
  return state.latestCapture;
}

export function subscribeCapture(cb: CaptureListener) {
  state.captureListeners.add(cb);
  console.log(`[frameStore] subscribeCapture, total listeners: ${state.captureListeners.size}`);
  return () => {
    state.captureListeners.delete(cb);
  };
}
