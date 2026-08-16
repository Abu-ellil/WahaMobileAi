// src/components/MessageBubble.tsx
// Memoized chat bubble. Long-press copies the message text.
// Bot messages are split into text + fenced code blocks; code blocks get
// copy / save-as-file actions, and html-css-js blocks get a run-in-preview one.

import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Message } from '../services/types';
import { Theme } from '../theme/ThemeProvider';
import { parseSegments, normalizeLang, isRunnableLang, buildPreviewHtml, fileNameFor, CodePart } from '../utils/code';
import { setPreview } from '../store/preview';
import CodeBlock from './CodeBlock';

interface Props {
  message: Message;
  theme: Theme;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ message, theme }: Props) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const isUser = message.role === 'user';

  const segments = useMemo(
    () => (isUser ? null : parseSegments(message.content)),
    [isUser, message.content],
  );
  const codeSegments = useMemo<CodePart[]>(() => {
    if (!segments) return [];
    return segments.flatMap((s) => (s.type === 'code' ? [{ lang: s.lang, code: s.code }] : []));
  }, [segments]);

  const runBlock = useCallback(
    (part: CodePart) => {
      setPreview({
        html: buildPreviewHtml(codeSegments, part),
        fileName: fileNameFor('html'),
      });
      router.push('/preview');
    },
    [codeSegments, router],
  );

  const handleLongPress = useCallback(() => {
    void Clipboard.setStringAsync(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [message.content]);

  return (
    // RTL app: 'row' renders right-to-left, 'row-reverse' renders left-to-right,
    // so user messages hug the right edge and bot messages the left edge.
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowBot]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={handleLongPress}
        style={[
          styles.bubble,
          isUser ? { backgroundColor: theme.colors.userBubble } : { backgroundColor: theme.colors.botBubble },
          !isUser && styles.bubbleShadow,
          message.error && styles.bubbleError,
        ]}
      >
        {isUser || !segments ? (
          <Text
            style={[
              styles.text,
              { fontFamily: theme.font },
              { color: isUser ? theme.colors.userBubbleText : theme.colors.botBubbleText },
            ]}
          >
            {message.content}
          </Text>
        ) : (
          segments.map((seg, i) =>
            seg.type === 'text' ? (
              <Text
                key={i}
                style={[styles.text, { fontFamily: theme.font, color: theme.colors.botBubbleText }]}
              >
                {seg.text}
              </Text>
            ) : (
              <CodeBlock
                key={i}
                lang={normalizeLang(seg.lang)}
                code={seg.code}
                onRun={isRunnableLang(seg.lang) ? () => runBlock({ lang: seg.lang, code: seg.code }) : undefined}
                theme={theme}
              />
            ),
          )
        )}
        <Text
          style={[
            styles.meta,
            { color: isUser ? 'rgba(255,255,255,0.65)' : theme.colors.textMuted },
          ]}
        >
          {copied ? 'تم النسخ ✓' : formatTime(message.createdAt)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginVertical: 4,
  },
  rowUser: {
    justifyContent: 'flex-start', // RTL: visual right
  },
  rowBot: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start', // RTL: visual left
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    maxWidth: '82%',
  },
  bubbleShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleError: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  text: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  meta: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
});

export default memo(MessageBubble);
