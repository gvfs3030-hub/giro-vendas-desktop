// [LOCAL] — importar clientes e produtos de um backup JSON (100% local)
// Não usamos um seletor de arquivo do sistema aqui de propósito: isso exigiria uma
// biblioteca nativa nova, e sem conseguir rodar `yarn install` para travar a versão
// certinha no yarn.lock, é arriscado adicionar dependência nova sem testar. Colar o
// texto funciona com o "Colar" nativo do teclado, sem precisar de nenhuma lib extra.
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import Toast from 'react-native-toast-message';

const CLIENT_COLUMNS = [
  'id', 'razaoSocial', 'nomeFantasia', 'cnpjCpf', 'phone', 'email', 'cep', 'street',
  'number', 'complement', 'neighborhood', 'city', 'state', 'observations', 'isActive',
  'createdAt', 'updatedAt',
];

const PRODUCT_COLUMNS = [
  'id', 'name', 'barcode', 'category', 'unit', 'price1', 'price2', 'price3',
  'stockCurrent', 'stockMinimum', 'description', 'isActive', 'createdAt', 'updatedAt',
];

export default function ImportBackupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!text.trim()) {
      Toast.show({ type: 'error', text1: 'Cole o conteúdo do backup primeiro', position: 'bottom' });
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      Toast.show({ type: 'error', text1: 'Isso não parece um JSON válido', text2: 'Confira se copiou o arquivo inteiro', position: 'bottom' });
      return;
    }

    const clients = Array.isArray(parsed?.clients) ? parsed.clients : [];
    const products = Array.isArray(parsed?.products) ? parsed.products : [];

    if (clients.length === 0 && products.length === 0) {
      Toast.show({ type: 'error', text1: 'Nenhum cliente ou produto encontrado nesse arquivo', position: 'bottom' });
      return;
    }

    Alert.alert(
      'Importar dados',
      `Encontrados ${clients.length} cliente(s) e ${products.length} produto(s). Registros com o mesmo ID já existente serão atualizados. Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Importar', onPress: () => runImport(clients, products) },
      ]
    );
  };

  const runImport = async (clients: any[], products: any[]) => {
    setImporting(true);
    try {
      const db = await getDatabase();
      let clientCount = 0;
      let productCount = 0;

      for (const row of clients) {
        if (!row?.id || !row?.razaoSocial) continue;
        const placeholders = CLIENT_COLUMNS.map(() => '?').join(',');
        const values = CLIENT_COLUMNS.map((c) => row[c] ?? null);
        await db.runAsync(`INSERT OR REPLACE INTO clients (${CLIENT_COLUMNS.join(',')}) VALUES (${placeholders})`, values);
        clientCount++;
      }

      for (const row of products) {
        if (!row?.id || !row?.name) continue;
        const placeholders = PRODUCT_COLUMNS.map(() => '?').join(',');
        const values = PRODUCT_COLUMNS.map((c) => row[c] ?? null);
        await db.runAsync(`INSERT OR REPLACE INTO products (${PRODUCT_COLUMNS.join(',')}) VALUES (${placeholders})`, values);
        productCount++;
      }

      Toast.show({ type: 'success', text1: 'Importação concluída!', text2: `${clientCount} cliente(s), ${productCount} produto(s)`, position: 'bottom' });
      router.back();
    } catch (e) {
      console.error('Import error:', e);
      Toast.show({ type: 'error', text1: 'Erro ao importar', position: 'bottom' });
    }
    setImporting(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Importar Clientes e Produtos</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.stepsBox, { backgroundColor: colors.primaryLight }]}>
          <Text style={{ color: colors.primary, fontWeight: '700', marginBottom: 6 }}>Como usar</Text>
          <Text style={{ color: colors.primary, fontSize: 14, lineHeight: 20 }}>
            1. No aparelho antigo, vá em Configurações e toque em "Exportar Backup (JSON)".{'\n'}
            2. Abra o arquivo exportado (num app de Arquivos, WhatsApp, e-mail etc.), selecione e copie todo o texto.{'\n'}
            3. Volte aqui, toque no campo abaixo, segure o dedo e toque em "Colar".{'\n'}
            4. Toque em "Importar".
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Conteúdo do backup (JSON)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={text}
          onChangeText={setText}
          placeholder="Cole aqui o conteúdo do arquivo giro_backup.json..."
          placeholderTextColor={colors.textCaption}
          multiline
          numberOfLines={12}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable
          style={[styles.importBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]}
          onPress={handleImport}
          disabled={!text.trim() || importing}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.importBtnText}>{importing ? 'Importando...' : 'Importar'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  stepsBox: { borderRadius: 12, padding: 14, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  textArea: { minHeight: 220, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 13, fontFamily: 'monospace' },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 24, marginTop: 20 },
  importBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
