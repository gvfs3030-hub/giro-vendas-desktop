// [LOCAL] — badge de status
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';

interface Props {
  label: string;
  color: string;
}

export default function StatusBadge({ label, color }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
