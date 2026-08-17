'use client';

import { Settings, Link, Save, X } from 'lucide-react';
import { useESP32Store } from '@/app/store/esp32Store';
import { useState } from 'react';
import { DrawerShell, Section, ConfigError } from './ConfigDrawer';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ open, onClose }: Props) {
  const streamUrl = useESP32Store((s) => s.streamUrl);
  const error = useESP32Store((s) => s.error);
  const setStreamUrl = useESP32Store((s) => s.setStreamUrl);
  const [streamUrlDraft, setStreamUrlDraft] = useState(streamUrl);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedUrl = streamUrlDraft.trim();

    if (!trimmedUrl) {
      setLocalError('Enter the stream URL');
      return;
    }
    try {
      new URL(trimmedUrl);
    } catch {
      setLocalError('Invalid URL');
      return;
    }

    if (trimmedUrl !== streamUrl) {
      setStreamUrl(trimmedUrl);
    }

    onClose();
  };

  return (
    <DrawerShell open={open} onClose={onClose} title="Settings" icon={<Settings className="w-4 h-4" />}>
      {error && <ConfigError error={error} />}

      <Section title="Stream" icon={<Link className="w-3.5 h-3.5" />}>
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 uppercase font-semibold">
            Stream URL (streamUrl)
          </label>
          <input
            type="text"
            value={streamUrlDraft}
            onChange={(e) => {
              setStreamUrlDraft(e.target.value);
              setLocalError(null);
            }}
            placeholder="http://192.168.x.x:81/stream"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 font-mono placeholder:text-zinc-600 outline-none focus:border-cyan-500 transition-colors"
          />
          {localError && (
            <p className="text-[11px] text-red-400">{localError}</p>
          )}
        </div>
      </Section>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" /> Save
        </button>
      </div>
    </DrawerShell>
  );
}
