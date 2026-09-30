// [LOCAL] — financeiro (contas a receber)
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { useFocusEffect, router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import type { Installment } from '../src/types';
import Card from '../src/components/Card';
import StatusBadge from '../src/components/StatusBadge';
import EmptyState from '../src/components/EmptyState';
import { formatCurrency, formatDate, todayISO } from '../src/utils/format';
import Toast from 'react-native-toast-message';

export default function FinancialScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [installments, setInstallments] = useState<(Installment & { clientName?: string })[]>([]);
  const [filter, setFilter] = useState('all');
  const [totals, setTotals] = useState({ total: 0, overdue: 0, pending: 0, paid: 0 });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const db = await getDatabase();
      // Update overdue
      const today = new Date().toISOString().split('T')[0];
      await db.runAsync(`UPDATE installments SET status = 'vencida', updatedAt = ? WHERE status = 'pendente' AND dueDate < ?`, [todayISO(), today]);

      const rows = await db.getAllAsync<Installment & { clientName: string }>(
        `SELECT i.*, c.nomeFantasia as clientName FROM installments i LEFT JOIN clients c ON i.clientId = c.id ORDER BY i.dueDate ASC`
      );
      setInstallments(rows ?? []);

      const t = await db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM installments');
      const o = await db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount - amountPaid), 0) as total FROM installments WHERE status = 'vencida'`);
      const pe = await db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount - amountPaid), 0) as total FROM installments WHERE status = 'pendente'`);
      const pa = await db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amountPaid), 0) as total FROM installments WHERE status = 'paga'`);
      setTotals({ total: t?.total ?? 0, overdue: o?.total ?? 0, pending: pe?.total ?? 0, paid: pa?.total ?? 0 });
    } catch (e) { console.error(e); }
  };

  const markAsPaid = async (inst: Installment) => {
    Alert.alert('Confirmar Pagamento', `Marcar parcela ${inst.installmentNumber} como paga?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', onPress: async () => {
          try {
            const db = await getDatabase();
            await db.runAsync(`UPDATE installments SET status = 'paga', amountPaid = amount, paymentDate = ?, updatedAt = ? WHERE id = ?`, [todayISO(), todayISO(), inst.id]);
            Toast.show({ type: 'success', text1: 'Pagamento registrado!', position: 'bottom' });
            loadData();
          } catch (e) { console.error(e); }
        },
      },
    ]);
  };

  const filtered = (installments ?? []).filter((i) => {
    if (filter === 'all') return true;
    return i?.status === filter;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Financeiro</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.textCaption, fontSize: 12 }}>Vencido</Text>
          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 16 }}>{formatCurrency(totals.overdue)}</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.textCaption, fontSize: 12 }}>A Vencer</Text>
          <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 16 }}>{formatCurrency(totals.pending)}</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.textCaption, fontSize: 12 }}>Pago</Text>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>{formatCurrency(totals.paid)}</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {[{ v: 'all', l: 'Todas' }, { v: 'vencida', l: 'Vencidas' }, { v: 'pendente', l: 'Pendentes' }, { v: 'paga', l: 'Pagas' }].map((f) => (
          <Pressable key={f.v} style={[styles.filterChip, { backgroundColor: filter === f.v ? colors.primary : colors.surface, borderColor: colors.border }]} onPress={() => setFilter(f.v)}>
            <Text style={{ color: filter === f.v ? '#fff' : colors.text, fontSize: 14 }}>{f.l}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item?.id ?? ''}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
        renderItem={({ item }) => {
          const statusColor = item?.status === 'paga' ? '#00C853' : item?.status === 'vencida' ? '#EF4444' : '#F59E0B';
          const statusLabel = item?.status === 'paga' ? 'Paga' : item?.status === 'vencida' ? 'Vencida' : 'Pendente';
          return (
            <Card style={[styles.instCard, item?.status === 'vencida' && { borderLeftWidth: 4, borderLeftColor: colors.danger }]}>
              <View style={styles.instRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientText, { color: colors.text }]}>{item?.clientName ?? 'Avulso'}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Parcela {item?.installmentNumber} | Vence: {formatDate(item?.dueDate)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCurrency(item?.amount)}</Text>
                  <StatusBadge label={statusLabel} color={statusColor} />
                </View>
              </View>
              {item?.status !== 'paga' && (
                <Pressable style={[styles.payBtn, { borderColor: colors.primary }]} onPress={() => markAsPaid(item)}>
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Registrar Pagamento</Text>
                </Pressable>
              )}
            </Card>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<EmptyState icon="wallet-outline" title="Nenhuma parcela" message="Parcelas de vendas a prazo aparecerão aqui" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  summaryBox: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  instCard: { marginHorizontal: 16 },
  instRow: { flexDirection: 'row', alignItems: 'center' },
  clientText: { fontSize: 16, fontWeight: '600' },
  payBtn: { marginTop: 8, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
});
