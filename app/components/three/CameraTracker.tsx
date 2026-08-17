'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useCameraStore } from '@/app/store/cameraStore';

const DECIMALS = 2;
const PRECISION = 10 ** DECIMALS;

function r(v: number): number {
  return Math.round(v * PRECISION) / PRECISION;
}

export default function CameraTracker() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const setPosition = useCameraStore((s) => s.setPosition);
  const setTarget = useCameraStore((s) => s.setTarget);
  const setDistance = useCameraStore((s) => s.setDistance);
  const frameRef = useRef(0);

  useFrame((state) => {
    frameRef.current++;
    if (frameRef.current % 3 !== 0) return;

    const cam = state.camera;
    const pos = cam.position;
    const target = controlsRef.current?.target;

    if (!target) return;

    const px = r(pos.x), py = r(pos.y), pz = r(pos.z);
    const tx = r(target.x), ty = r(target.y), tz = r(target.z);

    setPosition([px, py, pz]);
    setTarget([tx, ty, tz]);
    setDistance(r(Math.sqrt((px - tx) ** 2 + (py - ty) ** 2 + (pz - tz) ** 2)));
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.5}
      maxDistance={15}
      maxPolarAngle={Math.PI / 1.8}
      target={[-0.1, 1.0, 0.2]}
    />
  );
}
