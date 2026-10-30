import Voxels from './voxel.js';

export const PX = 1 / 16;

const C = {
  tyre: '#231b16',
  hub: '#a9b2b5',
  chrome: '#c9d1d3',
  steel: '#8a8f92',
  dark: '#3d3531',
  glass: '#2a2a30',
  sky: '#9ecbe0',
  red: '#c9382f',
  yellow: '#e8c14a',
  blue: '#2f4f9a',
  white: '#eef0ee',
  wood: '#a8743e',
  woodDark: '#7a5230',
};

function wheel(m, cx, cy, z0, w, r = 4) {
  for (let x = -r; x < r; x++) {
    for (let y = -r; y < r; y++) {
      const d = (x + 0.5) ** 2 + (y + 0.5) ** 2;
      if (d > r * r) continue;
      m.box(cx + x, cy + y, z0, cx + x + 1, cy + y + 1, z0 + w, d < (r * 0.45) ** 2 ? C.hub : C.tyre);
    }
  }
}

export function jeepney() {
  const m = new Voxels();
  [8, 39].forEach((x) => [0, 19].forEach((z) => wheel(m, x, 4, z, 3)));
  m.box(2, 3, 2, 46, 5, 20, C.dark);
  m.box(2, 5, 2, 36, 21, 20, C.white);
  m.box(2, 5, 2, 36, 8, 20, C.red);
  for (const z of [2, 19]) {
    m.box(2, 8, z, 36, 9, z + 1, C.yellow);
    m.box(2, 9, z, 36, 10, z + 1, C.blue);
    m.box(2, 10, z, 36, 11, z + 1, C.red);
    for (let x = 4; x < 34; x += 6) m.box(x, 13, z, x + 5, 19, z + 1, C.glass);
  }
  m.box(2, 6, 5, 3, 19, 17, C.glass);
  m.box(0, 4, 4, 2, 5, 18, C.steel);
  m.box(36, 5, 3, 47, 12, 19, C.white);
  m.box(36, 5, 3, 47, 8, 19, C.red);
  m.box(33, 12, 3, 38, 20, 19, C.white);
  m.box(37, 13, 4, 38, 19, 18, C.sky);
  m.box(46, 6, 5, 47, 11, 17, C.steel);
  for (let y = 6; y < 11; y += 2) m.box(47, y, 6, 48, y + 1, 16, C.chrome);
  m.box(46, 9, 3, 47, 11, 5, '#fff1b0');
  m.box(46, 9, 17, 47, 11, 19, '#fff1b0');
  m.box(44, 12, 7, 46, 15, 9, '#e2b93b');
  m.box(44, 12, 13, 46, 15, 15, '#e2b93b');
  m.box(45, 15, 7, 46, 16, 9, '#e2b93b');
  m.box(45, 15, 13, 46, 16, 15, '#e2b93b');
  m.box(40, 12, 3, 41, 18, 4, C.chrome);
  m.box(40, 12, 18, 41, 18, 19, C.chrome);
  m.box(1, 21, 1, 38, 22, 21, '#c0c6c8');
  for (const z of [1, 20]) m.box(4, 22, z, 34, 23, z + 1, C.steel);
  m.box(29, 22, 5, 37, 25, 17, C.yellow);
  for (let z = 6; z < 16; z += 3) m.box(37, 23, z, 38, 24, z + 2, C.dark);
  m.box(0, 4, 2, 2, 6, 20, C.chrome);
  m.box(46, 4, 2, 48, 6, 20, C.chrome);
  return m;
}

export function tricycle(main = '#3a5fa8', shade = '#2d4b86', driver = false) {
  const m = new Voxels();
  wheel(m, 5, 4, 3, 2);
  wheel(m, 27, 4, 3, 2);
  m.box(10, 6, 2, 23, 11, 6, '#c2504d');
  m.box(8, 11, 2, 18, 12, 6, '#2a2420');
  m.box(12, 3, 3, 19, 6, 5, C.steel);
  m.box(24, 5, 4, 26, 13, 5, '#5c6467');
  m.box(23, 13, 1, 25, 14, 8, '#5c6467');
  m.box(26, 9, 3, 28, 11, 6, '#fff1b0');
  m.box(6, 3, 6, 18, 4, 9, '#5c6467');
  wheel(m, 11, 4, 19, 2);
  m.box(2, 4, 9, 21, 19, 20, main);
  m.box(2, 7, 9, 21, 8, 20, '#c2504d');
  m.box(2, 8, 9, 21, 9, 20, '#f2efe6');
  m.box(5, 10, 19, 17, 17, 20, '#24304a');
  m.box(20, 11, 10, 21, 18, 19, C.sky);
  m.box(1, 19, 8, 22, 21, 21, shade);
  m.box(1, 18, 8, 22, 19, 9, C.yellow);
  m.box(1, 18, 20, 22, 19, 21, C.yellow);
  if (driver) {
    m.box(13, 12, 3, 17, 18, 6, '#f2efe6');
    m.box(14, 18, 3, 17, 21, 6, '#cb9265');
    m.box(14, 21, 3, 17, 22, 6, '#2b2523');
  }
  return m;
}

export function motorbike() {
  const m = new Voxels();
  wheel(m, 4, 4, 2, 2);
  wheel(m, 19, 4, 2, 2);
  m.box(6, 6, 1, 17, 10, 5, '#c2504d');
  m.box(5, 10, 1, 13, 11, 5, '#2a2420');
  m.box(8, 3, 2, 14, 6, 4, C.steel);
  m.box(1, 5, 4, 9, 6, 5, C.hub);
  m.box(17, 5, 2, 18, 14, 4, '#5c6467');
  m.box(16, 14, 0, 18, 15, 6, '#5c6467');
  m.box(18, 10, 2, 20, 12, 4, '#fff1b0');
  return m;
}

export function lampPost() {
  const m = new Voxels();
  m.box(-2, 0, -2, 2, 2, 2, '#5c6467');
  m.box(-1, 2, -1, 1, 56, 1, '#9aa0a3');
  m.box(-1, 54, 1, 1, 56, 13, '#9aa0a3');
  m.box(-2, 52, 11, 2, 54, 17, '#5c6467');
  m.box(-1, 51, 12, 1, 52, 16, '#fff3c4');
  return m;
}

export function bench(length = 30) {
  const m = new Voxels();
  for (const x of [2, length - 4]) {
    m.box(x, 0, 1, x + 2, 7, 3, C.woodDark);
    m.box(x, 0, 7, x + 2, 7, 9, C.woodDark);
  }
  m.box(0, 7, 0, length, 8, 10, C.wood);
  m.box(0, 8, 0, length, 15, 2, C.wood);
  m.box(0, 11, 0, length, 12, 2, C.woodDark);
  return m;
}

export function pot(kind = 'plain') {
  const m = new Voxels();
  m.box(1, 0, 1, 7, 5, 7, '#b5622f');
  m.box(0, 5, 0, 8, 7, 8, '#c9783f');
  m.box(1, 6, 1, 7, 7, 7, '#5c3d22');
  const green = (x, y, z) => ((x * 7 + y * 3 + z * 5) % 4 === 0 ? '#6fb35f' : (x + z) % 3 === 0 ? '#2f7a52' : '#3d8a55');
  if (kind === 'snake') {
    [[2, 2, 13], [4, 3, 16], [5, 5, 12], [3, 5, 14], [6, 3, 11]].forEach(([x, z, h]) => m.box(x, 7, z, x + 1, 7 + h - 6, z + 1, (x + z) % 2 ? '#a8c96a' : '#3d8a55'));
  } else {
    m.blob(4, 11, 4, 5, green);
    if (kind === 'flowers') {
      [[1, 12, 2], [6, 13, 3], [4, 15, 6], [2, 10, 7], [7, 10, 5], [4, 14, 1]].forEach(([x, y, z]) => m.set(x, y, z, '#e05a8a'));
    }
  }
  return m;
}

export function tires() {
  const m = new Voxels();
  for (let ring = 0; ring < 3; ring++) {
    const y = ring * 4;
    for (let x = -6; x < 6; x++) {
      for (let z = -6; z < 6; z++) {
        const d = (x + 0.5) ** 2 + (z + 0.5) ** 2;
        if (d <= 36 && d >= 9) m.box(x, y, z, x + 1, y + 4, z + 1, (x + z + ring) % 5 ? C.tyre : '#3a302a');
      }
    }
  }
  return m;
}

export function barrel(cat = false) {
  const m = new Voxels();
  for (let x = -5; x < 5; x++) {
    for (let z = -5; z < 5; z++) {
      if ((x + 0.5) ** 2 + (z + 0.5) ** 2 > 25) continue;
      m.box(x, 0, z, x + 1, 16, z + 1, '#3f6b8a');
      m.set(x, 4, z, '#2c4f69').set(x, 11, z, '#2c4f69');
    }
  }
  if (!cat) return m;
  m.box(-3, 16, -2, 3, 19, 2, '#e0a24d');
  m.box(1, 19, -2, 4, 21, 1, '#e0a24d');
  m.box(-3, 17, -2, 3, 18, 2, '#b5762e');
  m.set(1, 21, -2, '#e0a24d').set(3, 21, -2, '#e0a24d');
  m.box(-5, 16, 1, -2, 17, 2, '#e0a24d');
  return m;
}

export function hoop() {
  const m = new Voxels();
  m.box(-2, 0, -2, 2, 46, 2, '#5c6467');
  m.box(-1, 38, 2, 1, 40, 6, '#5c6467');
  m.box(-11, 36, 6, 11, 50, 7, '#ece6d6');
  m.box(-11, 36, 6, 11, 37, 7, '#5c6467');
  m.box(-11, 49, 6, 11, 50, 7, '#5c6467');
  m.box(-4, 40, 7, 4, 41, 8, '#b5482f');
  m.box(-4, 45, 7, 4, 46, 8, '#b5482f');
  m.box(-4, 40, 7, -3, 46, 8, '#b5482f');
  m.box(3, 40, 7, 4, 46, 8, '#b5482f');
  for (let a = 0; a < 20; a++) {
    const x = Math.round(Math.cos((a / 20) * Math.PI * 2) * 4);
    const z = 11 + Math.round(Math.sin((a / 20) * Math.PI * 2) * 4);
    m.set(x, x > 2 ? 38 : 39, z, '#d9772f');
  }
  return m;
}

export function car(colour = '#d9d4c8') {
  const m = new Voxels();
  [9, 37].forEach((x) => [1, 19].forEach((z) => wheel(m, x, 4, z, 2)));
  m.box(1, 3, 2, 47, 11, 20, colour);
  m.box(11, 11, 3, 36, 19, 19, colour);
  m.box(12, 12, 2, 35, 18, 3, C.glass);
  m.box(12, 12, 19, 35, 18, 20, C.glass);
  m.box(35, 12, 4, 37, 18, 18, C.sky);
  m.box(10, 12, 4, 12, 18, 18, C.sky);
  m.box(46, 6, 3, 47, 8, 6, '#fff1b0');
  m.box(46, 6, 16, 47, 8, 19, '#fff1b0');
  m.box(1, 6, 3, 2, 8, 6, '#c9382f');
  m.box(1, 6, 16, 2, 8, 19, '#c9382f');
  return m;
}

export function crate(fill = '#8fc46a') {
  const m = new Voxels();
  m.box(0, 0, 0, 14, 8, 10, C.wood);
  for (let x = 0; x < 14; x += 4) m.box(x, 0, 0, x + 1, 8, 10, C.woodDark);
  for (let x = 1; x < 13; x++) for (let z = 1; z < 9; z++) m.set(x, 8 + ((x + z) % 3 === 0 ? 1 : 0), z, (x * z) % 5 === 0 ? '#c9d47a' : fill);
  return m;
}

const LEAVES = {
  green: ['#2f7a52', '#3d8a55', '#4a9a5c', '#6fb35f'],
  dark: ['#1f5a40', '#2a6a48', '#357a50', '#4a8f58'],
  dry: ['#b0602a', '#d0782f', '#e09a3a', '#efc25a'],
};

export function tree(seed = 1, size = 1, kind = 'green') {
  const m = new Voxels();
  const rnd = mulberry(seed);
  const trunk = '#6b4426';
  const width = Math.max(1, Math.round(2 * size));
  for (let y = 0; y < 14 * size; y++) {
    const sway = Math.round(Math.sin(y / 5 + seed) * 1.2 * size);
    m.box(sway - width, y, -width, sway + width, y + 1, width, y % 4 ? trunk : '#5a3a20');
  }
  m.box(-width * 2, 0, -width, width * 2, 1, width, trunk);
  const leaves = LEAVES[kind] || LEAVES.green;
  const lumps = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 + rnd();
    const r = i === 0 ? 0 : 5 + rnd() * 4;
    const cx = Math.cos(a) * r * size;
    const cz = Math.sin(a) * r * size * 0.8;
    const cy = (17 + rnd() * 6) * size;
    m.blob(cx, cy, cz, (7 + rnd() * 3) * size, (x, y, z, d) => {
      const top = y > cy + 2 ? 1 : 0;
      const speck = (x * 7 + y * 13 + z * 5) % 11 === 0 ? 1 : 0;
      return leaves[Math.min(3, Math.max(0, Math.round(1 + top + speck - d)))];
    });
  }
  return m;
}

function mulberry(seed) {
  let a = seed * 2654435761;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cart(colour = '#c9382f') {
  const m = new Voxels();
  wheel(m, 6, 4, 0, 2);
  wheel(m, 6, 4, 13, 2);
  m.box(0, 6, 1, 20, 14, 14, colour);
  m.box(1, 14, 2, 19, 15, 13, '#d9d4c8');
  m.box(3, 15, 4, 9, 19, 10, '#a9b2b5');
  m.box(12, 15, 3, 18, 18, 12, '#cfe6ee');
  m.box(19, 4, 6, 20, 14, 8, '#5c6467');
  m.box(1, 15, 13, 2, 30, 14, '#8a7a52');
  for (let x = -8; x < 12; x++) {
    for (let z = -2; z < 22; z++) {
      const d = (x - 1.5) ** 2 + (z - 9.5) ** 2;
      if (d < 100) m.set(x, d < 30 ? 31 : 30, z, (x + z) % 6 < 3 ? '#e8c14a' : '#c9382f');
    }
  }
  return m;
}

export function box() {
  return new Voxels().box(0, 0, 0, 10, 8, 9, '#b98a52').box(0, 7, 4, 10, 8, 5, '#8a6238');
}

export function chair() {
  const m = new Voxels();
  const w = '#f2efe6';
  for (const [x, z] of [[0, 0], [8, 0], [0, 8], [8, 8]]) m.box(x, 0, z, x + 2, 7, z + 2, w);
  m.box(0, 7, 0, 10, 8, 10, w);
  m.box(0, 8, 0, 10, 16, 2, w);
  m.box(1, 11, 0, 9, 13, 1, '#d9d4c8');
  return m;
}

export function table() {
  const m = new Voxels();
  for (const [x, z] of [[1, 1], [26, 1], [1, 12], [26, 12]]) m.box(x, 0, z, x + 2, 11, z + 2, '#7a5230');
  m.box(0, 11, 0, 29, 12, 15, '#e8e2d0');
  m.box(0, 9, 0, 29, 11, 1, '#e8e2d0');
  m.box(4, 12, 4, 9, 16, 9, '#c9d1d3');
  m.box(13, 12, 5, 23, 14, 11, '#d9a85a');
  return m;
}

export function flagpole() {
  const m = new Voxels();
  m.box(-3, 0, -3, 3, 2, 3, '#5c6467');
  m.box(-1, 2, -1, 1, 60, 1, '#c9d1d3');
  m.box(-1, 60, -1, 1, 62, 1, '#e2b93b');
  const flag = (x, y) => {
    const tri = y < 6 ? x <= y * 1.4 : x <= (11 - y) * 1.4;
    if (tri) return (x - 2) ** 2 + (y - 5.5) ** 2 < 2.5 ? '#e8c14a' : '#f2efe6';
    return y >= 6 ? '#2f4f9a' : '#c9382f';
  };
  for (let x = 0; x < 20; x++) for (let y = 0; y < 12; y++) m.set(x + 1, 46 + y, 0, flag(x, y));
  return m;
}

export function fountain() {
  const m = new Voxels();
  for (let x = -22; x < 22; x++) {
    for (let z = -18; z < 18; z++) {
      const d = (x + 0.5) ** 2 / 484 + (z + 0.5) ** 2 / 324;
      if (d > 1) continue;
      if (d > 0.8) m.box(x, 0, z, x + 1, 7, z + 1, '#c9c5b8');
      else m.set(x, 0, z, (x * 3 + z * 7) % 13 === 0 ? '#c9a24d' : '#8f8b80');
    }
  }
  m.box(-3, 0, -3, 3, 14, 3, '#c9c5b8');
  m.box(-7, 14, -7, 7, 16, 7, '#d9d4c8');
  m.box(-2, 16, -2, 2, 20, 2, '#c9c5b8');
  return m;
}

export function cross() {
  return new Voxels().box(-1, 0, 0, 1, 18, 2, '#e9dcc0').box(-5, 11, 0, 5, 13, 2, '#e9dcc0');
}

export function bush(dark = false) {
  const colour = dark ? '#2f7a52' : '#3d8a55';
  return new Voxels().blob(0, 6, 0, 7, (x, y, z) => ((x + y + z) % 4 ? colour : '#6fb35f'));
}

export function laundry(length = 112) {
  const m = new Voxels();
  m.box(0, 0, 0, 2, 26, 2, '#8a7a52');
  m.box(length, 0, 0, length + 2, 26, 2, '#8a7a52');
  m.box(1, 25, 0, length + 1, 26, 1, '#5c4630');
  const clothes = ['#3a5fa8', '#f2efe6', '#e58fa8', '#e8c14a', '#c9382f', '#6fae5a'];
  for (let x = 6, i = 0; x < length - 8; x += 13, i++) {
    const w = 8 + (i % 2) * 2;
    const h = 7 + ((i * 5) % 6);
    m.box(x, 25 - h, 0, x + w, 25, 1, clothes[i % clothes.length]);
  }
  return m;
}

export function tent(length = 80) {
  const m = new Voxels();
  for (const x of [0, length - 2]) for (const z of [0, 30]) m.box(x, 0, z, x + 2, 36, z + 2, '#9aa0a3');
  for (let x = -2; x < length + 2; x++) {
    for (let z = -2; z < 34; z++) {
      const y = 36 + Math.round(4 - Math.abs(z - 16) / 4);
      m.set(x, y, z, Math.floor(x / 8) % 2 ? '#f2efe6' : '#2f4f9a');
    }
  }
  return m;
}


export function bucket(colour = '#2f6fb3') {
  const m = new Voxels();
  for (let x = -4; x < 4; x++) {
    for (let z = -4; z < 4; z++) {
      const d = (x + 0.5) ** 2 + (z + 0.5) ** 2;
      if (d > 17) continue;
      m.box(x, 0, z, x + 1, 1, z + 1, colour);
      if (d >= 9) m.box(x, 1, z, x + 1, 8, z + 1, d >= 13 ? colour : '#1d1d1d');
      if (d >= 13) m.set(x, 8, z, '#e8e3d6');
    }
  }
  m.box(-4, 9, 0, -3, 11, 1, '#9aa3a6').box(-3, 11, 0, 3, 12, 1, '#9aa3a6').box(3, 9, 0, 4, 11, 1, '#9aa3a6');
  return m;
}

export function bin() {
  const m = new Voxels();
  for (let x = -5; x < 5; x++) {
    for (let z = -5; z < 5; z++) {
      const d = (x + 0.5) ** 2 + (z + 0.5) ** 2;
      if (d > 26) continue;
      m.box(x, 0, z, x + 1, 13, z + 1, (x + z) % 7 === 0 ? '#356b40' : '#3d7a4a');
      m.set(x, 8, z, '#e8c14a');
      m.set(x, 13, z, '#2a4d32');
    }
  }
  m.box(-1, 14, -1, 1, 15, 1, '#2a4d32');
  return m;
}
