// [LOCAL] — card padrão
import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, Spacing } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function Card({ children, onPress, style }: Props) {
  const { colors, isDark } = useTheme();
  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      shadowColor: isDark ? 'transparent' : '#000',
      borderColor: isDark ? colors.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [...(Array.isArray(cardStyle) ? cardStyle : [cardStyle]), { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }
  return <Pressable style={cardStyle}>{children}</Pressable>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
