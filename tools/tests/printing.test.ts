import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FileAdapter } from '../../src/platform/fileAdapter';
import {
  configurePrinting, saveOrderPdf, saveReportPdf, generateAndOpenOrderPdf,
  generateAndOpenReportPdf, saveAndRevealBackup, safeFileName, type PrintingEnv,
} from '../../src/platform/printing';

class MemFs implements FileAdapter {
  files = new Map<string, Uint8Array | string>();
  async exists(p: string) { return this.files.has(p); }
  async readBytes(p: string) { return this.files.get(p) as Uint8Array; }
  async writeBytes(p: string, b: Uint8Array) { this.files.set(p, b); }
  async readText(p: string) { return this.files.get(p) as string; }
  async writeText(p: string, t: string) { this.files.set(p, t); }
  async remove(p: string) { this.files.delete(p); }
  async move(a: string, b: string) { this.files.set(b, this.files.get(a)!); this.files.delete(a); }
  async mkdir() {}
}

function setup() {
  const fs = new MemFs();
  const opened: string[] = [];
  let dirsEnsured = 0;
  const env: PrintingEnv = {
    fs, pdfDir: '/data/PDFs', backupDir: '/data/Backups',
    join: (...parts) => parts.join('/'),
    ensureDirs: async () => { dirsEnsured++; },
    openWithSystem: async (p) => { opened.push(p); return true; },
  };
  configurePrinting(env);
  return { fs, opened, dirsEnsured: () => dirsEnsured };
}

const order = {
  companyName: 'Giro Vendas', sellerName: 'Ana', orderNumber: '#3', clientName: 'Cliente Teste', date: '28/09/2026',
  items: [{ name: 'Produto', qty: '1', unitPrice: 'R$ 1,00', discount: '0%', subtotal: 'R$ 1,00' }],
  subtotal: 'R$ 1,00', discountTotal: 'R$ 0,00', total: 'R$ 1,00', payment: 'Dinheiro',
};
const report = {
  title: 'Relatório', generatedAt: 'Hoje',
  summary: [{ label: 'Vendas', value: 'R$ 1,00' }], sections: [],
};

test('saveOrderPdf: salva em pdfDir, cria as pastas e devolve o caminho', async () => {
  const { fs, dirsEnsured } = setup();
  const path = await saveOrderPdf(order, 'pedido-003.pdf');
  assert.equal(path, '/data/PDFs/pedido-003.pdf');
  assert.equal(dirsEnsured(), 1);
  const bytes = fs.files.get(path) as Uint8Array;
  assert.ok(bytes instanceof Uint8Array && bytes.length > 200, 'deveria ter salvo bytes reais de PDF');
  assert.equal(String.fromCharCode(...bytes.slice(0, 5)), '%PDF-');
});

test('saveReportPdf: mesma pasta, arquivo de relatório', async () => {
  const { fs } = setup();
  const path = await saveReportPdf(report, 'relatorio.pdf');
  assert.equal(path, '/data/PDFs/relatorio.pdf');
  assert.ok(fs.files.has(path));
});

test('generateAndOpenOrderPdf / generateAndOpenReportPdf: salva E abre com o programa do sistema', async () => {
  const { opened } = setup();
  const p1 = await generateAndOpenOrderPdf(order, 'a.pdf');
  const p2 = await generateAndOpenReportPdf(report, 'b.pdf');
  assert.deepEqual(opened, [p1, p2]);
});

test('saveAndRevealBackup: salva o JSON em backupDir e abre a PASTA (não o arquivo)', async () => {
  const { fs, opened } = setup();
  const path = await saveAndRevealBackup('{"a":1}', 'giro_backup.json');
  assert.equal(path, '/data/Backups/giro_backup.json');
  assert.equal(fs.files.get(path), '{"a":1}');
  assert.deepEqual(opened, ['/data/Backups']); // pasta, não o arquivo
});

test('safeFileName: remove caracteres inválidos em nome de arquivo do Windows', () => {
  assert.equal(safeFileName('Relatório: Vendas de João/Maria*?.pdf'), 'Relatório- Vendas de João-Maria--.pdf');
  assert.equal(safeFileName('   '), 'documento');
  assert.equal(safeFileName('pedido-003.pdf'), 'pedido-003.pdf');
});

test('nome de arquivo perigoso passa por safeFileName antes de tocar o disco', async () => {
  const { fs } = setup();
  const path = await saveOrderPdf(order, 'C:\\Windows\\System32\\evil.pdf');
  assert.equal(path, '/data/PDFs/C-\\Windows\\System32\\evil.pdf'.replace(/\\/g, '-'));
  assert.ok(!fs.files.has('C:\\Windows\\System32\\evil.pdf'));
});
