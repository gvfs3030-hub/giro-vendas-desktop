// [DESKTOP] Implementação real de arquivos usando @dr.pogodin/react-native-fs
// (fork mantido do react-native-fs; o original v2.20 NÃO funciona no Windows).
import { Linking, Platform } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { base64ToBytes, bytesToBase64 } from './base64';
import type { FileAdapter } from './fileAdapter';

const SEP = (Platform.OS as string) === 'windows' ? '\\' : '/';

export function join(...parts: string[]): string {
  const joined = parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/[\\/]+$/, '') : p.replace(/^[\\/]+|[\\/]+$/g, '')))
    .join(SEP);
  return (Platform.OS as string) === 'windows' ? joined.replace(/\//g, '\\') : joined;
}

/** Pasta onde ficam banco, configurações, PDFs e backups. */
export const dataDir: string = join(RNFS.DocumentDirectoryPath, 'GiroVendas');
export const pdfDir: string = join(dataDir, 'PDFs');
export const backupDir: string = join(dataDir, 'Backups');

export const fs: FileAdapter = {
  exists: (p) => RNFS.exists(p),
  readBytes: async (p) => base64ToBytes(await RNFS.readFile(p, 'base64')),
  writeBytes: (p, bytes) => RNFS.writeFile(p, bytesToBase64(bytes), 'base64'),
  readText: (p) => RNFS.readFile(p, 'utf8'),
  writeText: (p, text) => RNFS.writeFile(p, text, 'utf8'),
  remove: (p) => RNFS.unlink(p),
  move: (from, to) => RNFS.moveFile(from, to),
  mkdir: (p) => RNFS.mkdir(p),
};

let ready: Promise<void> | null = null;
/** Cria as pastas do app (idempotente). */
export function ensureDirs(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const dir of [dataDir, pdfDir, backupDir]) {
        if (!(await fs.exists(dir))) await fs.mkdir(dir);
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** Abre um arquivo com o programa padrão do Windows (ex.: PDF no leitor de PDF). */
export async function openWithSystem(path: string): Promise<boolean> {
  const url = 'file:///' + path.replace(/\\/g, '/').replace(/^\/+/, '');
  try {
    await Linking.openURL(encodeURI(url));
    return true;
  } catch (e) {
    console.warn('Não foi possível abrir o arquivo automaticamente:', e);
    return false;
  }
}
