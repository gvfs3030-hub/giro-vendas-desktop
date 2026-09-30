// [LOCAL] — lista de pedidos
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, router } from '../../../src/platform/router';
import { Ionicons } from '../../../src/platform/icons';
import { useSafeAreaInsets } from '../../../src/platform/insets';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getDatabase } from '../../../src/database/database';
import type { Sale } from '../../../src/types';
import Card from '../../../src/components/Card';
import SearchBar from '../../../src/components/SearchBar';
import StatusBadge from '../../../src/components/StatusBadge';
import EmptyState from '../../../src/components/EmptyState';
import { formatCurrency, formatDateTime } from '../../../src/utils/format';
import { ORDER_STATUS } from '../../../src/constants/theme';

export default function OrdersListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<(Sale & { clientName?: string })[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<Sale & { clientName: string }>(
        `SELECT s.*, c.nomeFantasia as clientName FROM sales s LEFT JOIN clients c ON s.clientId = c.id ORDER BY s.createdAt DESC`
      );
      setOrders(rows ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = (orders ?? []).filter((o) => {
    if (statusFilter !== 'all' && o?.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (o?.clientName ?? '').toLowerCase().includes(s) ||
             String(o?.orderNumber ?? '').includes(s);
    }
    return true;
  });

  const getStatusInfo = (status: string) => {
    return ORDER_STATUS.find((s) => s.value === status) ?? { label: status, color: '#999' };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Pedidos</Text>
      </View>
      <View style={styles.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar pedido..." />
      </View>
      <View style={styles.filters}>
        {[{ value: 'all', label: 'Todos' }, ...ORDER_STATUS].map((s) => (
          <Pressable
            key={s.value}
            style={[styles.filterChip, { backgroundColor: statusFilter === s.value ? colors.primary : colors.surface, borderColor: colors.border }]}
            onPress={() => setStatusFilter(s.value)}
          >
            <Text style={{ color: statusFilter === s.value ? '#fff' : colors.text, fontSize: 14 }}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item?.id ?? ''}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        renderItem={({ item }) => {
          const statusInfo = getStatusInfo(item?.status ?? '');
          return (
            <Card style={styles.orderCard} onPress={() => router.push(`/order/${item?.id}`)}>
              <View style={styles.orderRow}>
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderNum, { color: colors.text }]}>#{String(item?.orderNumber ?? 0).padStart(3, '0')}</Text>
                  <Text style={[styles.clientText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item?.clientName ?? 'Cliente'}
                  </Text>
                  <Text style={[styles.dateText, { color: colors.textCaption }]}>{formatDateTime(item?.createdAt)}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={[styles.totalText, { color: colors.text }]}>{formatCurrency(item?.total)}</Text>
                  <StatusBadge label={statusInfo.label} color={statusInfo.color} />
                </View>
              </View>
            </Card>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Nenhum pedido realizado"
            message="Faça sua primeira venda!"
            actionLabel="Nova Venda"
            onAction={() => router.push('/new-sale')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  orderCard: { marginHorizontal: 16 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderInfo: { flex: 1 },
  orderNum: { fontSize: 16, fontWeight: '700' },
  clientText: { fontSize: 14, marginTop: 2 },
  dateText: { fontSize: 12, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  totalText: { fontSize: 18, fontWeight: '700' },
});
