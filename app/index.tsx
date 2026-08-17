﻿﻿// app/index.tsx — شاشة المحادثة
// Streaming chat with throttled state updates (one render per ~60ms instead of
// one per token), inverted FlatList for message recycling, and a stop button.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeProvider';
import { useChat, addMessage, getMessages, newChat, useActiveConversation } from '../src/store/chat';
import { useSettings, getSettings } from '../src/store/settings';
import { useModels } from '../src/store/models';
import { chatController } from '../src/services/controller';
import { CompletionStats, Message, newId } from '../src/services/types';
import { isExpoGo } from '../src/services/LocalEngine';
import MessageBubble from '../src/components/MessageBubble';
import ChatInput from '../src/components/ChatInput';
import TypingDots from '../src/components/TypingDots';
import AdBanner from '../src/components/AdBanner';

const FLUSH_INTERVAL_MS = 60;

export default function ChatScreen() {
  const theme = useTheme();
  const { colors, font, fontBold } = theme;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const messages = useChat();
  const activeConversation = useActiveConversation();
  const settings = useSettings();
  const models = useModels();

  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CompletionStats | null>(null);

  const pendingRef = useRef('');
  const pendingReasoningRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopInterval = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  useEffect(() => stopInterval, [stopInterval]);

  const startInterval = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setInterval(() => {
      setStreamText(pendingRef.current);
      setReasoningText(pendingReasoningRef.current);
    }, FLUSH_INTERVAL_MS);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || running) return;

    addMessage({ id: newId(), role: 'user', content: text, createdAt: Date.now() });
    setInput('');
    setError(null);
    setStats(null);
    setStreamText('');
    setReasoningText('');
    pendingRef.current = '';
    pendingReasoningRef.current = '';
    setRunning(true);
    startInterval();

    try {
      const result = await chatController.send(
        getMessages(),
        getSettings(),
        (delta) => {
          pendingRef.current += delta;
        },
        (progress) => setLoadProgress(progress),
        (reasoning) => {
          pendingReasoningRef.current += reasoning;
        },
      );
      stopInterval();
      const finalText = pendingRef.current.trim();
      const finalReasoning = pendingReasoningRef.current.trim();
      if (finalText || finalReasoning) {
        addMessage({
          id: newId(),
          role: 'assistant',
          content: finalText || finalReasoning, // Fallback to reasoning if maxTokens ran out during thinking
          createdAt: Date.now(),
          reasoning_content: finalText && finalReasoning ? finalReasoning : undefined,
        });
      }
      setStats(result.stats);
    } catch (e) {
      stopInterval();
      const partial = pendingRef.current.trim();
      if (partial) {
        addMessage({
          id: newId(),
          role: 'assistant',
          content: partial,
          createdAt: Date.now(),
          error: true,
        });
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      pendingRef.current = '';
      setStreamText('');
      setLoadProgress(null);
      setRunning(false);
    }
  }, [input, running, startInterval, stopInterval]);

  // header subtitle — what we're talking to right now
  const modeLabel =
    settings.mode === 'remote'
      ? settings.remote.baseUrl
        ? `☁️ ${settings.remote.baseUrl.replace(/^https?:\/\//, '')}`
        : '☁️ السيرفر غير مضبوط'
      : settings.local.modelId && models.some((m) => m.id === settings.local.modelId)
        ? `📱 ${models.find((m) => m.id === settings.local.modelId)?.fileName ?? ''}`
        : '📱 لا يوجد نموذج محلي';

  const data = React.useMemo(() => [...messages].reverse(), [messages]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.headerBg }}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={newChat}
            disabled={running}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 20, color: colors.headerText, opacity: running ? 0.4 : 1 }}>
              ←
            </Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text
              style={[styles.title, { color: colors.headerText, fontFamily: fontBold }]}
              numberOfLines={1}
            >
              {activeConversation && activeConversation.title ? activeConversation.title : 'U.O-OO_O←Oc O←O_USO_Oc'}
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.headerText, fontFamily: font }]}
              numberOfLines={1}
            >
              {modeLabel}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/history')}
            disabled={running}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 17, color: colors.headerText, opacity: running ? 0.4 : 1 }}>dY~</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 19, color: colors.headerText }}>←sT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AdBanner visible={settings.showAds} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={data}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} theme={theme} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState theme={theme} />}
          ListHeaderComponent={
            running ? (
              <StreamingBubble
                theme={theme}
                text={streamText}
                reasoning={reasoningText}
                loadProgress={loadProgress}
              />
            ) : null
          }
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        />

        {error != null && (
          <View style={[styles.errorBar, { backgroundColor: colors.errorBg }]}>
            <Text style={[styles.errorText, { color: colors.error, fontFamily: font }]}>
              {error}
            </Text>
          </View>
        )}

        {stats && !running && <StatsBar stats={stats} theme={theme} />}

        <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.inputBg }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={send}
            onStop={() => chatController.stop()}
            running={running}
            theme={theme}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// The inverted FlatList passes its counter-rotation to ListEmptyComponent via
// the style prop — forward it to the root view or the content renders upside down.
function EmptyState({
  theme,
  style,
}: {
  theme: ReturnType<typeof useTheme>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.empty, style]}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text, fontFamily: theme.fontBold }]}>
        مرحباً بك 👋
      </Text>
      <Text style={[styles.emptyDesc, { color: theme.colors.textMuted, fontFamily: theme.font }]}>
        ابدأ محادثتك مع نموذج الذكاء الاصطناعي.{'\n'}
        شغّل نموذجاً على جهازك (GGUF) أو اتصل بسيرفر — كله من ⚙ الإعدادات.
      </Text>
      {isExpoGo() && (
        <Text style={[styles.emptyHint, { color: theme.colors.warning, fontFamily: theme.font }]}>
          أنت تعمل في Expo Go: الوضع البعيد متاح فقط.{'\n'}
          لتشغيل GGUF على الجهاز استخدم npx expo run:android
        </Text>
      )}
    </View>
  );
}

function StreamingBubble({
  theme,
  text,
  reasoning,
  loadProgress,
}: {
  theme: ReturnType<typeof useTheme>;
  text: string;
  reasoning: string;
  loadProgress: number | null;
}) {
  const { colors, font } = theme;
  const isThinking = !text && reasoning.length > 0;
  return (
    <View style={[styles.rowBot, { marginHorizontal: 12, marginVertical: 4 }]}>
      <View style={[styles.streamingBubble, { backgroundColor: colors.botBubble }]}>
        {loadProgress != null ? (
          <Text style={[styles.streamingText, { color: colors.textMuted, fontFamily: font }]}>
            ⏳ جاري تحميل النموذج… {Math.round(loadProgress)}%
          </Text>
        ) : isThinking ? (
          <Text style={[styles.streamingText, { color: colors.textMuted, fontFamily: font, fontStyle: 'italic' }]}>
            🧠 Thinking…
          </Text>
        ) : text ? (
          <Text style={[styles.streamingText, { color: colors.botBubbleText, fontFamily: font }]}>
            {text}
            <Text style={{ color: colors.primary }}> ▍</Text>
          </Text>
        ) : (
          <TypingDots theme={theme} />
        )}
      </View>
    </View>
  );
}

function StatsBar({ stats, theme }: { stats: CompletionStats; theme: ReturnType<typeof useTheme> }) {
  const { colors, font } = theme;
  const parts: string[] = [`⏱ ${(stats.latencyMs / 1000).toFixed(1)}s`];
  if (stats.tokensPerSecond) parts.push(`⚡ ${stats.tokensPerSecond.toFixed(1)} tok/s`);
  if (stats.totalTokens) parts.push(`🔤 ${stats.totalTokens}`);
  return (
    <View style={[styles.statsBar, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.statsText, { color: colors.textMuted, fontFamily: font }]}>
        {parts.join('   ·   ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
  },
  title: { fontSize: 17 },
  subtitle: { fontSize: 11, opacity: 0.85, marginTop: 1 },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingVertical: 10, flexGrow: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 21, marginBottom: 10 },
  emptyDesc: { fontSize: 14, lineHeight: 23, textAlign: 'center' },
  emptyHint: { fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 18 },
  rowBot: { flexDirection: 'row-reverse', justifyContent: 'flex-start' },
  streamingBubble: {
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '82%',
    minHeight: 40,
    justifyContent: 'center',
  },
  streamingText: { fontSize: 15, lineHeight: 23, textAlign: 'right' },
  errorBar: { marginHorizontal: 12, marginBottom: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  errorText: { fontSize: 13, textAlign: 'right' },
  statsBar: { marginHorizontal: 12, marginBottom: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  statsText: { fontSize: 12, textAlign: 'right' },
});
