// [DESKTOP] Layout do assistente de nova venda: todas as etapas (cliente, produtos, carrinho,
// pagamento, confirmação) dividem UM SaleWizardProvider enquanto estiverem contíguas na pilha
// de navegação — ver 'new-sale' em src/platform/routes.tsx e groupByLayout em routerCore.ts.
import React from 'react';
import { SaleWizardProvider } from '../../src/contexts/SaleWizardContext';

export default function NewSaleLayout({ children }: { children: React.ReactNode }) {
  return <SaleWizardProvider>{children}</SaleWizardProvider>;
}
