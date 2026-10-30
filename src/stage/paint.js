import * as THREE from 'three';
import { PIXEL } from '../systems/Fonts.js';

const TILE = 16;
const SHEET_COLS = 37;

export function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  if (draw) draw(c.getContext('2d'), c);
  return c;
}

export function texture(source, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(source);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

export class Sheet {
  constructor(image) {
    this.image = image;
  }

  draw(ctx, frame, x, y) {
    ctx.drawImage(this.image, (frame % SHEET_COLS) * TILE, Math.floor(frame / SHEET_COLS) * TILE, TILE, TILE, x, y, TILE, TILE);
  }

  tile(frame) {
    return canvas(TILE, TILE, (ctx) => this.draw(ctx, frame, 0, 0));
  }

  grid(rows) {
    return canvas(rows[0].length * TILE, rows.length * TILE, (ctx) => rows.forEach((row, r) => row.forEach((f, c) => f !== null && this.draw(ctx, f, c * TILE, r * TILE))));
  }
}

export function tinRoof(base) {
  const col = new THREE.Color(base);
  const shade = (k) => `#${col.clone().multiplyScalar(k).getHexString()}`;
  return canvas(TILE, TILE, (ctx) => {
    for (let x = 0; x < TILE; x++) {
      ctx.fillStyle = [shade(1.12), shade(1), shade(0.86), shade(0.94)][x % 4];
      ctx.fillRect(x, 0, 1, TILE);
    }
    ctx.fillStyle = 'rgba(120,60,30,0.35)';
    ctx.fillRect(5, 3, 2, 5);
    ctx.fillRect(12, 10, 1, 4);
    ctx.fillStyle = shade(0.7);
    ctx.fillRect(0, 15, TILE, 1);
  });
}

export function courtSurface(sheet, w, h, asphalt) {
  return canvas(w * TILE, h * TILE, (ctx) => {
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) sheet.draw(ctx, asphalt, x * TILE, y * TILE);
    ctx.strokeStyle = 'rgba(232,228,216,0.8)';
    ctx.lineWidth = 1;
    const mid = (w * TILE) / 2;
    ctx.strokeRect(4.5, 4.5, w * TILE - 9, h * TILE - 9);
    ctx.strokeRect(mid - 19.5, 4.5, 39, 48);
    ctx.beginPath();
    ctx.arc(mid, 52.5, 19, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mid, 4.5, 84, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  });
}

export function signBoard(text, colour = '#8a3a1e', bg = '#f0e2bd') {
  const probe = canvas(1, 1).getContext('2d');
  probe.font = `bold 14px ${PIXEL}`;
  const w = Math.ceil(probe.measureText(text).width) + 16;
  return canvas(w, 20, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 18, w, 2);
    ctx.font = `bold 14px ${PIXEL}`;
    ctx.fillStyle = colour;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 8, 10);
  });
}

export function paintedWords(text, colour) {
  const probe = canvas(1, 1).getContext('2d');
  probe.font = `bold 11px ${PIXEL}`;
  const w = Math.ceil(probe.measureText(text).width) + 4;
  return canvas(w, 14, (ctx) => {
    ctx.font = `bold 11px ${PIXEL}`;
    ctx.fillStyle = colour;
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.85;
    ctx.fillText(text, 2, 7);
  });
}

export function skyGradient(top, bottom) {
  return canvas(2, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 128);
  });
}

function speckle(ctx, seed, n, colours, w = TILE, h = TILE) {
  let s = seed;
  const next = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colours[Math.floor(next() * colours.length)];
    ctx.fillRect(Math.floor(next() * w), Math.floor(next() * h), 1, 1);
  }
}

export function roadTile() {
  return canvas(TILE, TILE, (ctx) => {
    ctx.fillStyle = '#6f7275';
    ctx.fillRect(0, 0, TILE, TILE);
    speckle(ctx, 7, 22, ['#696c6f', '#777a7c', '#66696b']);
    ctx.fillStyle = 'rgba(30,30,30,0.18)';
    ctx.fillRect(0, 0, 1, TILE);
  });
}

export function sidewalkTile() {
  return canvas(TILE, TILE, (ctx) => {
    ctx.fillStyle = '#cfc6b2';
    ctx.fillRect(0, 0, TILE, TILE);
    speckle(ctx, 3, 30, ['#c4baa5', '#d8d0bd', '#bfb49d']);
    ctx.fillStyle = '#a69b86';
    ctx.fillRect(0, 0, TILE, 1);
    ctx.fillRect(0, 0, 1, TILE);
  });
}
