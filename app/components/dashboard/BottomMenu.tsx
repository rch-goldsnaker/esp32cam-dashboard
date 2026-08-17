'use client';

import { useCallback, useState } from 'react';
import {
  Video,
  Zap,
  Camera,
  Circle,
  Square,
  Settings,
  Link,
} from 'lucide-react';
import { useESP32Store } from '@/app/store/esp32Store';

interface Props {
  onOpenSettings: () => void;
  onOpenConexion: () => void;
}

export default function BottomMenu({ onOpenSettings, onOpenConexion }: Props) {
  const streamEnabled = useESP32Store((s) => s.streamEnabled);
  const setStreamEnabled = useESP32Store((s) => s.setStreamEnabled);
  const toggleFlash = useESP32Store((s) => s.toggleFlash);
  const flashLedOn = useESP32Store((s) => s.flashLedOn);
  const recording = useESP32Store((s) => s.recording);
  const startRecording = useESP32Store((s) => s.startRecording);
  const stopRecording = useESP32Store((s) => s.stopRecording);

  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleStreamToggle = useCallback(async () => {
    await setStreamEnabled(!streamEnabled);
  }, [streamEnabled, setStreamEnabled]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-end gap-1 px-2 py-2 bg-zinc-900/85 border border-zinc-700 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/60">
        <MenuButton
          label={streamEnabled ? 'Stop stream' : 'Start stream'}
          active={streamEnabled}
          activeColor="text-cyan-400"
          onClick={handleStreamToggle}
          onHover={setTooltip}
        >
          <Video className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          label="Capture photo"
          active={false}
          activeColor="text-green-400"
          onClick={() => useESP32Store.getState().captureNow()}
          onHover={setTooltip}
        >
          <Camera className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          label={recording ? 'Stop recording' : 'Record video'}
          active={recording}
          activeColor="text-red-400"
          onClick={() => recording ? stopRecording() : startRecording()}
          onHover={setTooltip}
        >
          {recording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </MenuButton>

        <MenuButton
          label={flashLedOn ? 'Turn off flash' : 'Turn on flash'}
          active={flashLedOn}
          activeColor="text-yellow-400"
          onClick={() => toggleFlash()}
          onHover={setTooltip}
        >
          <Zap className="w-5 h-5" />
        </MenuButton>

        <Divider />

        <MenuButton
          label="Settings"
          active={false}
          activeColor="text-zinc-300"
          onClick={onOpenSettings}
          onHover={setTooltip}
        >
          <Settings className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          label="Connection"
          active={false}
          activeColor="text-zinc-300"
          onClick={onOpenConexion}
          onHover={setTooltip}
        >
          <Link className="w-5 h-5" />
        </MenuButton>
      </div>

      {tooltip && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-zinc-200 whitespace-nowrap shadow-lg pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="w-px h-7 bg-zinc-700 mx-1 self-center" />;
}

function MenuButton({
  label,
  active,
  activeColor,
  onClick,
  onHover,
  children,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  onClick: () => void;
  onHover: (label: string | null) => void;
  children: React.ReactNode;
}) {
  const colorClass = active ? activeColor : 'text-zinc-400 hover:text-zinc-200';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(label)}
      onMouseLeave={() => onHover(null)}
      className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer
        hover:bg-zinc-800 hover:scale-105 active:scale-95
        ${colorClass}
        ${active ? 'bg-zinc-800/70' : ''}`}
    >
      {active && (
        <span className="absolute inset-0 rounded-xl ring-1 ring-current opacity-50" />
      )}
      {children}
    </button>
  );
}