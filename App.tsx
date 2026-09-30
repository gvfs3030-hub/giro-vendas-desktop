// [DESKTOP] Substitui app/_layout.tsx (expo-router). Ponto de entrada do app Windows:
// inicializa o banco, monta os provedores de tema/estado e organiza a tela em
// barra lateral fixa + área de conteúdo (o roteador cuida do resto).
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AppStateProvider, useAppState } from './src/contexts/AppStateContext';
import { initDatabase } from './src/database/database';
import { RouterHost, usePathname } from './src/platform/router';
import { routes, NEW_SALE } from './src/platform/routes';
import NewSaleLayout from './app/new-sale/_layout';
import NotFound from './app/+not-found';
import Sidebar from './src/components/Sidebar';

const layouts = { [NEW_SALE]: NewSaleLayout };

function Loading() {
  const { colors } = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.text }]}>Carregando...</Text>
    </View>
  );
}

/** Onboarding/instalação ocupam a tela toda; o app "de verdade" ganha a barra lateral. */
function Shell() {
  const pathname = usePathname();
  const chromeless = pathname === '/' || pathname === '/onboarding' || pathname === '/setup';
  return (
    <View style={styles.shell}>
      {!chromeless && <Sidebar />}
      <View style={{ flex: 1 }}>
        <RouterHost routes={routes} layouts={layouts} initialHref="/" notFound={NotFound} />
      </View>
    </View>
  );
}

function AppContent() {
  const { colors } = useTheme();
  const { isLoading: appStateLoading } = useAppState();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((e) => {
        console.error('Erro ao iniciar o banco de dados:', e);
        setDbError(String(e?.message ?? e));
        setDbReady(true); // segue mesmo assim: as telas mostram seus próprios erros de leitura
      });
  }, []);

  if (!dbReady || appStateLoading) return <Loading />;

  return (
    <>
      {dbError && (
        <View style={[styles.dbErrorBanner, { backgroundColor: colors.danger }]}>
          <Text style={styles.dbErrorText}>
            Não foi possível abrir o banco de dados local. Alguns dados podem não aparecer. ({dbError})
          </Text>
        </View>
      )}
      <Shell />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  dbErrorBanner: { paddingVertical: 8, paddingHorizontal: 16, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999 },
  dbErrorText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
