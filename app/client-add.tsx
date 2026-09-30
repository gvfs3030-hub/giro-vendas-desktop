// [LOCAL] — adicionar cliente
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import { generateUUID, todayISO } from '../src/utils/format';
import { FontSize, Spacing, BorderRadius } from '../src/constants/theme';
import { useFocusPreview } from '../src/components/FocusPreview';
import Toast from 'react-native-toast-message';

// [LOCAL] Componente definido FORA da tela: se ficasse dentro de ClientAddScreen,
// o React recriava esse componente a cada tecla digitada (novo tipo de componente
// a cada render), desmontando e remontando o TextInput nativo e derrubando o foco
// e o teclado depois de cada caractere. Definido aqui fora, a mesma instância é
// reaproveitada entre renders e a digitação funciona normalmente.
function InputField({ label, field, required, form, onUpdate, colors, ...props }: any) {
  const { report, clear } = useFocusPreview();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}{required ? ' *' : ''}</Text>
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

export default function ClientAddScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    razaoSocial: '', nomeFantasia: '', cnpjCpf: '', phone: '', email: '',
    cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
    observations: '',
  });
  const [saving, setSaving] = useState(false);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));
  const canSave = form.razaoSocial.trim().length >= 2 && form.nomeFantasia.trim().length >= 2 && form.phone.trim().length >= 2;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      const now = todayISO();
      const id = generateUUID();
      await db.runAsync(
        `INSERT INTO clients (id, razaoSocial, nomeFantasia, cnpjCpf, phone, email, cep, street, number, complement, neighborhood, city, state, observations, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [id, form.razaoSocial.trim(), form.nomeFantasia.trim(), form.cnpjCpf || null, form.phone.trim(), form.email || null,
         form.cep || null, form.street || null, form.number || null, form.complement || null, form.neighborhood || null,
         form.city || null, form.state || null, form.observations || null, now, now]
      );
      Toast.show({ type: 'success', text1: 'Cliente cadastrado!', position: 'bottom' });
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Novo Cliente</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <InputField {...fieldProps} label="Razão Social" field="razaoSocial" required placeholder="Razão social" />
        <InputField {...fieldProps} label="Nome Fantasia" field="nomeFantasia" required placeholder="Nome fantasia" />
        <InputField {...fieldProps} label="CNPJ/CPF" field="cnpjCpf" placeholder="00.000.000/0000-00" keyboardType="numeric" />
        <InputField {...fieldProps} label="Telefone" field="phone" required placeholder="(00) 00000-0000" keyboardType="phone-pad" />
        <InputField {...fieldProps} label="Email" field="email" placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Endereço</Text>
        <InputField {...fieldProps} label="CEP" field="cep" placeholder="00000-000" keyboardType="numeric" />
        <InputField {...fieldProps} label="Rua" field="street" placeholder="Rua/Avenida" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}><InputField {...fieldProps} label="Número" field="number" placeholder="Nº" keyboardType="numeric" /></View>
          <View style={{ flex: 2 }}><InputField {...fieldProps} label="Complemento" field="complement" placeholder="Apto, sala..." /></View>
        </View>
        <InputField {...fieldProps} label="Bairro" field="neighborhood" placeholder="Bairro" />
        <View style={styles.row}>
          <View style={{ flex: 2 }}><InputField {...fieldProps} label="Cidade" field="city" placeholder="Cidade" /></View>
          <View style={{ flex: 1 }}><InputField {...fieldProps} label="UF" field="state" placeholder="UF" maxLength={2} autoCapitalize="characters" /></View>
        </View>
        <InputField {...fieldProps} label="Observações" field="observations" placeholder="Observações sobre o cliente..." multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />

        <Pressable
          style={[styles.saveBtn, { backgroundColor: canSave ? colors.primary : colors.border }]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Cliente'}</Text>
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
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  saveBtn: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
