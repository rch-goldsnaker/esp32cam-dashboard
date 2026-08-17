'use client';

import { AlertTriangle } from 'lucide-react';

export function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        {icon} {title}
      </h3>
      <div className="space-y-3 p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
        {children}
      </div>
    </section>
  );
}

export function Toggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        active ? 'bg-cyan-700 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      <span className="text-xs">{label}</span>
      <span
        className={`w-9 h-5 rounded-full relative transition-colors ${
          active ? 'bg-cyan-400' : 'bg-zinc-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            active ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </button>
  );
}

export function Slider({
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center gap-1">
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
        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-cyan-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
      />
      <div className="flex items-center justify-between text-[9px] text-zinc-600 font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function DrawerShell({
  open,
  onClose,
  title,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">{icon}</span>
            <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 cursor-pointer"
            title="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </header>
        <div className="p-5 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfigError({ error }: { error: string }) {
  if (!error) return null;

  const isConfig = isConfigError(error);

  return (
    <div className={`flex items-start gap-2 px-3 py-2 border rounded-lg ${
      isConfig
        ? 'bg-amber-950/50 border-amber-800/60'
        : 'bg-red-950/50 border-red-900/50'
    }`}>
      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
        isConfig ? 'text-amber-400' : 'text-red-400'
      }`} />
      <div className="flex flex-col gap-0.5">
        <span className={`text-xs ${isConfig ? 'text-amber-200' : 'text-red-300'}`}>{error}</span>
        {error.startsWith('TB not configured') && (
          <span className="text-[10px] text-amber-300/80 font-mono leading-relaxed">
                    1. Check TB_USERNAME/TB_PASSWORD on the server.<br/>
                    2. Set the Device ID in Settings → Connection.
          </span>
        )}
        {error.includes('usuario o contraseña inválidos') && (
          <span className="text-[10px] text-amber-300/80 font-mono leading-relaxed">
                    TB_USERNAME or TB_PASSWORD are incorrect. Check in TB Cloud → Security.
          </span>
        )}
        {error.includes('sin permisos') && (
          <span className="text-[10px] text-amber-300/80 font-mono leading-relaxed">
                    The TB user lacks permissions for this device. Assign the TENANT_ADMIN role in TB.
          </span>
        )}
      </div>
    </div>
  );
}

function isConfigError(msg: string): boolean {
  return (
    msg.startsWith('TB not configured') ||
    msg.includes('invalid username or password') ||
    msg.includes('no permissions') ||
    msg.includes('TB_USERNAME') ||
    msg.includes('Device ID')
  );
}
