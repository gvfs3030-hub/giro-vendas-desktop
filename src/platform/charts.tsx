// [DESKTOP] Substitui 'react-native-chart-kit' (que exige react-native-svg). Mesma assinatura de
// props usada pelas telas (BarChart / LineChart), desenhado só com <View>. A largura é medida do
// próprio contêiner, então o gráfico acompanha o redimensionamento da janela.
import React, { useState } from 'react';
import { View, Text, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import {
  computeBars, computeLinePoints, formatCompact, niceMax, segmentGeometry,
} from './chartMath';

interface ChartConfig {
  color?: (opacity?: number) => string;
  labelColor?: (opacity?: number) => string;
  barPercentage?: number;
  propsForDots?: { r?: string; fill?: string };
  [key: string]: unknown;
}

interface ChartProps {
  data: { labels: string[]; datasets: { data: number[] }[] };
  width?: number;
  height: number;
  chartConfig?: ChartConfig;
  style?: StyleProp<ViewStyle>;
  bezier?: boolean;
  yAxisLabel?: string;
  yAxisSuffix?: string;
}

const GUTTER = 48; // espaço do eixo Y
const LABEL_H = 24; // espaço dos rótulos do eixo X
const TOP_PAD = 18; // espaço para o valor acima da barra mais alta
const GRID_LINES = 4;

function useChart(props: ChartProps) {
  const [measured, setMeasured] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== measured) setMeasured(w);
  };
  const totalW = measured ?? props.width ?? 300;
  const plotW = Math.max(totalW - GUTTER - 8, 40);
  const plotH = Math.max(props.height - LABEL_H - TOP_PAD, 40);
  const values = props.data.datasets[0]?.data ?? [];
  const yMax = niceMax(Math.max(...values, 0));
  const color = props.chartConfig?.color?.(1) ?? '#00C853';
  const labelColor = props.chartConfig?.labelColor?.(1) ?? '#666';
  return { onLayout, plotW, plotH, values, yMax, color, labelColor };
}

function Frame(props: ChartProps & { chart: ReturnType<typeof useChart>; children: React.ReactNode }) {
  const { chart, height, style, data } = props;
  const slot = chart.plotW / Math.max(chart.values.length, 1);
  return (
    <View style={[{ height, width: '100%' }, style]} onLayout={chart.onLayout}>
      {/* grade + eixo Y */}
      {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
        const frac = i / GRID_LINES;
        const y = TOP_PAD + chart.plotH * (1 - frac);
        return (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: y - 7, height: 14 }} pointerEvents="none">
            <Text style={{ position: 'absolute', left: 0, width: GUTTER - 6, textAlign: 'right', fontSize: 10, color: chart.labelColor }}>
              {(props.yAxisLabel ?? '') + formatCompact(chart.yMax * frac) + (props.yAxisSuffix ?? '')}
            </Text>
            <View style={{ position: 'absolute', left: GUTTER, right: 8, top: 7, height: 1, backgroundColor: 'rgba(128,128,128,0.22)' }} />
          </View>
        );
      })}
      {/* área de plotagem */}
      <View style={{ position: 'absolute', left: GUTTER, top: TOP_PAD, width: chart.plotW, height: chart.plotH }}>
        {props.children}
      </View>
      {/* rótulos do eixo X */}
      {data.labels.map((label, i) => (
        <Text
          key={i}
          numberOfLines={1}
          style={{
            position: 'absolute', left: GUTTER + slot * i, width: slot, top: TOP_PAD + chart.plotH + 6,
            textAlign: 'center', fontSize: 11, color: chart.labelColor,
          }}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}

export function BarChart(props: ChartProps) {
  const chart = useChart(props);
  const bars = computeBars(chart.values, chart.plotW, chart.plotH, chart.yMax, props.chartConfig?.barPercentage ?? 0.6);
  return (
    <Frame {...props} chart={chart}>
      {bars.map((b, i) => (
        <View key={i} style={{ position: 'absolute', left: b.x, bottom: 0, width: b.width, alignItems: 'center' }}>
          {b.value > 0 && b.width >= 22 && (
            <Text numberOfLines={1} style={{ fontSize: 10, color: chart.labelColor, marginBottom: 2, width: b.width + 24, textAlign: 'center' }}>
              {formatCompact(b.value)}
            </Text>
          )}
          <View style={{ width: b.width, height: b.height, backgroundColor: chart.color, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
        </View>
      ))}
    </Frame>
  );
}

export function LineChart(props: ChartProps) {
  const chart = useChart(props);
  const pts = computeLinePoints(chart.values, chart.plotW, chart.plotH, chart.yMax);
  const r = Number(props.chartConfig?.propsForDots?.r ?? 4);
  const dotColor = props.chartConfig?.propsForDots?.fill ?? chart.color;
  return (
    <Frame {...props} chart={chart}>
      {pts.slice(1).map((p, i) => {
        const g = segmentGeometry(pts[i], p, 2.5);
        return (
          <View
            key={`s${i}`}
            style={{
              position: 'absolute', left: g.left, top: g.top, width: g.width, height: g.height,
              backgroundColor: chart.color, borderRadius: 2, transform: [{ rotate: `${g.angleRad}rad` }],
            }}
          />
        );
      })}
      {pts.map((p, i) => (
        <View
          key={`d${i}`}
          style={{ position: 'absolute', left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: dotColor }}
        />
      ))}
    </Frame>
  );
}
