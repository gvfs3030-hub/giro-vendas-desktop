// [LOCAL] — Step 5: confirmação + geração de PDF
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from '../../src/platform/router';
import { Ionicons } from '../../src/platform/icons';
import { useSafeAreaInsets } from '../../src/platform/insets';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSaleWizard } from '../../src/contexts/SaleWizardContext';
import { getDatabase } from '../../src/database/database';
import { generateUUID, todayISO, formatCurrency, formatDateTime, addDays, todayDateISO, paymentDetailLine } from '../../src/utils/format';
import Toast from 'react-native-toast-message';
import { generateAndOpenOrderPdf } from '../../src/platform/printing';

export default function ConfirmationStep() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wizard = useSaleWizard();
  const [saleId, setSaleId] = useState<string | null>(null);
  const [orderNum, setOrderNum] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) saveSale();
  }, []);

  const saveSale = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      const now = todayISO();
      const id = generateUUID();

      // Get next order number
      const maxRow = await db.getFirstAsync<{ maxNum: number }>('SELECT COALESCE(MAX(orderNumber), 0) as maxNum FROM sales');
      const newOrderNum = (maxRow?.maxNum ?? 0) + 1;

      const subtotal = wizard.getSubtotal();
      const totalDiscount = wizard.getTotalDiscount();
      const total = wizard.getTotal();

      await db.runAsync(
        `INSERT INTO sales (id, orderNumber, clientId, subtotal, totalDiscount, total, paymentMethod, installmentCount, interestRate, cardInstallments, observations, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`,
        [id, newOrderNum, wizard.state.clientId ?? 'avulso', subtotal, totalDiscount, total,
         wizard.state.paymentMethod, wizard.state.installmentCount, wizard.state.interestRate || 0,
         wizard.state.paymentMethod === 'cartao' ? wizard.state.installmentCount : 1,
         wizard.state.observations || null,
         now, now]
      );

      // Insert items + decrement stock
      for (const item of (wizard.state.items ?? [])) {
        const itemId = generateUUID();
        await db.runAsync(
          `INSERT INTO sale_items (id, saleId, productId, productName, quantity, unitPrice, discount, subtotal, priceTable, unit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item?.productId, item?.productName, item?.quantity, item?.unitPrice, item?.discount, item?.subtotal, item?.priceTable, item?.unit]
        );
        // Decrement stock
        await db.runAsync(
          'UPDATE products SET stockCurrent = MAX(0, stockCurrent - ?), updatedAt = ? WHERE id = ?',
          [item?.quantity ?? 0, now, item?.productId]
        );
      }

      // Create installments if payment is 'prazo'
      if (wizard.state.paymentMethod === 'prazo' && wizard.state.installmentCount > 1) {
        const totalComJuros = total * (1 + (wizard.state.interestRate || 0) / 100);
        const installmentValue = totalComJuros / wizard.state.installmentCount;
        const today = todayDateISO();
        for (let i = 0; i < wizard.state.installmentCount; i++) {
          const instId = generateUUID();
          const dueDate = addDays(today, 30 * (i + 1));
          await db.runAsync(
            `INSERT INTO installments (id, saleId, clientId, installmentNumber, dueDate, amount, amountPaid, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 0, 'pendente', ?, ?)`,
            [instId, id, wizard.state.clientId ?? 'avulso', i + 1, dueDate, installmentValue, now, now]
          );
        }
      }

      setSaleId(id);
      setOrderNum(newOrderNum);
      setSaved(true);
      Toast.show({ type: 'success', text1: 'Pedido confirmado!', text2: `#${String(newOrderNum).padStart(3, '0')}`, position: 'bottom' });
    } catch (e) {
      console.error('Save sale error:', e);
      Toast.show({ type: 'error', text1: 'Erro ao salvar pedido', position: 'bottom' });
    }
    setSaving(false);
  };

  const generatePDF = async () => {
    try {
      const db = await getDatabase();
      const config = await db.getFirstAsync<{ companyName: string; sellerName: string }>('SELECT companyName, sellerName FROM config WHERE id = 1');

      const path = await generateAndOpenOrderPdf({
        companyName: config?.companyName ?? 'Giro Vendas',
        sellerName: config?.sellerName ?? '',
        orderNumber: `#${String(orderNum).padStart(3, '0')}`,
        clientName: wizard.state.clientName ?? 'Consumidor Avulso',
        date: formatDateTime(todayISO()),
        items: (wizard.state.items ?? []).map((item) => ({
          name: item?.productName ?? '',
          qty: `${item?.quantity ?? 0} ${item?.unit ?? ''}`.trim(),
          unitPrice: formatCurrency(item?.unitPrice),
          discount: `${item?.discount ?? 0}%`,
          subtotal: formatCurrency(item?.subtotal),
        })),
        subtotal: formatCurrency(wizard.getSubtotal()),
        discountTotal: formatCurrency(wizard.getTotalDiscount()),
        total: formatCurrency(wizard.getTotal()),
        payment: paymentDetailLine(wizard.state.paymentMethod, wizard.state.installmentCount, wizard.state.interestRate),
      }, `pedido-${String(orderNum).padStart(3, '0')}.pdf`);

      Toast.show({ type: 'success', text1: 'PDF salvo', text2: path, position: 'bottom' });
    } catch (e) {
      console.error('PDF error:', e);
      Toast.show({ type: 'error', text1: 'Erro ao gerar PDF', position: 'bottom' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 32 }]}>
        {/* Success icon */}
        <View style={[styles.successIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Pedido Confirmado!</Text>
        <Text style={[styles.orderNum, { color: colors.primary }]}>#{String(orderNum).padStart(3, '0')}</Text>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Cliente</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{wizard.state.clientName ?? 'Consumidor Avulso'}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary, marginTop: 8 }]}>Itens</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{(wizard.state.items ?? []).length} produto(s)</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary, marginTop: 8 }]}>Total</Text>
          <Text style={[styles.totalText, { color: colors.primary }]}>{formatCurrency(wizard.getTotal())}</Text>
        </View>

        <Pressable style={[styles.pdfBtn, { backgroundColor: colors.primary }]} onPress={generatePDF}>
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={styles.pdfBtnText}>Gerar e Compartilhar PDF</Text>
        </Pressable>

        {saleId && (
          <Pressable style={[styles.viewBtn, { borderColor: colors.primary }]} onPress={() => { wizard.reset(); router.replace(`/order/${saleId}`); }}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>Ver Pedido</Text>
          </Pressable>
        )}

        <Pressable style={styles.homeBtn} onPress={() => { wizard.reset(); router.replace('/tabs/home'); }}>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Voltar ao Início</Text>
        </Pressable>

        <Pressable style={[styles.newSaleBtn, { borderColor: colors.primary }]} onPress={() => { wizard.reset(); router.replace('/new-sale'); }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>Nova Venda</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { alignItems: 'center', padding: 24, paddingBottom: 48 },
  successIcon: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '700' },
  orderNum: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  summaryCard: { width: '100%', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 16, fontWeight: '600' },
  totalText: { fontSize: 24, fontWeight: '700' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 56, paddingHorizontal: 32, borderRadius: 24, marginBottom: 12 },
  pdfBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  viewBtn: { height: 56, paddingHorizontal: 32, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 12, width: '100%' },
  homeBtn: { paddingVertical: 12, marginBottom: 8 },
  newSaleBtn: { height: 56, paddingHorizontal: 32, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', width: '100%' },
});
