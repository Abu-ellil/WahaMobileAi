// src/services/controller.ts
// One entry point the chat screen talks to. Routes to the local or remote
// engine and owns abort/stop for both.

import { AppSettings, Message, SendResult } from './types';
import { sendRemote } from './RemoteEngine';
import { sendLocal, stopLocal } from './LocalEngine';

class ChatController {
  private aborter: AbortController | null = null;
  private mode: 'local' | 'remote' = 'remote';

  async send(
    history: Message[],
    settings: AppSettings,
    onDelta: (text: string) => void,
    onLoadProgress?: (progress: number) => void,
  ): Promise<SendResult> {
    this.aborter = new AbortController();
    this.mode = settings.mode;

    const stats =
      settings.mode === 'local'
        ? await sendLocal(history, settings, onDelta, onLoadProgress)
        : await sendRemote(history, settings, onDelta, this.aborter.signal);

    return { stats, aborted: this.aborter.signal.aborted };
  }

  stop(): void {
    this.aborter?.abort();
    if (this.mode === 'local') void stopLocal();
  }

  async unloadLocalModel(): Promise<void> {
    const { releaseLocalModel } = await import('./LocalEngine');
    await releaseLocalModel();
  }
}

export const chatController = new ChatController();
