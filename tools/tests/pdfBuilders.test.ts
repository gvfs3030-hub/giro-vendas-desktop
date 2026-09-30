import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  buildOrderPdf, buildReportPdf, sanitize, wrapText, type OrderPdfData, type ReportPdfData,
} from '../../src/platform/pdfBuilders';

// pdfjs-dist depende de DOMMatrix/Path2D em runtime de navegador; no Node puro usamos a build
// "legacy" e desligamos o worker (roda tudo na mesma thread, o que é suficiente para o teste).
// É ESM-only, então precisa de import() dinâmico mesmo estando o resto do arquivo em CommonJS.
let pdfjsPromise: Promise<any> | null = null;
function pdfjs() {
  if (!pdfjsPromise) pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

async function extractText(bytes: Uint8Array): Promise<{ pages: string[]; full: string }> {
  const { getDocument, GlobalWorkerOptions } = await pdfjs();
  GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const doc = await getDocument({ data: bytes.slice(), useWorkerFetch: false, isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it: any) => it.str).join(' '));
  }
  return { pages, full: pages.join('\n') };
}

const sampleOrder: OrderPdfData = {
  companyName: 'Distribuidora São João', sellerName: 'Maria Aparecida',
  orderNumber: '#007', clientName: 'João & Filhos Ltda — Matriz', date: '28/09/2026 14:32',
  items: [
    { name: 'Cheetos', qty: '10 UN', unitPrice: 'R$ 5,50', discount: '0%', subtotal: 'R$ 55,00' },
    { name: 'Refrigerante Cola 2L', qty: '3 UN', unitPrice: 'R$ 8,90', discount: '5%', subtotal: 'R$ 25,37' },
  ],
  subtotal: 'R$ 80,37', discountTotal: 'R$ 1,33', total: 'R$ 79,04', payment: 'Cart\u00e3o em 3x sem juros',
};

test('PDF do pedido: 1 página, cabeçalho, itens, totais e agradecimento aparecem no texto', async () => {
  const bytes = await buildOrderPdf(sampleOrder);
  assert.ok(bytes.length > 500);
  const { pages, full } = await extractText(bytes);
  assert.equal(pages.length, 1);
  for (const needle of [
    'Distribuidora São João', 'Maria Aparecida', '#007', 'Cheetos', 'Refrigerante Cola 2L',
    'R$ 55,00', 'Total: R$ 79,04', 'Cartão em 3x sem juros', 'Agradecemos a Preferência!',
  ]) {
    assert.ok(full.includes(needle), `esperava encontrar "${needle}" no PDF.\nTexto extraído:\n${full}`);
  }
  // valida que é mesmo um PDF válido, reabrindo com pdf-lib
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), 1);
});

async function extractItems(bytes: Uint8Array): Promise<{ str: string; y: number }[][]> {
  const { getDocument, GlobalWorkerOptions } = await pdfjs();
  GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const doc = await getDocument({ data: bytes.slice(), useWorkerFetch: false, isEvalSupported: false }).promise;
  const pages: { str: string; y: number }[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it: any) => ({ str: it.str as string, y: it.transform[5] as number })));
  }
  return pages;
}

test('PDF do pedido: nome de produto longo quebra em várias linhas sem se sobrepor à linha do item seguinte', async () => {
  const data: OrderPdfData = {
    ...sampleOrder,
    items: [
      { name: 'Combo Promocional Gigante de Salgadinhos Sortidos Edição Especial Verão 2026 Tamanho Família', qty: '1 UN', unitPrice: 'R$ 199,90', discount: '10%', subtotal: 'R$ 179,91' },
      { name: 'Água Mineral', qty: '2 UN', unitPrice: 'R$ 2,00', discount: '0%', subtotal: 'R$ 4,00' },
    ],
  };
  const bytes = await buildOrderPdf(data);
  const [items] = await extractItems(bytes);
  const yOf = (needle: string) => items.find((it) => it.str.includes(needle))?.y;
  const comboLine1 = yOf('Combo Promocional');
  const comboLine2 = yOf('Salgadinhos');
  const comboLine3 = yOf('Tamanho Família');
  const aguaLine = yOf('Água Mineral');
  for (const y of [comboLine1, comboLine2, comboLine3, aguaLine]) assert.notEqual(y, undefined);
  // No PDF, y cresce para cima: cada linha seguinte deve ter y estritamente menor (mais baixo na página),
  // com espaçamento mínimo — ou seja, as 4 linhas realmente ficam empilhadas, nenhuma redesenhada por cima da outra.
  const MIN_GAP = 8;
  assert.ok(comboLine1! - comboLine2! >= MIN_GAP, `linha 1→2 do nome colidiu (${comboLine1} → ${comboLine2})`);
  assert.ok(comboLine2! - comboLine3! >= MIN_GAP, `linha 2→3 do nome colidiu (${comboLine2} → ${comboLine3})`);
  assert.ok(comboLine3! - aguaLine! >= MIN_GAP, `"Água Mineral" ficou colada/sobreposta à última linha do item anterior (${comboLine3} → ${aguaLine})`);
});

test('PDF do pedido: muitos itens geram várias páginas e cada página tem o cabeçalho da tabela', async () => {
  const items = Array.from({ length: 60 }, (_, i) => ({
    name: `Produto de teste número ${i + 1}`, qty: '1 UN', unitPrice: 'R$ 10,00', discount: '0%', subtotal: 'R$ 10,00',
  }));
  const bytes = await buildOrderPdf({ ...sampleOrder, items });
  const { pages, full } = await extractText(bytes);
  assert.ok(pages.length >= 2, `esperava várias páginas, veio ${pages.length}`);
  assert.ok(full.includes('Produto de teste número 1 '));
  assert.ok(full.includes('Produto de teste número 60'));
  // o cabeçalho verde da tabela ("Produto", "Subtotal"...) se repete em cada página
  const headerCount = pages.filter((p) => p.includes('Produto') && p.includes('Subtotal')).length;
  assert.equal(headerCount, pages.length);
});

test('PDF do pedido: zero itens não quebra (mostra só os totais)', async () => {
  const bytes = await buildOrderPdf({ ...sampleOrder, items: [] });
  const { full } = await extractText(bytes);
  assert.ok(full.includes('Total: R$ 79,04'));
});

const sampleReport: ReportPdfData = {
  title: 'Relatório de Vendas', generatedAt: 'Gerado em 28/09/2026',
  summary: [
    { label: 'Vendas', value: 'R$ 12.340,00' },
    { label: 'Meta', value: 'R$ 15.000,00' },
    { label: 'Despesas', value: 'R$ 890,00' },
    { label: 'Lucro estimado', value: 'R$ 11.450,00' },
  ],
  sections: [
    { title: 'Top Produtos', rows: [{ label: '1. Cheetos', value: 'R$ 550,00' }, { label: '2. Refrigerante', value: 'R$ 420,00' }] },
    { title: 'Top Clientes', rows: [] }, // seção vazia — não deve aparecer
  ],
};

test('PDF de relatório: seções aparecem, seção vazia é omitida', async () => {
  const bytes = await buildReportPdf(sampleReport);
  const { full } = await extractText(bytes);
  assert.ok(full.includes('Relatório de Vendas'));
  assert.ok(full.includes('Lucro estimado'));
  assert.ok(full.includes('R$ 11.450,00'));
  assert.ok(full.includes('Top Produtos'));
  assert.ok(full.includes('Cheetos'));
  assert.ok(!full.includes('Top Clientes'), 'seção sem linhas não deveria ser desenhada');
});

test('sanitize: acentos do português passam intactos (a fonte padrão os suporta); só glifos ausentes viram "?"; não derruba o PDF', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const supported = new Set(font.getCharacterSet());
  assert.equal(sanitize('São João — 100% "ótimo"', supported), 'São João - 100% "ótimo"');
  assert.equal(sanitize('emoji 🎉 chinês 中文', supported), 'emoji ? chinês ??');
  const page = doc.addPage();
  // não deve lançar exceção ao desenhar o texto sanitizado
  page.drawText(sanitize('café ☕ nº 3', supported), { x: 10, y: 10, size: 12, font });
  await doc.save();
});

test('wrapText: respeita a largura, quebra palavra muito longa por caractere, trunca com reticências', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 10;
  const maxWidth = 100;
  const lines = wrapText(font, 'Refrigerante Cola Zero Lata 350ml Pack com 12 unidades', size, maxWidth, 4);
  for (const ln of lines) assert.ok(font.widthOfTextAtSize(ln.replace('...', ''), size) <= maxWidth + 0.5);
  assert.ok(lines.length <= 4);
  const truncated = wrapText(font, 'Este é um nome de produto absurdamente longo que nunca vai caber em três linhas de jeito nenhum', size, maxWidth, 3);
  assert.equal(truncated.length, 3);
  assert.ok(truncated[2].endsWith('...'));
  const longWord = wrapText(font, 'Supercalifragilisticexpialidocious-mega-ultra-nome-de-produto', size, 40, 5);
  for (const ln of longWord) assert.ok(font.widthOfTextAtSize(ln, size) <= 40 + 0.5);
  assert.deepEqual(wrapText(font, '', size, maxWidth), ['']);
});
