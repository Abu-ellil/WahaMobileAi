// src/store/models.ts
// Imported GGUF models. Files are copied once into app storage so picker
// URIs (which are transient) never break later loads.

import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FS from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { AppError, ImportedModel, newId } from '../services/types';
import { getSettings, updateSection } from './settings';
import { releaseLocalModel } from '../services/LocalEngine';

const KEY = 'gguf.models.v1';
const MODELS_DIR = FS.documentDirectory + 'models/';

let models: ImportedModel[] = [];
const listeners = new Set<() => void>();

export function getModels(): ImportedModel[] {
  return models;
}

export function getActiveModel(): ImportedModel | undefined {
  const id = getSettings().local.modelId;
  return models.find((m) => m.id === id);
}

function subscribeModels(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useModels(): ImportedModel[] {
  return useSyncExternalStore(subscribeModels, getModels);
}

export async function loadModels(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ImportedModel[];
      if (Array.isArray(parsed)) {
        // drop entries whose file vanished (uninstall/cache clears)
        models = parsed.filter((m) => typeof m?.path === 'string');
        listeners.forEach((fn) => fn());
      }
    }
  } catch {
    // corrupted — start fresh
  }
}

function persist(): void {
  void AsyncStorage.setItem(KEY, JSON.stringify(models)).catch(() => {});
}

/** Opens the document picker, copies the .gguf into app storage, returns it. */
export async function importModel(): Promise<ImportedModel | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset?.uri) throw new AppError('لم يتم اختيار ملف.');

  if (!/\.gguf$/i.test(asset.name ?? asset.uri)) {
    throw new AppError('الملف المختار ليس بصيغة .gguf');
  }

  await FS.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  const safeName = (asset.name ?? `model-${Date.now()}.gguf`).replace(/[\\/:*?"<>|]/g, '_');
  const dest = MODELS_DIR + `${newId()}-${safeName}`;
  await FS.copyAsync({ from: asset.uri, to: dest });

  const info = await FS.getInfoAsync(dest);
  const model: ImportedModel = {
    id: newId(),
    fileName: safeName,
    path: dest,
    sizeBytes: info.exists && 'size' in info ? info.size : (asset.size ?? 0),
    addedAt: Date.now(),
  };

  models = [...models, model];
  persist();
  listeners.forEach((fn) => fn());
  return model;
}

export async function deleteModel(id: string): Promise<void> {
  const model = models.find((m) => m.id === id);
  if (!model) return;

  await FS.deleteAsync(model.path, { idempotent: true }).catch(() => {});
  models = models.filter((m) => m.id !== id);
  persist();
  listeners.forEach((fn) => fn());

  if (getSettings().local.modelId === id) {
    updateSection('local', { modelId: undefined });
    await releaseLocalModel();
  }
}

/** Sets the active local model; the engine reloads lazily on next send. */
export function activateModel(id: string): void {
  updateSection('local', { modelId: id });
}
