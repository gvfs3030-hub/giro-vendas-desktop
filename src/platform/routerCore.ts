// [DESKTOP] Núcleo do roteador — lógica pura (sem React / sem React Native).
// Substitui o expo-router: mantém a mesma API de caminhos ('/order/123', '/new-sale?clientId=1')
// que as telas já usam, mas com uma pilha de histórico própria, controlada por nós.

export type Params = Record<string, string>;

export interface ParsedHref {
  path: string;
  query: Params;
}

export interface StackEntry {
  /** identificador único da entrada (uma mesma rota pode aparecer 2x na pilha) */
  key: string;
  path: string;
  query: Params;
}

export type NavAction =
  | { type: 'push'; href: Href }
  | { type: 'replace'; href: Href }
  | { type: 'reset'; href: Href }
  | { type: 'back' };

/** Formas aceitas pelo expo-router: string ou { pathname, params } */
export type Href = string | { pathname: string; params?: Record<string, string | number | undefined> };

export const HOME_PATH = '/tabs/home';

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

export function normalizePath(path: string): string {
  let p = path.trim();
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

export function parseHref(href: Href): ParsedHref {
  if (typeof href !== 'string') {
    const extra: Params = {};
    let pathname = href.pathname;
    for (const [k, v] of Object.entries(href.params ?? {})) {
      if (v === undefined) continue;
      const token = `[${k}]`;
      if (pathname.includes(token)) pathname = pathname.replace(token, encodeURIComponent(String(v)));
      else extra[k] = String(v);
    }
    return { path: normalizePath(pathname), query: extra };
  }
  const hashless = href.split('#')[0];
  const qIndex = hashless.indexOf('?');
  const rawPath = qIndex === -1 ? hashless : hashless.slice(0, qIndex);
  const rawQuery = qIndex === -1 ? '' : hashless.slice(qIndex + 1);
  const query: Params = {};
  if (rawQuery) {
    for (const pair of rawQuery.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const k = safeDecode(eq === -1 ? pair : pair.slice(0, eq));
      const v = eq === -1 ? '' : safeDecode(pair.slice(eq + 1));
      query[k] = v;
    }
  }
  return { path: normalizePath(rawPath), query };
}

/** Casa '/order/:id' com '/order/abc' → { id: 'abc' }; retorna null se não casar. */
export function matchPattern(pattern: string, path: string): Params | null {
  const ps = normalizePath(pattern).split('/').filter(Boolean);
  const xs = normalizePath(path).split('/').filter(Boolean);
  if (ps.length !== xs.length) return null;
  const params: Params = {};
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].startsWith(':')) params[ps[i].slice(1)] = safeDecode(xs[i]);
    else if (ps[i] !== xs[i]) return null;
  }
  return params;
}

export function findRoute<T extends { pattern: string }>(
  routes: T[],
  path: string
): { route: T; params: Params } | null {
  for (const route of routes) {
    const params = matchPattern(route.pattern, path);
    if (params) return { route, params };
  }
  return null;
}

let keyCounter = 0;
export function nextKey(): string {
  keyCounter += 1;
  return `r${keyCounter}`;
}

function makeEntry(href: Href): StackEntry {
  const { path, query } = parseHref(href);
  return { key: nextKey(), path, query };
}

/**
 * Regras (espelham o comportamento do expo-router no celular):
 *  - push:    empilha uma nova tela
 *  - replace: troca a tela do topo
 *  - reset:   zera o histórico (usado pela barra lateral)
 *  - back:    desempilha; se já for a última tela, volta ao início em vez de "não fazer nada"
 */
export function reduceStack(stack: StackEntry[], action: NavAction): StackEntry[] {
  switch (action.type) {
    case 'push':
      return [...stack, makeEntry(action.href)];
    case 'replace': {
      const entry = makeEntry(action.href);
      return stack.length === 0 ? [entry] : [...stack.slice(0, -1), entry];
    }
    case 'reset':
      return [makeEntry(action.href)];
    case 'back': {
      if (stack.length > 1) return stack.slice(0, -1);
      const top = stack[stack.length - 1];
      if (top && top.path === HOME_PATH) return stack; // já está no início
      return [makeEntry(HOME_PATH)];
    }
  }
}

/** Agrupa entradas consecutivas que compartilham o mesmo "layout" (ex.: o assistente de nova venda). */
export interface Segment<T> {
  layoutId: string | null;
  items: T[];
}

export function groupByLayout<T>(items: T[], layoutOf: (item: T) => string | null): Segment<T>[] {
  const segments: Segment<T>[] = [];
  for (const item of items) {
    const layoutId = layoutOf(item);
    const last = segments[segments.length - 1];
    if (last && layoutId !== null && last.layoutId === layoutId) last.items.push(item);
    else segments.push({ layoutId, items: [item] });
  }
  return segments;
}
