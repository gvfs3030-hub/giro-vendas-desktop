// [LOCAL] — Step 3: carrinho
import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from '../../src/platform/router';
import { Ionicons } from '../../src/platform/icons';
import { useSafeAreaInsets } from '../../src/platform/insets';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSaleWizard } from '../../src/contexts/SaleWizardContext';
import Card from '../../src/components/Card';
import { formatCurrency } from '../../src/utils/format';

export default function CartStep() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wizard = useSaleWizard();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Carrinho</Text>
        <Text style={[styles.step, { color: colors.textCaption }]}>3/5</Text>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={wizard.state.items ?? []}
        keyExtractor={(item) => item?.productId ?? ''}
        contentContainerStyle={{ paddingBottom: 200 }}
        renderItem={({ item }) => (
          <Card style={styles.itemCard}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item?.productName}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  {item?.quantity} {item?.unit} x {formatCurrency(item?.unitPrice)}
                  {(item?.discount ?? 0) > 0 ? ` (-${item?.discount}%)` : ''}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: colors.text }]}>{formatCurrency(item?.subtotal)}</Text>
              <Pressable onPress={() => wizard.removeItem(item?.productId ?? '')} hitSlop={12}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      {/* Observations */}
      <View style={[styles.obsBox, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.obsInput, { color: colors.text, borderColor: colors.border }]}
          value={wizard.state.observations}
          onChangeText={wizard.setObservations}
          placeholder="Observações do pedido..."
          placeholderTextColor={colors.textCaption}
          multiline
        />
      </View>

      {/* Summary + Next */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textSecondary }}>Subtotal:</Text>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{formatCurrency(wizard.getSubtotal())}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textSecondary }}>Desconto:</Text>
            <Text style={{ color: colors.warning, fontWeight: '600' }}>-{formatCurrency(wizard.getTotalDiscount())}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Total:</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 18 }}>{formatCurrency(wizard.getTotal())}</Text>
          </View>
        </View>
        <Pressable style={[styles.nextBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/new-sale/payment')}>
          <Text style={styles.nextBtnText}>Próximo</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  step: { fontSize: 14 },
  itemCard: { marginHorizontal: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemTotal: { fontSize: 16, fontWeight: '700' },
  obsBox: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1 },
  obsInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 48 },
  bottomBar: { padding: 16, borderTopWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 24, marginTop: 12 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
