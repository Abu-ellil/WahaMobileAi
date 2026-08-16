// src/components/CodeBlock.tsx
// A fenced code block inside a bot message: monospace LTR body + actions
// (copy / save as file / run in preview when html-css-js).

import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme/ThemeProvider';
import { fileNameFor } from '../utils/code';
import { saveCodeFile } from '../services/files';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const COLLAPSED_LINES = 14;

const LANG_LABEL: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
  ts: 'TypeScript',
  py: 'Python',
  sh: 'Shell',
  json: 'JSON',
  java: 'Java',
  kt: 'Kotlin',
  swift: 'Swift',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  php: 'PHP',
  sql: 'SQL',
  go: 'Go',
  rs: 'Rust',
  rb: 'Ruby',
  dart: 'Dart',
  code: 'كود',
};

interface Props {
  lang: string; // already normalized
  code: string;
  /** present only for runnable (html/css/js) blocks */
  onRun?: () => void;
  theme: Theme;
}

function CodeBlock({ lang, code, onRun, theme }: Props) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lineCount = code.split('\n').length;
  const collapsible = lineCount > COLLAPSED_LINES;

  const handleCopy = useCallback(() => {
    void Clipboard.setStringAsync(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [code]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveCodeFile(code, lang, fileNameFor(lang));
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [code, lang, saving]);

  const { colors, dark } = theme;
  const codeBg = dark ? '#0d1117' : '#f6f8fa';
  const codeFg = dark ? '#e6edf3' : '#24292f';

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: codeBg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: dark ? '#161b22' : '#eaeef2' }]}>
        <Text style={[styles.badge, { color: colors.primary, fontFamily: theme.fontBold }]}>
          {LANG_LABEL[lang] ?? lang}
        </Text>
        <View style={styles.actions}>
          {onRun && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onRun} hitSlop={6}>
              <Text style={[styles.btnRunText, { color: colors.onPrimary, fontFamily: theme.fontBold }]}>▶ تشغيل</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnLabel} onPress={handleSave} disabled={saving} hitSlop={6}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Text style={[styles.btnText, { color: saved ? colors.success : colors.textMuted, fontFamily: theme.font }]}>
                {saved ? 'تم الحفظ ✓' : '💾 حفظ'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnLabel} onPress={handleCopy} hitSlop={6}>
            <Text style={[styles.btnText, { color: copied ? colors.success : colors.textMuted, fontFamily: theme.font }]}>
              {copied ? 'تم النسخ ✓' : 'نسخ'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => collapsible && setExpanded((v) => !v)} disabled={!collapsible}>
        <Text
          style={[styles.code, { color: codeFg }]}
          numberOfLines={expanded ? undefined : COLLAPSED_LINES}
          ellipsizeMode="tail"
        >
          {code}
        </Text>
      </TouchableOpacity>

      {collapsible && (
        <TouchableOpacity style={styles.moreBtn} onPress={() => setExpanded((v) => !v)} hitSlop={6}>
          <Text style={[styles.moreText, { color: colors.primary, fontFamily: theme.font }]}>
            {expanded ? 'تقليص ▲' : `عرض الكل (${lineCount} سطر) ▼`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 6,
    overflow: 'hidden',
    minWidth: 220,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  badge: {
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btn: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  btnRunText: {
    fontSize: 11,
  },
  btnLabel: {
    paddingVertical: 2,
  },
  btnText: {
    fontSize: 11,
  },
  code: {
    fontFamily: MONO,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'left',
    writingDirection: 'ltr',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  moreBtn: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  moreText: {
    fontSize: 11,
  },
});

export default memo(CodeBlock);
