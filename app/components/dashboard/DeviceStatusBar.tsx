'use client';

import {
  WifiOff,
  Cpu,
  Camera,
  AlertCircle,
  Clock,
  Hash,
  Activity,
  HardDrive,
  Percent,
  Aperture,
  Image as ImageIcon,
  Move,
  RotateCw,
  Pause,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';
import { useDeviceStatus } from '@/app/hooks/useDeviceStatus';
import { useCameraStore } from '@/app/store/cameraStore';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { RES_MAP } from '@/app/lib/constants';

function num(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

function formatUptime(seconds: number | null): string {
  if (seconds == null) return '—';
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function rssiColor(rssi: number | null): string {
  if (rssi == null) return 'text-zinc-500';
  if (rssi >= -55) return 'text-green-400';
  if (rssi >= -67) return 'text-cyan-400';
  if (rssi >= -75) return 'text-yellow-400';
  if (rssi >= -85) return 'text-orange-400';
  return 'text-red-400';
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  tooltip: string;
}

function Stat({ icon, label, value, valueColor = 'text-zinc-200', tooltip }: StatProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 rounded-md px-2 py-1.5 cursor-default transition-colors" />
        }
      >
        <span className="text-cyan-400/70">{icon}</span>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
            {label}
          </span>
          <span className={`text-[11px] font-mono truncate ${valueColor}`}>
            {value}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p className="text-xs max-w-[200px]">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold text-cyan-500/70 uppercase tracking-widest">
      {children}
    </span>
  );
}

function panelClasses(extra: string = '') {
  return `hud-panel rounded-2xl p-3 pointer-events-auto ${extra}`;
}

export default function DeviceStatusBar() {
  const { connected, lastSeen, attrs, upstreamOk, upstreamError, deviceIdConfigured } = useDeviceStatus(3000);
  const camPos = useCameraStore((s) => s.position);
  const camTarget = useCameraStore((s) => s.target);
  const camDist = useCameraStore((s) => s.distance);
  const modelVisible = useCameraStore((s) => s.modelVisible);
  const modelRotating = useCameraStore((s) => s.modelRotating);
  const environmentVisible = useCameraStore((s) => s.environmentVisible);
  const setModelVisible = useCameraStore((s) => s.setModelVisible);
  const setModelRotating = useCameraStore((s) => s.setModelRotating);
  const setEnvironmentVisible = useCameraStore((s) => s.setEnvironmentVisible);

  if (!deviceIdConfigured) {
    return (
      <div className="absolute top-3 left-3 pointer-events-none z-10">
        <div className={panelClasses('min-w-[260px] max-w-[340px] !border-amber-500/30 shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)]')}>
          <div className="flex items-center gap-2 mb-1.5">
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-mono text-amber-300 uppercase tracking-wider">
              Device ID not configured
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
            Configure the ESP32-CAM Device ID from Settings → Connection.
          </p>
        </div>
      </div>
    );
  }

  if (!upstreamOk) {
    return (
      <div className="absolute top-3 left-3 pointer-events-none z-10">
        <div className={panelClasses('min-w-[260px] max-w-[340px] !border-amber-500/30 shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)]')}>
          <div className="flex items-center gap-2 mb-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-mono text-amber-300 uppercase tracking-wider">
              ThingsBoard not responding
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
            {upstreamError ?? 'Unknown error querying TB.'}
            <br />
            Check TB_USERNAME/TB_PASSWORD on the server and Device ID in Settings → Connection.
          </p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="absolute top-3 left-3 pointer-events-none z-10">
        <div className={panelClasses('min-w-[260px] max-w-[320px] !border-red-500/30 shadow-[0_0_24px_-8px_rgba(239,68,68,0.4)]')}>
          <div className="flex items-center gap-2 mb-1.5">
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-[11px] font-mono text-red-300 uppercase tracking-wider">
              ESP32-CAM disconnected
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
            {lastSeen != null
              ? `Last seen: ${new Date(lastSeen).toLocaleTimeString()}`
              : 'No device attributes received yet.'}
            <br />
            Make sure the ESP32 is powered on, connected to WiFi and ThingsBoard.
          </p>
        </div>
      </div>
    );
  }

  const rssi = num(attrs.rssi?.value);
  const uptime = num(attrs.uptime?.value);
  const framesOk = num(attrs.streamFramesSent?.value);
  const framesFail = num(attrs.streamFailures?.value);
  const cameraReady = bool(attrs.cameraReady?.value);
  const mac = str(attrs.macAddress?.value);
  const heap = num(attrs.freeHeap?.value);
  const heapSize = num(attrs.heapSize?.value);
  const heapMinFree = num(attrs.heapMinFree?.value);
  const freePsram = num(attrs.freePsram?.value);
  const psramTotal = num(attrs.psramTotal?.value);
  const psramUsedPct = num(attrs.psramUsedPct?.value);
  const lastJpegSize = num(attrs.lastJpegSize?.value);
  const frameSize = num(attrs.frameSize?.value);

  return (
    <>
      {/* TOP LEFT — Status */}
      <div className="absolute top-3 left-3 pointer-events-none z-10">
        <div className={panelClasses('min-w-[280px] max-w-[340px] space-y-3')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.7)] animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-200 uppercase tracking-wider">
                ESP32 connected
              </span>
            </div>
            {mac && (
              <span className="text-[10px] font-mono text-zinc-500">
                …{mac.slice(-8)}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <SectionTitle>Status</SectionTitle>
            <div className="grid grid-cols-2 gap-1.5">
              <Stat
                icon={<Activity className="w-3.5 h-3.5" />}
                label="RSSI"
                value={rssi != null ? `${rssi} dBm` : '—'}
                valueColor={rssiColor(rssi)}
                tooltip="WiFi signal strength in dBm. -30 = excellent, -70 = weak, -90 = almost no connection"
              />
              <Stat
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Uptime"
                value={formatUptime(uptime)}
                tooltip="Time powered on in seconds since last boot"
              />
              <Stat
                icon={<Camera className="w-3.5 h-3.5" />}
                label="Camera"
                value={cameraReady == null ? '—' : cameraReady ? 'OK' : 'NO'}
                valueColor={cameraReady ? 'text-green-400' : 'text-red-400'}
                tooltip="Whether the OV2640 camera initialized correctly"
              />
              <Stat
                icon={<Hash className="w-3.5 h-3.5" />}
                label="Frames OK"
                value={framesOk != null ? String(framesOk) : '—'}
                tooltip="Total JPEG frames sent successfully via HTTP since last boot"
              />
              <Stat
                icon={<AlertCircle className="w-3.5 h-3.5" />}
                label="Frames Fail"
                value={framesFail != null ? String(framesFail) : '—'}
                valueColor={framesFail != null && framesFail > 0 ? 'text-red-400' : 'text-zinc-200'}
                tooltip="Total HTTP failures when sending frames since last boot"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TOP RIGHT — Camera Position */}
      <div className="absolute top-3 right-3 pointer-events-none z-10">
        <div className={panelClasses('min-w-[180px] space-y-1.5')}>
          <SectionTitle>Camera</SectionTitle>
          <div className="space-y-1.5">
            <Stat
              icon={<Move className="w-3.5 h-3.5" />}
              label="Position"
              value={`[${camPos.map((v) => v.toFixed(1)).join(', ')}]`}
              tooltip="3D camera position [x, y, z] in the scene"
            />
            <Stat
              icon={<Move className="w-3.5 h-3.5" />}
              label="Target"
              value={`[${camTarget.map((v) => v.toFixed(1)).join(', ')}]`}
              tooltip="3D orbit target [x, y, z] that the camera looks at"
            />
            <Stat
              icon={<Move className="w-3.5 h-3.5" />}
              label="Distance"
              value={camDist.toFixed(2)}
              tooltip="Distance between camera and target"
            />
          </div>
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={() => setModelRotating(!modelRotating)}
              title="Toggle 3D model rotation"
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] cursor-pointer pointer-events-auto ${
                modelRotating ? 'bg-cyan-500 text-zinc-950 shadow-[0_0_12px_-2px_rgba(34,211,238,0.8)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              {modelRotating ? <RotateCw className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              Rotation
            </button>
            <button
              onClick={() => setModelVisible(!modelVisible)}
              title="Show or hide the 3D model"
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] cursor-pointer pointer-events-auto ${
                modelVisible ? 'bg-cyan-500 text-zinc-950 shadow-[0_0_12px_-2px_rgba(34,211,238,0.8)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              {modelVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Model
            </button>
            <button
              onClick={() => setEnvironmentVisible(!environmentVisible)}
              title="Show or hide the city environment (buildings + moon)"
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] cursor-pointer pointer-events-auto ${
                environmentVisible ? 'bg-violet-500 text-zinc-950 shadow-[0_0_12px_-2px_rgba(168,85,247,0.8)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              <Building2 className="w-3 h-3" />
              Env
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT — Resources */}
      <div className="absolute bottom-20 right-3 pointer-events-none z-10">
        <div className={panelClasses('min-w-[240px] max-w-[300px] space-y-1.5')}>
          <SectionTitle>Resources</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5">
            <Stat
              icon={<Cpu className="w-3.5 h-3.5" />}
              label="Heap"
              value={formatBytes(heap)}
              tooltip="Free internal DRAM in bytes. Below ~30KB risks malloc crash"
            />
            <Stat
              icon={<Cpu className="w-3.5 h-3.5" />}
              label="Heap Total"
              value={formatBytes(heapSize)}
              tooltip="Total internal RAM of the ESP32 in bytes (~320KB real)"
            />
            <Stat
              icon={<Cpu className="w-3.5 h-3.5" />}
              label="Heap Min"
              value={formatBytes(heapMinFree)}
              valueColor={heapMinFree != null && heapMinFree < 30720 ? 'text-amber-400' : 'text-zinc-200'}
              tooltip="Historic minimum free DRAM since boot. Low values indicate memory pressure"
            />
            <Stat
              icon={<HardDrive className="w-3.5 h-3.5" />}
              label="PSRAM Free"
              value={formatBytes(freePsram)}
              tooltip="Free external PSRAM in bytes (of 4MB total). Frame buffers live here"
            />
            <Stat
              icon={<HardDrive className="w-3.5 h-3.5" />}
              label="PSRAM Total"
              value={formatBytes(psramTotal)}
              tooltip="Total PSRAM in bytes (normally 4,194,304)"
            />
            <Stat
              icon={<Percent className="w-3.5 h-3.5" />}
              label="PSRAM %"
              value={psramUsedPct != null ? `${psramUsedPct}%` : '—'}
              valueColor={psramUsedPct != null && psramUsedPct > 80 ? 'text-red-400' : 'text-zinc-200'}
              tooltip="Percentage of PSRAM used. If >80% consider reducing frame size"
            />
            <Stat
              icon={<ImageIcon className="w-3.5 h-3.5" />}
              label="Last JPEG"
              value={formatBytes(lastJpegSize)}
              tooltip="Size of the last captured JPEG in bytes"
            />
            <Stat
              icon={<Aperture className="w-3.5 h-3.5" />}
              label="Resolution"
              value={frameSize != null ? (RES_MAP[frameSize] ?? String(frameSize)) : '—'}
              valueColor="text-cyan-400"
              tooltip="Current camera resolution (0=QQVGA 160x120 ... 7=UXGA 1600x1200)"
            />
          </div>
        </div>
      </div>
    </>
  );
}
