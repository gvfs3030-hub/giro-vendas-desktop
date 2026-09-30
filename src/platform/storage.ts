// [DESKTOP] Substitui @react-native-async-storage/async-storage (mesma API usada pelo app).
// Guarda tudo num único arquivo JSON dentro da pasta de dados do app.
import { writeTextAtomic, recoverPath, type FileAdapter } from './fileAdapter';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
}

export function createStorage(fs: FileAdapter, filePath: string, prepare?: () => Promise<void>): KeyValueStorage {
  let cache: Record<string, string> | null = null;
  let chain: Promise<unknown> = Promise.resolve();

  async function load(): Promise<Record<string, string>> {
    if (cache) return cache;
    cache = {};
    try {
      if (prepare) await prepare();
      if (await recoverPath(fs, filePath)) {
        const parsed = JSON.parse(await fs.readText(filePath));
        if (parsed && typeof parsed === 'object') cache = parsed;
      }
    } catch (e) {
      console.warn('Storage: começando vazio (arquivo ilegível):', e);
    }
    return cache!;
  }

  // Serializa as gravações: duas chamadas seguidas nunca se atropelam no disco.
  function persist(): Promise<void> {
    const run = chain.then(async () => {
      if (prepare) await prepare();
      await writeTextAtomic(fs, filePath, JSON.stringify(cache ?? {}));
    });
    chain = run.catch(() => undefined);
    return run;
  }

  return {
    async getItem(key) {
      const data = await load();
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    async setItem(key, value) {
      const data = await load();
      data[key] = String(value);
      await persist();
    },
    async removeItem(key) {
      const data = await load();
      delete data[key];
      await persist();
    },
    async multiRemove(keys) {
      const data = await load();
      for (const k of keys) delete data[k];
      await persist();
    },
    async clear() {
      cache = {};
      await persist();
    },
  };
}

// Instância real (carrega o módulo de arquivos nativo só quando o app usa de fato).
let real: KeyValueStorage | null = null;
function instance(): KeyValueStorage {
  if (!real) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fs, dataDir, join, ensureDirs } = require('./fs') as typeof import('./fs');
    real = createStorage(fs, join(dataDir, 'settings.json'), ensureDirs);
  }
  return real;
}

const AsyncStorage: KeyValueStorage = {
  getItem: (k) => instance().getItem(k),
  setItem: (k, v) => instance().setItem(k, v),
  removeItem: (k) => instance().removeItem(k),
  multiRemove: (ks) => instance().multiRemove(ks),
  clear: () => instance().clear(),
};

export default AsyncStorage;
