'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, Grid, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import Model from './Model';
import CameraTracker from './CameraTracker';

function makeGlowTexture(color: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `${color}ff`);
  gradient.addColorStop(0.35, `${color}88`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function BackgroundGlow() {
  const cyanTex = useMemo(() => makeGlowTexture('#00e5ff'), []);
  const magentaTex = useMemo(() => makeGlowTexture('#c026ff'), []);

  return (
    <group renderOrder={-10}>
      <sprite position={[-9, 7, -22]} scale={[34, 34, 1]}>
        <spriteMaterial
          map={cyanTex}
          color="#00e5ff"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </sprite>
      <sprite position={[12, 4, -26]} scale={[26, 26, 1]}>
        <spriteMaterial
          map={magentaTex}
          color="#c026ff"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </sprite>
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
          <fog attach="fog" args={['#0a0a14', 8, 35]} />

          <BackgroundGlow />

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
