// [DESKTOP] Substitui 'expo-print' + 'expo-sharing'. Em vez de "compartilhar" (conceito de
// celular), aqui salvamos o PDF numa pasta fixa do app e abrimos com o leitor de PDF padrão
// do Windows — e também expomos a pasta, para quem preferir olhar/reenviar o arquivo depois.
import type { FileAdapter } from './fileAdapter';
import { buildOrderPdf, buildReportPdf, type OrderPdfData, type ReportPdfData } from './pdfBuilders';

export interface PrintingEnv {
  fs: FileAdapter;
  pdfDir: string;
  backupDir: string;
  join: (...parts: string[]) => string;
  ensureDirs: () => Promise<void>;
  openWithSystem: (path: string) => Promise<boolean>;
}

let overrides: PrintingEnv | null = null;
/** Usado pelos testes para injetar pastas/arquivos em memória. */
export function configurePrinting(env: PrintingEnv | null) {
  overrides = env;
}

function env(): PrintingEnv {
  if (overrides) return overrides;
  // carregado sob demanda: assim este módulo é importável fora do React Native (nos testes)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const real = require('./fs') as typeof import('./fs');
  return {
    fs: real.fs, pdfDir: real.pdfDir, backupDir: real.backupDir, join: real.join,
    ensureDirs: real.ensureDirs, openWithSystem: real.openWithSystem,
  };
}

export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'documento';
}

async function savePdf(bytes: Uint8Array, filename: string): Promise<string> {
  const e = env();
  await e.ensureDirs();
  const path = e.join(e.pdfDir, safeFileName(filename));
  await e.fs.writeBytes(path, bytes);
  return path;
}

export async function saveOrderPdf(data: OrderPdfData, filename: string): Promise<string> {
  return savePdf(await buildOrderPdf(data), filename);
}

export async function saveReportPdf(data: ReportPdfData, filename: string): Promise<string> {
  return savePdf(await buildReportPdf(data), filename);
}

/** Gera, salva e já abre no leitor de PDF do Windows. Devolve o caminho salvo. */
export async function generateAndOpenOrderPdf(data: OrderPdfData, filename: string): Promise<string> {
  const path = await saveOrderPdf(data, filename);
  await env().openWithSystem(path);
  return path;
}

export async function generateAndOpenReportPdf(data: ReportPdfData, filename: string): Promise<string> {
  const path = await saveReportPdf(data, filename);
  await env().openWithSystem(path);
  return path;
}

/** Backup JSON: salva na pasta de backups e abre a pasta (não o arquivo) no Explorer. */
export async function saveAndRevealBackup(json: string, filename = 'giro_backup.json'): Promise<string> {
  const e = env();
  await e.ensureDirs();
  const path = e.join(e.backupDir, safeFileName(filename));
  await e.fs.writeText(path, json);
  await e.openWithSystem(e.backupDir);
  return path;
}
