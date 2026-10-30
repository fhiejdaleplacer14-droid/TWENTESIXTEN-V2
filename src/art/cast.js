export const TILE = 16;
export const DIRS = ['left', 'down', 'up', 'right'];

const SKIN = {
  tan: { ffc999: 'e3ab7c', f1b089: 'cb9265', ffc8a1: 'e3ab7c', e29779: 'b97a5c' },
  brown: { ffc999: 'c68a5c', f1b089: 'ab7149', ffc8a1: 'c68a5c', e29779: '99603f' },
};
const BLACK_HAIR = { dc8652: '3d3531', c57652: '2b2523' };
const WHITE_HAIR = { a09cca: 'e9e8ee', '7a77a4': 'c6c5cf', '5c6278': '9a99a6' };
const shirt = (main, shade) => ({ '42a379': main, '369069': shade, c2504d: main, a54240: shade, aaa8bd: main, '898ca6': shade, c77b47: main, a9673b: shade });

export const CAST = {
  player: { base: 0, swap: [SKIN.tan, BLACK_HAIR, shirt('3aa6a0', '2c8a86'), { d6d4aa: '4f5a70', c5b993: '3d465a' }] },
  lola: { base: 2, swap: [SKIN.tan, WHITE_HAIR, { dc8652: 'cbb8e2', c57652: 'ab95c9', '42a379': 'b7a3d6', '369069': '9a86bd' }] },
  tonyo: { base: 4, swap: [SKIN.tan, shirt('f0ece0', 'd0cabb'), { dc8652: '6b4a2a' }] },
  cora: { base: 1, swap: [SKIN.tan, BLACK_HAIR, shirt('e07a3a', 'bf5f28')] },
  linda: { base: 5, swap: [SKIN.tan, shirt('6fae5a', '548c45')] },
  vendor: { base: 3, swap: [] },
  kid: { base: 0, swap: [SKIN.tan, BLACK_HAIR, shirt('e8c14a', 'c9a238')] },
  baller: { base: 0, swap: [SKIN.tan, BLACK_HAIR, shirt('e07a3a', 'bf5f28'), { d6d4aa: '3a5fa8', c5b993: '2d4b86' }] },
  nena: { base: 1, swap: [SKIN.tan, BLACK_HAIR, shirt('7b6fc0', '5f55a0'), { a09cca: 'd6d4aa', '7a77a4': 'c5b993' }] },
  jun: { base: 0, swap: [SKIN.brown, BLACK_HAIR, shirt('c2504d', 'a54240')] },
  liza: { base: 5, swap: [SKIN.tan, shirt('e58fa8', 'c66f8a'), { ff7143: 'f2efe6' }] },
  ben: { base: 4, swap: [SKIN.brown, shirt('5f86a6', '4a6c88'), { dc8652: '6b4a2a' }] },
  baby: { base: 1, swap: [SKIN.tan, BLACK_HAIR, shirt('e58fa8', 'c66f8a')] },
  rudy: { base: 3, swap: [{ d6d4aa: 'e8c14a', c5b993: 'c9a238' }] },
  ising: { base: 2, swap: [SKIN.brown, WHITE_HAIR, { dc8652: 'f0ece0', c57652: 'd0cabb', '42a379': '6b5a48', '369069': '54463a' }] },
  bong: { base: 0, swap: [SKIN.tan, BLACK_HAIR, shirt('f0ece0', 'd0cabb'), { d6d4aa: '3a5fa8', c5b993: '2d4b86' }] },
  jenjen: { base: 5, swap: [SKIN.tan, shirt('e8c14a', 'c9a238'), { ff7143: 'c2504d' }] },
  rosa: { base: 1, swap: [SKIN.brown, BLACK_HAIR, shirt('6fae5a', '548c45')] },
  karding: { base: 4, swap: [SKIN.tan, shirt('6fae5a', '548c45'), { dc8652: '6b4a2a' }] },
  mila: { base: 5, swap: [SKIN.tan, shirt('c2504d', 'a54240'), { ff7143: 'f2efe6' }] },
  berto: { base: 0, swap: [SKIN.brown, BLACK_HAIR, shirt('f0ece0', 'd0cabb')] },
  kid_me: { base: 0, swap: [SKIN.tan, BLACK_HAIR, shirt('3aa6a0', '2c8a86'), { d6d4aa: '4f5a70', c5b993: '3d465a' }] },
  kid_a: { base: 0, swap: [SKIN.brown, BLACK_HAIR] },
  kid_b: { base: 5, swap: [SKIN.tan, shirt('e58fa8', 'c66f8a')] },
  kid_c: { base: 4, swap: [SKIN.tan, shirt('c2504d', 'a54240'), { dc8652: '6b4a2a' }] },
};

export function recolor(sheet, { base, swap }) {
  const colours = Object.assign({}, ...swap);
  const canvas = document.createElement('canvas');
  canvas.width = TILE * 4;
  canvas.height = TILE * 3;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sheet, 0, base * TILE * 3, TILE * 4, TILE * 3, 0, 0, TILE * 4, TILE * 3);
  const img = ctx.getImageData(0, 0, TILE * 4, TILE * 3);
  for (let i = 0; i < img.data.length; i += 4) {
    const to = colours[((1 << 24) | (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]).toString(16).slice(1)];
    if (to) [img.data[i], img.data[i + 1], img.data[i + 2]] = [0, 2, 4].map((n) => parseInt(to.slice(n, n + 2), 16));
  }
  cutOutline(img);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

const OUTLINE = [0x8d, 0x52, 0x43];

function cutOutline(img) {
  const { width: w, height: h, data } = img;
  const at = (x, y) => (y * w + x) * 4;
  const sameFrame = (x, y, xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && Math.floor(xx / TILE) === Math.floor(x / TILE) && Math.floor(yy / TILE) === Math.floor(y / TILE);
  const opaque = (x, y, xx, yy) => sameFrame(x, y, xx, yy) && data[at(xx, yy) + 3] > 0;
  const isLine = (x, y) => data[at(x, y) + 3] > 0 && OUTLINE.every((v, i) => data[at(x, y) + i] === v);
  const sides = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
  for (let pass = 0; pass < 2; pass++) {
    const gone = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!isLine(x, y)) continue;
        const near = sides(x, y);
        const outside = near.some(([xx, yy]) => !opaque(x, y, xx, yy));
        const filled = near.filter(([xx, yy]) => opaque(x, y, xx, yy) && !isLine(xx, yy)).length;
        if (outside && (pass === 0 || filled <= 1)) gone.push(at(x, y));
      }
    }
    for (const i of gone) data[i + 3] = 0;
  }
  const shades = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isLine(x, y)) continue;
      const sum = [0, 0, 0];
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && opaque(x, y, x + dx, y + dy) && !isLine(x + dx, y + dy)) {
            for (let i = 0; i < 3; i++) sum[i] += data[at(x + dx, y + dy) + i];
            n++;
          }
        }
      }
      shades.push([at(x, y), sum.map((v) => (n ? Math.round((v / n) * 0.62) : 60))]);
    }
  }
  for (const [i, rgb] of shades) rgb.forEach((v, k) => (data[i + k] = v));
}
