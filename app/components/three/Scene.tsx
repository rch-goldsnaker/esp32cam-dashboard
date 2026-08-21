'use client';

import { Suspense, useMemo } from 'react';
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

const WINDOW_PALETTE = ['#7ce8ff', '#ff5fe0', '#ffd166', '#9d7bff', '#ffffff'];
const FACADE_PALETTE = ['#0b0a17', '#0e0a1e', '#0a1018', '#120a16', '#0a0e1a'];

function makeWindowEmissiveTexture(width: number, height: number): THREE.CanvasTexture {
  const texW = 128;
  const texH = Math.max(64, Math.round(texW * (height / Math.max(width, 0.5))));
  const canvas = document.createElement('canvas');
  canvas.width = texW;
  canvas.height = texH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, texW, texH);

  const cols = Math.max(3, Math.round(width * 2.6));
  const rows = Math.max(4, Math.round(height * 2.1));
  const cellW = texW / cols;
  const cellH = texH / rows;
  const marginRows = 1;

  for (let r = marginRows; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.36) continue;
      const pad = Math.min(cellW, cellH) * 0.22;
      ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      ctx.fillStyle = WINDOW_PALETTE[Math.floor(Math.random() * WINDOW_PALETTE.length)];
      ctx.fillRect(c * cellW + pad, r * cellH + pad, cellW - pad * 2, cellH - pad * 2);
    }
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Building({ x, z, width, depth, height, seed }: BuildingSpec) {
  const rotationY = Math.atan2(-x, -z);
  const neonColor = seed > 0.5 ? '#00e5ff' : '#c026ff';
  const facadeColor = FACADE_PALETTE[Math.floor(seed * FACADE_PALETTE.length) % FACADE_PALETTE.length];

  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth)),
    [width, height, depth]
  );
  const windowMap = useMemo(() => makeWindowEmissiveTexture(width, height), [width, height]);

  const hasCap = seed > 0.55;
  const hasAntenna = height > 11 && seed < 0.75;
  const capSize = Math.min(width, depth) * 0.45;

  return (
    <group position={[x, height / 2, z]} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={facadeColor}
          roughness={0.55 + seed * 0.3}
          metalness={0.35}
          emissiveMap={windowMap}
          emissive="#ffffff"
          emissiveIntensity={1.6}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={neonColor} transparent opacity={0.35} toneMapped={false} />
      </lineSegments>
      {hasCap && (
        <mesh position={[0, height / 2 + capSize * 0.3, 0]}>
          <boxGeometry args={[capSize, capSize * 0.6, capSize]} />
          <meshStandardMaterial color={facadeColor} roughness={0.6} metalness={0.4} />
        </mesh>
      )}
      {hasAntenna && (
        <mesh position={[0, height / 2 + 1.1, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 2.2, 6]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.7} />
        </mesh>
      )}
      {hasAntenna && (
        <mesh position={[0, height / 2 + 2.2, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={neonColor} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function CitySkyline() {
  const buildings = useMemo(() => {
    const list: BuildingSpec[] = [];
    const rings = [
      { radius: 30, count: 18, minH: 4, maxH: 10 },
      { radius: 45, count: 24, minH: 6, maxH: 16 },
      { radius: 62, count: 28, minH: 9, maxH: 24 },
      { radius: 80, count: 32, minH: 12, maxH: 30 },
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
          <fog attach="fog" args={['#0a0a14', 20, 95]} />

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

          <Stars radius={90} depth={60} count={3000} factor={4} saturation={0} fade speed={1} />

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
            fadeDistance={55}
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
