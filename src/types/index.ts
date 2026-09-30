// [LOCAL] — tipos do app Giro, 100% offline

export interface Config {
  id: number;
  sellerName: string;
  companyName: string;
  category: string;
  phone: string | null;
  monthlyGoal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpjCpf: string | null;
  phone: string;
  email: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUri: string | null;
  observations: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  unit: string;
  price1: number;
  price2: number | null;
  price3: number | null;
  stockCurrent: number;
  stockMinimum: number;
  photoUri: string | null;
  description: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  orderNumber: number;
  clientId: string;
  subtotal: number;
  totalDiscount: number;
  total: number;
  paymentMethod: string;
  installmentCount: number;
  interestRate?: number;
  cardInstallments?: number;
  observations: string | null;
  signatureUri: string | null;
  signatureData?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  priceTable: number;
  unit: string;
}

export interface Installment {
  id: string;
  saleId: string;
  clientId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  amountPaid: number;
  status: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  orderNumber?: number;
}

export interface Visit {
  id: string;
  clientId: string;
  checkInAt: string;
  checkOutAt: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  durationMinutes: number | null;
  notes: string | null;
  createdAt: string;
  clientName?: string;
}

export interface VisitPlan {
  id: string;
  clientId: string;
  plannedDate: string;
  notes: string | null;
  status: 'pendente' | 'concluida' | 'cancelada';
  visitId: string | null;
  createdAt: string;
  clientName?: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  photoUri: string | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  yearMonth: string;
  targetAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Sale wizard types
export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  priceTable: number;
  unit: string;
  stockAvailable: number;
}

export interface SaleWizardState {
  clientId: string | null;
  clientName: string | null;
  items: CartItem[];
  paymentMethod: string;
  installmentCount: number;
  interestRate: number;
  firstDueDate: string | null;
  observations: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
