// [LOCAL] — tema visual do Giro

export const Colors = {
  light: {
    primary: '#00C853',
    primaryDark: '#00952B',
    primaryLight: '#E8F9EE',
    accent: '#FF6B35',
    background: '#F7FAF8',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#4A4A4A',
    textCaption: '#7A7A7A',
    border: '#E0E0E0',
    error: '#E53935',
    success: '#00C853',
    warning: '#FF6B35',
    danger: '#EF4444',
    skeleton: '#E8E8E8',
    tabBar: '#FFFFFF',
    statusBar: 'dark' as const,
  },
  dark: {
    primary: '#00C853',
    primaryDark: '#00952B',
    primaryLight: '#1A3A22',
    accent: '#FF6B35',
    background: '#0D1F12',
    surface: '#1A2E1E',
    card: '#1F3525',
    text: '#F0F0F0',
    textSecondary: '#B0B0B0',
    textCaption: '#808080',
    border: '#2A3F2E',
    error: '#E53935',
    success: '#00C853',
    warning: '#FF6B35',
    danger: '#EF4444',
    skeleton: '#2A3F2E',
    tabBar: '#1A2E1E',
    statusBar: 'light' as const,
  },
};

export type ColorScheme = typeof Colors.light | typeof Colors.dark;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const CATEGORIES = [
  'Alimentos',
  'Bebidas',
  'Laticínios',
  'Frios e Congelados',
  'Hortifruti',
  'Padaria',
  'Outros',
] as const;

export const UNITS = ['UN', 'CX', 'KG', 'L', 'PCT', 'FD'] as const;

export const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'prazo', label: 'A Prazo' },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: 'combustivel', label: 'Combustível' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'hospedagem', label: 'Hospedagem' },
  { value: 'pedagio', label: 'Pedágio' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outros', label: 'Outros' },
] as const;

export const ORDER_STATUS = [
  { value: 'pendente', label: 'Pendente', color: '#F59E0B' },
  { value: 'entregue', label: 'Entregue', color: '#00C853' },
  { value: 'cancelado', label: 'Cancelado', color: '#EF4444' },
] as const;
