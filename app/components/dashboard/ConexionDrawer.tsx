'use client';

import { Link, Save, X } from 'lucide-react';
import { useESP32Store } from '@/app/store/esp32Store';
import { useState } from 'react';
import { DrawerShell, Section, ConfigError } from './ConfigDrawer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ConexionDrawer({ open, onClose }: Props) {
  const deviceId = useESP32Store((s) => s.deviceId);
  const error = useESP32Store((s) => s.error);
  const setDeviceId = useESP32Store((s) => s.setDeviceId);
  const [deviceIdDraft, setDeviceIdDraft] = useState(deviceId ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedId = deviceIdDraft.trim();

    if (!trimmedId) {
      setLocalError('Enter the Device ID');
      return;
    }
    if (!UUID_RE.test(trimmedId)) {
      setLocalError('Invalid format. Must be a UUID');
      return;
    }

    if (trimmedId !== (deviceId ?? '')) {
      setDeviceId(trimmedId);
    }

    onClose();
  };

  return (
    <DrawerShell open={open} onClose={onClose} title="Connection" icon={<Link className="w-4 h-4" />}>
      {error && <ConfigError error={error} />}

      <Section title="Connection" icon={<Link className="w-3.5 h-3.5" />}>
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 uppercase font-semibold">
            ThingsBoard Device ID
          </label>
          <input
            type="text"
            value={deviceIdDraft}
            onChange={(e) => {
              setDeviceIdDraft(e.target.value);
              setLocalError(null);
            }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
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
