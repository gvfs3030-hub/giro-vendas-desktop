// [LOCAL] — detalhe do cliente
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from '../../../src/platform/router';
import { Ionicons } from '../../../src/platform/icons';
import { useSafeAreaInsets } from '../../../src/platform/insets';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getDatabase } from '../../../src/database/database';
import type { Client, Sale, Installment, Visit } from '../../../src/types';
import { formatCurrency, formatDate, formatDateTime } from '../../../src/utils/format';
import Card from '../../../src/components/Card';
import StatusBadge from '../../../src/components/StatusBadge';
import { ORDER_STATUS } from '../../../src/constants/theme';
import Toast from 'react-native-toast-message';
import { Linking } from 'react-native';

export default function ClientDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [client, setClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<'dados' | 'pedidos' | 'financeiro' | 'visitas'>('dados');
  const [sales, setSales] = useState<Sale[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      const db = await getDatabase();
      const c = await db.getFirstAsync<Client>('SELECT * FROM clients WHERE id = ?', [id]);
      setClient(c ?? null);
      const s = await db.getAllAsync<Sale>('SELECT * FROM sales WHERE clientId = ? ORDER BY createdAt DESC', [id]);
      setSales(s ?? []);
      const inst = await db.getAllAsync<Installment>('SELECT * FROM installments WHERE clientId = ? ORDER BY dueDate ASC', [id]);
      setInstallments(inst ?? []);
      const v = await db.getAllAsync<Visit>('SELECT * FROM visits WHERE clientId = ? ORDER BY checkInAt DESC', [id]);
      setVisits(v ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = () => {
    Alert.alert('Excluir Cliente', 'Tem certeza que deseja excluir este cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            const db = await getDatabase();
            const hasSales = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM sales WHERE clientId = ?', [id]);
            if ((hasSales?.cnt ?? 0) > 0) {
              Toast.show({ type: 'error', text1: 'Não é possível excluir', text2: 'Este cliente possui pedidos', position: 'bottom' });
              return;
            }
            await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
            Toast.show({ type: 'success', text1: 'Cliente excluído', position: 'bottom' });
            router.back();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  if (!client) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  const tabs = ['dados', 'pedidos', 'financeiro', 'visitas'] as const;
  const tabLabels = { dados: 'Dados', pedidos: 'Pedidos', financeiro: 'Financeiro', visitas: 'Visitas' };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.primary }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarTextLg}>{(client.nomeFantasia ?? '?')[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.headerName} numberOfLines={1}>{client.nomeFantasia}</Text>
          <Text style={styles.headerCity}>{client.city ?? ''} {client.state ? `- ${client.state}` : ''}</Text>
        </View>
        <Pressable onPress={() => router.push(`/client/${id}/edit`)} hitSlop={12}>
          <Ionicons name="create-outline" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {client.phone ? (
          <Pressable style={[styles.qBtn, { backgroundColor: colors.surface }]} onPress={() => Linking.openURL(`tel:${client.phone}`)}>
            <Ionicons name="call" size={20} color={colors.primary} />
            <Text style={[styles.qLabel, { color: colors.text }]}>Ligar</Text>
          </Pressable>
        ) : null}
        {client.phone ? (
          <Pressable style={[styles.qBtn, { backgroundColor: colors.surface }]} onPress={() => Linking.openURL(`https://wa.me/55${(client.phone ?? '').replace(/\D/g, '')}`)}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={[styles.qLabel, { color: colors.text }]}>WhatsApp</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.qBtn, { backgroundColor: colors.surface }]} onPress={() => router.push(`/new-sale?clientId=${id}&clientName=${encodeURIComponent(client.nomeFantasia ?? '')}`)}>          <Ionicons name="cart" size={20} color={colors.primary} />
          <Text style={[styles.qLabel, { color: colors.text }]}>Vender</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        {tabs.map((t) => (
          <Pressable key={t} style={[styles.tabItem, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.textSecondary }]}>{tabLabels[t]}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'dados' && (
          <View>
            <InfoRow label="Razão Social" value={client.razaoSocial} colors={colors} />
            <InfoRow label="CNPJ/CPF" value={client.cnpjCpf} colors={colors} />
            <InfoRow label="Telefone" value={client.phone} colors={colors} />
            <InfoRow label="Email" value={client.email} colors={colors} />
            <InfoRow label="Endereço" value={[client.street, client.number, client.neighborhood, client.city, client.state].filter(Boolean).join(', ')} colors={colors} />
            <InfoRow label="Observações" value={client.observations} colors={colors} />
            <Pressable style={[styles.deleteBtn, { borderColor: colors.danger }]} onPress={handleDelete}>
              <Text style={{ color: colors.danger, fontWeight: '700' }}>Excluir Cliente</Text>
            </Pressable>
          </View>
        )}
        {tab === 'pedidos' && (
          sales.length === 0
            ? <Text style={[styles.emptyText, { color: colors.textCaption }]}>Nenhum pedido</Text>
            : sales.map((s) => (
                <Card key={s.id} style={styles.listItem} onPress={() => router.push(`/order/${s.id}`)}>
                  <View style={styles.itemRow}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>#{String(s.orderNumber ?? 0).padStart(3, '0')}</Text>
                    <Text style={[styles.itemValue, { color: colors.text }]}>{formatCurrency(s.total)}</Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{formatDate(s.createdAt)}</Text>
                </Card>
              ))
        )}
        {tab === 'financeiro' && (
          installments.length === 0
            ? <Text style={[styles.emptyText, { color: colors.textCaption }]}>Nenhuma parcela</Text>
            : installments.map((inst) => (
                <Card key={inst.id} style={styles.listItem}>
                  <View style={styles.itemRow}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>Parcela {inst.installmentNumber}</Text>
                    <Text style={[styles.itemValue, { color: colors.text }]}>{formatCurrency(inst.amount)}</Text>
                  </View>
                  <View style={styles.itemRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Vence: {formatDate(inst.dueDate)}</Text>
                    <StatusBadge label={inst.status === 'paga' ? 'Paga' : inst.status === 'vencida' ? 'Vencida' : 'Pendente'} color={inst.status === 'paga' ? '#00C853' : inst.status === 'vencida' ? '#EF4444' : '#F59E0B'} />
                  </View>
                </Card>
              ))
        )}
        {tab === 'visitas' && (
          visits.length === 0
            ? <Text style={[styles.emptyText, { color: colors.textCaption }]}>Nenhuma visita</Text>
            : visits.map((v) => (
                <Card key={v.id} style={styles.listItem}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{formatDateTime(v.checkInAt)}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    {v.checkOutAt ? `Duração: ${v.durationMinutes ?? 0} min` : 'Em andamento'}
                  </Text>
                  {v.notes ? <Text style={{ color: colors.textCaption, fontSize: 14 }}>{v.notes}</Text> : null}
                </Card>
              ))
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string | null | undefined; colors: any }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'column' },
  headerCenter: { alignItems: 'center', marginTop: 8 },
  avatarLg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffffff40', alignItems: 'center', justifyContent: 'center' },
  avatarTextLg: { color: '#fff', fontSize: 28, fontWeight: '700' },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 8 },
  headerCity: { color: '#ffffffbb', fontSize: 14 },
  quickActions: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 12 },
  qBtn: { alignItems: 'center', padding: 12, borderRadius: 12, minWidth: 70, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  qLabel: { fontSize: 12, marginTop: 4 },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 48 },
  infoRow: { marginBottom: 16 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 16 },
  deleteBtn: { marginTop: 24, alignItems: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1 },
  listItem: { marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemValue: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 16, textAlign: 'center', padding: 32 },
});
