// [LOCAL] — componente de estado vazio
import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '../platform/icons';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../constants/theme';
import PrimaryButton from './PrimaryButton';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function EmptyState({ icon = 'folder-open-outline', title, message, actionLabel, onAction, style }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={64} color={colors.textCaption} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  title: { fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.md, textAlign: 'center' },
  message: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },
  button: { marginTop: Spacing.lg, minWidth: 200 },
});
