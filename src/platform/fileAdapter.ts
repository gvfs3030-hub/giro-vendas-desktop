// [DESKTOP] Interface mínima de arquivos + gravação "atômica".
// Todo acesso a disco do app passa por aqui. Se a biblioteca nativa de arquivos der problema
// no Windows, só o arquivo fs.ts precisa ser trocado.
export interface FileAdapter {
  exists(path: string): Promise<boolean>;
  readBytes(path: string): Promise<Uint8Array>;
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
  readText(path: string): Promise<string>;
  writeText(path: string, text: string): Promise<void>;
  remove(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  mkdir(path: string): Promise<void>;
}

/**
 * Grava em <path>.tmp e só então substitui o arquivo final. Se o app fechar no meio,
 * loadWithRecovery() ainda encontra ou o arquivo antigo íntegro ou o .tmp completo.
 */
export async function writeBytesAtomic(fs: FileAdapter, path: string, bytes: Uint8Array): Promise<void> {
  const tmp = `${path}.tmp`;
  await fs.writeBytes(tmp, bytes);
  if (await fs.exists(path)) await fs.remove(path);
  await fs.move(tmp, path);
}

export async function writeTextAtomic(fs: FileAdapter, path: string, text: string): Promise<void> {
  const tmp = `${path}.tmp`;
  await fs.writeText(tmp, text);
  if (await fs.exists(path)) await fs.remove(path);
  await fs.move(tmp, path);
}

/** Lê o arquivo; se ele sumiu por uma queda no meio da gravação, promove o .tmp. */
export async function recoverPath(fs: FileAdapter, path: string): Promise<boolean> {
  if (await fs.exists(path)) return true;
  const tmp = `${path}.tmp`;
  if (await fs.exists(tmp)) {
    await fs.move(tmp, path);
    return true;
  }
  return false;
}
