// [DESKTOP] Roteador próprio — substitui 'expo-router' mantendo a mesma API usada pelas telas:
//   router.push / replace / back, useLocalSearchParams, useFocusEffect, Redirect
// Diferenças em relação ao celular: não há abas nem gestos; a navegação "de topo" é feita pela
// barra lateral (router.reset). As telas anteriores continuam montadas (escondidas), então
// filtros digitados e rolagem são preservados ao voltar — igual ao comportamento do celular.
import React, {
  Component, createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore,
} from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  findRoute, groupByLayout, matchPattern, reduceStack, HOME_PATH,
  type Href, type NavAction, type Params, type StackEntry,
} from './routerCore';

export type { Href, Params } from './routerCore';

// ---------- store (fora do React, para poder chamar router.push() de qualquer lugar) ----------
let stack: StackEntry[] = [];
const listeners = new Set<() => void>();

function dispatch(action: NavAction) {
  const next = reduceStack(stack, action);
  if (next === stack) return;
  stack = next;
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const getSnapshot = () => stack;

export const router = {
  push: (href: Href) => dispatch({ type: 'push', href }),
  navigate: (href: Href) => dispatch({ type: 'push', href }),
  replace: (href: Href) => dispatch({ type: 'replace', href }),
  back: () => dispatch({ type: 'back' }),
  dismiss: () => dispatch({ type: 'back' }),
  /** Exclusivo do desktop: zera o histórico (usado pelos itens da barra lateral). */
  reset: (href: Href) => dispatch({ type: 'reset', href }),
  canGoBack: () => stack.length > 1,
};

export function useRouter() {
  return router;
}

export function usePathname(): string {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  return s[s.length - 1]?.path ?? '/';
}

// ---------- contexto por tela ----------
const FocusContext = createContext<boolean>(true);
const ParamsContext = createContext<Params>({});

export function useLocalSearchParams<T extends object = Params>(): T {
  return useContext(ParamsContext) as unknown as T;
}

/** Igual ao do expo-router: roda quando a tela ganha foco (e de novo ao voltar para ela). */
export function useFocusEffect(effect: () => void | (() => void)) {
  const focused = useContext(FocusContext);
  useEffect(() => {
    if (!focused) return undefined;
    const cleanup = effect();
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [focused, effect]);
}

export function Redirect({ href }: { href: Href }) {
  useEffect(() => {
    router.replace(href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ---------- host ----------
export interface RouteConfig {
  pattern: string;
  component: React.ComponentType<any>;
  /** id de um layout (ex.: 'new-sale') — telas contíguas do mesmo layout dividem o mesmo Provider */
  layout?: string;
}

interface HostProps {
  routes: RouteConfig[];
  layouts?: Record<string, React.ComponentType<{ children: React.ReactNode }>>;
  initialHref?: Href;
  notFound?: React.ComponentType;
}

class ScreenBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Erro na tela:', error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Algo deu errado nesta tela</Text>
        <Pressable onPress={() => router.reset(HOME_PATH)} style={{ padding: 12 }}>
          <Text style={{ color: '#00C853', fontWeight: '700' }}>Voltar ao início</Text>
        </Pressable>
      </View>
    );
  }
}

function ScreenHost(props: {
  entry: StackEntry;
  route: RouteConfig | null;
  focused: boolean;
  NotFound?: React.ComponentType;
}) {
  const { entry, route, focused, NotFound } = props;
  const params = useMemo<Params>(
    () => ({ ...entry.query, ...(route ? matchPattern(route.pattern, entry.path) ?? {} : {}) }),
    [entry, route]
  );
  const Screen = route?.component ?? NotFound ?? null;
  return (
    <View
      style={[{ flex: 1 }, !focused && { display: 'none' }]}
      pointerEvents={focused ? 'auto' : 'none'}
    >
      <FocusContext.Provider value={focused}>
        <ParamsContext.Provider value={params}>
          <ScreenBoundary>{Screen ? <Screen /> : null}</ScreenBoundary>
        </ParamsContext.Provider>
      </FocusContext.Provider>
    </View>
  );
}

export function RouterHost({ routes, layouts = {}, initialHref = '/', notFound }: HostProps) {
  useState(() => {
    if (stack.length === 0) stack = reduceStack([], { type: 'reset', href: initialHref });
    return null;
  });
  const current = useSyncExternalStore(subscribe, getSnapshot);
  const topKey = current[current.length - 1]?.key;

  const resolved = current.map((entry) => ({ entry, route: findRoute(routes, entry.path)?.route ?? null }));
  const segments = groupByLayout(resolved, (r) => r.route?.layout ?? null);

  return (
    <View style={{ flex: 1 }}>
      {segments.map((segment) => {
        const nodes = segment.items.map(({ entry, route }) => (
          <ScreenHost
            key={entry.key}
            entry={entry}
            route={route}
            focused={entry.key === topKey}
            NotFound={notFound}
          />
        ));
        const segmentKey = segment.items[0].entry.key;
        const Layout = segment.layoutId ? layouts[segment.layoutId] : undefined;
        return Layout ? (
          <Layout key={segmentKey}>{nodes}</Layout>
        ) : (
          <React.Fragment key={segmentKey}>{nodes}</React.Fragment>
        );
      })}
    </View>
  );
}
