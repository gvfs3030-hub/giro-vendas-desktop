// [DESKTOP] Motor SQL real: sql.js (SQLite em JavaScript puro, versão "asm" — sem WebAssembly
// e sem módulo nativo). Só este arquivo conhece o sql.js.
import type { RunResult, SqlEngine } from './sqliteCompat';

export async function createSqlJsEngine(initial: Uint8Array | null): Promise<SqlEngine> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('sql.js/dist/sql-asm.js');
  const initSqlJs = (mod.default ?? mod) as (config?: object) => Promise<any>;
  const SQL = await initSqlJs();
  const db = initial && initial.length > 0 ? new SQL.Database(initial) : new SQL.Database();

  const enableForeignKeys = () => db.exec('PRAGMA foreign_keys = ON;');
  enableForeignKeys();

  return {
    exec(sql) {
      db.exec(sql);
    },

    run(sql, params): RunResult {
      db.run(sql, params.length > 0 ? params : undefined);
      const changes: number = db.getRowsModified();
      let lastInsertRowId = 0;
      if (/^\s*(insert|replace)/i.test(sql)) {
        const r = db.exec('SELECT last_insert_rowid()');
        lastInsertRowId = Number(r?.[0]?.values?.[0]?.[0] ?? 0);
      }
      return { changes, lastInsertRowId };
    },

    all(sql, params) {
      const stmt = db.prepare(sql);
      try {
        if (params.length > 0) stmt.bind(params);
        const rows: Record<string, unknown>[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        return rows;
      } finally {
        stmt.free();
      }
    },

    export() {
      const bytes: Uint8Array = db.export();
      // sql.js volta o PRAGMA foreign_keys para OFF após export(): religa.
      enableForeignKeys();
      return bytes;
    },

    close() {
      db.close();
    },
  };
}
