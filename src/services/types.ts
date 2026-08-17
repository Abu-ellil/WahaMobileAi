// src/services/types.ts
// Shared types for the whole app.

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  /** true when this message holds a partial/error generation */
  error?: boolean;
  /** reasoning/thinking content from models that support it (e.g. Qwen, DeepSeek) */
  reasoning_content?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface RemoteSettings {
  baseUrl: string; // e.g. "http://192.168.1.50:8080"
  model: string;   // model id understood by the server
  apiKey?: string; // optional, for servers behind auth
}

export interface LocalSettings {
  modelId?: string; // id of an imported GGUF (see store/models)
  nCtx: number;     // context window
  nGpuLayers: number;
  nThreads: number;
}

export interface GenerationSettings {
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface AppSettings {
  mode: 'local' | 'remote';
  remote: RemoteSettings;
  local: LocalSettings;
  generation: GenerationSettings;
}

export interface ImportedModel {
  id: string;
  fileName: string;
  path: string; // persistent file:// URI inside app storage
  sizeBytes: number;
  addedAt: number;
}

export interface CompletionStats {
  latencyMs: number;
  tokensPerSecond?: number;
  totalTokens?: number;
}

export interface SendResult {
  stats: CompletionStats;
  /** true when the user pressed stop — text may be partial */
  aborted: boolean;
}

/** Error with a user-facing Arabic message. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
