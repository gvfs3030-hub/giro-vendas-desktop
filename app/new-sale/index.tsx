// [LOCAL] — Step 1: selecionar cliente
import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from '../../src/platform/router';
import { Ionicons } from '../../src/platform/icons';
import { useSafeAreaInsets } from '../../src/platform/insets';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSaleWizard } from '../../src/contexts/SaleWizardContext';
import { getDatabase } from '../../src/database/database';
import type { Client } from '../../src/types';
import SearchBar from '../../src/components/SearchBar';
import Card from '../../src/components/Card';

export default function SelectClientStep() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wizard = useSaleWizard();
  const params = useLocalSearchParams<{ clientId?: string; clientName?: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (params.clientId && params.clientName) {
      wizard.setClient(params.clientId, decodeURIComponent(params.clientName ?? ''));
    }
  }, [params.clientId]);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [])
  );

  const loadClients = async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<Client>('SELECT * FROM clients WHERE isActive = 1 ORDER BY nomeFantasia ASC');
      setClients(rows ?? []);
    } catch (e) { console.error(e); }
  };

  const filtered = (clients ?? []).filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c?.nomeFantasia ?? '').toLowerCase().includes(s) || (c?.phone ?? '').includes(s);
  });

  const handleSelect = (c: Client) => {
    wizard.setClient(c.id, c.nomeFantasia ?? '');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Selecionar Cliente</Text>
        <Text style={[styles.step, { color: colors.textCaption }]}>1/5</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar cliente..." />
      </View>

      {/* Consumidor avulso */}
      <Pressable
        style={[styles.avulsoBtn, { backgroundColor: wizard.state.clientId === 'avulso' ? colors.primaryLight : colors.surface, borderColor: wizard.state.clientId === 'avulso' ? colors.primary : colors.border }]}
        onPress={() => wizard.setClient('avulso', 'Consumidor Avulso')}
      >
        <Ionicons name="person-outline" size={20} color={colors.primary} />
        <Text style={{ color: colors.text, fontSize: 16 }}>Consumidor Avulso</Text>
      </Pressable>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item?.id ?? ''}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => {
          const selected = wizard.state.clientId === item?.id;
          return (
            <Card
              style={[styles.clientCard, selected && { borderColor: colors.primary, borderWidth: 2 }]}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.clientRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>{(item?.nomeFantasia ?? '?')[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientName, { color: colors.text }]}>{item?.nomeFantasia}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{item?.city ?? ''}</Text>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </View>
            </Card>
          );
        }}
      />

      {/* Next button */}
      {wizard.state.clientId && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={[styles.selectedText, { color: colors.textSecondary }]}>{wizard.state.clientName}</Text>
          <Pressable style={[styles.nextBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/new-sale/products')}>
            <Text style={styles.nextBtnText}>Próximo</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  step: { fontSize: 14 },
  avulsoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  clientCard: { marginHorizontal: 16, marginBottom: 8 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontSize: 16, fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1 },
  selectedText: { fontSize: 14, flex: 1 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
