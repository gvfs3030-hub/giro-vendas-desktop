import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseHref, matchPattern, findRoute, reduceStack, groupByLayout, HOME_PATH, type StackEntry,
} from '../../src/platform/routerCore';

test('parseHref: caminho simples e query com acentos/espaços (formato usado em client/[id])', () => {
  const href = `/new-sale?clientId=abc-123&clientName=${encodeURIComponent('João & Filhos Ltda')}`;
  const p = parseHref(href);
  assert.equal(p.path, '/new-sale');
  assert.deepEqual(p.query, { clientId: 'abc-123', clientName: 'João & Filhos Ltda' });
});

test('parseHref: objeto { pathname, params } com [id]', () => {
  const p = parseHref({ pathname: '/client/[id]', params: { id: 'x1', tab: 'notas' } });
  assert.equal(p.path, '/client/x1');
  assert.deepEqual(p.query, { tab: 'notas' });
});

test('parseHref: normaliza barras e query vazia', () => {
  assert.deepEqual(parseHref('tabs//home/'), { path: '/tabs/home', query: {} });
  assert.deepEqual(parseHref('/'), { path: '/', query: {} });
});

test('matchPattern: parâmetros dinâmicos', () => {
  assert.deepEqual(matchPattern('/order/:id', '/order/9f1c'), { id: '9f1c' });
  assert.deepEqual(matchPattern('/product/:id/edit', '/product/77/edit'), { id: '77' });
  assert.equal(matchPattern('/product/:id', '/product/77/edit'), null);
  assert.equal(matchPattern('/order/:id', '/orders/1'), null);
});

test('findRoute: todas as rotas de push() do app resolvem', () => {
  const routes = [
    '/', '/onboarding', '/setup', '/tabs/home', '/tabs/clients', '/tabs/orders',
    '/new-sale', '/new-sale/products', '/new-sale/cart', '/new-sale/payment', '/new-sale/confirmation',
    '/client-add', '/product-add', '/expense-add', '/client/:id', '/client/:id/edit',
    '/product/:id', '/product/:id/edit', '/order/:id', '/expense/:id', '/installment/:id', '/visit/:id',
    '/products', '/financial', '/expenses', '/routes', '/visit-plan', '/import-backup',
    '/reports', '/assistant', '/settings',
  ].map((pattern) => ({ pattern }));
  const used = [
    '/new-sale', '/product-add', '/client-add', '/products', '/financial', '/tabs/home', '/', '/visit-plan',
    '/tabs/clients', '/reports', '/expense-add', '/order/550e8400-e29b-41d4-a716-446655440000', '/setup',
    '/product/12', '/product/12/edit', '/client/9/edit', '/expense/5', '/client/9', '/tabs/orders',
    '/settings', '/routes', '/new-sale/products', '/new-sale/payment', '/new-sale/confirmation',
    '/new-sale/cart', '/import-backup',
  ];
  for (const path of used) assert.ok(findRoute(routes, path), `sem rota para ${path}`);
  assert.equal(findRoute(routes, '/nao-existe'), null);
});

const home = (): StackEntry[] => reduceStack([], { type: 'reset', href: HOME_PATH });

test('reduceStack: push / replace / back', () => {
  let s = home();
  s = reduceStack(s, { type: 'push', href: '/new-sale' });
  s = reduceStack(s, { type: 'push', href: '/new-sale/products' });
  assert.deepEqual(s.map((e) => e.path), [HOME_PATH, '/new-sale', '/new-sale/products']);
  s = reduceStack(s, { type: 'replace', href: '/new-sale/cart' });
  assert.deepEqual(s.map((e) => e.path), [HOME_PATH, '/new-sale', '/new-sale/cart']);
  s = reduceStack(s, { type: 'back' });
  assert.deepEqual(s.map((e) => e.path), [HOME_PATH, '/new-sale']);
});

test('reduceStack: chaves únicas mesmo repetindo a mesma rota', () => {
  let s = home();
  s = reduceStack(s, { type: 'push', href: '/client/1' });
  s = reduceStack(s, { type: 'push', href: '/client/1' });
  assert.notEqual(s[1].key, s[2].key);
});

test('reduceStack: back na última tela vai para o início; no início não faz nada', () => {
  let s = reduceStack([], { type: 'reset', href: '/products' });
  s = reduceStack(s, { type: 'back' });
  assert.deepEqual(s.map((e) => e.path), [HOME_PATH]);
  const before = s;
  assert.equal(reduceStack(s, { type: 'back' }), before);
});

test('reduceStack: reset (barra lateral) zera o histórico', () => {
  let s = home();
  s = reduceStack(s, { type: 'push', href: '/products' });
  s = reduceStack(s, { type: 'push', href: '/product/3' });
  s = reduceStack(s, { type: 'reset', href: '/financial' });
  assert.deepEqual(s.map((e) => e.path), ['/financial']);
});

test('groupByLayout: assistente de venda compartilha UM provider enquanto contíguo', () => {
  const layoutOf = (p: string) => (p.startsWith('/new-sale') ? 'new-sale' : null);
  const seg = groupByLayout(
    [HOME_PATH, '/new-sale', '/new-sale/products', '/client/1', '/new-sale/cart'], layoutOf
  );
  assert.deepEqual(seg.map((x) => [x.layoutId, x.items.length]), [
    [null, 1], ['new-sale', 2], [null, 1], ['new-sale', 1],
  ]);
});
