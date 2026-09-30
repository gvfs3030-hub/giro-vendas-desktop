// [LOCAL] — detalhe do produto
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from '../../../src/platform/router';
import { Ionicons } from '../../../src/platform/icons';
import { useSafeAreaInsets } from '../../../src/platform/insets';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getDatabase } from '../../../src/database/database';
import type { Product } from '../../../src/types';
import { formatCurrency } from '../../../src/utils/format';
import StatusBadge from '../../../src/components/StatusBadge';
import Toast from 'react-native-toast-message';

export default function ProductDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      loadProduct();
    }, [id])
  );

  const loadProduct = async () => {
    try {
      const db = await getDatabase();
      const p = await db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', [id]);
      setProduct(p ?? null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = () => {
    Alert.alert('Excluir Produto', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            const db = await getDatabase();
            await db.runAsync('UPDATE products SET isActive = 0, updatedAt = ? WHERE id = ?', [new Date().toISOString(), id]);
            Toast.show({ type: 'success', text1: 'Produto removido', position: 'bottom' });
            router.back();
          } catch (e) { console.error(e); }
        },
      },
    ]);
  };

  if (!product) return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  const lowStock = (product.stockCurrent ?? 0) <= (product.stockMinimum ?? 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Produto</Text>
        <Pressable onPress={() => router.push(`/product/${id}/edit`)} hitSlop={12}><Ionicons name="create-outline" size={24} color={colors.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="cube" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
        {product.category ? <Text style={[styles.cat, { color: colors.textSecondary }]}>{product.category}</Text> : null}
        <View style={styles.pricesRow}>
          <View style={styles.priceBox}>
            <Text style={[styles.priceLabel, { color: colors.textCaption }]}>Preço de Venda</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>{formatCurrency(product.price1)}</Text>
          </View>
          {product.price2 != null && (
            <View style={styles.priceBox}>
              <Text style={[styles.priceLabel, { color: colors.textCaption }]}>Preço de Custo</Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>{formatCurrency(product.price2)}</Text>
            </View>
          )}
        </View>
        {product.price1 > 0 && product.price2 != null && product.price2 > 0 && (
          <View style={[styles.marginBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Lucro estimado por unidade</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 20, marginTop: 2 }}>
              {formatCurrency(product.price1 - product.price2)}
              {'  '}
              ({(((product.price1 - product.price2) / product.price1) * 100).toFixed(1)}%)
            </Text>
          </View>
        )}
        <View style={styles.stockInfo}>
          <Text style={[styles.stockLabel, { color: colors.textSecondary }]}>Estoque: {product.stockCurrent} {product.unit}</Text>
          {lowStock && <StatusBadge label="Estoque Baixo" color="#EF4444" />}
        </View>
        {product.barcode ? <Text style={[styles.info, { color: colors.textSecondary }]}>Código: {product.barcode}</Text> : null}
        {product.description ? <Text style={[styles.info, { color: colors.textSecondary }]}>{product.description}</Text> : null}
        <Pressable style={[styles.deleteBtn, { borderColor: colors.danger }]} onPress={handleDelete}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Excluir Produto</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, alignItems: 'center', paddingBottom: 48 },
  iconBox: { width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  productName: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  cat: { fontSize: 16, marginTop: 4 },
  pricesRow: { flexDirection: 'row', gap: 16, marginTop: 24 },
  priceBox: { alignItems: 'center' },
  marginBox: { borderRadius: 12, padding: 12, marginTop: 16, alignItems: 'center' },
  priceLabel: { fontSize: 12 },
  priceValue: { fontSize: 20, fontWeight: '700' },
  stockInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  stockLabel: { fontSize: 16 },
  info: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  deleteBtn: { marginTop: 32, alignItems: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1, width: '100%' },
});
