'use client';

import {
  SlidersHorizontal,
  Sun,
  Contrast,
  Palette,
  Activity,
  Image as ImageIcon,
  Aperture,
  FlipHorizontal2,
  FlipVertical2,
} from 'lucide-react';
import { useESP32Store } from '@/app/store/esp32Store';
import { FRAME_SIZE_LABELS, type FrameSizeNum } from '@/app/lib/tb/types';

function PanelSlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-zinc-500 uppercase font-semibold flex items-center gap-1">
          {icon} {label}
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
      />
    </div>
  );
}

export default function SettingsPanel() {
  const streamFps = useESP32Store((s) => s.streamFps);
  const frameSize = useESP32Store((s) => s.frameSize);
  const imageQuality = useESP32Store((s) => s.imageQuality);
  const brightness = useESP32Store((s) => s.brightness);
  const contrast = useESP32Store((s) => s.contrast);
  const saturation = useESP32Store((s) => s.saturation);
  const vflip = useESP32Store((s) => s.vflip);
  const hmirror = useESP32Store((s) => s.hmirror);
  const setStreamFps = useESP32Store((s) => s.setStreamFps);
  const setFrameSize = useESP32Store((s) => s.setFrameSize);
  const setImageQuality = useESP32Store((s) => s.setImageQuality);
  const setBrightness = useESP32Store((s) => s.setBrightness);
  const setContrast = useESP32Store((s) => s.setContrast);
  const setSaturation = useESP32Store((s) => s.setSaturation);
  const setVflip = useESP32Store((s) => s.setVflip);
  const setHmirror = useESP32Store((s) => s.setHmirror);

  return (
    <div className="absolute bottom-20 left-3 pointer-events-none z-10">
      <div className="hud-panel rounded-2xl p-3 min-w-[220px] max-w-[260px] space-y-2 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[9px] font-semibold text-cyan-500/70 uppercase tracking-widest">
            Settings
          </span>
        </div>

        <div className="space-y-2 p-2 bg-white/[0.03] rounded-lg border border-white/5">
          <PanelSlider
            label="FPS"
            icon={<Activity className="w-3 h-3" />}
            value={streamFps}
            min={1}
            max={15}
            step={1}
            onChange={(v) => setStreamFps(v)}
          />

          <div className="space-y-1">
            <span className="text-[9px] text-zinc-500 uppercase font-semibold flex items-center gap-1">
              <Aperture className="w-3 h-3" /> Resolution
            </span>
            <select
              value={frameSize}
              onChange={(e) => setFrameSize(Number(e.target.value) as FrameSizeNum)}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-zinc-200 outline-none focus:border-cyan-400 cursor-pointer"
            >
              {Object.entries(FRAME_SIZE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{`${k} → ${v}`}</option>
              ))}
            </select>
          </div>

          <PanelSlider
            label="JPEG Quality"
            icon={<ImageIcon className="w-3 h-3" />}
            value={imageQuality}
            min={0}
            max={63}
            step={1}
            onChange={(v) => setImageQuality(v)}
          />

          <PanelSlider
            label="Brightness"
            icon={<Sun className="w-3 h-3" />}
            value={brightness}
            min={-2}
            max={2}
            step={1}
            onChange={(v) => setBrightness(v)}
          />

          <PanelSlider
            label="Contrast"
            icon={<Contrast className="w-3 h-3" />}
            value={contrast}
            min={-2}
            max={2}
            step={1}
            onChange={(v) => setContrast(v)}
          />

          <PanelSlider
            label="Saturation"
            icon={<Palette className="w-3 h-3" />}
            value={saturation}
            min={-2}
            max={2}
            step={1}
            onChange={(v) => setSaturation(v)}
          />

          <div className="flex gap-1.5">
            <button
              onClick={() => setVflip(!vflip)}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] cursor-pointer ${
                vflip ? 'bg-cyan-500 text-zinc-950 shadow-[0_0_12px_-2px_rgba(34,211,238,0.8)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              <FlipVertical2 className="w-3 h-3" /> V-Flip
            </button>
            <button
              onClick={() => setHmirror(!hmirror)}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] cursor-pointer ${
                hmirror ? 'bg-cyan-500 text-zinc-950 shadow-[0_0_12px_-2px_rgba(34,211,238,0.8)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              <FlipHorizontal2 className="w-3 h-3" /> H-Mirror
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
