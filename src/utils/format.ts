// [LOCAL] — formatação brasileira

export function formatCurrency(value: number | null | undefined): string {
  const num = value ?? 0;
  return 'R$ ' + num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return '-';
  }
}

export function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  } catch {
    return '-';
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function todayDateISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function parseCurrencyInput(text: string): number {
  const cleaned = text.replace(/[^0-9,]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0] ?? dateStr;
}

export function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = { dinheiro: 'Dinheiro', cartao: 'Cartão', boleto: 'Boleto', pix: 'PIX', prazo: 'A Prazo' };
  return map[method] ?? method;
}

// [LOCAL] Linha completa de pagamento pra exibir na tela e no PDF, já incluindo
// parcelas (cartão ou a prazo) e juros, quando houver.
export function paymentDetailLine(method: string, installmentCount: number, interestRate?: number | null): string {
  let line = paymentMethodLabel(method);
  const hasInstallments = (method === 'cartao' || method === 'prazo') && installmentCount > 1;
  if (hasInstallments) line += ` em ${installmentCount}x`;
  if ((method === 'cartao' || method === 'prazo') && (interestRate ?? 0) > 0) {
    line += ` (com juros de ${interestRate}%)`;
  } else if (hasInstallments) {
    line += ' sem juros';
  }
  return line;
}

// [LOCAL] Rótulo amigável pra uma data (YYYY-MM-DD) usada no diário de visitas:
// "Hoje", "Amanhã", ou "dd/mm — segunda-feira". Parseamos os componentes na mão pra
// não cair na pegadinha de fuso horário do `new Date("YYYY-MM-DD")` (que interpreta
// como UTC e pode voltar um dia dependendo do fuso do aparelho).
const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export function friendlyDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  if (diffDays === 0) return `Hoje — ${dd}/${mm}`;
  if (diffDays === 1) return `Amanhã — ${dd}/${mm}`;
  if (diffDays === -1) return `Ontem — ${dd}/${mm}`;
  const weekday = WEEKDAYS[target.getDay()];
  const prefix = diffDays < 0 ? 'Atrasado' : weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${prefix} — ${dd}/${mm}`;
}
