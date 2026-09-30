// [LOCAL] — tela de configuração inicial (sem login)
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from '../../src/platform/insets';
import { Ionicons } from '../../src/platform/icons';
import { useAppState } from '../../src/contexts/AppStateContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { getDatabase } from '../../src/database/database';
import { todayISO } from '../../src/utils/format';
import { CATEGORIES, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';
import Toast from 'react-native-toast-message';
import { router } from '../../src/platform/router';

export default function SetupScreen() {
  const { setSetupComplete } = useAppState();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sellerName, setSellerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('Alimentos');
  const [phone, setPhone] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = sellerName.trim().length >= 2 && companyName.trim().length >= 2;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      const now = todayISO();
      await db.runAsync(
        `INSERT OR REPLACE INTO config (id, sellerName, companyName, category, phone, monthlyGoal, createdAt, updatedAt) VALUES (1, ?, ?, ?, ?, 0, ?, ?)`,
        [sellerName.trim(), companyName.trim(), category, phone.trim() || null, now, now]
      );
      await setSetupComplete();
      Toast.show({ type: 'success', text1: 'Bem-vindo ao Giro Vendas!', position: 'bottom' });
      router.replace('/tabs/home');
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Erro ao salvar', position: 'bottom' });
    }
    setSaving(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Ionicons name="storefront" size={48} color="#fff" />
        <Text style={styles.headerTitle}>Giro Vendas</Text>
        <Text style={styles.headerSub}>Configure seu perfil para começar</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Nome do Vendedor *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={sellerName}
          onChangeText={setSellerName}
          placeholder="Seu nome"
          placeholderTextColor={colors.textCaption}
        />

        <Text style={[styles.label, { color: colors.text }]}>Nome da Empresa *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Nome da empresa"
          placeholderTextColor={colors.textCaption}
        />

        <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
        <Pressable
          style={[styles.input, styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowCatPicker(!showCatPicker)}
        >
          <Text style={{ color: colors.text, fontSize: FontSize.md }}>{category}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.textCaption} />
        </Pressable>
        {showCatPicker && (
          <View style={[styles.pickerList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.pickerItem, cat === category && { backgroundColor: colors.primaryLight }]}
                onPress={() => { setCategory(cat); setShowCatPicker(false); }}
              >
                <Text style={{ color: colors.text, fontSize: FontSize.md }}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Telefone (opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="(00) 00000-0000"
          placeholderTextColor={colors.textCaption}
          keyboardType="phone-pad"
        />

        <Pressable
          style={[styles.saveBtn, { backgroundColor: canSave ? colors.primary : colors.border }]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar e Começar'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 48 },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 24,
  },
  headerTitle: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 8 },
  headerSub: { color: '#ffffffcc', fontSize: 16, marginTop: 4 },
  form: { paddingHorizontal: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    justifyContent: 'center',
  },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerList: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 16 },
  saveBtn: {
    height: 56,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
