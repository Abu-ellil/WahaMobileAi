// app/history.tsx — شاشة سجل المحادثات
// كل المحادثات المحفوظة (الأحدث أولاً): فتح محادثة قديمة أو حذفها.

import React, { useCallback } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeProvider';
import {
  useConversations,
  useActiveConversation,
  setActiveConversation,
  deleteConversation,
} from '../src/store/chat';
import { Conversation } from '../src/services/types';

export default function HistoryScreen() {
  const theme = useTheme();
  const { colors, font, fontBold } = theme;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const conversations = useConversations();
  const active = useActiveConversation();

  const openConversation = useCallback(
    (id: string) => {
      setActiveConversation(id);
      router.back();
    },
    [router],
  );

  const confirmDelete = useCallback((conversation: Conversation) => {
    Alert.alert('حذف المحادثة', `حذف "${conversation.title || 'محادثة'}" نهائياً؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteConversation(conversation.id) },
    ]);
  }, []);

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
            سجل المحادثات
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            active={active?.id === item.id}
            onOpen={() => openConversation(item.id)}
            onDelete={() => confirmDelete(item)}
            theme={theme}
          />
        )}
        ListEmptyComponent={<EmptyHistory theme={theme} />}
        contentContainerStyle={{
          paddingVertical: 12,
          paddingHorizontal: 12,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function ConversationRow({
  conversation,
  active,
  onOpen,
  onDelete,
  theme,
}: {
  conversation: Conversation;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const { colors, font, fontBold } = theme;
  const last = conversation.messages[conversation.messages.length - 1];
  const preview = last ? last.content.replace(/\s+/g, ' ').trim() : '';

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surfaceAlt, borderColor: active ? colors.primary : colors.border },
      ]}
    >
      <TouchableOpacity style={styles.rowMain} onPress={onOpen}>
        <Text
          style={{ color: colors.text, fontFamily: fontBold, fontSize: 14, textAlign: 'right' }}
          numberOfLines={1}
        >
          {active ? '● ' : ''}
          {conversation.title || 'محادثة'}
        </Text>
        {preview ? (
          <Text
            style={{ color: colors.textMuted, fontFamily: font, fontSize: 12, marginTop: 3, textAlign: 'right' }}
            numberOfLines={1}
          >
            {preview}
          </Text>
        ) : null}
        <Text style={{ color: colors.textMuted, fontFamily: font, fontSize: 11, marginTop: 4, textAlign: 'right' }}>
          {conversation.messages.length} رسالة · {formatDate(conversation.updatedAt)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={{ color: colors.error, fontSize: 16 }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyHistory({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text, fontFamily: theme.fontBold }]}>
        مفيش محادثات محفوظة 🕐
      </Text>
      <Text style={[styles.emptyDesc, { color: theme.colors.textMuted, fontFamily: theme.font }]}>
        كل محادثة تبدأها بتتحفظ هنا تلقائياً.{'\n'}
        ارجع واضغط ＋ لبدء محادثة جديدة.
      </Text>
    </View>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (timestamp >= startOfToday) return 'اليوم';
  if (timestamp >= startOfToday - 86400000) return 'أمس';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  rowMain: { flex: 1 },
  deleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, marginBottom: 10 },
  emptyDesc: { fontSize: 13, lineHeight: 21, textAlign: 'center' },
});
