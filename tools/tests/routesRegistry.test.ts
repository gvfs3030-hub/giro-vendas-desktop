import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { findRoute, parseHref } from '../../src/platform/routerCore';

const root = path.resolve(__dirname, '../..');

/** Extrai os padrões de rota de routes.tsx sem importar o arquivo (que puxaria react-native). */
function extractPatterns(): { pattern: string; componentImport: string }[] {
  const src = fs.readFileSync(path.join(root, 'src/platform/routes.tsx'), 'utf8');
  const out: { pattern: string; componentImport: string }[] = [];
  for (const m of src.matchAll(/\{\s*pattern:\s*'([^']+)'\s*,\s*component:\s*(\w+)/g)) {
    out.push({ pattern: m[1], componentImport: m[2] });
  }
  return out;
}

/** Todo componente listado em routes.tsx precisa vir de um import cujo arquivo exista de fato. */
function extractImportPaths(): Map<string, string> {
  const src = fs.readFileSync(path.join(root, 'src/platform/routes.tsx'), 'utf8');
  const map = new Map<string, string>();
  for (const m of src.matchAll(/^import (\w+) from '([^']+)';/gm)) {
    map.set(m[1], m[2]);
  }
  return map;
}

function resolveScreenFile(relativeImport: string): string | null {
  const base = path.join(root, 'src/platform', relativeImport);
  for (const ext of ['.tsx', '.ts']) if (fs.existsSync(base + ext)) return base + ext;
  return null;
}

function collectFiles(dir: string, out: string[] = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectFiles(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Todo alvo de router.push/replace/reset usado nas telas (string literal ou template simples). */
function collectNavigationTargets(): { file: string; href: string }[] {
  const targets: { file: string; href: string }[] = [];
  for (const file of collectFiles(path.join(root, 'app'))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/router\.(?:push|replace|reset)\(\s*(`[^`]*`|'[^']*')/g)) {
      let href = m[1].slice(1, -1);
      href = href.replace(/\$\{[^}]+\}/g, 'X'); // parâmetro dinâmico vira um valor qualquer
      href = href.split('?')[0]; // querystring não faz parte do pattern
      if (href) targets.push({ file: path.relative(root, file), href });
    }
  }
  return targets;
}

test('routes.tsx: todo componente listado importa de um arquivo que existe em app/', () => {
  const imports = extractImportPaths();
  const patterns = extractPatterns();
  assert.ok(patterns.length >= 30, `esperava pelo menos 30 rotas registradas, achei ${patterns.length}`);
  for (const { pattern, componentImport } of patterns) {
    const importPath = imports.get(componentImport);
    assert.ok(importPath, `rota "${pattern}" usa componente "${componentImport}" sem import correspondente`);
    const resolved = resolveScreenFile(importPath!);
    assert.ok(resolved, `rota "${pattern}": import "${importPath}" não resolve para um arquivo em app/`);
  }
});

test('routes.tsx: nenhum padrão de rota duplicado', () => {
  const patterns = extractPatterns().map((p) => p.pattern);
  const seen = new Set<string>();
  const dupes = patterns.filter((p) => (seen.has(p) ? true : (seen.add(p), false)));
  assert.deepEqual(dupes, []);
});

test('todo router.push/replace/reset usado nas telas resolve contra routes.tsx', () => {
  const routeTable = extractPatterns().map(({ pattern }) => ({ pattern }));
  const targets = collectNavigationTargets();
  assert.ok(targets.length >= 20, `esperava achar pelo menos 20 chamadas de navegação, achei ${targets.length}`);
  const failures: string[] = [];
  for (const { file, href } of targets) {
    const { path: p } = parseHref(href);
    if (!findRoute(routeTable, p)) failures.push(`${file}: router.push/replace/reset("${href}") → sem rota para "${p}"`);
  }
  assert.deepEqual(failures, [], `alvos de navegação sem rota correspondente:\n${failures.join('\n')}`);
});

test('toda tela em app/ (exceto _layout e index de grupo) está registrada em routes.tsx', () => {
  const patterns = extractPatterns().map((p) => p.pattern);
  const registeredImports = new Set(Array.from(extractImportPaths().values()));
  const screenFiles = collectFiles(path.join(root, 'app')).filter((f) => {
    const rel = path.relative(path.join(root, 'app'), f);
    return !rel.includes('_layout') && !rel.startsWith('+not-found');
  });
  const orphans = screenFiles.filter((f) => {
    const relFromPlatform = '../../app/' + path.relative(path.join(root, 'app'), f).replace(/\\/g, '/').replace(/\.tsx?$/, '');
    return !registeredImports.has(relFromPlatform);
  });
  assert.deepEqual(orphans.map((f) => path.relative(root, f)), [], 'telas existentes sem entrada em routes.tsx');
  assert.ok(patterns.length === screenFiles.length, `routes.tsx tem ${patterns.length} rotas, mas há ${screenFiles.length} arquivos de tela em app/`);
});
