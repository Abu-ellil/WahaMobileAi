// app/settings.tsx — شاشة الإعدادات
// كل تغيير يُحفظ فوراً (مع debounce داخلي للكتابة على القرص) — لا زرار حفظ.

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../src/theme/ThemeProvider';
import { useSettings, updateSection, setSettings } from '../src/store/settings';
import { useModels, importModel, deleteModel, activateModel } from '../src/store/models';
import { useChat, clearMessages } from '../src/store/chat';
import { pingRemote, RemotePingResult } from '../src/services/RemoteEngine';
import { isExpoGo } from '../src/services/LocalEngine';
import { ImportedModel } from '../src/services/types';
import Stepper from '../src/components/Stepper';

const CTX_OPTIONS = [512, 1024, 2048, 4096, 8192];

export default function SettingsScreen() {
  const theme = useTheme();
  const { colors, font, fontBold } = theme;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const settings = useSettings();
  const models = useModels();
  const messages = useChat();

  const [testing, setTesting] = useState(false);
  const [ping, setPing] = useState<RemotePingResult | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const model = await importModel();
      if (model) {
        activateModel(model.id);
        Alert.alert('تم الاستيراد', `تم إضافة "${model.fileName}" وتحديده كنموذج نشط.`);
      }
    } catch (e) {
      Alert.alert('خطأ في الاستيراد', e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }, []);

  const handleDeleteModel = useCallback((model: ImportedModel) => {
    Alert.alert('حذف النموذج', `حذف "${model.fileName}" من الجهاز؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          void deleteModel(model.id).catch((e: unknown) => {
            Alert.alert('خطأ', e instanceof Error ? e.message : String(e));
          });
        },
      },
    ]);
  }, []);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setPing(null);
    const result = await pingRemote(settings.remote.baseUrl);
    setPing(result);
    setTesting(false);
    if (!result.ok) {
      Alert.alert(
        'فشل الاتصال',
        'تأكد من:\n• تشغيل الخادم (llama.cpp / Ollama)\n• صحة العنوان بما فيه المنفذ\n• أن الجهاز والسيرفر على نفس الشبكة\n• إعدادات الجدار الناري',
      );
    }
  }, [settings.remote.baseUrl]);

  const confirmClearChat = useCallback(() => {
    Alert.alert('مسح المحادثة', 'حذف كل الرسائل المحفوظة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'مسح', style: 'destructive', onPress: () => clearMessages() },
    ]);
  }, []);

  const serverLabel =
    ping?.server === 'ollama' ? 'Ollama' : ping?.server === 'openai-compatible' ? 'متوافق مع OpenAI (llama.cpp وغيره)' : '';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.headerBg }}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 24, color: colors.headerText, fontFamily: fontBold }}>→</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText, fontFamily: fontBold }]}>
            الإعدادات
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── نمط التشغيل ── */}
        <Section title="نمط التشغيل" theme={theme}>
          <View style={styles.modeCard}>
            <ModeButton
              active={settings.mode === 'remote'}
              onPress={() => setSettings({ mode: 'remote' })}
              label="☁️ بعيد — سيرفر llama.cpp / Ollama"
              theme={theme}
            />
            <ModeButton
              active={settings.mode === 'local'}
              onPress={() => setSettings({ mode: 'local' })}
              label="📱 محلي — نموذج GGUF على الجهاز"
              theme={theme}
            />
          </View>
          {settings.mode === 'local' && isExpoGo() && (
            <Text style={[styles.hint, { color: colors.error, fontFamily: font }]}>
              ⚠ أنت داخل Expo Go — الوضع المحلي يحتاج نسخة تطوير: npx expo run:android
            </Text>
          )}
        </Section>

        {/* ── إعدادات السيرفر البعيد ── */}
        {settings.mode === 'remote' && (
          <Section title="السيرفر البعيد" theme={theme}>
            <Field label="عنوان السيرفر (IP + منفذ)" theme={theme}>
              <View style={styles.urlRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: font }]}
                  value={settings.remote.baseUrl}
                  onChangeText={(t) => updateSection('remote', { baseUrl: t })}
                  placeholder="http://192.168.1.50:8080"
                  placeholderTextColor={colors.textMuted}
                  textAlign="right"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <TouchableOpacity
                  style={[styles.testBtn, { backgroundColor: colors.primary }]}
                  onPress={handleTest}
                  disabled={testing || !settings.remote.baseUrl.trim()}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text style={{ color: colors.onPrimary, fontFamily: fontBold, fontSize: 13 }}>
                      اختبار
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {ping?.ok && (
                <Text style={[styles.okText, { color: colors.success, fontFamily: font }]}>
                  ✓ متصل{serverLabel ? ` — ${serverLabel}` : ''}
                </Text>
              )}
              {ping && !ping.ok && (
                <Text style={[styles.failText, { color: colors.error, fontFamily: font }]}>
                  ✗ فشل الاتصال
                </Text>
              )}
            </Field>

            <Field label="اسم النموذج (Model ID)" theme={theme}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: font }]}
                value={settings.remote.model}
                onChangeText={(t) => updateSection('remote', { model: t })}
                placeholder="مثال: llama-3.2 / qwen2.5:1.5b"
                placeholderTextColor={colors.textMuted}
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {ping && ping.ok && ping.models.length > 0 && (
                <View style={styles.chipRow}>
                  {ping.models.slice(0, 6).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: settings.remote.model === m ? colors.primary : colors.border }]}
                      onPress={() => updateSection('remote', { model: m })}
                    >
                      <Text style={{ color: colors.text, fontFamily: font, fontSize: 12 }} numberOfLines={1}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>

            <Field label="مفتاح API (اختياري)" theme={theme}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: font }]}
                value={settings.remote.apiKey ?? ''}
                onChangeText={(t) => updateSection('remote', { apiKey: t })}
                placeholder="Bearer token إن كان الخادم محمياً"
                placeholderTextColor={colors.textMuted}
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </Field>
          </Section>
        )}

        {/* ── النماذج المحلية ── */}
        {settings.mode === 'local' && (
          <Section title="نماذج GGUF على الجهاز" theme={theme}>
            {models.map((m) => {
              const active = settings.local.modelId === m.id;
              return (
                <View
                  key={m.id}
                  style={[styles.modelRow, { backgroundColor: colors.surfaceAlt, borderColor: active ? colors.primary : colors.border }]}
                >
                  <TouchableOpacity style={styles.flex} onPress={() => activateModel(m.id)}>
                    <Text style={{ color: colors.text, fontFamily: active ? fontBold : font, fontSize: 14 }} numberOfLines={1}>
                      {active ? '● ' : '○ '}
                      {m.fileName}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontFamily: font, fontSize: 11, marginTop: 2 }}>
                      {formatBytes(m.sizeBytes)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteModel(m)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={{ color: colors.error, fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.importBtn, { borderColor: colors.primary }]}
              onPress={handleImport}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary, fontFamily: fontBold, fontSize: 14 }}>
                  ＋ استيراد ملف .gguf
                </Text>
              )}
            </TouchableOpacity>
            <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font }]}>
              يُنسخ الملف إلى مساحة التطبيق حتى لا يعتمد على مجلدات مؤقتة.{'\n'}
              مقترحات للجوال: Llama 3.2 1B أو Qwen2.5 0.5B/1.5B بصيغة Q4_K_M.
            </Text>

            <View style={styles.ctxRow}>
              {CTX_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: settings.local.nCtx === n ? colors.primary : colors.border }]}
                  onPress={() => updateSection('local', { nCtx: n })}
                >
                  <Text style={{ color: colors.text, fontFamily: font, fontSize: 12 }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font, marginTop: -6 }]}>
              حجم السياق (n_ctx) — سياق أكبر = ذاكرة أكبر.
            </Text>

            <Stepper
              label="طبقات GPU (n_gpu_layers)"
              value={settings.local.nGpuLayers}
              step={1}
              min={0}
              max={99}
              onChange={(v) => updateSection('local', { nGpuLayers: v })}
              theme={theme}
            />
            <Stepper
              label="عدد الأنوية (n_threads)"
              value={settings.local.nThreads}
              step={1}
              min={1}
              max={8}
              onChange={(v) => updateSection('local', { nThreads: v })}
              theme={theme}
            />
          </Section>
        )}

        {/* ── معاملات التوليد ── */}
        <Section title="معاملات التوليد" theme={theme}>
          <Stepper
            label="درجة العشوائية (Temperature)"
            value={settings.generation.temperature}
            step={0.1}
            min={0}
            max={2}
            onChange={(v) => updateSection('generation', { temperature: v })}
            format={(v) => v.toFixed(1)}
            theme={theme}
          />
          <Stepper
            label="أقصى طول للرد (tokens)"
            value={settings.generation.maxTokens}
            step={64}
            min={64}
            max={4096}
            onChange={(v) => updateSection('generation', { maxTokens: v })}
            theme={theme}
          />
          <Field label="رسالة النظام (System Prompt)" theme={theme}>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: font },
              ]}
              value={settings.generation.systemPrompt}
              onChangeText={(t) => updateSection('generation', { systemPrompt: t })}
              placeholder="تعليمات تُمرر للنموذج مع كل محادثة…"
              placeholderTextColor={colors.textMuted}
              textAlign="right"
              multiline
            />
          </Field>
        </Section>

        {/* ── بيانات ── */}
        <Section title="البيانات" theme={theme}>
          <TouchableOpacity style={[styles.dangerBtn, { borderColor: colors.error }]} onPress={confirmClearChat} disabled={messages.length === 0}>
            <Text style={{ color: colors.error, fontFamily: fontBold, fontSize: 14, opacity: messages.length === 0 ? 0.4 : 1 }}>
              مسح المحادثة الحالية ({messages.length} رسالة)
            </Text>
          </TouchableOpacity>
          <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font }]}>
            يمسح رسائل المحادثة المفتوحة فقط — بقية السجل لا يتأثر (من 🕘 في الشاشة الرئيسية).
          </Text>
        </Section>
      </ScrollView>
    </View>
  );
}

// ─── Small building blocks ────────────────────────────────────────────────────

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: Theme }) {
  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.primary, fontFamily: theme.fontBold }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Field({ label, children, theme }: { label: string; children: React.ReactNode; theme: Theme }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textMuted, fontFamily: theme.font }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function ModeButton({
  active,
  onPress,
  label,
  theme,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.modeBtn,
        {
          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceAlt,
          borderColor: active ? theme.colors.primary : theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={{
          color: active ? theme.colors.primary : theme.colors.text,
          fontFamily: active ? theme.fontBold : theme.font,
          fontSize: 14,
          textAlign: 'right',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return 'حجم غير معروف';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
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
  backBtn: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, textAlign: 'center' },
  section: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: { fontSize: 14, marginBottom: 12, textAlign: 'right' },
  modeCard: { gap: 8 },
  modeBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
  },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, marginBottom: 6, textAlign: 'right' },
  urlRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlign: 'right',
  },
  textArea: { minHeight: 84, textAlignVertical: 'top', lineHeight: 22 },
  testBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginStart: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  okText: { fontSize: 12, marginTop: 6, textAlign: 'right' },
  failText: { fontSize: 12, marginTop: 6, textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  ctxRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  deleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  importBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  hint: { fontSize: 12, lineHeight: 19, textAlign: 'right', marginBottom: 10 },
  dangerBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
