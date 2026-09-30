import assert from 'node:assert/strict';
import { test } from 'node:test';
import { niceMax, formatCompact, computeBars, computeLinePoints, segmentGeometry } from '../../src/platform/chartMath';

test('niceMax arredonda o topo do eixo para valores "redondos"', () => {
  assert.equal(niceMax(0), 1);
  assert.equal(niceMax(-5), 1);
  assert.equal(niceMax(NaN), 1);
  assert.equal(niceMax(730), 1000);
  assert.equal(niceMax(1200), 2000);
  assert.equal(niceMax(2300), 2500);
  assert.equal(niceMax(4100), 5000);
  assert.equal(niceMax(100), 100);
  assert.equal(niceMax(0.07), 0.1);
});

test('formatCompact em pt-BR', () => {
  assert.equal(formatCompact(0), '0');
  assert.equal(formatCompact(950), '950');
  assert.equal(formatCompact(1200), '1,2 mil');
  assert.equal(formatCompact(2_500_000), '2,5 mi');
  assert.equal(formatCompact(5.5), '5,5');
});

test('computeBars: barras dentro da área, altura proporcional, todas zero não quebra', () => {
  const bars = computeBars([0, 50, 100], 300, 100, 100);
  assert.equal(bars.length, 3);
  assert.deepEqual(bars.map((b) => b.height), [0, 50, 100]);
  for (const b of bars) { assert.ok(b.x >= 0 && b.x + b.width <= 300); }
  const zeros = computeBars([0, 0, 0], 300, 100, 1);
  assert.ok(zeros.every((b) => b.height === 0));
  assert.equal(computeBars([], 300, 100, 1).length, 0);
});

test('computeBars: valor acima do teto é limitado a 100% da altura', () => {
  assert.equal(computeBars([500], 100, 80, 100)[0].height, 80);
});

test('computeLinePoints: y invertido (maior valor = mais alto = y menor); ponto único centralizado', () => {
  const p = computeLinePoints([0, 100], 200, 100, 100);
  assert.equal(p[0].y, 100);
  assert.equal(p[1].y, 0);
  assert.ok(p[0].x < p[1].x);
  assert.deepEqual(computeLinePoints([40], 200, 100, 100), [{ x: 100, y: 60 }]);
});

test('segmentGeometry: horizontal, vertical e diagonal', () => {
  const h = segmentGeometry({ x: 0, y: 10 }, { x: 100, y: 10 }, 2);
  assert.equal(h.width, 100); assert.equal(h.angleRad, 0); assert.equal(h.left, 0); assert.equal(h.top, 9);
  const v = segmentGeometry({ x: 10, y: 0 }, { x: 10, y: 50 }, 2);
  assert.equal(v.width, 50); assert.ok(Math.abs(v.angleRad - Math.PI / 2) < 1e-9);
  // o centro da View girada coincide com o ponto médio do segmento
  assert.equal(v.left + v.width / 2, 10); assert.equal(v.top + v.height / 2, 25);
  const d = segmentGeometry({ x: 0, y: 0 }, { x: 30, y: 40 }, 2);
  assert.equal(d.width, 50);
});
