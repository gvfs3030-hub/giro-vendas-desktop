// [DESKTOP] Matemática dos gráficos (pura, testável). Os componentes só desenham o resultado.
export function niceMax(max: number): number {
  if (!isFinite(max) || max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  const f = max / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

/** 950 → "950", 1200 → "1,2 mil", 2_500_000 → "2,5 mi" */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const fmt = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)} mi`;
  if (abs >= 1_000) return `${fmt(n / 1_000)} mil`;
  return fmt(n);
}

export interface Bar { x: number; width: number; height: number; value: number }

export function computeBars(values: number[], plotW: number, plotH: number, yMax: number, barPercentage = 0.6): Bar[] {
  const n = Math.max(values.length, 1);
  const slot = plotW / n;
  const width = Math.max(slot * barPercentage, 2);
  return values.map((value, i) => ({
    x: slot * i + (slot - width) / 2,
    width,
    height: Math.max(0, Math.min(1, value / yMax)) * plotH,
    value,
  }));
}

export interface Point { x: number; y: number }

/** y medido a partir do TOPO da área de plotagem. */
export function computeLinePoints(values: number[], plotW: number, plotH: number, yMax: number): Point[] {
  const n = values.length;
  const slot = plotW / Math.max(n, 1);
  return values.map((value, i) => ({
    x: n === 1 ? plotW / 2 : slot * i + slot / 2,
    y: plotH - Math.max(0, Math.min(1, value / yMax)) * plotH,
  }));
}

/** Um segmento vira uma <View> fina, girada em torno do próprio centro (que fica no ponto médio). */
export function segmentGeometry(a: Point, b: Point, thickness: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  return {
    left: (a.x + b.x) / 2 - length / 2,
    top: (a.y + b.y) / 2 - thickness / 2,
    width: length,
    height: thickness,
    angleRad: Math.atan2(dy, dx),
  };
}
