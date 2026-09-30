// [LOCAL] — rotas e visitas
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Modal, TextInput, Alert, Linking, Platform } from 'react-native';
import { useFocusEffect, router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import type { Visit, Client } from '../src/types';
import Card from '../src/components/Card';
import EmptyState from '../src/components/EmptyState';
import { formatTime, formatDate, generateUUID, todayISO } from '../src/utils/format';
import Toast from 'react-native-toast-message';

export default function RoutesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visits, setVisits] = useState<(Visit & { clientName?: string })[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [checkOutNotes, setCheckOutNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadVisits();
    }, [])
  );

  const loadVisits = async () => {
    try {
      const db = await getDatabase();
      const today = new Date().toISOString().split('T')[0];
      const rows = await db.getAllAsync<Visit & { clientName: string }>(
        `SELECT v.*, c.nomeFantasia as clientName FROM visits v LEFT JOIN clients c ON v.clientId = c.id WHERE date(v.checkInAt) = ? ORDER BY v.checkInAt DESC`, [today]
      );
      setVisits(rows ?? []);
      const cl = await db.getAllAsync<Client>('SELECT * FROM clients WHERE isActive = 1 ORDER BY nomeFantasia');
      setClients(cl ?? []);
    } catch (e) { console.error(e); }
  };

  const handleCheckIn = async () => {
    if (!selectedClient) return;
    try {
      const db = await getDatabase();
      const now = todayISO();
      await db.runAsync(
        'INSERT INTO visits (id, clientId, checkInAt, createdAt) VALUES (?,?,?,?)',
        [generateUUID(), selectedClient.id, now, now]
      );
      Toast.show({ type: 'success', text1: 'Check-in realizado!', position: 'bottom' });
      setShowCheckIn(false);
      setSelectedClient(null);
      loadVisits();
    } catch (e) { console.error(e); }
  };

  const handleCheckOut = async (visit: Visit) => {
    try {
      const db = await getDatabase();
      const now = new Date();
      const checkIn = new Date(visit.checkInAt);
      const duration = Math.round((now.getTime() - checkIn.getTime()) / 60000);
      await db.runAsync(
        'UPDATE visits SET checkOutAt = ?, durationMinutes = ?, notes = ? WHERE id = ?',
        [now.toISOString(), duration, checkOutNotes || null, visit.id]
      );
      Toast.show({ type: 'success', text1: 'Check-out realizado!', position: 'bottom' });
      setCheckOutNotes('');
      loadVisits();
    } catch (e) { console.error(e); }
  };

  const openMaps = (visit: Visit) => {
    if (visit.checkInLatitude && visit.checkInLongitude) {
      Linking.openURL(`https://www.google.com/maps?q=${visit.checkInLatitude},${visit.checkInLongitude}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Rotas e Visitas</Text>
        <Pressable onPress={() => router.push('/visit-plan')} hitSlop={12}>
          <Ionicons name="calendar-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <Pressable style={[styles.planBanner, { backgroundColor: colors.primaryLight }]} onPress={() => router.push('/visit-plan')}>
        <Ionicons name="calendar" size={18} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14, flex: 1 }}>Diário de Visitas — planeje os próximos dias</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>

      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{formatDate(todayISO())} — Hoje</Text>

      <FlatList
        data={visits}
        keyExtractor={(item) => item?.id ?? ''}
        contentContainerStyle={visits.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        renderItem={({ item }) => {
          const active = !item?.checkOutAt;
          return (
            <Card style={[styles.visitCard, active && { borderLeftWidth: 4, borderLeftColor: colors.primary }]}>
              <View style={styles.visitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.visitClient, { color: colors.text }]}>{item?.clientName ?? 'Cliente'}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    {formatTime(item?.checkInAt)} {item?.checkOutAt ? `→ ${formatTime(item?.checkOutAt)} (${item?.durationMinutes ?? 0}min)` : '— Em andamento'}
                  </Text>
                  {item?.notes ? <Text style={{ color: colors.textCaption, fontSize: 14, marginTop: 4 }}>{item.notes}</Text> : null}
                </View>
                {active ? (
                  <Pressable style={[styles.checkOutBtn, { backgroundColor: colors.primaryLight }]} onPress={() => {
                    Alert.prompt?.('Check-out', 'Adicionar nota?', (text) => {
                      setCheckOutNotes(text ?? '');
                      handleCheckOut(item);
                    }) ?? handleCheckOut(item);
                  }}>
                    <Ionicons name="log-out-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Check-out</Text>
                  </Pressable>
                ) : (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </View>
            </Card>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<EmptyState icon="map-outline" title="Nenhuma visita hoje" message="Faça check-in em um cliente" actionLabel="Check-in" onAction={() => setShowCheckIn(true)} />}
      />

      {/* Check-in Modal */}
      <Modal visible={showCheckIn} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCheckIn(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Check-in</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>Selecione o cliente</Text>
            <FlatList
              data={clients}
              keyExtractor={(c) => c?.id ?? ''}
              style={{ maxHeight: 300 }}
              renderItem={({ item: c }) => (
                <Pressable
                  style={[styles.clientItem, selectedClient?.id === c?.id && { backgroundColor: colors.primaryLight }]}
                  onPress={() => setSelectedClient(c)}
                >
                  <Text style={{ color: colors.text }}>{c?.nomeFantasia}</Text>
                  {selectedClient?.id === c?.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </Pressable>
              )}
            />
            <Pressable style={[styles.checkInBtn, { backgroundColor: selectedClient ? colors.primary : colors.border }]} onPress={handleCheckIn} disabled={!selectedClient}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Realizar Check-in</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Pressable style={[styles.fab, { backgroundColor: colors.primary, bottom: 16 + insets.bottom }]} onPress={() => setShowCheckIn(true)}>
        <Ionicons name="location" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  planBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12 },
  dateLabel: { paddingHorizontal: 16, fontSize: 16, marginBottom: 12 },
  visitCard: { marginHorizontal: 16 },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  visitClient: { fontSize: 16, fontWeight: '600' },
  checkOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  clientItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 8 },
  checkInBtn: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
