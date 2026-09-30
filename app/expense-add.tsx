// [LOCAL] — adicionar despesa
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import { generateUUID, todayISO, todayDateISO, parseCurrencyInput } from '../src/utils/format';
import { EXPENSE_CATEGORIES } from '../src/constants/theme';
import Toast from 'react-native-toast-message';

export default function ExpenseAddScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('combustivel');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayDateISO());
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCat, setShowCat] = useState(false);

  const canSave = description.trim().length >= 2 && parseCurrencyInput(amount) > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      const now = todayISO();
      await db.runAsync(
        'INSERT INTO expenses (id, description, category, amount, date, observations, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)',
        [generateUUID(), description.trim(), category, parseCurrencyInput(amount), date, observations || null, now, now]
      );
      Toast.show({ type: 'success', text1: 'Despesa registrada!', position: 'bottom' });
      router.back();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Erro ao salvar', position: 'bottom' });
    }
    setSaving(false);
  };

  const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? category;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Nova Despesa</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.text }]}>Descrição *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={description} onChangeText={setDescription} placeholder="Descrição da despesa" placeholderTextColor={colors.textCaption} />

        <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
        <Pressable style={[styles.input, styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowCat(!showCat)}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{catLabel}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.textCaption} />
        </Pressable>
        {showCat && (
          <View style={[styles.pickerList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {EXPENSE_CATEGORIES.map((c) => (
              <Pressable key={c.value} style={[styles.pickerItem, c.value === category && { backgroundColor: colors.primaryLight }]} onPress={() => { setCategory(c.value); setShowCat(false); }}>
                <Text style={{ color: colors.text }}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Valor *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={amount} onChangeText={setAmount} placeholder="0,00" placeholderTextColor={colors.textCaption} keyboardType="decimal-pad" />

        <Text style={[styles.label, { color: colors.text }]}>Data</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textCaption} />

        <Text style={[styles.label, { color: colors.text }]}>Observações</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: 'top' }]} value={observations} onChangeText={setObservations} placeholder="Observações" placeholderTextColor={colors.textCaption} multiline />

        <Pressable style={[styles.saveBtn, { backgroundColor: canSave ? colors.primary : colors.border }]} onPress={handleSave} disabled={!canSave || saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Despesa'}</Text>
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
  saveBtn: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
