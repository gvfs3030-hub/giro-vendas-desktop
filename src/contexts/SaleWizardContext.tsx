// [LOCAL] — contexto do wizard de nova venda
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CartItem, SaleWizardState } from '../types';

const initialState: SaleWizardState = {
  clientId: null,
  clientName: null,
  items: [],
  paymentMethod: 'dinheiro',
  installmentCount: 1,
  interestRate: 0,
  firstDueDate: null,
  observations: '',
};

interface SaleWizardContextType {
  state: SaleWizardState;
  setClient: (id: string, name: string) => void;
  addItem: (item: CartItem) => void;
  updateItem: (productId: string, updates: Partial<CartItem>) => void;
  removeItem: (productId: string) => void;
  setPayment: (method: string, count: number, firstDate: string | null, interestRate?: number) => void;
  setObservations: (obs: string) => void;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getTotal: () => number;
  reset: () => void;
}

const SaleWizardContext = createContext<SaleWizardContextType | null>(null);

export function SaleWizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SaleWizardState>(initialState);

  const setClient = useCallback((id: string, name: string) => {
    setState((s) => ({ ...s, clientId: id, clientName: name }));
  }, []);

  const addItem = useCallback((item: CartItem) => {
    setState((s) => {
      const existing = s.items?.find((i) => i?.productId === item?.productId);
      if (existing) {
        return {
          ...s,
          items: (s.items ?? []).map((i) =>
            i?.productId === item?.productId ? { ...i, ...item } : i
          ),
        };
      }
      return { ...s, items: [...(s.items ?? []), item] };
    });
  }, []);

  const updateItem = useCallback((productId: string, updates: Partial<CartItem>) => {
    setState((s) => ({
      ...s,
      items: (s.items ?? []).map((i) =>
        i?.productId === productId ? { ...i, ...updates } : i
      ),
    }));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setState((s) => ({
      ...s,
      items: (s.items ?? []).filter((i) => i?.productId !== productId),
    }));
  }, []);

  const setPayment = useCallback((method: string, count: number, firstDate: string | null, interestRate?: number) => {
    setState((s) => ({
      ...s,
      paymentMethod: method,
      installmentCount: count,
      firstDueDate: firstDate,
      interestRate: interestRate ?? 0,
    }));
  }, []);

  const setObservations = useCallback((obs: string) => {
    setState((s) => ({ ...s, observations: obs }));
  }, []);

  const getSubtotal = useCallback(() => {
    return (state.items ?? []).reduce((sum, i) => sum + (i?.subtotal ?? 0), 0);
  }, [state.items]);

  const getTotalDiscount = useCallback(() => {
    return (state.items ?? []).reduce((sum, i) => {
      const full = (i?.quantity ?? 0) * (i?.unitPrice ?? 0);
      return sum + (full - (i?.subtotal ?? 0));
    }, 0);
  }, [state.items]);

  const getTotal = useCallback(() => {
    return getSubtotal();
  }, [getSubtotal]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <SaleWizardContext.Provider
      value={{
        state,
        setClient,
        addItem,
        updateItem,
        removeItem,
        setPayment,
        setObservations,
        getSubtotal,
        getTotalDiscount,
        getTotal,
        reset,
      }}
    >
      {children}
    </SaleWizardContext.Provider>
  );
}

export function useSaleWizard() {
  const ctx = useContext(SaleWizardContext);
  if (!ctx) throw new Error('useSaleWizard must be inside SaleWizardProvider');
  return ctx;
}
