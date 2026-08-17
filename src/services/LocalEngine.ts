// src/services/LocalEngine.ts
// On-device GGUF inference via llama.rn.
//
// The llama.rn import is dynamic: its native module only exists in custom dev
// client builds, so in Expo Go we fail with a clear message instead of crashing
// at bundle time. The loaded context is kept alive between messages (huge win —
// no re-init, KV cache reused) and reloads only when model/params change.

import Constants from 'expo-constants';
import type { LlamaContext } from 'llama.rn';
import { AppError, AppSettings, CompletionStats, Message } from './types';

let ctx: LlamaContext | null = null;
let ctxKey = '';
let activeContext: LlamaContext | null = null;

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

async function findModel(settings: AppSettings) {
  // Lazy import breaks the circular dependency: models.ts ↔ LocalEngine.ts
  const { getModels } = await import('../store/models');
  const model = getModels().find((m) => m.id === settings.local.modelId);
  if (!model) {
    throw new AppError('لا يوجد نموذج GGUF محدد — استورد نموذجاً من الإعدادات أولاً.');
  }
  return model;
}

async function ensureContext(
  settings: AppSettings,
  onProgress?: (progress: number) => void,
): Promise<LlamaContext> {
  if (isExpoGo()) {
    throw new AppError(
      'الوضع المحلي يحتاج نسخة تطوير مخصصة (npx expo run:android) — llama.rn لا يعمل داخل Expo Go.',
    );
  }
  const model = await findModel(settings);
  const key = `${model.path}|${settings.local.nCtx}|${settings.local.nGpuLayers}|${settings.local.nThreads}`;
  if (ctx && key === ctxKey) return ctx;

  if (ctx) {
    await ctx.release().catch(() => {});
    ctx = null;
    ctxKey = '';
  }

  const { initLlama } = await import('llama.rn');
  try {
    ctx = await initLlama(
      {
        model: model.path,
        n_ctx: settings.local.nCtx,
        n_gpu_layers: settings.local.nGpuLayers,
        n_threads: settings.local.nThreads,
        use_mlock: true,
      },
      onProgress,
    );
  } catch (e) {
    ctx = null;
    throw new AppError(
      e instanceof Error && e.message
        ? `فشل تحميل النموذج: ${e.message}`
        : 'فشل تحميل النموذج — قد يكون أكبر من ذاكرة الجهاز.',
    );
  }
  ctxKey = key;
  return ctx;
}

/** true while a local model is loaded and matches the given settings */
export function isLocalModelLoaded(settings: AppSettings): boolean {
  if (!ctx) return false;
  const key = ctxKey;
  if (!key) return false;
  return true;
}

export async function sendLocal(
  history: Message[],
  settings: AppSettings,
  onDelta: (text: string) => void,
  onProgress?: (progress: number) => void,
  onReasoning?: (text: string) => void,
): Promise<CompletionStats> {
  const start = Date.now();
  const context = await ensureContext(settings, onProgress);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  const sys = settings.generation.systemPrompt.trim();
  if (sys) messages.push({ role: 'system', content: sys });
  for (const m of history) {
    if (m.role === 'system') continue;
    messages.push({ role: m.role, content: m.content });
  }

  activeContext = context;
  try {
    const result = await context.completion(
      {
        messages,
        n_predict: settings.generation.maxTokens,
        temperature: settings.generation.temperature,
      },
      (data) => {
        // Capture reasoning/thinking content from models that support it
        if (data.reasoning_content && onReasoning) {
          onReasoning(data.reasoning_content);
        }
        // data.token is the new incremental piece — not accumulated
        const piece = data.token ?? data.content ?? '';
        if (piece) onDelta(piece);
      },
    );

    const tps = result?.timings?.predicted_per_second;
    return {
      latencyMs: Date.now() - start,
      tokensPerSecond: tps,
      totalTokens: result?.timings?.predicted_n,
    };
  } finally {
    activeContext = null;
  }
}

export async function stopLocal(): Promise<void> {
  await activeContext?.stopCompletion().catch(() => {});
}

export async function releaseLocalModel(): Promise<void> {
  if (ctx) {
    await ctx.release().catch(() => {});
    ctx = null;
    ctxKey = '';
  }
}
