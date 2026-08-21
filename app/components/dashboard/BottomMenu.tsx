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
  const [bursts, setBursts] = useState<Record<string, number>>({});

  const bump = useCallback((key: string) => {
    setBursts((b) => ({ ...b, [key]: (b[key] ?? 0) + 1 }));
  }, []);

  const handleStreamToggle = useCallback(async () => {
    bump('stream');
    await setStreamEnabled(!streamEnabled);
  }, [streamEnabled, setStreamEnabled, bump]);

  const handleFlashToggle = useCallback(() => {
    bump('flash');
    toggleFlash();
  }, [toggleFlash, bump]);

  const handleCapture = useCallback(() => {
    bump('capture');
    useESP32Store.getState().captureNow();
  }, [bump]);

  const handleRecordToggle = useCallback(() => {
    bump('record');
    recording ? stopRecording() : startRecording();
  }, [recording, stopRecording, startRecording, bump]);

  const handleSettings = useCallback(() => {
    bump('settings');
    onOpenSettings();
  }, [onOpenSettings, bump]);

  const handleConexion = useCallback(() => {
    bump('conexion');
    onOpenConexion();
  }, [onOpenConexion, bump]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="hud-panel-strong flex items-end gap-1 px-2 py-2 rounded-2xl">
        <MenuButton
          label={streamEnabled ? 'Stop stream' : 'Start stream'}
          active={streamEnabled}
          activeColor="text-cyan-400"
          onClick={handleStreamToggle}
          onHover={setTooltip}
          glow={streamEnabled}
          burstKey={bursts.stream}
        >
          <Video className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          label="Capture photo"
          active={false}
          activeColor="text-green-400"
          onClick={handleCapture}
          onHover={setTooltip}
          burstKey={bursts.capture}
        >
          <Camera className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          label={recording ? 'Stop recording' : 'Record video'}
          active={recording}
          activeColor="text-red-400"
          onClick={handleRecordToggle}
          onHover={setTooltip}
          glow={recording}
          burstKey={bursts.record}
        >
          {recording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </MenuButton>

        <MenuButton
          label={flashLedOn ? 'Turn off flash' : 'Turn on flash'}
          active={flashLedOn}
          activeColor="text-yellow-400"
          onClick={handleFlashToggle}
          onHover={setTooltip}
          glow={flashLedOn}
          burstKey={bursts.flash}
        >
          <Zap className="w-5 h-5" fill={flashLedOn ? 'currentColor' : 'none'} />
        </MenuButton>

        <Divider />

        <MenuButton
          label="Settings"
          active={false}
          activeColor="text-violet-400"
          onClick={handleSettings}
          onHover={setTooltip}
          burstKey={bursts.settings}
        >
          <Settings className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          label="Connection"
          active={false}
          activeColor="text-violet-400"
          onClick={handleConexion}
          onHover={setTooltip}
          burstKey={bursts.conexion}
        >
          <Link className="w-5 h-5" />
        </MenuButton>
      </div>

      {tooltip && (
        <div className="hud-panel absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-200 whitespace-nowrap pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="w-px h-7 bg-gradient-to-b from-transparent via-cyan-500/40 to-transparent mx-1 self-center" />;
}

function MenuButton({
  label,
  active,
  activeColor,
  onClick,
  onHover,
  children,
  glow = false,
  burstKey,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  onClick: () => void;
  onHover: (label: string | null) => void;
  children: React.ReactNode;
  glow?: boolean;
  burstKey?: number;
}) {
  const colorClass = active ? activeColor : 'text-zinc-400 hover:text-cyan-300';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(label)}
      onMouseLeave={() => onHover(null)}
      className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer
        hover:bg-white/8 hover:scale-105 active:scale-95
        ${colorClass}
        ${active ? 'bg-white/10' : ''}
        ${glow ? 'flash-glow' : ''}`}
    >
      {active && (
        <span className="absolute inset-0 rounded-xl ring-1 ring-current opacity-50" />
      )}
      {!!burstKey && (
        <span
          key={burstKey}
          className={`flash-burst absolute inset-0 rounded-full pointer-events-none ${activeColor}`}
        />
      )}
      {children}
    </button>
  );
}