// [LOCAL] — detalhe da despesa
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from '../../../src/platform/router';
import { Ionicons } from '../../../src/platform/icons';
import { useSafeAreaInsets } from '../../../src/platform/insets';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getDatabase } from '../../../src/database/database';
import type { Expense } from '../../../src/types';
import { formatCurrency, formatDate } from '../../../src/utils/format';
import { EXPENSE_CATEGORIES } from '../../../src/constants/theme';
import Toast from 'react-native-toast-message';

export default function ExpenseDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [expense, setExpense] = useState<Expense | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      loadExpense();
    }, [id])
  );

  const loadExpense = async () => {
    try {
      const db = await getDatabase();
      const e = await db.getFirstAsync<Expense>('SELECT * FROM expenses WHERE id = ?', [id]);
      setExpense(e ?? null);
    } catch (e) { console.error(e); }
  };

  const handleDelete = () => {
    Alert.alert('Excluir Despesa', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          const db = await getDatabase();
          await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
          Toast.show({ type: 'success', text1: 'Despesa excluída', position: 'bottom' });
          router.back();
        } catch (e) { console.error(e); }
      }},
    ]);
  };

  if (!expense) return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Despesa</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ color: colors.danger, fontSize: 28, fontWeight: '700', textAlign: 'center' }}>-{formatCurrency(expense.amount)}</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>{catLabel} | {formatDate(expense.date)}</Text>
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.textCaption, fontSize: 12 }}>Descrição</Text>
          <Text style={{ color: colors.text, fontSize: 16, marginTop: 4 }}>{expense.description}</Text>
          {expense.observations ? (<><Text style={{ color: colors.textCaption, fontSize: 12, marginTop: 12 }}>Observações</Text><Text style={{ color: colors.text }}>{expense.observations}</Text></>) : null}
        </View>
        <Pressable style={[styles.deleteBtn, { borderColor: colors.danger }]} onPress={handleDelete}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Excluir Despesa</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 48 },
  infoBox: { marginTop: 24, padding: 16, borderRadius: 16, borderWidth: 1 },
  deleteBtn: { marginTop: 24, alignItems: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1 },
});
