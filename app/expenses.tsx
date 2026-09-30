// [LOCAL] — despesas
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import type { Expense } from '../src/types';
import Card from '../src/components/Card';
import EmptyState from '../src/components/EmptyState';
import { formatCurrency, formatDate, currentYearMonth } from '../src/utils/format';
import { EXPENSE_CATEGORIES } from '../src/constants/theme';

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [])
  );

  const loadExpenses = async () => {
    try {
      const db = await getDatabase();
      const ym = currentYearMonth();
      const rows = await db.getAllAsync<Expense>(`SELECT * FROM expenses WHERE date LIKE ? ORDER BY date DESC`, [`${ym}%`]);
      setExpenses(rows ?? []);
      const total = await db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ?`, [`${ym}%`]);
      setMonthTotal(total?.total ?? 0);
    } catch (e) { console.error(e); }
  };

  const getCatLabel = (cat: string) => EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
  const getCatIcon = (cat: string): keyof typeof Ionicons.glyphMap => {
    const map: Record<string, keyof typeof Ionicons.glyphMap> = { combustivel: 'car', alimentacao: 'restaurant', hospedagem: 'bed', pedagio: 'card', manutencao: 'build', outros: 'ellipsis-horizontal' };
    return map[cat] ?? 'ellipsis-horizontal';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Despesas</Text>
        <View style={{ width: 24 }} />
      </View>

      <Card style={styles.totalCard}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Total do Mês</Text>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{formatCurrency(monthTotal)}</Text>
      </Card>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item?.id ?? ''}
        contentContainerStyle={expenses.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Card style={styles.expenseCard} onPress={() => router.push(`/expense/${item?.id}`)}>
            <View style={styles.expenseRow}>
              <View style={[styles.catIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={getCatIcon(item?.category ?? '')} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.expDesc, { color: colors.text }]} numberOfLines={1}>{item?.description}</Text>
                <Text style={{ color: colors.textCaption, fontSize: 14 }}>{getCatLabel(item?.category ?? '')} | {formatDate(item?.date)}</Text>
              </View>
              <Text style={{ color: colors.danger, fontWeight: '700' }}>-{formatCurrency(item?.amount)}</Text>
            </View>
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="Nenhuma despesa" actionLabel="Adicionar Despesa" onAction={() => router.push('/expense-add')} />}
      />

      <Pressable style={[styles.fab, { backgroundColor: colors.primary, bottom: 16 + insets.bottom }]} onPress={() => router.push('/expense-add')}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  totalCard: { marginHorizontal: 16, marginBottom: 12, alignItems: 'center' },
  expenseCard: { marginHorizontal: 16 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expDesc: { fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
