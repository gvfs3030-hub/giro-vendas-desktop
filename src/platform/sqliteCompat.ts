// [DESKTOP] Camada compatível com o 'expo-sqlite' (mesmos métodos que as telas já usam:
// execAsync, runAsync, getFirstAsync, getAllAsync, withTransactionAsync).
//
// Por baixo há um "motor" SQL plugável (SqlEngine). No app real o motor é o sql.js (SQLite
// compilado para JavaScript puro — não depende de nenhum módulo nativo no Windows) e o banco
// é salvo em disco como um arquivo SQLite normal (giro.db).
import { writeBytesAtomic, recoverPath, type FileAdapter } from './fileAdapter';

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SqlEngine {
  exec(sql: string): void;
  run(sql: string, params: unknown[]): RunResult;
  all(sql: string, params: unknown[]): Record<string, unknown>[];
  export(): Uint8Array;
  close(): void;
}

export type EngineFactory = (initialBytes: Uint8Array | null) => Promise<SqlEngine>;

export interface OpenOptions {
  fs: FileAdapter;
  /** caminho completo do arquivo .db */
  path: string;
  engineFactory: EngineFactory;
  /** cria a pasta de dados, se necessário */
  prepare?: () => Promise<void>;
  /** janela de gravação: no máximo 1 gravação a cada X ms, e sempre logo após uma alteração */
  saveDelayMs?: number;
}

type BindValue = string | number | null | Uint8Array;

function normalizeValue(v: unknown): BindValue {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number' || typeof v === 'string' || v instanceof Uint8Array) return v;
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** expo-sqlite aceita runAsync(sql, [a,b]) e runAsync(sql, a, b). */
function normalizeParams(params: unknown[]): BindValue[] {
  const list = params.length === 1 && Array.isArray(params[0]) ? (params[0] as unknown[]) : params;
  return list.map(normalizeValue);
}

export class SQLiteDatabase {
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> = Promise.resolve();
  private txDepth = 0;
  private txChain: Promise<unknown> = Promise.resolve();
  private closed = false;

  constructor(private engine: SqlEngine, private opts: OpenOptions) {}

  // ---------- API compatível com expo-sqlite ----------
  async execAsync(sql: string): Promise<void> {
    this.engine.exec(sql);
    this.markDirty();
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<RunResult> {
    const result = this.engine.run(sql, normalizeParams(params));
    this.markDirty();
    return result;
  }

  async getFirstAsync<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T | null> {
    const rows = this.engine.all(sql, normalizeParams(params));
    return (rows[0] as T | undefined) ?? null;
  }

  async getAllAsync<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.engine.all(sql, normalizeParams(params)) as T[];
  }

  /** Transações não se sobrepõem (uma espera a outra terminar). */
  withTransactionAsync(task: () => Promise<void>): Promise<void> {
    const run = this.txChain.then(async () => {
      this.txDepth += 1;
      this.engine.exec('BEGIN');
      try {
        await task();
        this.engine.exec('COMMIT');
      } catch (e) {
        try {
          this.engine.exec('ROLLBACK');
        } catch {
          /* já revertido */
        }
        throw e;
      } finally {
        this.txDepth -= 1;
        this.markDirty();
      }
    });
    this.txChain = run.catch(() => undefined);
    return run;
  }

  async closeAsync(): Promise<void> {
    await this.flush();
    this.closed = true;
    this.engine.close();
  }

  // ---------- persistência (exclusiva do desktop) ----------
  private markDirty() {
    this.dirty = true;
    if (this.timer || this.closed) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.save();
    }, this.opts.saveDelayMs ?? 250);
  }

  private save(): Promise<void> {
    this.saving = this.saving.then(async () => {
      if (!this.dirty || this.closed) return;
      // export() do sql.js fecha/reabre o banco — nunca pode acontecer no meio de uma transação
      // (reverteria o que está em andamento). Adia e tenta de novo logo depois.
      if (this.txDepth > 0) {
        this.timer = setTimeout(() => {
          this.timer = null;
          void this.save();
        }, 50);
        return;
      }
      this.dirty = false;
      try {
        if (this.opts.prepare) await this.opts.prepare();
        await writeBytesAtomic(this.opts.fs, this.opts.path, this.engine.export());
      } catch (e) {
        this.dirty = true; // tenta de novo na próxima alteração
        console.error('Falha ao salvar o banco de dados:', e);
      }
    });
    return this.saving;
  }

  /** Grava imediatamente tudo que estiver pendente. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // espera transações em andamento antes de exportar
    await this.txChain;
    await this.save();
    await this.saving;
  }
}

// ---------- abertura / configuração ----------
let overrides: Partial<OpenOptions> | null = null;

/** Usado pelos testes para injetar arquivos em memória e outro motor SQL. */
export function configureSqlite(options: Partial<OpenOptions> | null) {
  overrides = options;
}

function defaultOptions(name: string): OpenOptions {
  // carregados sob demanda: assim este módulo continua importável fora do React Native (testes)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fs, dataDir, join, ensureDirs } = require('./fs') as typeof import('./fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createSqlJsEngine } = require('./sqlJsEngine') as typeof import('./sqlJsEngine');
  return { fs, path: join(dataDir, name), engineFactory: createSqlJsEngine, prepare: ensureDirs };
}

export async function openDatabaseAsync(name: string): Promise<SQLiteDatabase> {
  const base = overrides?.fs && overrides?.engineFactory && overrides?.path ? null : defaultOptions(name);
  const opts = { ...(base ?? {}), ...(overrides ?? {}) } as OpenOptions;
  if (opts.prepare) await opts.prepare();

  let initial: Uint8Array | null = null;
  if (await recoverPath(opts.fs, opts.path)) {
    try {
      initial = await opts.fs.readBytes(opts.path);
    } catch (e) {
      console.error('Não foi possível ler o banco existente:', e);
      throw e; // nunca começar "do zero" por cima de um arquivo que existe mas não abriu
    }
  }
  const engine = await opts.engineFactory(initial);
  return new SQLiteDatabase(engine, opts);
}
