// src/components/Stepper.tsx
// Dependency-free − / value / + control for numeric settings.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../theme/ThemeProvider';

interface Props {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  theme: Theme;
}

export default function Stepper({ label, value, step, min, max, onChange, format, theme }: Props) {
  const { colors, font, fontBold } = theme;
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: font }]}>{label}</Text>
      <View style={[styles.row, { backgroundColor: colors.surfaceAlt }]}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => onChange(clamp(value - step))}
          disabled={value <= min}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.btnText, { color: colors.primary }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.value, { color: colors.text, fontFamily: fontBold }]}>
          {format ? format(value) : String(value)}
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => onChange(clamp(value + step))}
          disabled={value >= max}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.btnText, { color: colors.primary }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
  },
  btn: {
    width: 44,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 22,
    lineHeight: 26,
  },
  value: {
    flex: 1,
    fontSize: 15,
    textAlign: 'center',
  },
});
