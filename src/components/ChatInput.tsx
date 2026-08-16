// src/components/ChatInput.tsx
// Message input bar. The send button becomes a stop button while generating.

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Theme } from '../theme/ThemeProvider';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  running: boolean;
  theme: Theme;
}

function ChatInput({ value, onChange, onSend, onStop, running, theme }: Props) {
  const { colors, font, fontBold, dark } = theme;
  return (
    <View
      style={[styles.bar, { backgroundColor: colors.inputBg, borderTopColor: colors.border }]}
    >
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: font },
        ]}
        value={value}
        onChangeText={onChange}
        multiline
        placeholder="اكتب رسالتك هنا…"
        placeholderTextColor={colors.textMuted}
        textAlign="right"
        keyboardAppearance={dark ? 'dark' : 'light'}
        returnKeyType="send"
        editable={!running}
        onSubmitEditing={onSend}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: running ? colors.error : colors.primary }]}
        onPress={running ? onStop : onSend}
        disabled={!running && !value.trim()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {running ? (
          <View style={styles.stopIcon} />
        ) : value.trim() ? (
          <Text style={{ color: colors.onPrimary, fontFamily: fontBold, fontSize: 14 }}>
            إرسال
          </Text>
        ) : (
          <Text style={{ color: colors.onPrimary, fontFamily: fontBold, fontSize: 14, opacity: 0.5 }}>
            إرسال
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    textAlignVertical: 'center',
  },
  btn: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginStart: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
});

export default ChatInput;
