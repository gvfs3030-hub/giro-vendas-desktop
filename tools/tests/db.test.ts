import assert from 'node:assert/strict';
import { test } from 'node:test';
import fsNode from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { FileAdapter } from '../../src/platform/fileAdapter';
import {
  configureSqlite, openDatabaseAsync, type SqlEngine, type EngineFactory,
} from '../../src/platform/sqliteCompat';
import { initDatabase, getDatabase } from '../../src/database/database';

// ---------- doubles ----------
class MemFs implements FileAdapter {
  files = new Map<string, Uint8Array | string>();
  log: string[] = [];
  async exists(p: string) { return this.files.has(p); }
  async readBytes(p: string) {
    const v = this.files.get(p); if (v === undefined) throw new Error('ENOENT ' + p);
    return typeof v === 'string' ? new TextEncoder().encode(v) : v;
  }
  async writeBytes(p: string, b: Uint8Array) { this.log.push('write ' + p); this.files.set(p, b); }
  async readText(p: string) {
    const v = this.files.get(p); if (v === undefined) throw new Error('ENOENT ' + p);
    return typeof v === 'string' ? v : new TextDecoder().decode(v);
  }
  async writeText(p: string, t: string) { this.log.push('write ' + p); this.files.set(p, t); }
  async remove(p: string) { this.log.push('remove ' + p); this.files.delete(p); }
  async move(a: string, b: string) {
    this.log.push(`move ${a} -> ${b}`);
    const v = this.files.get(a); if (v === undefined) throw new Error('ENOENT ' + a);
    this.files.delete(a); this.files.set(b, v);
  }
  async mkdir() {}
}

/** Motor de teste sobre node:sqlite. "Bytes" = dump SQL em JSON (o node:sqlite não tem export). */
class TestEngine implements SqlEngine {
  db = new DatabaseSync(':memory:');
  exports = 0;
  inTx = false;
  exportedDuringTx = 0;
  constructor(initial: Uint8Array | null) {
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (initial && initial.length) {
      const dump: { ddl: string[]; rows: { table: string; row: Record<string, any> }[] } = JSON.parse(new TextDecoder().decode(initial));
      for (const d of dump.ddl) this.db.exec(d);
      for (const { table, row } of dump.rows) {
        const cols = Object.keys(row);
        this.db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c]));
      }
    }
  }
  exec(sql: string) {
    if (/^\s*BEGIN/i.test(sql)) this.inTx = true;
    if (/^\s*(COMMIT|ROLLBACK)/i.test(sql)) this.inTx = false;
    this.db.exec(sql);
  }
  run(sql: string, params: unknown[]) {
    const r = this.db.prepare(sql).run(...(params as any[]));
    return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
  }
  all(sql: string, params: unknown[]) {
    return this.db.prepare(sql).all(...(params as any[])).map((r) => ({ ...r })) as Record<string, unknown>[];
  }
  export() {
    this.exports++;
    if (this.inTx) this.exportedDuringTx++;
    const tables = this.db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];
    const rows: any[] = [];
    for (const t of tables) for (const row of this.db.prepare(`SELECT * FROM ${t.name}`).all()) rows.push({ table: t.name, row: { ...row } });
    return new TextEncoder().encode(JSON.stringify({ ddl: tables.map((t) => t.sql), rows }));
  }
  close() { this.db.close(); }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setup() {
  const fs = new MemFs();
  const engines: TestEngine[] = [];
  const engineFactory: EngineFactory = async (initial) => { const e = new TestEngine(initial); engines.push(e); return e; };
  configureSqlite({ fs, path: '/data/giro.db', engineFactory, saveDelayMs: 5 });
  return { fs, engines };
}

// ---------- 1. schema ----------
test('initDatabase cria o schema completo e é idempotente', async () => {
  setup();
  await initDatabase();
  await initDatabase();
  const db = await getDatabase();
  const tables = (await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'")).map((t) => t.name);
  for (const t of ['config', 'clients', 'products', 'sales', 'sale_items', 'installments', 'visits', 'expenses', 'goals']) {
    assert.ok(tables.includes(t), `tabela ${t} ausente`);
  }
});

// ---------- 2. TODAS as consultas reais das telas compilam contra o schema ----------
function collectSourceFiles(dir: string, out: string[] = []) {
  for (const e of fsNode.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectSourceFiles(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

test('todas as consultas SQL literais do app são válidas no schema', async () => {
  setup();
  await initDatabase();
  const db = await getDatabase();
  const literal = /(getFirstAsync|getAllAsync|runAsync|execAsync)\s*(?:<[^>]*>)?\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  const root = path.resolve(__dirname, '../..');
  const files = [...collectSourceFiles(path.join(root, 'app')), ...collectSourceFiles(path.join(root, 'src/database'))];
  let checked = 0;
  const failures: string[] = [];
  const raw = (db as any).engine.db as DatabaseSync;
  for (const file of files) {
    const src = fsNode.readFileSync(file, 'utf8');
    for (const m of src.matchAll(literal)) {
      const kind = m[1];
      const body = m[2].slice(1, -1);
      if (body.includes('${')) continue; // SQL montado dinamicamente
      const sql = body.replace(/\\'/g, "'");
      try {
        if (kind === 'execAsync') { raw.exec('BEGIN'); raw.exec(sql); raw.exec('ROLLBACK'); }
        else raw.prepare(sql);
        checked++;
      } catch (e: any) {
        try { raw.exec('ROLLBACK'); } catch { /* sem transação */ }
        failures.push(`${path.relative(root, file)}: ${e.message}\n    ${sql.replace(/\s+/g, ' ').slice(0, 140)}`);
      }
    }
  }
  assert.deepEqual(failures, [], 'consultas inválidas:\n' + failures.join('\n'));
  assert.ok(checked > 60, `esperava validar >60 consultas, validou ${checked}`);
  console.log(`   ✔ ${checked} consultas SQL validadas`);
});

// ---------- 3. o INSERT de venda (sem assinatura) e leituras típicas ----------
test('fluxo de venda: INSERT da confirmação (sem assinatura) + leitura do pedido', async () => {
  setup();
  await initDatabase();
  const db = await getDatabase();
  const src = fsNode.readFileSync(path.resolve(__dirname, '../../app/new-sale/confirmation.tsx'), 'utf8');
  assert.ok(!/signature/i.test(src), 'confirmation.tsx não deve mais citar assinatura');
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sales (id, orderNumber, clientId, subtotal, totalDiscount, total, paymentMethod, installmentCount, interestRate, cardInstallments, observations, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`,
    ['s1', 1, 'avulso', 100, 10, 90, 'dinheiro', 1, 0, 1, null, now, now]
  );
  const s = await db.getFirstAsync<{ total: number; status: string; signatureData: string | null }>('SELECT * FROM sales WHERE id = ?', ['s1']);
  assert.equal(s?.total, 90);
  assert.equal(s?.status, 'pendente');
  assert.equal(s?.signatureData ?? null, null);
});

test('runAsync devolve changes/lastInsertRowId; booleans e undefined são convertidos', async () => {
  setup();
  const db = await openDatabaseAsync('x.db');
  await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, a INTEGER, b TEXT)');
  const r = await db.runAsync('INSERT INTO t (a, b) VALUES (?, ?)', [true, undefined]);
  assert.equal(r.changes, 1);
  assert.equal(r.lastInsertRowId, 1);
  const row = await db.getFirstAsync<{ a: number; b: string | null }>('SELECT a, b FROM t');
  assert.deepEqual(row, { a: 1, b: null });
  assert.equal(await db.getFirstAsync('SELECT * FROM t WHERE id = ?', 99), null); // varargs também funciona
});

// ---------- 4. persistência ----------
test('alterações são gravadas em disco (uma vez por janela) e sobrevivem à reabertura', async () => {
  const { fs } = setup();
  const db = await openDatabaseAsync('giro.db');
  await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
  await db.runAsync('INSERT INTO t VALUES (1, ?)', ['a']);
  await db.runAsync('INSERT INTO t VALUES (2, ?)', ['b']);
  await db.runAsync('INSERT INTO t VALUES (3, ?)', ['c']);
  assert.ok(!fs.files.has('/data/giro.db'), 'ainda dentro da janela: nada gravado');
  await sleep(40);
  assert.ok(fs.files.has('/data/giro.db'));
  assert.ok(!fs.files.has('/data/giro.db.tmp'), 'não deixa .tmp para trás');
  assert.equal(fs.log.filter((l) => l === 'write /data/giro.db.tmp').length, 1, 'as 3 alterações viraram 1 gravação');

  const reopened = await openDatabaseAsync('giro.db');
  const rows = await reopened.getAllAsync<{ v: string }>('SELECT v FROM t ORDER BY id');
  assert.deepEqual(rows.map((r) => r.v), ['a', 'b', 'c']);
});

test('flush() grava na hora', async () => {
  const { fs } = setup();
  const db = await openDatabaseAsync('giro.db');
  await db.execAsync('CREATE TABLE t (id INTEGER)');
  await db.flush();
  assert.ok(fs.files.has('/data/giro.db'));
});

test('transação: nunca exporta no meio (evita reverter o que está em andamento) e faz rollback em erro', async () => {
  const { engines } = setup();
  const db = await openDatabaseAsync('giro.db');
  await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
  await db.flush();
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO t VALUES (1, ?)', ['x']);
    await sleep(40); // a janela de 5ms de gravação vence aqui dentro
    await db.runAsync('INSERT INTO t VALUES (2, ?)', ['y']);
  });
  assert.equal(engines[0].exportedDuringTx, 0, 'export() rodou dentro de uma transação');
  assert.equal((await db.getAllAsync('SELECT * FROM t')).length, 2);

  await assert.rejects(db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO t VALUES (3, ?)', ['z']);
    throw new Error('falhou no meio');
  }), /falhou no meio/);
  assert.equal((await db.getAllAsync('SELECT * FROM t')).length, 2, 'rollback');
  await db.flush();
});

test('transações concorrentes são enfileiradas (sem "transaction within a transaction")', async () => {
  setup();
  const db = await openDatabaseAsync('giro.db');
  await db.execAsync('CREATE TABLE t (id INTEGER)');
  await Promise.all([1, 2, 3].map((n) => db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO t VALUES (?)', [n]);
    await sleep(5);
  })));
  assert.equal((await db.getAllAsync('SELECT * FROM t')).length, 3);
});

// ---------- 5. queda no meio da gravação ----------
test('recuperação: se só sobrou o .tmp (queda entre remover e mover), ele é promovido', async () => {
  const { fs } = setup();
  const seed = await openDatabaseAsync('giro.db');
  await seed.execAsync('CREATE TABLE t (id INTEGER)');
  await seed.runAsync('INSERT INTO t VALUES (7)');
  await seed.flush();
  fs.files.set('/data/giro.db.tmp', fs.files.get('/data/giro.db')!);
  fs.files.delete('/data/giro.db'); // simulou a queda
  const db = await openDatabaseAsync('giro.db');
  assert.deepEqual(await db.getAllAsync('SELECT id FROM t'), [{ id: 7 }]);
  assert.ok(fs.files.has('/data/giro.db'));
});

test('arquivo existente e ilegível: NÃO começa banco vazio por cima', async () => {
  const { fs } = setup();
  fs.files.set('/data/giro.db', 'isto não é um banco');
  configureSqlite({
    fs, path: '/data/giro.db', saveDelayMs: 5,
    engineFactory: async () => { throw new Error('arquivo corrompido'); },
  });
  await assert.rejects(openDatabaseAsync('giro.db'), /corrompido/);
  assert.equal(fs.files.get('/data/giro.db'), 'isto não é um banco', 'arquivo original intacto');
});
