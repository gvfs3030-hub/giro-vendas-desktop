// [LOCAL] — editar cliente
import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from '../../../src/platform/router';
import { Ionicons } from '../../../src/platform/icons';
import { useSafeAreaInsets } from '../../../src/platform/insets';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getDatabase } from '../../../src/database/database';
import type { Client } from '../../../src/types';
import { todayISO } from '../../../src/utils/format';
import { useFocusPreview } from '../../../src/components/FocusPreview';
import Toast from 'react-native-toast-message';

// [LOCAL] Componente definido FORA da tela: se ficasse dentro de ClientEditScreen,
// o React recriava esse componente a cada tecla digitada (novo tipo de componente
// a cada render), desmontando e remontando o TextInput nativo e derrubando o foco
// e o teclado depois de cada caractere. Definido aqui fora, a mesma instância é
// reaproveitada entre renders e a digitação funciona normalmente.
function InputField({ label, field, form, onUpdate, colors, ...props }: any) {
  const { report, clear } = useFocusPreview();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={form[field] ?? ''}
        onChangeText={(v: string) => { onUpdate(field, v); report(label, v); }}
        onFocus={() => report(label, form[field] ?? '')}
        onBlur={clear}
        placeholderTextColor={colors.textCaption}
        {...props}
      />
    </View>
  );
}

export default function ClientEditScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadClient();
    }, [id])
  );

  const loadClient = async () => {
    try {
      const db = await getDatabase();
      const c = await db.getFirstAsync<Client>('SELECT * FROM clients WHERE id = ?', [id]);
      if (c) {
        setForm({
          razaoSocial: c.razaoSocial ?? '', nomeFantasia: c.nomeFantasia ?? '', cnpjCpf: c.cnpjCpf ?? '',
          phone: c.phone ?? '', email: c.email ?? '', cep: c.cep ?? '', street: c.street ?? '',
          number: c.number ?? '', complement: c.complement ?? '', neighborhood: c.neighborhood ?? '',
          city: c.city ?? '', state: c.state ?? '', observations: c.observations ?? '',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE clients SET razaoSocial=?, nomeFantasia=?, cnpjCpf=?, phone=?, email=?, cep=?, street=?, number=?, complement=?, neighborhood=?, city=?, state=?, observations=?, updatedAt=? WHERE id=?`,
        [form.razaoSocial, form.nomeFantasia, form.cnpjCpf || null, form.phone, form.email || null,
         form.cep || null, form.street || null, form.number || null, form.complement || null,
         form.neighborhood || null, form.city || null, form.state || null, form.observations || null, todayISO(), id]
      );
      Toast.show({ type: 'success', text1: 'Cliente atualizado!', position: 'bottom' });
      router.back();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Erro ao salvar', position: 'bottom' });
    }
    setSaving(false);
  };

  const fieldProps = { form, onUpdate: update, colors };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Editar Cliente</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <InputField {...fieldProps} label="Razão Social" field="razaoSocial" />
        <InputField {...fieldProps} label="Nome Fantasia" field="nomeFantasia" />
        <InputField {...fieldProps} label="CNPJ/CPF" field="cnpjCpf" />
        <InputField {...fieldProps} label="Telefone" field="phone" keyboardType="phone-pad" />
        <InputField {...fieldProps} label="Email" field="email" keyboardType="email-address" autoCapitalize="none" />
        <InputField {...fieldProps} label="CEP" field="cep" />
        <InputField {...fieldProps} label="Rua" field="street" />
        <InputField {...fieldProps} label="Número" field="number" />
        <InputField {...fieldProps} label="Complemento" field="complement" />
        <InputField {...fieldProps} label="Bairro" field="neighborhood" />
        <InputField {...fieldProps} label="Cidade" field="city" />
        <InputField {...fieldProps} label="UF" field="state" maxLength={2} />
        <InputField {...fieldProps} label="Observações" field="observations" multiline />
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
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  saveBtn: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
