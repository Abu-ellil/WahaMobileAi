// src/store/chat.ts
// Multi-conversation chat history (streaming text lives in component state).
// One active conversation feeds the chat screen; every conversation with
// messages is persisted to AsyncStorage, debounced.
//
// Snapshots handed to useSyncExternalStore must keep a stable reference
// between mutations (sorted/filtered lists are cached in `visible`), or React
// re-renders in an infinite loop.

import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, Message, newId } from '../services/types';

const KEY = 'gguf.conversations.v1';
const OLD_KEY = 'gguf.chat.v1'; // pre-history single-chat format
const TITLE_MAX = 42;
const EMPTY_MESSAGES: Message[] = [];

let conversations: Conversation[] = [];
let visible: Conversation[] = []; // cached non-empty list, newest first
let activeId: string | null = null;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// ── Internal helpers ──────────────────────────────────────────────────────────

function getActive(): Conversation | null {
  return conversations.find((c) => c.id === activeId) ?? null;
}

function ensureActive(): Conversation {
  let active = getActive();
  if (!active) {
    active = {
      id: newId(),
      title: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    conversations = [active, ...conversations];
    activeId = active.id;
  }
  return active;
}

/** Recompute the cached list, then notify subscribers. Call after every mutation. */
function commit(): void {
  conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  visible = conversations.filter((c) => c.messages.length > 0);
  listeners.forEach((fn) => fn());
}

function titleFromMessage(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX)}…` : clean;
}

function persistNow(): void {
  void AsyncStorage.setItem(KEY, JSON.stringify(visible)).catch(() => {});
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistNow();
  }, 500);
}

function subscribeChat(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function getMessages(): Message[] {
  return getActive()?.messages ?? EMPTY_MESSAGES;
}

export function getActiveConversation(): Conversation | null {
  return getActive();
}

/** All conversations with content, newest first (cached reference). */
export function listConversations(): Conversation[] {
  return visible;
}

export function useChat(): Message[] {
  return useSyncExternalStore(subscribeChat, getMessages);
}

export function useActiveConversation(): Conversation | null {
  return useSyncExternalStore(subscribeChat, getActiveConversation);
}

export function useConversations(): Conversation[] {
  return useSyncExternalStore(subscribeChat, listConversations);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function addMessage(message: Message): void {
  const active = ensureActive();
  active.messages = [...active.messages, message];
  active.updatedAt = Date.now();
  if (!active.title && message.role === 'user') {
    active.title = titleFromMessage(message.content);
  }
  commit();
  scheduleSave();
}

/** Start a fresh empty conversation; the old one stays in history. */
export function newChat(): void {
  const current = getActive();
  if (current && current.messages.length === 0) return; // already fresh
  const fresh: Conversation = {
    id: newId(),
    title: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  // drop other empty conversations so they never pile up
  conversations = [fresh, ...conversations.filter((c) => c.messages.length > 0)];
  activeId = fresh.id;
  commit();
}

export function setActiveConversation(id: string): void {
  if (activeId === id) return;
  if (!conversations.some((c) => c.id === id)) return;
  activeId = id;
  commit();
}

export function deleteConversation(id: string): void {
  conversations = conversations.filter((c) => c.id !== id);
  if (activeId === id) {
    // conversations is kept newest-first, so this is the most recent remaining
    const next = conversations.find((c) => c.messages.length > 0);
    if (next) {
      activeId = next.id;
    } else {
      activeId = null;
      ensureActive();
    }
  }
  commit();
  persistNow();
}

/** Empty the active conversation (settings' "clear current chat"). */
export function clearMessages(): void {
  const active = getActive();
  if (!active || active.messages.length === 0) return;
  active.messages = [];
  active.title = '';
  active.updatedAt = Date.now();
  commit();
  persistNow();
}

// ── Load + migration ──────────────────────────────────────────────────────────

export async function loadChat(): Promise<void> {
  let migrated = false;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Conversation[];
      if (Array.isArray(parsed)) {
        conversations = parsed.filter(
          (c) => c && typeof c.id === 'string' && Array.isArray(c.messages),
        );
      }
    }

    // migrate the pre-history single-chat format exactly once
    if (conversations.length === 0) {
      const oldRaw = await AsyncStorage.getItem(OLD_KEY);
      if (oldRaw) {
        const oldMessages = JSON.parse(oldRaw) as Message[];
        if (Array.isArray(oldMessages) && oldMessages.length > 0) {
          const firstUser = oldMessages.find((m) => m.role === 'user');
          conversations = [
            {
              id: newId(),
              title: firstUser ? titleFromMessage(firstUser.content) : 'محادثة',
              createdAt: oldMessages[0].createdAt ?? Date.now(),
              updatedAt: oldMessages[oldMessages.length - 1].createdAt ?? Date.now(),
              messages: oldMessages,
            },
          ];
          migrated = true;
        }
      }
    }

    if (conversations.length > 0) {
      conversations.sort((a, b) => b.updatedAt - a.updatedAt);
      activeId = conversations[0].id;
    } else {
      ensureActive();
    }
  } catch {
    // corrupted — start fresh
    conversations = [];
    activeId = null;
    ensureActive();
  }
  commit();

  // drop the old key only after the migrated data is safely persisted,
  // otherwise the next launch retries the migration
  if (migrated && visible.length > 0) {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(visible));
      await AsyncStorage.removeItem(OLD_KEY);
    } catch {
      // old key kept on purpose
    }
  }
}
