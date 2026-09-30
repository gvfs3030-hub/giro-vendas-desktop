import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FileAdapter } from '../../src/platform/fileAdapter';
import { createStorage } from '../../src/platform/storage';

class MemFs implements FileAdapter {
  files = new Map<string, Uint8Array | string>();
  log: string[] = [];
  async exists(p: string) { return this.files.has(p); }
  async readBytes(p: string) { return this.files.get(p) as Uint8Array; }
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

test('getItem em chave inexistente devolve null (não lança)', async () => {
  const store = createStorage(new MemFs(), '/data/settings.json');
  assert.equal(await store.getItem('theme'), null);
});

test('setItem/getItem: ida e volta, e persiste em disco de forma atômica (via .tmp)', async () => {
  const fs = new MemFs();
  const store = createStorage(fs, '/data/settings.json');
  await store.setItem('theme', 'dark');
  assert.equal(await store.getItem('theme'), 'dark');
  assert.ok(fs.files.has('/data/settings.json'));
  assert.ok(!fs.files.has('/data/settings.json.tmp'));
  assert.deepEqual(JSON.parse(fs.files.get('/data/settings.json') as string), { theme: 'dark' });
});

test('valores não-string são convertidos com String() (mesmo contrato do AsyncStorage real)', async () => {
  const store = createStorage(new MemFs(), '/data/settings.json');
  await store.setItem('onboarding_complete', true as unknown as string);
  assert.equal(await store.getItem('onboarding_complete'), 'true');
});

test('removeItem e multiRemove', async () => {
  const store = createStorage(new MemFs(), '/data/settings.json');
  await store.setItem('a', '1');
  await store.setItem('b', '2');
  await store.setItem('c', '3');
  await store.removeItem('a');
  assert.equal(await store.getItem('a'), null);
  await store.multiRemove(['b', 'c']);
  assert.equal(await store.getItem('b'), null);
  assert.equal(await store.getItem('c'), null);
});

test('clear() esvazia tudo', async () => {
  const store = createStorage(new MemFs(), '/data/settings.json');
  await store.setItem('a', '1');
  await store.clear();
  assert.equal(await store.getItem('a'), null);
});

test('sobrevive a reabertura (nova instância lê o que a anterior gravou)', async () => {
  const fs = new MemFs();
  const store1 = createStorage(fs, '/data/settings.json');
  await store1.setItem('sellerName', 'Ana');
  const store2 = createStorage(fs, '/data/settings.json');
  assert.equal(await store2.getItem('sellerName'), 'Ana');
});

test('arquivo ainda não existe: primeira leitura não derruba (começa vazio)', async () => {
  const store = createStorage(new MemFs(), '/data/settings.json');
  assert.equal(await store.getItem('x'), null);
  await store.setItem('x', 'y'); // confirma que ainda dá pra gravar depois
  assert.equal(await store.getItem('x'), 'y');
});

test('JSON corrompido no disco: começa vazio em vez de lançar exceção', async () => {
  const fs = new MemFs();
  fs.files.set('/data/settings.json', 'isto não é json{{{');
  const store = createStorage(fs, '/data/settings.json');
  assert.equal(await store.getItem('theme'), null);
  await store.setItem('theme', 'light'); // e continua funcionando normalmente depois
  assert.equal(await store.getItem('theme'), 'light');
});

test('recuperação: promove o .tmp se só ele sobrou (queda no meio da gravação anterior)', async () => {
  const fs = new MemFs();
  const seed = createStorage(fs, '/data/settings.json');
  await seed.setItem('a', '1');
  fs.files.set('/data/settings.json.tmp', fs.files.get('/data/settings.json')!);
  fs.files.delete('/data/settings.json');
  const reopened = createStorage(fs, '/data/settings.json');
  assert.equal(await reopened.getItem('a'), '1');
});

test('prepare() é chamado antes de ler e antes de gravar (para criar a pasta de dados)', async () => {
  let calls = 0;
  const store = createStorage(new MemFs(), '/data/settings.json', async () => { calls++; });
  await store.getItem('a');
  assert.equal(calls, 1);
  await store.setItem('a', '1');
  assert.equal(calls, 2);
});

test('gravações concorrentes na mesma instância não se atropelam (ficam serializadas)', async () => {
  const fs = new MemFs();
  const store = createStorage(fs, '/data/settings.json');
  await Promise.all([
    store.setItem('a', '1'),
    store.setItem('b', '2'),
    store.setItem('c', '3'),
  ]);
  const final = JSON.parse(fs.files.get('/data/settings.json') as string);
  assert.deepEqual(final, { a: '1', b: '2', c: '3' });
});
