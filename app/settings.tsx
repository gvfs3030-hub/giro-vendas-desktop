// [LOCAL] — configurações
import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useFocusEffect, router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import { todayISO, todayDateISO, currentYearMonth, generateUUID, parseCurrencyInput, formatCurrency } from '../src/utils/format';
import Card from '../src/components/Card';
import Toast from 'react-native-toast-message';
import AsyncStorage from '../src/platform/storage';
import { saveAndRevealBackup } from '../src/platform/printing';
import type { ThemeMode } from '../src/types';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [sellerName, setSellerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [goalValue, setGoalValue] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const db = await getDatabase();
      const config = await db.getFirstAsync<{ sellerName: string; companyName: string }>('SELECT sellerName, companyName FROM config WHERE id = 1');
      setSellerName(config?.sellerName ?? '');
      setCompanyName(config?.companyName ?? '');
      const ym = currentYearMonth();
      const goal = await db.getFirstAsync<{ targetAmount: number }>('SELECT targetAmount FROM goals WHERE yearMonth = ?', [ym]);
      setGoalValue(goal?.targetAmount ? String(goal.targetAmount) : '');
    } catch (e) { console.error(e); }
  };

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync('UPDATE config SET sellerName = ?, companyName = ?, updatedAt = ? WHERE id = 1', [sellerName, companyName, todayISO()]);
      Toast.show({ type: 'success', text1: 'Perfil atualizado!', position: 'bottom' });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const saveGoal = async () => {
    try {
      const db = await getDatabase();
      const ym = currentYearMonth();
      const now = todayISO();
      const val = parseCurrencyInput(goalValue);
      const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM goals WHERE yearMonth = ?', [ym]);
      if (existing) {
        await db.runAsync('UPDATE goals SET targetAmount = ?, updatedAt = ? WHERE yearMonth = ?', [val, now, ym]);
      } else {
        await db.runAsync('INSERT INTO goals (id, yearMonth, targetAmount, createdAt, updatedAt) VALUES (?,?,?,?,?)', [generateUUID(), ym, val, now, now]);
      }
      Toast.show({ type: 'success', text1: 'Meta atualizada!', position: 'bottom' });
    } catch (e) { console.error(e); }
  };

  const exportData = async () => {
    try {
      const db = await getDatabase();
      const tables = ['config', 'clients', 'products', 'sales', 'sale_items', 'installments', 'visits', 'expenses', 'goals'];
      const backup: Record<string, unknown[]> = { version: [1] as any, exportedAt: [todayISO()] as any };
      for (const table of tables) {
        const rows = await db.getAllAsync(`SELECT * FROM ${table}`);
        backup[table] = rows ?? [];
      }
      const json = JSON.stringify(backup, null, 2);
      const filename = `giro_backup_${todayDateISO()}.json`;
      const path = await saveAndRevealBackup(json, filename);
      Toast.show({ type: 'success', text1: 'Backup exportado!', text2: path, position: 'bottom' });
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Erro ao exportar', position: 'bottom' });
    }
  };

  const clearData = () => {
    Alert.alert('Limpar Todos os Dados', 'Esta ação é irreversível! Todos os dados serão perdidos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar Tudo', style: 'destructive', onPress: async () => {
          try {
            const db = await getDatabase();
            await db.execAsync('DELETE FROM sale_items; DELETE FROM installments; DELETE FROM sales; DELETE FROM visits; DELETE FROM expenses; DELETE FROM goals; DELETE FROM products; DELETE FROM clients; DELETE FROM config;');
            await AsyncStorage.multiRemove(['setup_complete', 'onboarding_complete']);
            Toast.show({ type: 'success', text1: 'Dados limpos', position: 'bottom' });
            router.replace('/');
          } catch (e) { console.error(e); }
        },
      },
    ]);
  };

  const themes: { label: string; value: ThemeMode }[] = [
    { label: 'Claro', value: 'light' },
    { label: 'Escuro', value: 'dark' },
    { label: 'Sistema', value: 'system' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Perfil</Text>
        <Text style={[styles.label, { color: colors.text }]}>Nome do Vendedor</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={sellerName} onChangeText={setSellerName} />
        <Text style={[styles.label, { color: colors.text }]}>Nome da Empresa</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={companyName} onChangeText={setCompanyName} />
        <Pressable style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={saveProfile}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar Perfil</Text>
        </Pressable>

        {/* Theme */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Aparência</Text>
        <View style={styles.themeRow}>
          {themes.map((t) => (
            <Pressable key={t.value} style={[styles.themeBtn, { backgroundColor: mode === t.value ? colors.primary : colors.surface, borderColor: mode === t.value ? colors.primary : colors.border }]} onPress={() => setMode(t.value)}>
              <Text style={{ color: mode === t.value ? '#fff' : colors.text, fontWeight: '600' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Goal */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Meta do Mês</Text>
        <View style={styles.goalRow}>
          <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={goalValue} onChangeText={setGoalValue} placeholder="Valor da meta" placeholderTextColor={colors.textCaption} keyboardType="decimal-pad" />
          <Pressable style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={saveGoal}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
          </Pressable>
        </View>

        {/* Data */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Dados</Text>
        <Pressable style={[styles.dataBtn, { borderColor: colors.primary }]} onPress={exportData}>
          <Ionicons name="download-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Exportar Backup (JSON)</Text>
        </Pressable>
        <Pressable style={[styles.dataBtn, { borderColor: colors.primary, marginTop: 8 }]} onPress={() => router.push('/import-backup')}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Importar Clientes e Produtos (JSON)</Text>
        </Pressable>
        <Pressable style={[styles.dataBtn, { borderColor: colors.danger, marginTop: 8 }]} onPress={clearData}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Limpar Todos os Dados</Text>
        </Pressable>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Sobre</Text>
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Giro Vendas</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Versão 1.0.0</Text>
          <Text style={{ color: colors.textCaption, marginTop: 4 }}>App de vendas offline para distribuidores</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  smallBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  goalRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dataBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1 },
});
