// [LOCAL] — lista de clientes
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, router } from '../../../src/platform/router';
import { Ionicons } from '../../../src/platform/icons';
import { useSafeAreaInsets } from '../../../src/platform/insets';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getDatabase } from '../../../src/database/database';
import type { Client } from '../../../src/types';
import Card from '../../../src/components/Card';
import SearchBar from '../../../src/components/SearchBar';
import EmptyState from '../../../src/components/EmptyState';
import { FontSize, Spacing } from '../../../src/constants/theme';

export default function ClientsListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [])
  );

  const loadClients = async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<Client>('SELECT * FROM clients ORDER BY nomeFantasia ASC');
      setClients(rows ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = (clients ?? []).filter((c) => {
    if (filter === 'active' && !c?.isActive) return false;
    if (filter === 'inactive' && c?.isActive) return false;
    if (search) {
      const s = search.toLowerCase();
      return (c?.nomeFantasia ?? '').toLowerCase().includes(s) ||
             (c?.razaoSocial ?? '').toLowerCase().includes(s) ||
             (c?.phone ?? '').includes(s) ||
             (c?.city ?? '').toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Clientes</Text>
      </View>
      <View style={styles.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar cliente..." />
      </View>
      <View style={styles.filters}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.surface, borderColor: colors.border }]}
            onPress={() => setFilter(f)}
          >
            <Text style={{ color: filter === f ? '#fff' : colors.text, fontSize: 14 }}>
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item?.id ?? ''}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Card style={styles.clientCard} onPress={() => router.push(`/client/${item?.id}`)}>
            <View style={styles.clientRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(item?.nomeFantasia ?? '?')[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>
                  {item?.nomeFantasia ?? ''}
                </Text>
                <Text style={[styles.clientCity, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item?.city ?? 'Sem cidade'} {item?.phone ? `\u2022 ${item.phone}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textCaption} />
            </View>
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Nenhum cliente cadastrado"
            message="Cadastre seu primeiro cliente para começar a vender"
            actionLabel="Cadastrar Cliente"
            onAction={() => router.push('/client-add')}
          />
        }
      />

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/client-add')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  clientCard: { marginHorizontal: 16 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600' },
  clientCity: { fontSize: 14, marginTop: 2 },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
});
