// [LOCAL] — assistente offline (regras)
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import { formatCurrency, currentYearMonth } from '../src/utils/format';
import Card from '../src/components/Card';

interface Insight {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  action?: () => void;
  color: string;
}

export default function AssistantScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [insights, setInsights] = useState<Insight[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadInsights();
    }, [])
  );

  const loadInsights = async () => {
    const results: Insight[] = [];
    try {
      const db = await getDatabase();

      // Inactive clients (30+ days)
      const inactive = await db.getFirstAsync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM clients c WHERE c.isActive = 1 AND c.id NOT IN (SELECT clientId FROM sales WHERE createdAt >= date('now', '-30 days'))`
      );
      if ((inactive?.cnt ?? 0) > 0) {
        results.push({
          icon: 'people-outline', title: 'Clientes Inativos',
          description: `${inactive?.cnt} cliente(s) sem compras há mais de 30 dias`,
          action: () => router.push('/tabs/clients'), color: colors.warning,
        });
      }

      // Low stock
      const lowStock = await db.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM products WHERE isActive = 1 AND stockCurrent <= stockMinimum'
      );
      if ((lowStock?.cnt ?? 0) > 0) {
        results.push({
          icon: 'cube-outline', title: 'Estoque Baixo',
          description: `${lowStock?.cnt} produto(s) com estoque abaixo do mínimo`,
          action: () => router.push('/products'), color: colors.danger,
        });
      }

      // Overdue installments
      const overdue = await db.getFirstAsync<{ cnt: number; total: number }>(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(amount - amountPaid), 0) as total FROM installments WHERE status = 'vencida'`
      );
      if ((overdue?.cnt ?? 0) > 0) {
        results.push({
          icon: 'alert-circle-outline', title: 'Parcelas Vencidas',
          description: `${overdue?.cnt} parcela(s) vencida(s) totalizando ${formatCurrency(overdue?.total)}`,
          action: () => router.push('/financial'), color: colors.danger,
        });
      }

      // Goal progress
      const ym = currentYearMonth();
      const goal = await db.getFirstAsync<{ targetAmount: number }>('SELECT targetAmount FROM goals WHERE yearMonth = ?', [ym]);
      const monthSales = await db.getFirstAsync<{ t: number }>(`SELECT COALESCE(SUM(total),0) as t FROM sales WHERE createdAt >= ? AND status != 'cancelado'`, [`${ym}-01`]);
      if ((goal?.targetAmount ?? 0) > 0) {
        const remaining = (goal?.targetAmount ?? 0) - (monthSales?.t ?? 0);
        if (remaining > 0) {
          results.push({
            icon: 'trending-up-outline', title: 'Meta do Mês',
            description: `Faltam ${formatCurrency(remaining)} para atingir a meta`,
            action: () => router.push('/reports'), color: colors.primary,
          });
        } else {
          results.push({
            icon: 'trophy-outline', title: 'Meta Atingida!',
            description: `Parabéns! Você atingiu a meta do mês!`,
            color: colors.primary,
          });
        }
      }

      // Products never sold
      const neverSold = await db.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM products p WHERE p.isActive = 1 AND p.id NOT IN (SELECT DISTINCT productId FROM sale_items)'
      );
      if ((neverSold?.cnt ?? 0) > 0) {
        results.push({
          icon: 'archive-outline', title: 'Produtos Parados',
          description: `${neverSold?.cnt} produto(s) nunca foram vendidos`,
          action: () => router.push('/products'), color: colors.warning,
        });
      }

      setInsights(results);
    } catch (e) { console.error(e); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Assistente</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {insights.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Tudo certo!</Text>
            <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>Nenhuma recomendação no momento. Continue vendendo!</Text>
          </View>
        ) : (
          insights.map((insight, i) => (
            <Card key={i} style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: insight.color }]} onPress={insight.action}>
              <View style={styles.insightRow}>
                <View style={[styles.insightIcon, { backgroundColor: insight.color + '20' }]}>
                  <Ionicons name={insight.icon} size={24} color={insight.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.title}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{insight.description}</Text>
                </View>
                {insight.action && <Ionicons name="chevron-forward" size={20} color={colors.textCaption} />}
              </View>
            </Card>
          ))
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
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  emptyMsg: { fontSize: 16, marginTop: 8, textAlign: 'center' },
  insightCard: { marginBottom: 12 },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  insightIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 16, fontWeight: '700' },
});
