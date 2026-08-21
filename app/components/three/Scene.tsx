'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, Grid, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import Model from './Model';
import CameraTracker from './CameraTracker';

interface BuildingSpec {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  seed: number;
}

const WINDOW_PALETTE = ['#7ce8ff', '#ff5fe0', '#ffd166', '#9d7bff'];

function Building({ x, z, width, depth, height, seed }: BuildingSpec) {
  const rotationY = Math.atan2(-x, -z);
  const neonColor = seed > 0.5 ? '#00e5ff' : '#c026ff';
  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth)),
    [width, height, depth]
  );

  const windows = useMemo(() => {
    const cols = Math.max(2, Math.round(width * 2.2));
    const rows = Math.max(2, Math.round(height / 0.65));
    const items: { pos: [number, number, number]; color: string }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.4) continue;
        const wx = -width / 2 + (c + 0.5) * (width / cols);
        const wy = 0.4 + r * 0.65;
        if (wy > height - 0.25) continue;
        items.push({
          pos: [wx, wy - height / 2, depth / 2 + 0.02],
          color: WINDOW_PALETTE[Math.floor(Math.random() * WINDOW_PALETTE.length)],
        });
      }
    }
    return items;
  }, [width, height, depth]);

  const instRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = instRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    windows.forEach((w, i) => {
      dummy.position.set(w.pos[0], w.pos[1], w.pos[2]);
      dummy.scale.set(0.16, 0.26, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(w.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [windows]);

  return (
    <group position={[x, height / 2, z]} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#0a0916" roughness={0.9} metalness={0.05} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={neonColor} transparent opacity={0.4} toneMapped={false} />
      </lineSegments>
      {windows.length > 0 && (
        <instancedMesh ref={instRef} args={[undefined, undefined, windows.length]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  );
}

function CitySkyline() {
  const buildings = useMemo(() => {
    const list: BuildingSpec[] = [];
    const rings = [
      { radius: 15, count: 12, minH: 2.5, maxH: 6 },
      { radius: 24, count: 16, minH: 4, maxH: 11 },
      { radius: 36, count: 20, minH: 7, maxH: 19 },
    ];
    rings.forEach((ring) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + Math.random() * 0.3;
        const r = ring.radius + (Math.random() - 0.5) * 4;
        list.push({
          x: Math.sin(angle) * r,
          z: Math.cos(angle) * r,
          width: 1.4 + Math.random() * 2.2,
          depth: 1.4 + Math.random() * 2.2,
          height: ring.minH + Math.random() * (ring.maxH - ring.minH),
          seed: Math.random(),
        });
      }
    });
    return list;
  }, []);

  return (
    <group renderOrder={-5}>
      {buildings.map((b, i) => (
        <Building key={i} {...b} />
      ))}
    </group>
  );
}

function Fallback() {
  return (
    <div className="flex items-center justify-center h-full w-full text-zinc-500">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-2 border-zinc-600 border-t-cyan-500 rounded-full animate-spin" />
        <span className="text-sm font-mono">Cargando modelo 3D...</span>
      </div>
    </div>
  );
}

export default function Scene() {
  return (
    <div className="w-full h-full min-h-0">
      <Canvas
        camera={{ position: [1.8, 2.0, -4.1], fov: 45 }}
        style={{ background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a14 100%)' }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#0a0a14', 10, 46]} />

          <CitySkyline />

          <ambientLight intensity={0.3} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={20}
            shadow-camera-left={-5}
            shadow-camera-right={5}
            shadow-camera-top={5}
            shadow-camera-bottom={-5}
          />
          <directionalLight position={[-3, 3, -3]} intensity={0.4} color="#8b5cf6" />

          <pointLight position={[0, 2, -5]} intensity={2} color="#00ffff" />
          <pointLight position={[-4, 1, 2]} intensity={1.5} color="#8b5cf6" />
          <pointLight position={[3, 0.5, -2]} intensity={0.8} color="#ff00ff" />
          <spotLight position={[0, 6, 0]} intensity={0.8} angle={0.5} penumbra={1} color="#ffffff" />

          <Environment preset="city" environmentIntensity={0.2} />

          <Model />

          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.4}
            scale={6}
            blur={2}
            far={4}
          />

          <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

          <CameraTracker />

          <Grid
            position={[0, -0.01, 0]}
            args={[100, 100]}
            cellSize={0.5}
            cellThickness={0.6}
            cellColor="#1a0033"
            sectionSize={1}
            sectionThickness={1.2}
            sectionColor="#4c1d95"
            fadeDistance={30}
            fadeStrength={1}
            infiniteGrid
          />
        </Suspense>

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={0.8}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <ChromaticAberration offset={[0.0005, 0.0005] as [number, number]} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export { Fallback };
