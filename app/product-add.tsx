// [LOCAL] — adicionar produto
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import { generateUUID, todayISO, parseCurrencyInput, formatCurrency } from '../src/utils/format';
import { UNITS, CATEGORIES, FontSize, Spacing, BorderRadius } from '../src/constants/theme';
import { useFocusPreview } from '../src/components/FocusPreview';
import Toast from 'react-native-toast-message';

export default function ProductAddScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { report, clear } = useFocusPreview();
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Alimentos');
  const [unit, setUnit] = useState('UN');
  const [price1, setPrice1] = useState('');
  const [price2, setPrice2] = useState('');
  const [stockCurrent, setStockCurrent] = useState('');
  const [stockMinimum, setStockMinimum] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [showUnit, setShowUnit] = useState(false);

  const canSave = name.trim().length >= 2 && parseCurrencyInput(price1) > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      const now = todayISO();
      const id = generateUUID();
      await db.runAsync(
        `INSERT INTO products (id, name, barcode, category, unit, price1, price2, stockCurrent, stockMinimum, description, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [id, name.trim(), barcode || null, category, unit, parseCurrencyInput(price1),
         price2 ? parseCurrencyInput(price2) : null,
         parseInt(stockCurrent) || 0, parseInt(stockMinimum) || 0, description || null, now, now]
      );
      Toast.show({ type: 'success', text1: 'Produto cadastrado!', position: 'bottom' });
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
        <Text style={[styles.title, { color: colors.text }]}>Novo Produto</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.text }]}>Nome do Produto *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={name} onChangeText={(v) => { setName(v); report('Nome do Produto', v); }} onFocus={() => report('Nome do Produto', name)} onBlur={clear} placeholder="Nome do produto" placeholderTextColor={colors.textCaption} />

        <Text style={[styles.label, { color: colors.text }]}>Código de Barras</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={barcode} onChangeText={(v) => { setBarcode(v); report('Código de Barras', v); }} onFocus={() => report('Código de Barras', barcode)} onBlur={clear} placeholder="Código de barras" placeholderTextColor={colors.textCaption} />

        <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
        <Pressable style={[styles.input, styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowCat(!showCat)}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{category}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.textCaption} />
        </Pressable>
        {showCat && (
          <View style={[styles.pickerList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {CATEGORIES.map((cat) => (
              <Pressable key={cat} style={[styles.pickerItem, cat === category && { backgroundColor: colors.primaryLight }]} onPress={() => { setCategory(cat); setShowCat(false); }}>
                <Text style={{ color: colors.text }}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Unidade</Text>
        <Pressable style={[styles.input, styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowUnit(!showUnit)}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{unit}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.textCaption} />
        </Pressable>
        {showUnit && (
          <View style={[styles.pickerList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {UNITS.map((u) => (
              <Pressable key={u} style={[styles.pickerItem, u === unit && { backgroundColor: colors.primaryLight }]} onPress={() => { setUnit(u); setShowUnit(false); }}>
                <Text style={{ color: colors.text }}>{u}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Preço de Venda *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={price1} onChangeText={(v) => { setPrice1(v); report('Preço de Venda', v); }} onFocus={() => report('Preço de Venda', price1)} onBlur={clear} placeholder="0,00" placeholderTextColor={colors.textCaption} keyboardType="decimal-pad" />

        <Text style={[styles.label, { color: colors.text }]}>Preço de Custo</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={price2} onChangeText={(v) => { setPrice2(v); report('Preço de Custo', v); }} onFocus={() => report('Preço de Custo', price2)} onBlur={clear} placeholder="0,00" placeholderTextColor={colors.textCaption} keyboardType="decimal-pad" />

        {parseCurrencyInput(price1) > 0 && parseCurrencyInput(price2) > 0 && (
          <View style={[styles.marginBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Lucro estimado por unidade</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 20, marginTop: 2 }}>
              {formatCurrency(parseCurrencyInput(price1) - parseCurrencyInput(price2))}
              {'  '}
              ({(((parseCurrencyInput(price1) - parseCurrencyInput(price2)) / parseCurrencyInput(price1)) * 100).toFixed(1)}%)
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text }]}>Estoque Atual</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={stockCurrent} onChangeText={(v) => { setStockCurrent(v); report('Estoque Atual', v); }} onFocus={() => report('Estoque Atual', stockCurrent)} onBlur={clear} placeholder="0" placeholderTextColor={colors.textCaption} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text }]}>Estoque Mínimo</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={stockMinimum} onChangeText={(v) => { setStockMinimum(v); report('Estoque Mínimo', v); }} onFocus={() => report('Estoque Mínimo', stockMinimum)} onBlur={clear} placeholder="0" placeholderTextColor={colors.textCaption} keyboardType="numeric" />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={(v) => { setDescription(v); report('Descrição', v); }} onFocus={() => report('Descrição', description)} onBlur={clear} placeholder="Descrição do produto" placeholderTextColor={colors.textCaption} multiline />

        <Pressable style={[styles.saveBtn, { backgroundColor: canSave ? colors.primary : colors.border }]} onPress={handleSave} disabled={!canSave || saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Produto'}</Text>
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
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerList: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 12 },
  marginBox: { borderRadius: 12, padding: 12, marginTop: 12 },
  saveBtn: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
