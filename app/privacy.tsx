// app/privacy.tsx — سياسة الخصوصية

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../src/theme/ThemeProvider';

const sections = [
  {
    title: 'نظرة عامة',
    body: 'تطبيق واحتي للذكاء الاصطناعي (Wahaty AI) يهدف إلى توفير تجربة محادثة ذكية مع نماذج لغوية كبيرة. نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.',
  },
  {
    title: 'البيانات التي نجمعها',
    body: 'يحتوي التطبيق على نوعين من البيانات:\n\n• البيانات المحلية: جميع محادثاتك ونماذج الذكاء الاصطناعي تُخزن محلياً على جهازك فقط. لا يتم رفع أي محتوى إلى خوادم خارجية إلا في وضع السيرفر البعيد.\n\n• بيانات السيرفر البعيد: عند استخدام وضع السيرفر البعيد، قد يتم إرسال رسائلك إلى الخادم الخارجي وفقاً لسياسات الخصوصية الخاصة بذلك الخادم.',
  },
  {
    title: 'كيف نستخدم بياناتك',
    body: '• معالجة محادثاتك محلياً عبر نموذج GGUF\n• حفظ سجل المحادثات لتسهيل الوصول إليها لاحقاً\n• عرض معاينات الأكواد المولدة\n• لا نشارك بياناتك مع أطراف ثالثة',
  },
  {
    title: 'النماذج المحلية (GGUF)',
    body: 'عند استيراد نموذج GGUF، يُنسخ الملف إلى مساحة التطبيق المحفوظة على جهازك. نحتفظ بالملف طالما طلبت ذلك. يمكنك حذف النموذج في أي وقت من شاشة الإعدادات، وسيتم حذف الملف نهائياً من جهازك.',
  },
  {
    title: 'السيرفر البعيد',
    body: 'عند استخدام وضع السيرفر البعيد (OpenAI / Ollama)، تُرسل رسائلك إلى عنوان السيرفر الذي تدخله بنفسك. نحن لا نتحكم في كيفية معالجة هذا السيرفر لبياناتك، ولذلك ننصح بمراجعة سياسة الخصوصية الخاصة بخادمك.',
  },
  {
    title: 'أذونات التطبيق',
    body: '• Storage (التخزين): لاستيراد ملفات GGUF وحفظ سجل المحادثات محلياً\n• Internet (الإنترنت): للاتصال بالسيرفر البعيد فقط (غير مطلوب للوضع المحلي)',
  },
  {
    title: 'حقوقك',
    body: '• يمكنك حذف جميع بياناتك المحلية في أي وقت\n• يمكنك إلغاء استيراد النماذج المحفوظة\n• يمكنك تعطيل الأذونات من إعدادات الجهاز\n• لا نجمع بيانات تعريفية عنك',
  },
  {
    title: 'التحديثات',
    body: 'قد نحدث هذه السياسة periodically. سنُعلمك بأي تغييرات جوهرية عبر التطبيق أو عبر صفحة الإعدادات. نُحثّك على مراجعة هذه السياسة بانتظام.',
  },
  {
    title: 'تواصل معنا',
    body: 'لأي استفسار حول سياسة الخصوصية أو بياناتك، يمكنك التواصل عبر:\nالبريد الإلكتروني: support@wahaty.ai',
  },
];

export default function PrivacyScreen() {
  const theme = useTheme();
  const { colors, font, fontBold } = theme;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.headerBg }}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 24, color: colors.headerText, fontFamily: fontBold }}>→</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText, fontFamily: fontBold }]}>
            سياسة الخصوصية
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section, i) => (
          <Section key={i} title={section.title} body={section.body} theme={theme} />
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted, fontFamily: font, fontSize: 11 }]}>
            آخر تحديث: أغسطس 2026
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  body,
  theme,
}: {
  title: string;
  body: string;
  theme: Theme;
}) {
  const { colors, font, fontBold } = theme;
  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: fontBold }]}>
        {title}
      </Text>
      <Text style={[styles.body, { color: colors.text, fontFamily: font }]}>
        {body}
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
  sectionTitle: { fontSize: 14, marginBottom: 8, textAlign: 'right' },
  body: { fontSize: 13, lineHeight: 22, textAlign: 'right' },
  footer: { alignItems: 'center', marginTop: 20, marginBottom: 8 },
  footerText: { textAlign: 'center' },
});
