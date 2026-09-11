// 2D value noise with smooth interpolation

function hash2(x, y) {
  let h = (Math.imul(x, 1664525) ^ Math.imul(y, 1013904223)) >>> 0;
  h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x, y) {
  const ix = Math.floor(x) | 0;
  const iy = Math.floor(y) | 0;
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  const ux = smoothstep(fx);
  const uy = smoothstep(fy);

  const a = hash2(ix,     iy)     * 2 - 1;
  const b = hash2(ix + 1, iy)     * 2 - 1;
  const c = hash2(ix,     iy + 1) * 2 - 1;
  const d = hash2(ix + 1, iy + 1) * 2 - 1;

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm(x, y, octaves = 5) {
  let v = 0, amp = 0.5, freq = 1, maxV = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * freq, y * freq) * amp;
    maxV += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return v / maxV;
}
