// src/store/settings.ts
// Single source of truth for app settings, persisted to AsyncStorage.
// Engines read from this store at request time — no manual syncing anywhere.

import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../services/types';

const KEY = 'gguf.settings.v2';

export const DEFAULT_SETTINGS: AppSettings = {
  mode: 'remote',
  remote: {
    baseUrl: '',
    model: '',
    apiKey: '',
  },
  local: {
    modelId: undefined,
    nCtx: 2048,
    nGpuLayers: 0,
    nThreads: 4,
  },
  generation: {
    temperature: 0.7,
    maxTokens: 512,
    systemPrompt: 'أنت مساعد ذكي باللغة العربية. أجب بإيجاز ووضوح.',
  },
  showAds: true,
};

let state: AppSettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function getSettings(): AppSettings {
  return state;
}

export function setSettings(patch: Partial<AppSettings>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
  scheduleSave();
}

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Updates one nested section (remote / local / generation). */
export function updateSection<K extends 'remote' | 'local' | 'generation'>(
  section: K,
  patch: Partial<AppSettings[K]>,
): void {
  setSettings({ [section]: { ...state[section], ...patch } } as Partial<AppSettings>);
}

export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribeSettings, getSettings);
}

export async function loadSettings(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      state = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        remote: { ...DEFAULT_SETTINGS.remote, ...parsed.remote },
        local: { ...DEFAULT_SETTINGS.local, ...parsed.local },
        generation: { ...DEFAULT_SETTINGS.generation, ...parsed.generation },
        showAds: typeof parsed.showAds === 'boolean' ? parsed.showAds : DEFAULT_SETTINGS.showAds,
      };
      listeners.forEach((fn) => fn());
    }
  } catch {
    // corrupted state — keep defaults
  }
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {
      // storage write failed — settings stay in memory for this session
    });
  }, 400);
}
