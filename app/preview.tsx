// app/preview.tsx — شاشة تشغيل الكود
// Runs a composed HTML document (from the chat's html/css/js blocks) inside a
// WebView. On web the same document is shown in an iframe (WebView has no web
// implementation).

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../src/theme/ThemeProvider';
import { getPreview } from '../src/store/preview';
import { saveCodeFile } from '../src/services/files';

export default function PreviewScreen() {
  const theme = useTheme();
  const { colors, font, fontBold } = theme;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Captured once on mount — the payload lives in memory, not in route params.
  const [preview] = useState(getPreview);
  const [saving, setSaving] = useState(false);

  const share = useCallback(async () => {
    if (!preview || saving) return;
    setSaving(true);
    try {
      await saveCodeFile(preview.html, 'html', preview.fileName);
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [preview, saving]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.headerBg }}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
            <Text style={{ fontSize: 22, color: colors.headerText, lineHeight: 26 }}>›</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={[styles.title, { color: colors.headerText, fontFamily: fontBold }]} numberOfLines={1}>
              تشغيل الكود
            </Text>
            {preview && (
              <Text
                style={[styles.subtitle, { color: colors.headerText, fontFamily: font }]}
                numberOfLines={1}
              >
                {preview.fileName}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={share} disabled={!preview || saving} hitSlop={8}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={{ fontSize: 17, color: colors.headerText, opacity: preview ? 1 : 0.4 }}>💾</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {!preview ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted, fontFamily: font }]}>
            لا توجد معاينة. اطلب كوداً من النموذج ثم اضغط ▶ تشغيل.
          </Text>
        </View>
      ) : Platform.OS === 'web' ? (
        <iframe srcDoc={preview.html} title="preview" style={styles.iframe} />
      ) : (
        <WebView
          style={styles.webview}
          originWhitelist={['*']}
          source={{ html: preview.html }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.webview, styles.loading]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          renderError={() => (
            <View style={[styles.webview, styles.loading]}>
              <Text style={[styles.emptyText, { color: colors.error, fontFamily: font }]}>
                تعذر تشغيل المعاينة.
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  webview: { flex: 1, backgroundColor: '#ffffff' },
  iframe: {
    flex: 1,
    width: '100%',
    height: '100%',
    border: 'none',
  } as never,
  loading: { alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
