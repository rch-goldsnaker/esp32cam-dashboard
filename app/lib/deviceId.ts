'use client';

const STORAGE_KEY = 'tb_device_id';

export function getDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setDeviceId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function clearDeviceId(): void {
  localStorage.removeItem(STORAGE_KEY);
}
