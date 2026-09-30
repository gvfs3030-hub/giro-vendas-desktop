// [DESKTOP] base64 <-> bytes em JS puro (não depende de atob/btoa/Buffer, que variam entre engines).
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP: number[] = (() => {
  const t: number[] = new Array(256).fill(-1);
  for (let i = 0; i < CHARS.length; i++) t[CHARS.charCodeAt(i)] = i;
  t['-'.charCodeAt(0)] = 62; // variante url-safe
  t['_'.charCodeAt(0)] = 63;
  return t;
})();

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    out += CHARS[b0 >> 2];
    out += CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < len ? CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < len ? CHARS[b2 & 63] : '=';
  }
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[\r\n\s]/g, '');
  let pad = 0;
  if (clean.endsWith('==')) pad = 2;
  else if (clean.endsWith('=')) pad = 1;
  const outLen = Math.floor((clean.length * 3) / 4) - pad;
  const out = new Uint8Array(outLen);
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = LOOKUP[clean.charCodeAt(i)];
    const c1 = LOOKUP[clean.charCodeAt(i + 1)];
    const c2 = i + 2 < clean.length ? LOOKUP[clean.charCodeAt(i + 2)] : 0;
    const c3 = i + 3 < clean.length ? LOOKUP[clean.charCodeAt(i + 3)] : 0;
    if (o < outLen) out[o++] = (c0 << 2) | (c1 >> 4);
    if (o < outLen) out[o++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (o < outLen) out[o++] = ((c2 & 3) << 6) | c3;
  }
  return out;
}
