// [LOCAL] — detalhe do pedido
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from '../../../src/platform/router';
import { Ionicons } from '../../../src/platform/icons';
import { useSafeAreaInsets } from '../../../src/platform/insets';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getDatabase } from '../../../src/database/database';
import type { Sale, SaleItem } from '../../../src/types';
import { formatCurrency, formatDateTime, todayISO, paymentDetailLine } from '../../../src/utils/format';
import StatusBadge from '../../../src/components/StatusBadge';
import Card from '../../../src/components/Card';
import { ORDER_STATUS } from '../../../src/constants/theme';
import Toast from 'react-native-toast-message';
import { generateAndOpenOrderPdf } from '../../../src/platform/printing';

export default function OrderDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sale, setSale] = useState<(Sale & { clientName?: string }) | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      loadOrder();
    }, [id])
  );

  const loadOrder = async () => {
    try {
      const db = await getDatabase();
      const s = await db.getFirstAsync<Sale & { clientName: string }>(
        'SELECT s.*, c.nomeFantasia as clientName FROM sales s LEFT JOIN clients c ON s.clientId = c.id WHERE s.id = ?', [id]
      );
      setSale(s ?? null);
      const it = await db.getAllAsync<SaleItem>('SELECT * FROM sale_items WHERE saleId = ?', [id]);
      setItems(it ?? []);
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const db = await getDatabase();
      await db.runAsync('UPDATE sales SET status = ?, updatedAt = ? WHERE id = ?', [newStatus, todayISO(), id]);
      // If cancelled, restore stock
      if (newStatus === 'cancelado') {
        for (const item of items) {
          await db.runAsync('UPDATE products SET stockCurrent = stockCurrent + ?, updatedAt = ? WHERE id = ?', [item?.quantity ?? 0, todayISO(), item?.productId]);
        }
      }
      Toast.show({ type: 'success', text1: 'Status atualizado', position: 'bottom' });
      loadOrder();
    } catch (e) { console.error(e); }
  };

  const handleGeneratePDF = async () => {
    if (!sale) return;
    try {
      const db = await getDatabase();
      const config = await db.getFirstAsync<{ companyName: string; sellerName: string }>('SELECT companyName, sellerName FROM config WHERE id = 1');
      const orderNumber = `#${String(sale.orderNumber ?? 0).padStart(3, '0')}`;

      const path = await generateAndOpenOrderPdf({
        companyName: config?.companyName ?? 'Giro Vendas',
        sellerName: config?.sellerName ?? '',
        orderNumber,
        clientName: sale.clientName ?? 'Avulso',
        date: formatDateTime(sale.createdAt),
        items: items.map((item) => ({
          name: item?.productName ?? '',
          qty: `${item?.quantity ?? 0} ${item?.unit ?? ''}`.trim(),
          unitPrice: formatCurrency(item?.unitPrice),
          discount: `${item?.discount ?? 0}%`,
          subtotal: formatCurrency(item?.subtotal),
        })),
        subtotal: formatCurrency(sale.subtotal),
        discountTotal: formatCurrency(sale.totalDiscount),
        total: formatCurrency(sale.total),
        payment: paymentDetailLine(sale.paymentMethod, sale.installmentCount, sale.interestRate),
      }, `pedido-${String(sale.orderNumber ?? 0).padStart(3, '0')}.pdf`);

      Toast.show({ type: 'success', text1: 'PDF salvo', text2: path, position: 'bottom' });
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Erro ao gerar PDF', position: 'bottom' });
    }
  };

  if (!sale) return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  const statusInfo = ORDER_STATUS.find((s) => s.value === sale.status) ?? { label: sale.status ?? '', color: '#999' };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Pedido #{String(sale.orderNumber ?? 0).padStart(3, '0')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <StatusBadge label={statusInfo.label} color={statusInfo.color} />
          <Text style={{ color: colors.textCaption, fontSize: 14 }}>{formatDateTime(sale.createdAt)}</Text>
        </View>
        <Card style={styles.infoCard}>
          <Text style={[styles.infoLabel, { color: colors.textCaption }]}>Cliente</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{sale.clientName ?? 'Consumidor Avulso'}</Text>
          <Text style={[styles.infoLabel, { color: colors.textCaption, marginTop: 8 }]}>Pagamento</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{paymentDetailLine(sale.paymentMethod, sale.installmentCount, sale.interestRate)}</Text>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Itens</Text>
        {items.map((item) => (
          <View key={item?.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16 }}>{item?.productName}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{item?.quantity} {item?.unit} x {formatCurrency(item?.unitPrice)}{(item?.discount ?? 0) > 0 ? ` (-${item?.discount}%)` : ''}</Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCurrency(item?.subtotal)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text style={{ color: colors.textSecondary }}>Subtotal</Text><Text style={{ color: colors.text }}>{formatCurrency(sale.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text style={{ color: colors.warning }}>Desconto</Text><Text style={{ color: colors.warning }}>-{formatCurrency(sale.totalDiscount)}</Text></View>
          <View style={styles.totalRow}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Total</Text><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 18 }}>{formatCurrency(sale.total)}</Text></View>
        </View>

        {sale.observations ? (
          <Card style={styles.obsCard}>
            <Text style={[styles.infoLabel, { color: colors.textCaption }]}>Observações</Text>
            <Text style={{ color: colors.text }}>{sale.observations}</Text>
          </Card>
        ) : null}

        <Pressable style={[styles.pdfBtn, { backgroundColor: colors.primary }]} onPress={handleGeneratePDF}>
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={styles.pdfBtnText}>Gerar PDF</Text>
        </Pressable>

        {sale.status !== 'cancelado' && (
          <View style={styles.statusActions}>
            {sale.status === 'pendente' && (
              <Pressable style={[styles.statusBtn, { backgroundColor: colors.primaryLight }]} onPress={() => updateStatus('entregue')}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Marcar como Entregue</Text>
              </Pressable>
            )}
            <Pressable style={[styles.statusBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => {
              Alert.alert('Cancelar Pedido', 'O estoque será restaurado. Confirmar?', [
                { text: 'Não', style: 'cancel' },
                { text: 'Cancelar Pedido', style: 'destructive', onPress: () => updateStatus('cancelado') },
              ]);
            }}>
              <Text style={{ color: colors.danger, fontWeight: '700' }}>Cancelar Pedido</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 48 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  infoCard: { marginBottom: 16 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  totals: { marginTop: 16, gap: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  obsCard: { marginTop: 16 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 24, marginTop: 24 },
  pdfBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusActions: { marginTop: 16, gap: 8 },
  statusBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
});
