// [DESKTOP] Substitui o roteamento por arquivos do expo-router: aqui a lista de rotas é
// explícita. Ao adicionar uma tela nova em app/, registre-a aqui também.
import type { RouteConfig } from './router';

import Index from '../../app/index';
import Onboarding from '../../app/onboarding/index';
import Setup from '../../app/setup/index';

import Home from '../../app/tabs/home';
import Clients from '../../app/tabs/clients/index';
import Orders from '../../app/tabs/orders/index';

import NewSaleClient from '../../app/new-sale/index';
import NewSaleProducts from '../../app/new-sale/products';
import NewSaleCart from '../../app/new-sale/cart';
import NewSalePayment from '../../app/new-sale/payment';
import NewSaleConfirmation from '../../app/new-sale/confirmation';

import ClientAdd from '../../app/client-add';
import ClientDetail from '../../app/client/[id]/index';
import ClientEdit from '../../app/client/[id]/edit';

import ProductAdd from '../../app/product-add';
import ProductDetail from '../../app/product/[id]/index';
import ProductEdit from '../../app/product/[id]/edit';
import Products from '../../app/products';

import ExpenseAdd from '../../app/expense-add';
import ExpenseDetail from '../../app/expense/[id]/index';
import Expenses from '../../app/expenses';

import OrderDetail from '../../app/order/[id]/index';
import InstallmentDetail from '../../app/installment/[id]/index';
import VisitDetail from '../../app/visit/[id]/index';

import Financial from '../../app/financial';
import Routes from '../../app/routes';
import VisitPlan from '../../app/visit-plan';
import ImportBackup from '../../app/import-backup';
import Reports from '../../app/reports';
import Assistant from '../../app/assistant';
import Settings from '../../app/settings';

/** id de layout usado pelo assistente de venda: essas telas dividem UM SaleWizardProvider
 * enquanto estiverem contíguas na pilha (ver groupByLayout em routerCore.ts). */
const NEW_SALE = 'new-sale';

export const routes: RouteConfig[] = [
  { pattern: '/', component: Index },
  { pattern: '/onboarding', component: Onboarding },
  { pattern: '/setup', component: Setup },

  { pattern: '/tabs/home', component: Home },
  { pattern: '/tabs/clients', component: Clients },
  { pattern: '/tabs/orders', component: Orders },

  { pattern: '/new-sale', component: NewSaleClient, layout: NEW_SALE },
  { pattern: '/new-sale/products', component: NewSaleProducts, layout: NEW_SALE },
  { pattern: '/new-sale/cart', component: NewSaleCart, layout: NEW_SALE },
  { pattern: '/new-sale/payment', component: NewSalePayment, layout: NEW_SALE },
  { pattern: '/new-sale/confirmation', component: NewSaleConfirmation, layout: NEW_SALE },

  { pattern: '/client-add', component: ClientAdd },
  { pattern: '/client/:id', component: ClientDetail },
  { pattern: '/client/:id/edit', component: ClientEdit },

  { pattern: '/product-add', component: ProductAdd },
  { pattern: '/product/:id', component: ProductDetail },
  { pattern: '/product/:id/edit', component: ProductEdit },
  { pattern: '/products', component: Products },

  { pattern: '/expense-add', component: ExpenseAdd },
  { pattern: '/expense/:id', component: ExpenseDetail },
  { pattern: '/expenses', component: Expenses },

  { pattern: '/order/:id', component: OrderDetail },
  { pattern: '/installment/:id', component: InstallmentDetail },
  { pattern: '/visit/:id', component: VisitDetail },

  { pattern: '/financial', component: Financial },
  { pattern: '/routes', component: Routes },
  { pattern: '/visit-plan', component: VisitPlan },
  { pattern: '/import-backup', component: ImportBackup },
  { pattern: '/reports', component: Reports },
  { pattern: '/assistant', component: Assistant },
  { pattern: '/settings', component: Settings },
];

export { NEW_SALE };
