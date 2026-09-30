// [DESKTOP] Geração de PDF com pdf-lib (JavaScript puro). Substitui expo-print, que converte HTML
// em PDF usando o motor do celular — algo que não existe no Windows. Os textos chegam prontos
// (já formatados em R$ e pt-BR); aqui só cuidamos do layout.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 40;
const GREEN = rgb(0, 0.784, 0.325); // #00C853
const INK = rgb(0.102, 0.102, 0.102);
const MUTED = rgb(0.4, 0.4, 0.4);
const FAINT = rgb(0.6, 0.6, 0.6);
const BOX = rgb(0.96, 0.96, 0.96);
const LINE = rgb(0.933, 0.933, 0.933);
const WHITE = rgb(1, 1, 1);

export interface OrderPdfData {
  companyName: string;
  sellerName: string;
  orderNumber: string; // ex.: "#001"
  clientName: string;
  date: string;
  items: { name: string; qty: string; unitPrice: string; discount: string; subtotal: string }[];
  subtotal: string;
  discountTotal: string;
  total: string;
  payment: string;
}

export interface ReportPdfData {
  title: string;
  generatedAt: string;
  summary: { label: string; value: string }[];
  sections: { title: string; rows: { label: string; value: string }[] }[];
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  supported: Set<number>;
}

async function createDoc(title: string): Promise<{ doc: PDFDocument; fonts: Fonts }> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator('Giro Vendas Desktop');
  doc.setProducer('Giro Vendas Desktop');
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, fonts: { regular, bold, supported: new Set(regular.getCharacterSet()) } };
}

/** As fontes padrão do PDF só cobrem Latin-1/WinAnsi: o resto vira "?" em vez de derrubar o PDF. */
export function sanitize(text: string, supported: Set<number>): string {
  let out = '';
  const normalized = String(text ?? '')
    .replace(/[\u00A0\u202F\u2007]/g, ' ')
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\r\n\t]+/g, ' ');
  for (const ch of normalized) {
    const cp = ch.codePointAt(0)!;
    out += supported.has(cp) ? ch : '?';
  }
  return out;
}

export function wrapText(font: PDFFont, text: string, size: number, maxWidth: number, maxLines = 3): string[] {
  const words = text.split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  const push = (l: string) => lines.push(l);
  for (const word of words) {
    let w = word;
    // palavra maior que a coluna: quebra por caracteres
    while (font.widthOfTextAtSize(w, size) > maxWidth) {
      let cut = w.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxWidth) cut--;
      if (current) { push(current); current = ''; }
      push(w.slice(0, cut));
      w = w.slice(cut);
    }
    const test = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) current = test;
    else { push(current); current = w; }
  }
  if (current) push(current);
  if (lines.length === 0) lines.push('');
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && font.widthOfTextAtSize(last + '...', size) > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = last + '...';
    return kept;
  }
  return lines;
}

/** Retângulo com cantos arredondados (o pdf-lib não tem borderRadius nativo). yTop = borda superior. */
function roundedRect(page: PDFPage, x: number, yTop: number, w: number, h: number, r: number, color = GREEN) {
  const path = `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  page.drawSvgPath(path, { x, y: yTop, color });
}

function textRight(page: PDFPage, text: string, xRight: number, y: number, font: PDFFont, size: number, color = INK) {
  page.drawText(text, { x: xRight - font.widthOfTextAtSize(text, size), y, size, font, color });
}

function textCenter(page: PDFPage, text: string, xCenter: number, y: number, font: PDFFont, size: number, color = INK) {
  page.drawText(text, { x: xCenter - font.widthOfTextAtSize(text, size) / 2, y, size, font, color });
}

function header(page: PDFPage, fonts: Fonts, title: string, subtitle: string): number {
  const w = A4[0] - MARGIN * 2;
  const top = A4[1] - MARGIN;
  roundedRect(page, MARGIN, top, w, 64, 8);
  page.drawText(title, { x: MARGIN + 16, y: top - 30, size: 20, font: fonts.bold, color: WHITE });
  if (subtitle) page.drawText(subtitle, { x: MARGIN + 16, y: top - 48, size: 11, font: fonts.regular, color: WHITE });
  return top - 64 - 18;
}

function footer(page: PDFPage, fonts: Fonts, y: number, withThanks: boolean) {
  const cx = A4[0] / 2;
  if (withThanks) {
    textCenter(page, 'Agradecemos a Prefer\u00eancia!', cx, y, fonts.bold, 13, GREEN);
    y -= 16;
  }
  textCenter(page, 'Documento gerado pelo Giro Vendas', cx, y, fonts.regular, 9, FAINT);
}

// ---------------------------------------------------------------- pedido
export async function buildOrderPdf(data: OrderPdfData): Promise<Uint8Array> {
  const { doc, fonts } = await createDoc(`Pedido ${data.orderNumber}`);
  const s = (t: string) => sanitize(t, fonts.supported);
  const contentW = A4[0] - MARGIN * 2;

  let page = doc.addPage(A4);
  let y = header(page, fonts, s(data.companyName || 'Giro Vendas'), s(`Vendedor: ${data.sellerName ?? ''}`));

  // caixas de informação
  const gap = 8;
  const boxW = (contentW - gap * 2) / 3;
  const info: [string, string][] = [['Pedido', data.orderNumber], ['Cliente', data.clientName], ['Data', data.date]];
  info.forEach(([label, value], i) => {
    const x = MARGIN + i * (boxW + gap);
    page.drawRectangle({ x, y: y - 46, width: boxW, height: 46, color: BOX });
    page.drawText(s(label), { x: x + 10, y: y - 16, size: 9, font: fonts.regular, color: MUTED });
    const lines = wrapText(fonts.bold, s(value), 11, boxW - 20, 1);
    page.drawText(lines[0], { x: x + 10, y: y - 33, size: 11, font: fonts.bold, color: INK });
  });
  y -= 46 + 20;

  // tabela
  const cols = [
    { title: 'Produto', w: 205, align: 'left' as const },
    { title: 'Qtd', w: 80, align: 'center' as const },
    { title: 'Pre\u00e7o Unit.', w: 90, align: 'right' as const },
    { title: 'Desc.', w: 50, align: 'center' as const },
    { title: 'Subtotal', w: contentW - 205 - 80 - 90 - 50, align: 'right' as const },
  ];
  const drawCell = (text: string, colIndex: number, rowY: number, font: PDFFont, size: number, color = INK) => {
    const x0 = MARGIN + cols.slice(0, colIndex).reduce((a, c) => a + c.w, 0);
    const col = cols[colIndex];
    if (col.align === 'left') page.drawText(text, { x: x0 + 8, y: rowY, size, font, color });
    else if (col.align === 'right') textRight(page, text, x0 + col.w - 8, rowY, font, size, color);
    else textCenter(page, text, x0 + col.w / 2, rowY, font, size, color);
  };
  const tableHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 24, width: contentW, height: 24, color: GREEN });
    cols.forEach((c, i) => drawCell(c.title, i, y - 16, fonts.bold, 10, WHITE));
    y -= 24;
  };
  tableHeader();

  const LINE_H = 12.5;
  for (const item of data.items) {
    const nameLines = wrapText(fonts.regular, s(item.name), 10, cols[0].w - 16, 3);
    const rowH = nameLines.length * LINE_H + 12;
    if (y - rowH < MARGIN + 40) {
      page = doc.addPage(A4);
      y = A4[1] - MARGIN;
      tableHeader();
    }
    nameLines.forEach((ln, i) => page.drawText(ln, { x: MARGIN + 8, y: y - 15 - i * LINE_H, size: 10, font: fonts.regular, color: INK }));
    drawCell(s(item.qty), 1, y - 15, fonts.regular, 10);
    drawCell(s(item.unitPrice), 2, y - 15, fonts.regular, 10);
    drawCell(s(item.discount), 3, y - 15, fonts.regular, 10);
    drawCell(s(item.subtotal), 4, y - 15, fonts.regular, 10);
    page.drawLine({ start: { x: MARGIN, y: y - rowH }, end: { x: MARGIN + contentW, y: y - rowH }, thickness: 0.6, color: LINE });
    y -= rowH;
  }

  // totais (precisa de ~150pt; senão vai para uma nova página)
  const paymentLines = wrapText(fonts.regular, s(`Pagamento: ${data.payment}`), 11, 320, 3);
  const totalsH = 22 + 18 + 18 + 28 + paymentLines.length * 15 + 60;
  if (y - totalsH < MARGIN) {
    page = doc.addPage(A4);
    y = A4[1] - MARGIN;
  }
  y -= 22;
  const right = MARGIN + contentW;
  textRight(page, s(`Subtotal: ${data.subtotal}`), right, y, fonts.regular, 11); y -= 18;
  textRight(page, s(`Desconto: -${data.discountTotal}`), right, y, fonts.regular, 11); y -= 26;
  textRight(page, s(`Total: ${data.total}`), right, y, fonts.bold, 17, GREEN); y -= 22;
  for (const ln of paymentLines) { textRight(page, ln, right, y, fonts.regular, 11); y -= 15; }

  footer(page, fonts, Math.max(y - 40, MARGIN + 12), true);
  return doc.save();
}

// ------------------------------------------------------------- relatório
export async function buildReportPdf(data: ReportPdfData): Promise<Uint8Array> {
  const { doc, fonts } = await createDoc(data.title);
  const s = (t: string) => sanitize(t, fonts.supported);
  const contentW = A4[0] - MARGIN * 2;
  const right = MARGIN + contentW;

  let page = doc.addPage(A4);
  let y = header(page, fonts, s(data.title), s(data.generatedAt));

  const ensure = (needed: number) => {
    if (y - needed < MARGIN + 30) {
      page = doc.addPage(A4);
      y = A4[1] - MARGIN;
    }
  };
  const sectionTitle = (t: string) => {
    ensure(50);
    y -= 12;
    page.drawText(s(t), { x: MARGIN, y, size: 14, font: fonts.bold, color: GREEN });
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: right, y }, thickness: 1, color: GREEN });
    y -= 6;
  };
  const row = (label: string, value: string, emphasize = false) => {
    ensure(22);
    y -= 16;
    const labelLines = wrapText(fonts.regular, s(label), 11, contentW - 150, 2);
    labelLines.forEach((ln, i) => page.drawText(ln, { x: MARGIN + 4, y: y - i * 13, size: 11, font: fonts.regular, color: INK }));
    textRight(page, s(value), right - 4, y, emphasize ? fonts.bold : fonts.regular, 11, emphasize ? GREEN : INK);
    y -= (labelLines.length - 1) * 13 + 5;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: right, y }, thickness: 0.5, color: LINE });
  };

  sectionTitle('Resumo do M\u00eas');
  data.summary.forEach((r, i) => row(r.label, r.value, i === data.summary.length - 1));
  for (const section of data.sections) {
    if (section.rows.length === 0) continue;
    y -= 10;
    sectionTitle(section.title);
    section.rows.forEach((r) => row(r.label, r.value));
  }

  footer(page, fonts, Math.max(y - 36, MARGIN + 12), false);
  return doc.save();
}
