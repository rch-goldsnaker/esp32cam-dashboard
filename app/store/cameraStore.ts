import { create } from 'zustand';

interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
  modelVisible: boolean;
  modelRotating: boolean;
  setPosition: (pos: [number, number, number]) => void;
  setTarget: (target: [number, number, number]) => void;
  setDistance: (d: number) => void;
  setModelVisible: (v: boolean) => void;
  setModelRotating: (v: boolean) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  position: [1.8, 2.0, -4.1],
  target: [-0.1, 1.0, 0.2],
  distance: 4.74,
  modelVisible: true,
  modelRotating: true,
  setPosition: (position) => set({ position }),
  setTarget: (target) => set({ target }),
  setDistance: (distance) => set({ distance }),
  setModelVisible: (modelVisible) => set({ modelVisible }),
  setModelRotating: (modelRotating) => set({ modelRotating }),
}));
