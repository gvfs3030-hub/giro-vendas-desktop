// [LOCAL] — editar produto
import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from '../../../src/platform/router';
import { Ionicons } from '../../../src/platform/icons';
import { useSafeAreaInsets } from '../../../src/platform/insets';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getDatabase } from '../../../src/database/database';
import type { Product } from '../../../src/types';
import { todayISO, parseCurrencyInput, formatCurrency } from '../../../src/utils/format';
import { UNITS, CATEGORIES } from '../../../src/constants/theme';
import Toast from 'react-native-toast-message';

export default function ProductEditScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProduct();
    }, [id])
  );

  const loadProduct = async () => {
    try {
      const db = await getDatabase();
      const p = await db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', [id]);
      if (p) {
        setForm({
          name: p.name ?? '', barcode: p.barcode ?? '', category: p.category ?? 'Alimentos',
          unit: p.unit ?? 'UN', price1: String(p.price1 ?? 0), price2: p.price2 ? String(p.price2) : '',
          stockCurrent: p.stockCurrent ? String(p.stockCurrent) : '',
          stockMinimum: p.stockMinimum ? String(p.stockMinimum) : '', description: p.description ?? '',
        });
      }
    } catch (e) { console.error(e); }
  };

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE products SET name=?, barcode=?, category=?, unit=?, price1=?, price2=?, stockCurrent=?, stockMinimum=?, description=?, updatedAt=? WHERE id=?`,
        [form.name, form.barcode || null, form.category, form.unit, parseCurrencyInput(form.price1 ?? '0'),
         form.price2 ? parseCurrencyInput(form.price2) : null,
         parseInt(form.stockCurrent ?? '0') || 0, parseInt(form.stockMinimum ?? '0') || 0, form.description || null, todayISO(), id]
      );
      Toast.show({ type: 'success', text1: 'Produto atualizado!', position: 'bottom' });
      router.back();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Erro ao salvar', position: 'bottom' });
    }
    setSaving(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Editar Produto</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={form.name ?? ''} onChangeText={(v) => update('name', v)} />
        <Text style={[styles.label, { color: colors.text }]}>Código de Barras</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={form.barcode ?? ''} onChangeText={(v) => update('barcode', v)} />
        <Text style={[styles.label, { color: colors.text }]}>Preço de Venda</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={form.price1 ?? ''} onChangeText={(v) => update('price1', v)} placeholder="0,00" placeholderTextColor={colors.textCaption} keyboardType="decimal-pad" />
        <Text style={[styles.label, { color: colors.text }]}>Preço de Custo</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={form.price2 ?? ''} onChangeText={(v) => update('price2', v)} placeholder="0,00" placeholderTextColor={colors.textCaption} keyboardType="decimal-pad" />
        {parseCurrencyInput(form.price1 ?? '') > 0 && parseCurrencyInput(form.price2 ?? '') > 0 && (
          <View style={[styles.marginBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Lucro estimado por unidade</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 20, marginTop: 2 }}>
              {formatCurrency(parseCurrencyInput(form.price1 ?? '') - parseCurrencyInput(form.price2 ?? ''))}
              {'  '}
              ({(((parseCurrencyInput(form.price1 ?? '') - parseCurrencyInput(form.price2 ?? '')) / parseCurrencyInput(form.price1 ?? '')) * 100).toFixed(1)}%)
            </Text>
          </View>
        )}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text }]}>Estoque Atual</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={form.stockCurrent ?? ''} onChangeText={(v) => update('stockCurrent', v)} placeholder="0" placeholderTextColor={colors.textCaption} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text }]}>Estoque Mínimo</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={form.stockMinimum ?? ''} onChangeText={(v) => update('stockMinimum', v)} placeholder="0" placeholderTextColor={colors.textCaption} keyboardType="numeric" />
          </View>
        </View>
        <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Alterações'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  row: { flexDirection: 'row', gap: 12 },
  marginBox: { borderRadius: 12, padding: 12, marginTop: 12 },
  saveBtn: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
