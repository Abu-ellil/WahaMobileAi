// src/services/RemoteEngine.ts
// Streams from any OpenAI-compatible server (llama.cpp server, Ollama, LM Studio…)
// using the global fetch from expo/fetch (SDK 57), which supports
// response.body.getReader() on native.

import { AppError, AppSettings, CompletionStats, Message } from './types';

const REQUEST_TIMEOUT_MS = 120_000;

export interface RemotePingResult {
  ok: boolean;
  server: 'ollama' | 'openai-compatible' | 'unknown';
  models: string[];
}

interface ApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function buildApiMessages(settings: AppSettings, history: Message[]): ApiMessage[] {
  const messages: ApiMessage[] = [];
  const sys = settings.generation.systemPrompt.trim();
  if (sys) messages.push({ role: 'system', content: sys });
  for (const m of history) {
    if (m.role === 'system') continue;
    messages.push({ role: m.role, content: m.content });
  }
  return messages;
}

function normalizeBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === 'AbortError' || e.message === 'Aborted');
}

/**
 * Streams a chat completion. onDelta fires per token chunk. If the request is
 * aborted mid-stream, whatever arrived so far is returned instead of throwing,
 * so partial answers are kept.
 */
export async function sendRemote(
  history: Message[],
  settings: AppSettings,
  onDelta: (text: string) => void,
  signal: AbortSignal,
): Promise<CompletionStats> {
  const start = Date.now();
  const base = normalizeBase(settings.remote.baseUrl);
  if (!base) {
    throw new AppError('عنوان السيرفر غير مضبوط — افتح الإعدادات وأدخله أولاً.');
  }
  if (!/^https?:\/\//i.test(base)) {
    throw new AppError('عنوان السيرفر لازم يبدأ بـ http:// أو https://');
  }

  // merge the caller's abort signal with a hard timeout
  const timeoutCtrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    timeoutCtrl.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => timeoutCtrl.abort();
  if (signal.aborted) timeoutCtrl.abort();
  else signal.addEventListener('abort', forwardAbort);

  let text = '';
  let tokenChunks = 0;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (settings.remote.apiKey) headers['Authorization'] = `Bearer ${settings.remote.apiKey}`;

    let res: Response;
    try {
      res = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: settings.remote.model || 'default',
          messages: buildApiMessages(settings, history),
          temperature: settings.generation.temperature,
          max_tokens: settings.generation.maxTokens,
          stream: true,
        }),
        signal: timeoutCtrl.signal,
      });
    } catch (e) {
      if (isAbortError(e)) return { latencyMs: Date.now() - start, totalTokens: tokenChunks };
      throw new AppError('تعذر الوصول للسيرفر. تأكد من العنوان ومن أن الخادم يعمل.');
    }

    if (!res.ok) {
      let detail = '';
      try {
        const body = (await res.text()) as unknown;
        if (typeof body === 'string' && body) {
          try {
            const json = JSON.parse(body) as { error?: { message?: string } | string };
            detail = typeof json.error === 'string' ? json.error : json.error?.message ?? '';
          } catch {
            detail = body.slice(0, 200);
          }
        }
      } catch {
        // ignore body parse issues
      }
      throw new AppError(
        `السيرفر رد بخطأ ${res.status}${detail ? `: ${detail}` : ''}`,
      );
    }
    if (!res.body) {
      throw new AppError('السيرفر لا يدعم البث (streaming) لهذا الطلب.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        let json: {
          choices?: Array<{ delta?: { content?: string } }>;
          usage?: { total_tokens?: number };
        };
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) {
          text += delta;
          tokenChunks += 1;
          onDelta(delta);
        }
      }
    }
  } catch (e) {
    if (isAbortError(e)) {
      // aborted mid-stream — keep what we have
      return { latencyMs: Date.now() - start, totalTokens: tokenChunks };
    }
    throw e;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', forwardAbort);
  }

  if (!text.trim() && timedOut) {
    throw new AppError('انتهت مهلة الطلب (120 ثانية) بدون أي رد من السيرفر.');
  }
  if (!text.trim()) {
    throw new AppError('وصل رد فارغ من السيرفر — جرّب نموذجاً أو إعدادات أخرى.');
  }

  const seconds = (Date.now() - start) / 1000;
  return {
    latencyMs: Date.now() - start,
    totalTokens: tokenChunks,
    tokensPerSecond: seconds > 0 ? tokenChunks / seconds : undefined,
  };
}

/** Connectivity check that understands both Ollama and llama.cpp-style servers. */
export async function pingRemote(baseUrl: string): Promise<RemotePingResult> {
  const base = normalizeBase(baseUrl);
  if (!base) return { ok: false, server: 'unknown', models: [] };

  const tryFetch = async (path: string, timeoutMs: number): Promise<Response | null> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(base + path, { signal: ctrl.signal });
      return res.ok ? res : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  // Ollama-native endpoint first
  const tags = await tryFetch('/api/tags', 4000);
  if (tags) {
    try {
      const data = (await tags.json()) as { models?: Array<{ name?: string }> };
      return {
        ok: true,
        server: 'ollama',
        models: (data.models ?? []).map((m) => m.name ?? '').filter(Boolean),
      };
    } catch {
      return { ok: true, server: 'ollama', models: [] };
    }
  }

  // OpenAI-compatible (llama.cpp server, Ollama /v1, LM Studio…)
  const modelsRes = await tryFetch('/v1/models', 4000);
  if (modelsRes) {
    try {
      const data = (await modelsRes.json()) as { data?: Array<{ id?: string }> };
      return {
        ok: true,
        server: 'openai-compatible',
        models: (data.data ?? []).map((m) => m.id ?? '').filter(Boolean),
      };
    } catch {
      return { ok: true, server: 'openai-compatible', models: [] };
    }
  }

  return { ok: false, server: 'unknown', models: [] };
}
