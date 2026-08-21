'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import BottomMenu from './BottomMenu';
import SettingsDrawer from './SettingsDrawer';
import ConexionDrawer from './ConexionDrawer';
import CameraStreamPanel from './CameraStreamPanel';
import DeviceStatusBar from './DeviceStatusBar';
import SettingsPanel from './SettingsPanel';
import { Fallback } from '../three/Scene';
import { useESP32Store } from '@/app/store/esp32Store';
import { getDeviceId } from '@/app/lib/deviceId';

const Scene = dynamic(() => import('../three/Scene'), {
  ssr: false,
  loading: () => <Fallback />,
});

let initialDeviceId: string | null = null;
let initialized = false;

function readInitialDeviceId(): string | null {
  if (!initialized) {
    initialized = true;
    initialDeviceId = getDeviceId();
  }
  return initialDeviceId;
}

export default function Dashboard() {
  const deviceId = useESP32Store((s) => s.deviceId);
  const setDeviceId = useESP32Store((s) => s.setDeviceId);
  const syncFromTB = useESP32Store((s) => s.syncFromTB);
  const streamEnabled = useESP32Store((s) => s.streamEnabled);
  const frameSize = useESP32Store((s) => s.frameSize);
  const imageQuality = useESP32Store((s) => s.imageQuality);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conexionOpen, setConexionOpen] = useState(false);
  const [settingsKey, setSettingsKey] = useState(0);
  const [conexionKey, setConexionKey] = useState(0);

  const storedId = readInitialDeviceId();

  useEffect(() => {
    if (storedId && !deviceId) {
      setDeviceId(storedId);
    }
  }, [storedId, deviceId, setDeviceId]);

  useEffect(() => {
    if (deviceId) {
      syncFromTB();
    }
  }, [deviceId, syncFromTB]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <main className="flex-1 relative min-w-0">
        <Scene />

        <DeviceStatusBar />

        <CameraStreamPanel
          key={streamEnabled ? 'stream-on' : 'stream-off'}
          streaming={streamEnabled}
          frameSize={frameSize}
          quality={imageQuality}
        />

        <BottomMenu
          onOpenSettings={() => { setSettingsKey((k) => k + 1); setSettingsOpen(true); }}
          onOpenConexion={() => { setConexionKey((k) => k + 1); setConexionOpen(true); }}
        />

        <SettingsDrawer key={`settings-${settingsKey}`} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <SettingsPanel />
        <ConexionDrawer key={`conexion-${conexionKey}`} open={conexionOpen} onClose={() => setConexionOpen(false)} />
      </main>
    </div>
  );
}