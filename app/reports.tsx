// [LOCAL] — relatórios com gráficos
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useFocusEffect, router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import { formatCurrency, formatDateTime, todayDateISO, currentYearMonth } from '../src/utils/format';
import Card from '../src/components/Card';
import { BarChart, LineChart } from '../src/platform/charts';
import Toast from 'react-native-toast-message';
import { generateAndOpenReportPdf } from '../src/platform/printing';

const screenWidth = Dimensions.get('window').width;

export default function ReportsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [weekData, setWeekData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [0] });
  const [topProducts, setTopProducts] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [0] });
  const [topClients, setTopClients] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [0] });
  const [monthSales, setMonthSales] = useState(0);
  const [monthGoal, setMonthGoal] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const loadReports = async () => {
    try {
      const db = await getDatabase();
      // Last 7 days
      const labels: string[] = [];
      const data: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        labels.push(String(d.getDate()));
        const r = await db.getFirstAsync<{ t: number }>(`SELECT COALESCE(SUM(total),0) as t FROM sales WHERE date(createdAt)=? AND status!='cancelado'`, [ds]);
        data.push(r?.t ?? 0);
      }
      setWeekData({ labels, data: data.length > 0 ? data : [0] });

      // Top products
      const tp = await db.getAllAsync<{ name: string; total: number }>(
        `SELECT si.productName as name, SUM(si.subtotal) as total FROM sale_items si JOIN sales s ON si.saleId = s.id WHERE s.status != 'cancelado' GROUP BY si.productId ORDER BY total DESC LIMIT 5`
      );
      setTopProducts({
        labels: (tp ?? []).map((p) => (p?.name ?? '').substring(0, 10)),
        data: (tp ?? []).length > 0 ? (tp ?? []).map((p) => p?.total ?? 0) : [0],
      });

      // Top clients
      const tc = await db.getAllAsync<{ name: string; total: number }>(
        `SELECT c.nomeFantasia as name, SUM(s.total) as total FROM sales s JOIN clients c ON s.clientId = c.id WHERE s.status != 'cancelado' GROUP BY s.clientId ORDER BY total DESC LIMIT 5`
      );
      setTopClients({
        labels: (tc ?? []).map((c) => (c?.name ?? '').substring(0, 10)),
        data: (tc ?? []).length > 0 ? (tc ?? []).map((c) => c?.total ?? 0) : [0],
      });

      // Month totals
      const ym = currentYearMonth();
      const ms = await db.getFirstAsync<{ t: number }>(`SELECT COALESCE(SUM(total),0) as t FROM sales WHERE createdAt >= ? AND status != 'cancelado'`, [`${ym}-01`]);
      setMonthSales(ms?.t ?? 0);
      const goal = await db.getFirstAsync<{ targetAmount: number }>('SELECT targetAmount FROM goals WHERE yearMonth = ?', [ym]);
      setMonthGoal(goal?.targetAmount ?? 0);
      const me = await db.getFirstAsync<{ t: number }>(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE date LIKE ?`, [`${ym}%`]);
      setMonthExpenses(me?.t ?? 0);
    } catch (e) { console.error(e); }
  };

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: () => colors.primary,
    labelColor: () => colors.textSecondary,
    barPercentage: 0.6,
  };

  const exportPDF = async () => {
    try {
      const path = await generateAndOpenReportPdf({
        title: 'Relatório de Vendas',
        generatedAt: `Gerado em ${formatDateTime(new Date().toISOString())}`,
        summary: [
          { label: 'Vendas', value: formatCurrency(monthSales) },
          { label: 'Meta', value: formatCurrency(monthGoal) },
          { label: 'Despesas', value: formatCurrency(monthExpenses) },
          { label: 'Lucro estimado', value: formatCurrency(monthSales - monthExpenses) },
        ],
        sections: [
          {
            title: 'Top Produtos',
            rows: topProducts.labels.map((label, i) => ({ label: `${i + 1}. ${label}`, value: formatCurrency(topProducts.data[i]) })),
          },
          {
            title: 'Top Clientes',
            rows: topClients.labels.map((label, i) => ({ label: `${i + 1}. ${label}`, value: formatCurrency(topClients.data[i]) })),
          },
        ],
      }, `relatorio-vendas-${todayDateISO()}.pdf`);
      Toast.show({ type: 'success', text1: 'PDF salvo', text2: path, position: 'bottom' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Erro ao exportar', position: 'bottom' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Relatórios</Text>
        <Pressable onPress={exportPDF} hitSlop={12}><Ionicons name="download-outline" size={24} color={colors.primary} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Month Summary */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={{ color: colors.textCaption, fontSize: 12 }}>Vendas Mês</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 18 }}>{formatCurrency(monthSales)}</Text>
          </Card>
          <Card style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={{ color: colors.textCaption, fontSize: 12 }}>Meta</Text>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{formatCurrency(monthGoal)}</Text>
          </Card>
          <Card style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={{ color: colors.textCaption, fontSize: 12 }}>Despesas</Text>
            <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 18 }}>{formatCurrency(monthExpenses)}</Text>
          </Card>
        </View>

        <Card style={[styles.chartCard, { backgroundColor: colors.primaryLight, borderWidth: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Lucro do mês</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Vendas − Despesas</Text>
            </View>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 26 }}>{formatCurrency(monthSales - monthExpenses)}</Text>
          </View>
        </Card>

        {/* Goal Progress */}
        {monthGoal > 0 && (
          <Card style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Meta vs Realizado</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min((monthSales / monthGoal) * 100, 100)}%` }]} />
            </View>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
              {((monthSales / monthGoal) * 100).toFixed(0)}% da meta
            </Text>
          </Card>
        )}

        {/* Week Chart */}
        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Vendas - Últimos 7 dias</Text>
          <BarChart
            data={{ labels: weekData.labels, datasets: [{ data: weekData.data }] }}
            width={screenWidth - 64}
            height={200}
            chartConfig={chartConfig}
            style={{ borderRadius: 12 }}
            yAxisLabel=""
            yAxisSuffix=""
          />
        </Card>

        {/* Top Products */}
        {topProducts.labels.length > 0 && topProducts.data[0] > 0 && (
          <Card style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Top Produtos</Text>
            {topProducts.labels.map((label, i) => (
              <View key={i} style={styles.rankItem}>
                <Text style={{ color: colors.text, flex: 1 }}>{i + 1}. {label}</Text>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{formatCurrency(topProducts.data[i])}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Top Clients */}
        {topClients.labels.length > 0 && topClients.data[0] > 0 && (
          <Card style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Top Clientes</Text>
            {topClients.labels.map((label, i) => (
              <View key={i} style={styles.rankItem}>
                <Text style={{ color: colors.text, flex: 1 }}>{i + 1}. {label}</Text>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{formatCurrency(topClients.data[i])}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 48 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { alignItems: 'center', paddingVertical: 12 },
  chartCard: { marginBottom: 16 },
  chartTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  progressBar: { height: 12, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  rankItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
});
