// [LOCAL] — dashboard principal
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useFocusEffect, router } from '../../src/platform/router';
import { Ionicons } from '../../src/platform/icons';
import { useSafeAreaInsets } from '../../src/platform/insets';
import { useTheme } from '../../src/contexts/ThemeContext';
import { getDatabase } from '../../src/database/database';
import { formatCurrency, getGreeting, formatDate, todayISO } from '../../src/utils/format';
import Card from '../../src/components/Card';
import { Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { LineChart } from '../../src/platform/charts';

const screenWidth = Dimensions.get('window').width;

interface DashData {
  sellerName: string;
  todaySales: number;
  todayCount: number;
  monthSales: number;
  monthCount: number;
  activeClients: number;
  overdueAmount: number;
  chartLabels: string[];
  chartData: number[];
  lowStockCount: number;
  overdueCount: number;
  hasClients: boolean;
  hasProducts: boolean;
  hasSales: boolean;
  hasGoal: boolean;
  goalTarget: number;
  goalCurrent: number;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashData | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const db = await getDatabase();
      const config = await db.getFirstAsync<{ sellerName: string; monthlyGoal: number }>('SELECT sellerName, monthlyGoal FROM config WHERE id = 1');
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today?.substring(0, 7) + '-01';

      const todayStats = await db.getFirstAsync<{ cnt: number; total: number }>(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(total), 0) as total FROM sales WHERE date(createdAt) = ? AND status != 'cancelado'`, [today]
      );
      const monthStats = await db.getFirstAsync<{ cnt: number; total: number }>(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(total), 0) as total FROM sales WHERE createdAt >= ? AND status != 'cancelado'`, [monthStart]
      );
      const clientCount = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM clients WHERE isActive = 1');
      const overdueStats = await db.getFirstAsync<{ cnt: number; total: number }>(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(amount - amountPaid), 0) as total FROM installments WHERE status = 'vencida'`
      );
      const lowStock = await db.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM products WHERE isActive = 1 AND stockCurrent <= stockMinimum'
      );

      // Last 7 days chart
      const labels: string[] = [];
      const chartVals: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        labels.push(String(d.getDate()));
        const row = await db.getFirstAsync<{ total: number }>(
          `SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date(createdAt) = ? AND status != 'cancelado'`, [ds]
        );
        chartVals.push(row?.total ?? 0);
      }

      // Checklist flags
      const hasClients = (clientCount?.cnt ?? 0) > 0;
      const hasProducts = ((await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM products WHERE isActive = 1'))?.cnt ?? 0) > 0;
      const hasSales = (todayStats?.cnt ?? 0) > 0 || (monthStats?.cnt ?? 0) > 0;

      const yearMonth = today?.substring(0, 7);
      const goalRow = await db.getFirstAsync<{ targetAmount: number }>('SELECT targetAmount FROM goals WHERE yearMonth = ?', [yearMonth]);
      const hasGoal = (goalRow?.targetAmount ?? 0) > 0;

      setData({
        sellerName: config?.sellerName ?? 'Vendedor',
        todaySales: todayStats?.total ?? 0,
        todayCount: todayStats?.cnt ?? 0,
        monthSales: monthStats?.total ?? 0,
        monthCount: monthStats?.cnt ?? 0,
        activeClients: clientCount?.cnt ?? 0,
        overdueAmount: overdueStats?.total ?? 0,
        chartLabels: labels,
        chartData: chartVals,
        lowStockCount: lowStock?.cnt ?? 0,
        overdueCount: overdueStats?.cnt ?? 0,
        hasClients,
        hasProducts,
        hasSales,
        hasGoal,
        goalTarget: goalRow?.targetAmount ?? config?.monthlyGoal ?? 0,
        goalCurrent: monthStats?.total ?? 0,
      });
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  };

  if (!data) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  const showChecklist = !data.hasClients || !data.hasProducts || !data.hasSales || !data.hasGoal;
  const goalPercent = data.goalTarget > 0 ? Math.min((data.goalCurrent / data.goalTarget) * 100, 100) : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {getGreeting()}, {data.sellerName}!
        </Text>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          {formatDate(todayISO())}
        </Text>
      </View>

      {/* Goal Progress */}
      {data.goalTarget > 0 && (
        <Card style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalTitle, { color: colors.text }]}>Meta do Mês</Text>
            <Text style={[styles.goalPercent, { color: colors.primary }]}>{goalPercent.toFixed(0)}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${goalPercent}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.goalSub, { color: colors.textSecondary }]}>
            {formatCurrency(data.goalCurrent)} de {formatCurrency(data.goalTarget)}
          </Text>
        </Card>
      )}

      {/* Summary Cards */}
      <View style={styles.cardsGrid}>
        <Card style={styles.summaryCard} onPress={() => router.push('/tabs/orders')}>
          <Ionicons name="cash-outline" size={24} color={colors.primary} />
          <Text style={[styles.cardValue, { color: colors.text }]}>{formatCurrency(data.todaySales)}</Text>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Vendas Hoje ({data.todayCount})</Text>
        </Card>
        <Card style={styles.summaryCard} onPress={() => router.push('/reports')}>
          <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
          <Text style={[styles.cardValue, { color: colors.text }]}>{formatCurrency(data.monthSales)}</Text>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Vendas Mês ({data.monthCount})</Text>
        </Card>
        <Card style={styles.summaryCard} onPress={() => router.push('/tabs/clients')}>
          <Ionicons name="people-outline" size={24} color={colors.primary} />
          <Text style={[styles.cardValue, { color: colors.text }]}>{data.activeClients}</Text>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Clientes Ativos</Text>
        </Card>
        <Card style={styles.summaryCard} onPress={() => router.push('/financial')}>
          <Ionicons name="alert-circle-outline" size={24} color={data.overdueAmount > 0 ? colors.warning : colors.primary} />
          <Text style={[styles.cardValue, { color: data.overdueAmount > 0 ? colors.warning : colors.text }]}>
            {formatCurrency(data.overdueAmount)}
          </Text>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>A Receber</Text>
        </Card>
      </View>

      {/* Chart */}
      {(data.chartData ?? []).some((v) => v > 0) && (
        <Card style={styles.chartCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Últimos 7 dias</Text>
          <LineChart
            data={{
              labels: data.chartLabels ?? [],
              datasets: [{ data: data.chartData?.length ? data.chartData : [0] }],
            }}
            width={screenWidth - 64}
            height={180}
            chartConfig={{
              backgroundColor: colors.card,
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              decimalPlaces: 0,
              color: () => colors.primary,
              labelColor: () => colors.textSecondary,
              propsForDots: { r: '4', fill: colors.primary },
            }}
            bezier
            style={{ borderRadius: 12 }}
          />
        </Card>
      )}

      {/* Alerts */}
      {(data.overdueCount > 0 || data.lowStockCount > 0) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Alertas</Text>
          {data.overdueCount > 0 && (
            <Card style={[styles.alertCard, { borderLeftColor: colors.warning }]} onPress={() => router.push('/financial')}>
              <Ionicons name="warning" size={24} color={colors.warning} />
              <Text style={[styles.alertText, { color: colors.text }]}>{data.overdueCount} parcela(s) vencida(s)</Text>
            </Card>
          )}
          {data.lowStockCount > 0 && (
            <Card style={[styles.alertCard, { borderLeftColor: colors.danger }]} onPress={() => router.push('/products')}>
              <Ionicons name="cube" size={24} color={colors.danger} />
              <Text style={[styles.alertText, { color: colors.text }]}>{data.lowStockCount} produto(s) com estoque baixo</Text>
            </Card>
          )}
        </View>
      )}

      {/* Checklist */}
      {showChecklist && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Primeiros Passos</Text>
          <CheckItem done={data.hasProducts} label="Cadastrar primeiro produto" onPress={() => router.push('/product-add')} colors={colors} />
          <CheckItem done={data.hasClients} label="Cadastrar primeiro cliente" onPress={() => router.push('/client-add')} colors={colors} />
          <CheckItem done={data.hasSales} label="Realizar primeira venda" onPress={() => router.push('/new-sale')} colors={colors} />
          <CheckItem done={data.hasGoal} label="Definir meta do mês" onPress={() => router.push('/settings')} colors={colors} />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ações Rápidas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActions}>
          <QuickAction icon="cart" label="Nova Venda" color={colors.primary} onPress={() => router.push('/new-sale')} textColor={colors.text} />
          <QuickAction icon="person-add" label="Novo Cliente" color={colors.primary} onPress={() => router.push('/client-add')} textColor={colors.text} />
          <QuickAction icon="cube" label="Novo Produto" color={colors.primary} onPress={() => router.push('/product-add')} textColor={colors.text} />
          <QuickAction icon="location" label="Check-in" color={colors.primary} onPress={() => router.push('/routes')} textColor={colors.text} />
        </ScrollView>
      </View>
    </ScrollView>
  );
}

function CheckItem({ done, label, onPress, colors }: { done: boolean; label: string; onPress: () => void; colors: any }) {
  return (
    <Pressable style={styles.checkItem} onPress={done ? undefined : onPress}>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={done ? colors.primary : colors.textCaption}
      />
      <Text style={[styles.checkLabel, { color: done ? colors.textCaption : colors.text, textDecorationLine: done ? 'line-through' : 'none' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function QuickAction({ icon, label, color, onPress, textColor }: { icon: string; label: string; color: string; onPress: () => void; textColor: string }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.quickActionLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, marginBottom: 16 },
  greeting: { fontSize: 24, fontWeight: '700' },
  dateText: { fontSize: 14, marginTop: 4 },
  goalCard: { marginHorizontal: 16, marginBottom: 16 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { fontSize: 16, fontWeight: '600' },
  goalPercent: { fontSize: 18, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, marginVertical: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  goalSub: { fontSize: 14 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  summaryCard: { width: (screenWidth - 44) / 2, alignItems: 'center', paddingVertical: 16 },
  cardValue: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  cardLabel: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  chartCard: { margin: 16 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, marginBottom: 8 },
  alertText: { fontSize: 14, flex: 1 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  checkLabel: { fontSize: 16 },
  quickActions: { gap: 16, paddingRight: 16 },
  quickAction: { alignItems: 'center', width: 80 },
  quickActionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 12, marginTop: 6, textAlign: 'center' },
});
