// [LOCAL] — rota raiz: redireciona baseado no estado do app
import React from 'react';
import { Redirect } from '../src/platform/router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppState } from '../src/contexts/AppStateContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function Index() {
  const { isLoading, isOnboarded, isSetup } = useAppState();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isOnboarded) return <Redirect href="/onboarding" />;
  if (!isSetup) return <Redirect href="/setup" />;
  return <Redirect href="/tabs/home" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
