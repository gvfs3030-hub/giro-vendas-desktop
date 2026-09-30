// [LOCAL] — Step 2: selecionar produtos
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useFocusEffect } from '../../src/platform/router';
import { Ionicons } from '../../src/platform/icons';
import { useSafeAreaInsets } from '../../src/platform/insets';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSaleWizard } from '../../src/contexts/SaleWizardContext';
import { getDatabase } from '../../src/database/database';
import type { Product } from '../../src/types';
import SearchBar from '../../src/components/SearchBar';
import Card from '../../src/components/Card';
import { formatCurrency } from '../../src/utils/format';

export default function SelectProductsStep() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wizard = useSaleWizard();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState('1');
  const [discount, setDiscount] = useState('0');

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
    } catch (e) { console.error(e); }
  };

  const filtered = (products ?? []).filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p?.name ?? '').toLowerCase().includes(s) || (p?.barcode ?? '').includes(s);
  });

  const handleAddProduct = () => {
    if (!modalProduct) return;
    const quantity = parseFloat(qty) || 1;
    const disc = parseFloat(discount) || 0;
    const maxQty = modalProduct.stockCurrent ?? 0;
    const finalQty = Math.min(quantity, maxQty > 0 ? maxQty : quantity);
    const unitPrice = modalProduct.price1 ?? 0;
    const subtotal = finalQty * unitPrice * (1 - disc / 100);

    wizard.addItem({
      productId: modalProduct.id,
      productName: modalProduct.name ?? '',
      quantity: finalQty,
      unitPrice,
      discount: disc,
      subtotal,
      priceTable: 1,
      unit: modalProduct.unit ?? 'UN',
      stockAvailable: maxQty,
    });
    setModalProduct(null);
    setQty('1');
    setDiscount('0');
  };

  const getItemQty = (productId: string) => {
    return wizard.state.items?.find((i) => i?.productId === productId)?.quantity ?? 0;
  };

  const totalItems = (wizard.state.items ?? []).reduce((s, i) => s + (i?.quantity ?? 0), 0);
  const totalValue = wizard.getSubtotal();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Adicionar Produtos</Text>
        <Text style={[styles.step, { color: colors.textCaption }]}>2/5</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar produto..." />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item?.id ?? ''}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => {
          const addedQty = getItemQty(item?.id ?? '');
          return (
            <Card style={styles.productCard} onPress={() => { setModalProduct(item); setQty('1'); setDiscount('0'); }}>
              <View style={styles.prodRow}>
                <View style={[styles.prodIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="cube" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prodName, { color: colors.text }]} numberOfLines={1}>{item?.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{formatCurrency(item?.price1)} | Est: {item?.stockCurrent ?? 0}</Text>
                </View>
                {addedQty > 0 ? (
                  <View style={[styles.qtyBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.qtyBadgeText}>{addedQty}</Text>
                  </View>
                ) : (
                  <Ionicons name="add-circle" size={28} color={colors.primary} />
                )}
              </View>
            </Card>
          );
        }}
      />

      {/* Add product modal */}
      <Modal visible={!!modalProduct} transparent animationType="slide" onRequestClose={() => setModalProduct(null)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalProduct(null)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 24) }]} onPress={() => {}}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{modalProduct?.name}</Text>
                <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
                  Disponível: {modalProduct?.stockCurrent ?? 0} {modalProduct?.unit} | {formatCurrency(modalProduct?.price1)}
                </Text>
                <Text style={[styles.label, { color: colors.text }]}>Quantidade</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="decimal-pad"
                />
                {parseFloat(qty) > (modalProduct?.stockCurrent ?? 0) && (modalProduct?.stockCurrent ?? 0) > 0 && (
                  <Text style={[styles.stockWarn, { color: colors.danger }]}>Apenas {modalProduct?.stockCurrent} unidades em estoque</Text>
                )}
                <Text style={[styles.label, { color: colors.text }]}>Desconto (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="decimal-pad"
                />
                <View style={styles.modalTotal}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal:</Text>
                  <Text style={[styles.totalValue, { color: colors.text }]}>
                    {formatCurrency((parseFloat(qty) || 0) * (modalProduct?.price1 ?? 0) * (1 - (parseFloat(discount) || 0) / 100))}
                  </Text>
                </View>
                <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleAddProduct}>
                  <Text style={styles.addBtnText}>Adicionar</Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{totalItems} item(ns)</Text>
          <Text style={[styles.totalText, { color: colors.text }]}>{formatCurrency(totalValue)}</Text>
        </View>
        <Pressable
          style={[styles.nextBtn, { backgroundColor: (wizard.state.items ?? []).length > 0 ? colors.primary : colors.border }]}
          onPress={() => router.push('/new-sale/cart')}
          disabled={(wizard.state.items ?? []).length === 0}
        >
          <Text style={styles.nextBtnText}>Próximo</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  step: { fontSize: 14 },
  productCard: { marginHorizontal: 16, marginBottom: 8 },
  prodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prodIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  prodName: { fontSize: 16, fontWeight: '600' },
  qtyBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qtyBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  stockWarn: { fontSize: 12, marginTop: 4 },
  modalTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  totalLabel: { fontSize: 16 },
  totalValue: { fontSize: 20, fontWeight: '700' },
  addBtn: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1 },
  totalText: { fontSize: 18, fontWeight: '700' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
