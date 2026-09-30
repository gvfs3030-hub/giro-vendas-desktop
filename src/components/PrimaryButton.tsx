// [LOCAL] — botão primário verde padrão
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export default function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary', style, icon }: Props) {
  const { colors } = useTheme();
  const bgColor = variant === 'danger' ? colors.danger : variant === 'secondary' ? 'transparent' : colors.primary;
  const textColor = variant === 'secondary' ? colors.primary : '#FFFFFF';
  const borderColor = variant === 'secondary' ? colors.primary : 'transparent';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bgColor, borderColor, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        variant === 'secondary' && styles.outlined,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  outlined: {
    borderWidth: 2,
  },
  label: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
