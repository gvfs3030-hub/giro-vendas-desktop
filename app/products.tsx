// [LOCAL] — catálogo de produtos
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import type { Product } from '../src/types';
import Card from '../src/components/Card';
import SearchBar from '../src/components/SearchBar';
import EmptyState from '../src/components/EmptyState';
import { formatCurrency } from '../src/utils/format';
import StatusBadge from '../src/components/StatusBadge';

export default function ProductsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  const loadProducts = async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<Product>('SELECT * FROM products WHERE isActive = 1 ORDER BY name ASC');
      setProducts(rows ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = (products ?? []).filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p?.name ?? '').toLowerCase().includes(s) || (p?.barcode ?? '').includes(s);
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Produtos</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar produto..." />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item?.id ?? ''}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        renderItem={({ item }) => {
          const lowStock = (item?.stockCurrent ?? 0) <= (item?.stockMinimum ?? 0);
          return (
            <Card style={styles.productCard} onPress={() => router.push(`/product/${item?.id}`)}>
              <View style={styles.productRow}>
                <View style={[styles.productIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="cube" size={24} color={colors.primary} />
                </View>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{item?.name}</Text>
                  <Text style={[styles.productPrice, { color: colors.textSecondary }]}>{formatCurrency(item?.price1)}</Text>
                  <View style={styles.stockRow}>
                    <Text style={{ color: colors.textCaption, fontSize: 12 }}>Estoque: {item?.stockCurrent ?? 0} {item?.unit}</Text>
                    {lowStock && <StatusBadge label="Baixo" color="#EF4444" />}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textCaption} />
              </View>
            </Card>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState icon="cube-outline" title="Nenhum produto cadastrado" actionLabel="Cadastrar Produto" onAction={() => router.push('/product-add')} />
        }
      />

      <Pressable style={[styles.fab, { backgroundColor: colors.primary, bottom: 16 + insets.bottom }]} onPress={() => router.push('/product-add')}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  productCard: { marginHorizontal: 16 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600' },
  productPrice: { fontSize: 14, marginTop: 2 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
