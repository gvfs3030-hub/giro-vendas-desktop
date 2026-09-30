// [LOCAL] — mostra uma caixinha acima do teclado com o campo/valor que está sendo
// digitado no momento, pra quando o teclado cobre o campo lá embaixo na tela e o
// vendedor perde de vista o que está escrevendo.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Keyboard, Platform, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface FocusPreviewContextType {
  report: (label: string, value: string) => void;
  clear: () => void;
}

const FocusPreviewContext = createContext<FocusPreviewContextType | null>(null);

export function useFocusPreview() {
  const ctx = useContext(FocusPreviewContext);
  // Fora de um Provider, vira no-op — assim nenhum componente quebra se for usado
  // numa tela que ainda não tem o provider.
  return ctx ?? { report: () => {}, clear: () => {} };
}

export function FocusPreviewProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [active, setActive] = useState<{ label: string; value: string } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: active && keyboardHeight > 0 ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [active, keyboardHeight]);

  const report = (label: string, value: string) => setActive({ label, value });
  const clear = () => setActive(null);

  const visible = !!active && keyboardHeight > 0;

  return (
    <FocusPreviewContext.Provider value={{ report, clear }}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            { bottom: keyboardHeight + 8, opacity, backgroundColor: colors.text },
          ]}
        >
          <Text style={[styles.label, { color: colors.background }]} numberOfLines={1}>{active?.label}</Text>
          <Text style={[styles.value, { color: colors.background }]} numberOfLines={1}>{active?.value || '—'}</Text>
        </Animated.View>
      )}
    </FocusPreviewContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    zIndex: 999,
  },
  label: { fontSize: 11, opacity: 0.7 },
  value: { fontSize: 16, fontWeight: '700', marginTop: 1 },
});
