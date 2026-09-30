// [LOCAL] — diário de planejamento de visitas: o vendedor marca em quais dias
// pretende passar em cada cliente, e depois vai marcando o check-in de cada uma.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { useFocusEffect, router } from '../src/platform/router';
import { Ionicons } from '../src/platform/icons';
import { useSafeAreaInsets } from '../src/platform/insets';
import { useTheme } from '../src/contexts/ThemeContext';
import { getDatabase } from '../src/database/database';
import type { VisitPlan, Client } from '../src/types';
import Card from '../src/components/Card';
import EmptyState from '../src/components/EmptyState';
import { friendlyDateLabel, generateUUID, todayISO, todayDateISO } from '../src/utils/format';
import Toast from 'react-native-toast-message';

function nextDays(count: number): { iso: string; dayNum: string; weekday: string }[] {
  const weekdaysShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const out = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ iso, dayNum: String(d.getDate()), weekday: weekdaysShort[d.getDay()] ?? '' });
  }
  return out;
}

export default function VisitPlanScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<VisitPlan[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayDateISO());
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => nextDays(14), []);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [])
  );

  const loadPlans = async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<VisitPlan>(
        `SELECT vp.*, c.nomeFantasia as clientName FROM visit_plans vp
         LEFT JOIN clients c ON vp.clientId = c.id
         WHERE vp.status = 'pendente'
         ORDER BY vp.plannedDate ASC, vp.createdAt ASC`
      );
      setPlans(rows ?? []);
      const cl = await db.getAllAsync<Client>('SELECT * FROM clients WHERE isActive = 1 ORDER BY nomeFantasia');
      setClients(cl ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const grouped = useMemo(() => {
    const map: Record<string, VisitPlan[]> = {};
    for (const p of plans) {
      if (!map[p.plannedDate]) map[p.plannedDate] = [];
      map[p.plannedDate].push(p);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [plans]);

  const handleAddPlan = async () => {
    if (!selectedClient || saving) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT INTO visit_plans (id, clientId, plannedDate, notes, status, createdAt) VALUES (?,?,?,?,?,?)',
        [generateUUID(), selectedClient.id, selectedDate, null, 'pendente', todayISO()]
      );
      Toast.show({ type: 'success', text1: 'Visita planejada!', position: 'bottom' });
      setShowAdd(false);
      setSelectedClient(null);
      setSelectedDate(todayDateISO());
      loadPlans();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Erro ao planejar visita', position: 'bottom' });
    }
    setSaving(false);
  };

  const handleCheckInPlan = async (plan: VisitPlan) => {
    try {
      const db = await getDatabase();
      const now = todayISO();
      const visitId = generateUUID();
      await db.runAsync(
        'INSERT INTO visits (id, clientId, checkInAt, notes, createdAt) VALUES (?,?,?,?,?)',
        [visitId, plan.clientId, now, plan.notes, now]
      );
      await db.runAsync(
        `UPDATE visit_plans SET status = 'concluida', visitId = ? WHERE id = ?`,
        [visitId, plan.id]
      );
      Toast.show({ type: 'success', text1: 'Check-in realizado!', position: 'bottom' });
      loadPlans();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Erro ao fazer check-in', position: 'bottom' });
    }
  };

  const handleCancelPlan = (plan: VisitPlan) => {
    Alert.alert('Cancelar visita planejada', `Remover a visita planejada para ${plan.clientName ?? 'este cliente'}?`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar visita',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = await getDatabase();
            await db.runAsync(`UPDATE visit_plans SET status = 'cancelada' WHERE id = ?`, [plan.id]);
            loadPlans();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Diário de Visitas</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={grouped}
        keyExtractor={([date]) => date}
        contentContainerStyle={grouped.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        renderItem={({ item: [date, dayPlans] }) => {
          const isOverdue = date < todayDateISO();
          return (
            <View style={styles.dateGroup}>
              <Text style={[styles.dateHeader, { color: isOverdue ? colors.danger : colors.primary }]}>
                {friendlyDateLabel(date)}
              </Text>
              {dayPlans.map((plan) => (
                <Card key={plan.id} style={styles.planCard}>
                  <View style={styles.planRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planClient, { color: colors.text }]}>{plan.clientName ?? 'Cliente'}</Text>
                      {plan.notes ? <Text style={{ color: colors.textCaption, fontSize: 13, marginTop: 2 }}>{plan.notes}</Text> : null}
                    </View>
                    <Pressable style={styles.iconBtn} onPress={() => handleCancelPlan(plan)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={22} color={colors.textCaption} />
                    </Pressable>
                    <Pressable style={[styles.checkBtn, { backgroundColor: colors.primaryLight }]} onPress={() => handleCheckInPlan(plan)}>
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Check-in</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nenhuma visita planejada"
            message="Planeje quais dias você vai passar em cada cliente"
            actionLabel="Planejar visita"
            onAction={() => setShowAdd(true)}
          />
        }
      />

      <Pressable style={[styles.fab, { backgroundColor: colors.primary, bottom: 16 + insets.bottom }]} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>

      <Modal visible={showAdd} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAdd(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Planejar Visita</Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Quando</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {days.map((d) => {
                const active = d.iso === selectedDate;
                return (
                  <Pressable
                    key={d.iso}
                    style={[styles.dayChip, { borderColor: colors.border, backgroundColor: active ? colors.primary : colors.background }]}
                    onPress={() => setSelectedDate(d.iso)}
                  >
                    <Text style={{ color: active ? '#fff' : colors.textCaption, fontSize: 11, fontWeight: '600' }}>{d.weekday}</Text>
                    <Text style={{ color: active ? '#fff' : colors.text, fontSize: 16, fontWeight: '700' }}>{d.dayNum}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Cliente</Text>
            <FlatList
              data={clients}
              keyExtractor={(c) => c?.id ?? ''}
              style={{ maxHeight: 260 }}
              renderItem={({ item: c }) => (
                <Pressable
                  style={[styles.clientItem, selectedClient?.id === c?.id && { backgroundColor: colors.primaryLight }]}
                  onPress={() => setSelectedClient(c)}
                >
                  <Text style={{ color: colors.text }}>{c?.nomeFantasia}</Text>
                  {selectedClient?.id === c?.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ color: colors.textCaption, padding: 12 }}>Cadastre um cliente primeiro</Text>}
            />

            <Pressable
              style={[styles.saveBtn, { backgroundColor: selectedClient ? colors.primary : colors.border }]}
              onPress={handleAddPlan}
              disabled={!selectedClient || saving}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{saving ? 'Salvando...' : 'Planejar Visita'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  dateGroup: { marginTop: 16, paddingHorizontal: 16 },
  dateHeader: { fontSize: 14, fontWeight: '700', marginBottom: 8, textTransform: 'capitalize' },
  planCard: { marginBottom: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planClient: { fontSize: 15, fontWeight: '600' },
  iconBtn: { padding: 4 },
  checkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  dayChip: { width: 52, height: 60, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  clientItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 8 },
  saveBtn: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
});
