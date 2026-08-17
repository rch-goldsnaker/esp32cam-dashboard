'use client';

import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useESP32Store } from '@/app/store/esp32Store';
import { useCameraStore } from '@/app/store/cameraStore';

export default function Model() {
  const { scene } = useGLTF('/models/esp32-1.glb');
  const streamEnabled = useESP32Store((s) => s.streamEnabled);
  const modelVisible = useCameraStore((s) => s.modelVisible);
  const modelRotating = useCameraStore((s) => s.modelRotating);
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.name === 'LED_Light') {
        lightRef.current = child as THREE.PointLight;
      }
    });
  }, [scene]);

  useEffect(() => {
    tRef.current = 0;
  }, [streamEnabled]);

  useFrame((_, delta) => {
    const light = lightRef.current;

    if (light) {
      if (streamEnabled) {
        tRef.current += delta;
        const fps = 24;
        const f = tRef.current * fps;

        if (f < 24) {
          light.intensity = 0.1;
        } else if (f < 48) {
          light.intensity = ((f - 24) / 24) * 5 + 0.1;
        } else if (f < 216) {
          const beatDur = 24;
          const rel = f - 48;
          const beat = Math.floor(rel / beatDur);
          const phase = rel % beatDur;
          if (beat < 7 && phase < 12) {
            light.intensity = 0.3 + 4.7 * Math.sin((phase / 12) * Math.PI);
          } else {
            light.intensity = 0.2;
          }
        } else {
          light.intensity = 5;
        }
      } else {
        light.intensity = 0;
      }
    }

    if (groupRef.current && modelRotating) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  if (!modelVisible) return null;

  return (
    <group ref={groupRef} scale={0.6}>
      <primitive object={scene} />
    </group>
  );
}
