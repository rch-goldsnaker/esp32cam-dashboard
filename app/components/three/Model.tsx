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
  const flashLedOn = useESP32Store((s) => s.flashLedOn);
  const modelVisible = useCameraStore((s) => s.modelVisible);
  const modelRotating = useCameraStore((s) => s.modelRotating);
  const groupRef = useRef<THREE.Group>(null);
  const tRef = useRef(0);

  const flashMeshRef = useRef<THREE.Mesh | null>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const flashBurstRef = useRef(0);
  const prevFlashOnRef = useRef(false);

  const lensMeshRef = useRef<THREE.Object3D | null>(null);
  const lensLightRef = useRef<THREE.PointLight>(null);
  const scanRingRef = useRef<THREE.Mesh>(null);
  const scanRingScaleRef = useRef(1);
  const frontDirRef = useRef(new THREE.Vector2(1, 0));

  useEffect(() => {
    scene.traverse((child) => {
      if (child.name === 'LED_SMD_5050_White_v1_Yellow_0') {
        flashMeshRef.current = child as THREE.Mesh;
      }
      if (child.name === 'User_Library_ov9655_ov9655_lens_Lens_0') {
        lensMeshRef.current = child;
      }
    });

    groupRef.current?.updateWorldMatrix(true, true);

    if (flashMeshRef.current && groupRef.current && flashLightRef.current) {
      const worldPos = new THREE.Vector3();
      flashMeshRef.current.getWorldPosition(worldPos);
      groupRef.current.worldToLocal(worldPos);
      flashLightRef.current.position.copy(worldPos);
    }

    if (lensMeshRef.current && groupRef.current && lensLightRef.current) {
      const worldPos = new THREE.Vector3();
      lensMeshRef.current.getWorldPosition(worldPos);
      groupRef.current.worldToLocal(worldPos);
      lensLightRef.current.position.copy(worldPos);
      frontDirRef.current.set(worldPos.x, worldPos.z);
    }

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    scanRingScaleRef.current = Math.max(size.x, size.z) * 0.62;
  }, [scene]);

  useEffect(() => {
    tRef.current = 0;
  }, [streamEnabled]);

  useEffect(() => {
    if (flashLedOn && !prevFlashOnRef.current) {
      flashBurstRef.current = 1;
    }
    prevFlashOnRef.current = flashLedOn;
  }, [flashLedOn]);

  useFrame((_, delta) => {
    const lensLight = lensLightRef.current;

    if (lensLight) {
      if (streamEnabled) {
        tRef.current += delta;
        const fps = 24;
        const f = tRef.current * fps;

        if (f < 24) {
          lensLight.intensity = 0.1;
        } else if (f < 48) {
          lensLight.intensity = ((f - 24) / 24) * 5 + 0.1;
        } else if (f < 216) {
          const beatDur = 24;
          const rel = f - 48;
          const beat = Math.floor(rel / beatDur);
          const phase = rel % beatDur;
          if (beat < 7 && phase < 12) {
            lensLight.intensity = 0.3 + 4.7 * Math.sin((phase / 12) * Math.PI);
          } else {
            lensLight.intensity = 0.2;
          }
        } else {
          lensLight.intensity = 5;
        }
      } else {
        lensLight.intensity = THREE.MathUtils.lerp(lensLight.intensity, 0, delta * 6);
      }
    }

    if (lensMeshRef.current) {
      const mat = lensMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissive.set('#00e5ff');
      const targetGlow = lensLight ? Math.min(lensLight.intensity / 2.5, 2) : 0;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity ?? 0, targetGlow, delta * 8);
    }

    if (scanRingRef.current) {
      scanRingRef.current.rotation.z += delta * (streamEnabled ? 0.6 : 0.08);
      const mat = scanRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, streamEnabled ? 0.55 : 0, delta * 4);
      scanRingRef.current.scale.setScalar(scanRingScaleRef.current);
    }

    if (groupRef.current) {
      if (streamEnabled) {
        const camPos = useCameraStore.getState().position;
        const frontAngle = Math.atan2(frontDirRef.current.y, frontDirRef.current.x);
        const desiredAngle = Math.atan2(camPos[2], camPos[0]);
        const targetY = frontAngle - desiredAngle;

        let angleDelta = targetY - groupRef.current.rotation.y;
        angleDelta = Math.atan2(Math.sin(angleDelta), Math.cos(angleDelta));
        groupRef.current.rotation.y += angleDelta * Math.min(1, delta * 3);
      } else if (modelRotating) {
        groupRef.current.rotation.y += delta * 0.3;
      }
    }

    if (flashBurstRef.current > 0) {
      flashBurstRef.current = Math.max(0, flashBurstRef.current - delta * 2.5);
    }

    const flashLight = flashLightRef.current;
    const flashMesh = flashMeshRef.current;
    const targetIntensity = (flashLedOn ? 6 : 0) + flashBurstRef.current * 18;

    if (flashLight) {
      flashLight.intensity = THREE.MathUtils.lerp(flashLight.intensity, targetIntensity, delta * 10);
    }

    if (flashMesh) {
      const mat = flashMesh.material as THREE.MeshStandardMaterial;
      const targetEmissive = (flashLedOn ? 1.4 : 0) + flashBurstRef.current * 4;
      mat.emissive.set('#fffbe6');
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity ?? 0, targetEmissive, delta * 10);
    }
  });

  if (!modelVisible) return null;

  return (
    <group ref={groupRef} scale={0.6}>
      <primitive object={scene} />
      <pointLight
        ref={flashLightRef}
        color="#fffbe6"
        intensity={0}
        distance={4}
        decay={2}
      />
      <pointLight
        ref={lensLightRef}
        color="#00e5ff"
        intensity={0}
        distance={3}
        decay={2}
      />
      <mesh ref={scanRingRef} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[1, 1.06, 64]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
