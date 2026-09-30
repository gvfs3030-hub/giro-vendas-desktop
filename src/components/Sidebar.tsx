// [DESKTOP] Substitui a barra de abas + o menu "Mais" do celular por uma barra lateral fixa,
// já que no PC não faltam pixels na tela como faltam no celular. Os itens usam router.reset()
// (troca de seção, sem empilhar histórico); "Nova Venda" usa push (é um fluxo que se empilha
// por cima de onde o vendedor estava, como no celular).
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, usePathname } from '../platform/router';
import { Ionicons, type IoniconName } from '../platform/icons';
import { useTheme } from '../contexts/ThemeContext';

interface NavItem {
  icon: IoniconName;
  label: string;
  route: string;
  /** a seção fica "ativa" para qualquer caminho que comece com este prefixo */
  matchPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'home', label: 'Início', route: '/tabs/home' },
  { icon: 'people', label: 'Clientes', route: '/tabs/clients', matchPrefix: '/client' },
  { icon: 'receipt', label: 'Pedidos', route: '/tabs/orders', matchPrefix: '/order' },
  { icon: 'cube-outline', label: 'Produtos', route: '/products', matchPrefix: '/product' },
  { icon: 'wallet-outline', label: 'Financeiro', route: '/financial' },
  { icon: 'receipt-outline', label: 'Despesas', route: '/expenses', matchPrefix: '/expense' },
  { icon: 'map-outline', label: 'Rotas e Visitas', route: '/routes', matchPrefix: '/visit' },
  { icon: 'bar-chart-outline', label: 'Relatórios', route: '/reports' },
  { icon: 'bulb-outline', label: 'Assistente', route: '/assistant' },
];

const SIDEBAR_WIDTH = 232;

export default function Sidebar() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const isNewSale = pathname.startsWith('/new-sale');

  const isActive = (item: NavItem) =>
    pathname === item.route || (!!item.matchPrefix && pathname.startsWith(item.matchPrefix));

  return (
    <View style={[styles.container, { width: SIDEBAR_WIDTH, backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      <View style={styles.brand}>
        <View style={[styles.logoDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.brandText, { color: colors.text }]}>Giro Vendas</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.newSaleBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
        onPress={() => router.push('/new-sale')}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.newSaleText}>Nova Venda</Text>
      </Pressable>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.navList} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Pressable
              key={item.route}
              style={({ pressed }) => [
                styles.navItem,
                active && { backgroundColor: colors.primaryLight },
                pressed && !active && { backgroundColor: colors.card },
              ]}
              onPress={() => router.reset(item.route)}
            >
              <Ionicons name={item.icon} size={20} color={active ? colors.primary : colors.textSecondary} />
              <Text style={[styles.navLabel, { color: active ? colors.primary : colors.text, fontWeight: active ? '700' : '500' }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.navItem,
          styles.settingsItem,
          { borderTopColor: colors.border },
          pathname === '/settings' && { backgroundColor: colors.primaryLight },
          pressed && pathname !== '/settings' && { backgroundColor: colors.card },
        ]}
        onPress={() => router.reset('/settings')}
      >
        <Ionicons name="settings-outline" size={20} color={pathname === '/settings' ? colors.primary : colors.textSecondary} />
        <Text style={[styles.navLabel, { color: pathname === '/settings' ? colors.primary : colors.text, fontWeight: pathname === '/settings' ? '700' : '500' }]}>
          Configurações
        </Text>
      </Pressable>

      {isNewSale && (
        <View style={[styles.wizardBadge, { backgroundColor: colors.primaryLight }]} pointerEvents="none">
          <Ionicons name="cart" size={14} color={colors.primary} />
          <Text style={[styles.wizardBadgeText, { color: colors.primary }]}>Venda em andamento</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRightWidth: 1, paddingTop: 20, paddingBottom: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  logoDot: { width: 10, height: 10, borderRadius: 5 },
  brandText: { fontSize: 17, fontWeight: '800' },
  newSaleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 16,
  },
  newSaleText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  navList: { paddingHorizontal: 12, gap: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  navLabel: { fontSize: 14 },
  settingsItem: { marginHorizontal: 12, marginTop: 8, borderTopWidth: 1, paddingTop: 18 },
  wizardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 12,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
  },
  wizardBadgeText: { fontSize: 12, fontWeight: '700' },
});
