import World, { T, TILES, city, span, SIDE, ROAD, STREET } from './World.js';
import { t } from '../systems/Lang.js';

export const COLS = 92;
export const ROWS = 50;
export const UPPER = 10;
export const MAIN = UPPER + STREET + 8;
export const BANK = MAIN + STREET + 6;
const SOUTH = STREET - 1;
const COURT = { c: 24, r: UPPER + STREET + 1, w: 14, h: 7 };
const ALLEYS = [13, 49, 70];
const { window: W, shopWindow: SW, door: D } = TILES;
const _ = null;
const px = ([c, r]) => ({ x: c * T, y: r * T });

const NODES = [
  [3, MAIN + SOUTH], [14, MAIN + SOUTH], [30, MAIN + SOUTH], [50, MAIN + SOUTH], [57, MAIN + SOUTH],
  [14, UPPER + SOUTH], [50, UPPER + SOUTH],
  [30, UPPER + 0.7], [11, UPPER + 0.7], [47, UPPER + 0.7],
  [30, BANK + 2], [30, 8.2], [43.5, MAIN + 0.9], [26, MAIN + 0.9],
  [71, MAIN + SOUTH], [88, MAIN + SOUTH], [71, UPPER + SOUTH],
  [69, UPPER + 0.7], [84.5, UPPER + 0.7], [69, 8.4], [84.5, 7.6],
  [77.5, MAIN + 0.9], [63.5, MAIN + 0.9], [86, MAIN + 0.9],
  [-1.5, MAIN + SOUTH], [COLS + 1.5, MAIN + SOUTH], [-1.5, UPPER + 0.7], [COLS + 1.5, UPPER + 0.7],
];
const EDGES = [
  [1, 24], [0, 2, 5, 13], [1, 3, 10, 12, 13], [2, 4, 6, 12], [3, 14, 22],
  [1, 6, 7, 8], [3, 5, 7, 9, 16],
  [5, 6, 8, 9, 11], [5, 7, 26], [6, 7, 17],
  [2], [7], [2, 3, 13], [1, 2, 12],
  [4, 15, 16, 21, 22], [14, 23, 25], [6, 14, 17, 18],
  [9, 16, 18, 19], [16, 17, 20, 27], [17], [18],
  [14, 22, 23], [4, 14, 21], [15, 21],
  [0], [15], [8], [18],
];

const SPOTS = [
  { kind: 'store', need: 'errand', at: [41.6, MAIN + 0.95], node: 12, room: 2, face: 'up' },
  { kind: 'market', need: 'errand', at: [82.6, 6.5], node: 20, room: 3, face: 'up' },
  { kind: 'cart', need: 'hunger', at: [35.9, 9.85], node: 11, room: 1, face: 'left' },
  { kind: 'carinderia', need: 'hunger', at: [75.6, MAIN + 0.95], node: 21, room: 2, face: 'up' },
  { kind: 'bakery', need: 'hunger', at: [85, MAIN + 0.95], node: 23, room: 2, face: 'up' },
  { kind: 'bench', need: 'rest', at: [35.1, 6.8], node: 11, room: 1, face: 'down' },
  { kind: 'bench', need: 'rest', at: [63.4, 8.8], node: 19, room: 1, face: 'down' },
  { kind: 'court', need: 'fun', at: [36.2, COURT.r + 4.35], node: 13, room: 2, face: 'left' },
  { kind: 'lot', need: 'fun', at: [45.6, 7.4], node: 9, room: 1, face: 'right', kids: true },
  { kind: 'creek', need: 'calm', at: [26, BANK + 2.55], node: 10, room: 1, face: 'down' },
  { kind: 'chapel', need: 'calm', at: [68.2, 7.5], node: 19, room: 2, face: 'up' },
  { kind: 'hangout', need: 'social', at: [55.2, MAIN + 0.95], node: 4, room: 3, face: 'down' },
  { kind: 'hangout', need: 'social', at: [18.6, MAIN + 1], node: 13, room: 2, face: 'down' },
  { kind: 'hangout', need: 'social', at: [8.6, UPPER + 0.8], node: 8, room: 2, face: 'down' },
];

const WAKE = {
  seat: { x: 8.75 * T, y: (MAIN + 0.45) * T - 13 },
  beside: { x: 9.65 * T, y: (MAIN + 0.45) * T + 3 },
  canopy: { c: 3, r: MAIN - 1.15, rows: [span(city(23, 11), city(24, 11), city(25, 11), 5)] },
  table: { c: 2.4, r: MAIN + 0.5, rows: TILES.crates },
  people: { cora: [4.6, MAIN + 0.95], tonyo: [7, MAIN + 1.05], linda: [3.5, MAIN + 2], mila: [2.9, MAIN + 1.25], berto: [11, MAIN + 1.3] },
  chairs: [[4.6, 1.9], [5.9, 1.9], [7.2, 1.9], [8.5, 1.9], [9.8, 1.9], [5.2, 2.75], [6.5, 2.75], [7.8, 2.75], [9.1, 2.75]].map(([c, r]) => px([c, MAIN + r])),
  lights: [[5.5, MAIN - 0.9], [3.2, MAIN - 0.2], [8, MAIN - 0.2]].map(px),
  slots: [[4, 3.3], [5.4, 3.5], [6.8, 3.3], [8.2, 3.5], [9.6, 3.3], [11, 3.5], [12.2, 2.4], [3, 2.9], [10.6, 2.3]].map(([c, r]) => px([c, MAIN + r])),
};

export function buildNeighborhood(scene) {
  const w = new World(scene, COLS, ROWS);
  ground(w);
  northSide(w);
  middleBlock(w);
  court(w);
  streetFurniture(w);
  southSide(w);
  fiesta(w);
  people(w);
  w.finish();
  return {
    world: w,
    spawn: { x: 5.5 * T, y: (MAIN + 1.6) * T },
    wake: WAKE,
    places: {
      court: { x: COURT.c * T, y: COURT.r * T, w: COURT.w * T, h: COURT.h * T },
      streets: [
        { x: 1 * T, y: (MAIN + 0.5) * T, w: (COLS - 2) * T, h: (STREET - 0.8) * T },
        { x: 1 * T, y: (UPPER + 0.5) * T, w: (COLS - 2) * T, h: (STREET - 0.8) * T },
      ],
      lot: { x: 41 * T, y: 4 * T, w: 16 * T, h: 4.6 * T },
      smoke: [[33.5, 9.3], [79.9, 5.2], [86.9, 5.2]].map(px),
      tree: { x: 48.9 * T, y: 6 * T },
      bushes: [[2.6, MAIN - 0.2], [22.7, 4.4], [43.9, 7.4], [19.5, BANK + 3], [54.9, 4.8], [62.4, 8], [89.6, 8.6]].map(px),
      walk: { nodes: NODES.map(px), edges: EDGES },
      spots: SPOTS.map((s) => ({ ...s, ...px(s.at), users: [] })),
      doors: { nena: { ...px([63.5, MAIN + 0.15]), node: 22 }, pisonet: { ...px([53.5, MAIN + 0.15]), node: 4 } },
      lanes: [
        { y: (MAIN + SIDE + 1.1) * T, dir: -1, from: (COLS + 3) * T, to: -3 * T, main: true },
        { y: (UPPER + SIDE + 3.1) * T, dir: 1, from: -3 * T, to: (COLS + 3) * T },
        { y: (UPPER + SIDE + 1.1) * T, dir: -1, from: (COLS + 3) * T, to: -3 * T },
      ],
      roads: [UPPER, MAIN].map((r) => ({ y: (r + SIDE) * T, h: ROAD * T })),
      hens: { x: 18 * T, y: (MAIN + SOUTH - 0.7) * T, w: 38 * T, h: 1.3 * T },
      loose: [
        { kind: 'bucket', c: 11.6, r: MAIN + 1.1 },
        { kind: 'chair', c: 40.3, r: MAIN + 1.2, turn: 0.3 },
        { kind: 'chair', c: 47.6, r: MAIN + 1.3, turn: -0.4 },
        { kind: 'box', c: 48.6, r: MAIN + 0.8 },
        { kind: 'bin', c: 24.3, r: MAIN + 1.2 },
        { kind: 'redBucket', c: 66.4, r: MAIN + 1.1 },
        { kind: 'chair', c: 80.2, r: MAIN + 1.2, turn: 0.2 },
        { kind: 'bin', c: 88.7, r: MAIN + 1.4 },
        { kind: 'bucket', c: 27.5, r: MAIN + SOUTH + 0.2 },
        { kind: 'bin', c: 10.5, r: UPPER + 1.4 },
        { kind: 'chair', c: 72.4, r: UPPER + 1.3, turn: 2.8 },
      ],
      ball: { x: 14.2 * T, y: (MAIN + 1.4) * T },
      radio: { x: 43.5 * T, y: (MAIN - 0.3) * T },
      sidewalks: [UPPER, MAIN].flatMap((r) => [(r + 1) * T, (r + SOUTH) * T]),
    },
  };
}

function ground(w) {
  let from = -20;
  for (const r of [UPPER, MAIN]) {
    w.fill(-30, from, COLS + 60, r + SIDE - from, TILES.grass);
    from = r + SIDE + ROAD;
  }
  w.fill(-30, from, COLS + 60, BANK + 4 - from, TILES.grass);
  w.fill(-30, ROWS + 6, COLS + 60, 20, TILES.grass);
  w.street(UPPER, { crossings: [14.5, 30, 50.5, 71.5] });
  w.street(MAIN, { crossings: [14.5, 30, 50.5, 71.5] });
  ALLEYS.forEach((c) => w.fill(c, UPPER + STREET, 2, MAIN - UPPER - STREET, TILES.concrete, 1.5));
  w.fill(22, 3, 16, 7, TILES.paveTan, 1);
  w.fill(2, 7, 18, 3, TILES.paveTan, 1);
  w.fill(62, 7, 14, 3, TILES.paveTan, 1);
  w.fill(78, 3, 13, 7, TILES.paveTan, 1);
  w.stamp(47.4, 5.2, TILES.dirtPatch, 0.5);
  for (let r = MAIN + STREET; r < BANK + 1; r++) w.stamp(29, r, [[city(10, 26), city(12, 26)]], 0.5);
  w.stamp(29, BANK + 1, [[city(10, 27), city(12, 27)]], 0.5);
  w.creek(BANK + 4);
}

function northSide(w) {
  const kinds = [TILES.tree, TILES.treeDark, TILES.tree, TILES.treeDry, TILES.treeDark];
  for (let i = 0; i * 2.4 < COLS; i++) w.tree(i * 2.4 - 0.3, 2.3 + (i % 3) * 0.3, kinds[i % kinds.length]);

  w.building(4, 14, 7, TILES.roof.tan, TILES.wall.tan, {
    wallRows: 3,
    roofRows: 2,
    upper: [_, W, W, _, W, W, _, _, W, W, _, W, W, _],
    front: [_, W, W, _, _, _, D, D, _, _, _, W, W, _],
  });
  w.sign(11, 4.25, t('signs.school'), '#3a5a40');
  w.block(0, 0, 20, 7);
  w.fence(2, 9, 8);
  w.fence(12, 9, 8);
  w.block(0, 7, 2, 3);
  w.block(20, 0, 2, 10);
  w.flagpole(9.5, 8.6);
  w.block(9.3, 8.3, 0.4, 0.3);
  w.spot('flagpole', 9.5, 8.2, 110);
  w.tile(2.3, 7.6, TILES.bush, 3);
  w.tile(17.9, 7.6, TILES.bushDark, 3);
  w.tree(20.5, 10, TILES.treeDark);

  w.block(22, 0, 16, 3);
  w.stamp(28.5, 4.5, TILES.pool, 2);
  w.block(28.6, 4.7, 2.8, 2.5);
  w.spot('fountain', 30, 7.6, 20);
  w.prop(23.6, 6.6, TILES.bench);
  w.prop(34.4, 6.6, TILES.bench);
  w.prop(33, 9.5, TILES.cart);
  [[22.2, 5], [36.8, 5], [22.2, 9.7], [36.8, 9.7]].forEach(([c, r]) => {
    w.tree(c, r, TILES.tree);
    w.block(c + 0.2, r - 0.5, 0.6, 0.5);
  });
  w.block(38, 0, 2, 10);
  w.tree(38.5, 10, TILES.treeDry);

  w.block(40, 0, 18, 3);
  w.fence(40, 9, 6);
  w.fence(48, 9, 10);
  w.block(58, 0, 4, 10);
  w.tree(58.4, 10, TILES.tree);
  w.tree(60.2, 9.6, TILES.treeDark);
  w.bigTree(48.9, 6.3);
  w.block(48.4, 5.8, 1, 0.5);
  w.spot('tree', 48.9, 6.7, 40);
  w.prop(51.5, 7.4, TILES.tires);
  [[41, 4.2], [43.5, 7.2], [54.5, 4.6], [56, 7.6]].forEach(([c, r], i) => w.tile(c, r, i % 2 ? TILES.bushDark : TILES.bush, 3));

  w.building(64, 10, 7, TILES.roof.red, TILES.wall.tan, {
    wallRows: 3,
    roofRows: 2,
    upper: [_, W, _, _, _, _, _, _, W, _],
    front: [_, W, _, _, D, D, _, _, W, _],
  });
  w.cross(69);
  w.block(62, 0, 14, 7);
  w.prop(62.4, 8.6, TILES.bench);
  w.prop(73.6, 8.6, TILES.bench);
  w.tile(62.1, 7.2, TILES.bushDark, 3);
  w.tile(74.9, 7.2, TILES.bush, 3);
  w.spot('chapel', 69, 7.1, 70);
  w.block(76, 0, 2, 10);
  w.tree(76.5, 10, TILES.treeDry);

  w.block(78, 0, 13, 3);
  w.sign(84.5, 3.1, t('signs.market'), '#3a5a40');
  w.prop(79.4, 5.4, TILES.cartGreen);
  w.prop(80.6, 5.3, TILES.crates);
  w.prop(83.9, 5.3, TILES.crate);
  w.prop(85, 5.3, TILES.crates);
  w.prop(87.4, 5.4, TILES.cart);
  w.prop(88.6, 5.3, TILES.box);
  w.prop(78.6, 8.6, TILES.crates);
  w.prop(88.4, 8.6, TILES.crate);
  w.prop(89.5, 8.5, TILES.barrel);
  w.spot('market', 84.9, 4.9, 30);
  w.block(91, 0, 1, 10);
}

function middleBlock(w) {
  const back = UPPER + STREET;
  const deep = MAIN - back;
  [0, ...ALLEYS.map((c) => c + 2)].forEach((from, i) => {
    const to = ALLEYS[i] ?? COLS;
    w.fence(from, back, to - from);
    if (i !== 1) w.block(from, back, to - from, deep);
  });
  w.block(15, back, COURT.c - 15, deep);
  w.block(COURT.c + COURT.w, back, 49 - COURT.c - COURT.w, deep);
  const yards = [[1, TILES.tree], [10.6, TILES.treeDry], [15.4, TILES.treeDark], [22.6, TILES.tree], [38.2, TILES.treeDark], [47.4, TILES.tree], [51.3, TILES.treeDry], [59.2, TILES.treeDark], [68.8, TILES.tree], [72.1, TILES.treeDark], [81.4, TILES.treeDry], [90.8, TILES.tree]];
  yards.forEach(([c, kind]) => w.tree(c, back + 3.2, kind));
  w.stamp(2.5, back + 1.3, TILES.laundry, 3);
  w.stamp(61, back + 1.3, TILES.laundry, 3);

  w.building(2, 10, MAIN, TILES.roof.red, TILES.wall.tan, { front: [_, W, _, D, _, W, W, _, W, _] });
  w.spot('home_door', 5.5, MAIN - 0.3, 40);
  w.prop(8.1, MAIN + 0.45, TILES.bench);
  w.spot('lola_bench', 9.1, MAIN + 0.2, 20);
  w.tile(2.1, MAIN - 0.55, TILES.bush, 3);
  w.tile(11, MAIN - 0.55, TILES.bushDark, 3);
  w.tile(12, MAIN - 0.55, TILES.bush, 3);

  w.building(16, 7, MAIN, TILES.roof.gray, TILES.wall.block, { front: [_, W, D, _, W, _, _] });
  w.prop(21.3, MAIN + 0.3, TILES.tires);
  w.cat(22.7, MAIN + 0.25);
  w.spot('tires', 21.3, MAIN + 0.3, 20);
  w.tile(15.1, MAIN - 0.55, TILES.bushDark, 3);

  w.building(39, 9, MAIN, TILES.roof.slate, TILES.wall.brick, {
    wallRows: 3,
    roofRows: 2,
    front: [_, _, _, _, D, _, SW, SW, _],
    upper: span(city(23, 11), city(24, 11), city(25, 11), 9),
  });
  w.sign(43.5, MAIN - 2.8, t('signs.store'));
  w.prop(39.2, MAIN + 0.35, TILES.crates);
  w.prop(46.6, MAIN + 0.35, TILES.crate);
  w.prop(47.5, MAIN + 0.3, TILES.box);

  w.building(52, 7, MAIN, TILES.roof.tan, TILES.wall.brick, { front: [_, D, _, SW, SW, _, _] });
  w.sign(55.5, MAIN - 1.85, t('signs.pisonet'), '#2f4a6b');
  w.spot('pisonet', 55.9, MAIN - 0.2, 40);
  w.tile(58.6, MAIN - 0.55, TILES.bush, 3);

  w.building(61, 8, MAIN, TILES.roof.slate, TILES.wall.tan, { front: [_, W, D, _, W, W, _, _] });
  w.tile(67.2, MAIN - 0.55, TILES.bushDark, 3);
  w.tile(69, MAIN - 0.55, TILES.bush, 3);

  w.building(73, 8, MAIN, TILES.roof.red, TILES.wall.block, {
    wallRows: 3,
    roofRows: 2,
    front: [_, SW, SW, _, D, _, SW, _],
    upper: span(city(27, 11), city(28, 11), city(29, 11), 8),
  });
  w.sign(77, MAIN - 2.8, t('signs.carinderia'));
  w.prop(73.2, MAIN + 0.45, TILES.bench);
  w.spot('carinderia', 74.2, MAIN + 0.2, 20);

  w.building(83, 8, MAIN, TILES.roof.tan, TILES.wall.brick, { front: [_, D, _, SW, SW, SW, _, _] });
  w.sign(87.5, MAIN - 1.85, t('signs.bakery'));
  w.spot('bakery', 87.5, MAIN - 0.2, 40);
  w.prop(90, MAIN + 0.3, TILES.box);
  w.tile(81.6, MAIN - 0.55, TILES.bush, 3);
}

function court(w) {
  const { c, r, w: cw } = COURT;
  w.court(COURT);
  w.block(c + cw / 2 - 0.2, r + 0.5, 0.4, 0.3);
  w.spot('court', c + cw / 2, r + 1.1, 76);
  w.prop(c + cw - 2.4, r + 4.2, TILES.bench);
  w.spot('court_bench', c + cw - 1.4, r + 4, 20);
}

function streetFurniture(w) {
  w.wire([12, 23, 38, 48, 58.8, 69, 81.2, 90.9].map((c) => w.pole(c, MAIN + 0.4)), { flags: true });
  w.wire([4.5, 20.5, 37.9, 53, 68.4, 84].map((c) => w.pole(c, UPPER + STREET - 0.5)));
  w.arch(ALLEYS[0] - 0.2, 2.4, MAIN - 0.1, t('signs.arch'));
  [[26.5, MAIN + STREET - 0.4], [63, MAIN + STREET - 0.4], [41, UPPER + STREET - 0.4], [77, UPPER + 1.4]].forEach(([c, r], i) => w.thing('motor', c, r, { solid: 1.2, flip: i % 2 === 1 }));
  w.prop(34, MAIN + SIDE + ROAD - 0.15, TILES.car);
  w.spot('car', 35.5, MAIN + SIDE + ROAD - 0.8, 40);
}

function southSide(w) {
  const r = MAIN + STREET;
  w.fence(0, r, 29, 0.6);
  w.fence(31, r, COLS - 31, 0.6);
  w.block(0, r, 29, BANK - r);
  w.block(31, r, COLS - 31, BANK - r);
  const roofs = [[2, 11, 'slate'], [15, 12, 'tan'], [33, 12, 'red'], [47, 11, 'gray'], [61, 12, 'tan'], [76, 13, 'slate']];
  roofs.forEach(([c, wide, colour]) => w.roof(c, r + 1, wide, 3, TILES.roof[colour]));
  const gaps = [[0.2, TILES.treeDry], [13.4, TILES.tree], [27.4, TILES.treeDark], [31.2, TILES.tree], [45.4, TILES.treeDry], [58.9, TILES.treeDark], [73.6, TILES.tree], [74.8, TILES.treeDry], [89.8, TILES.treeDark]];
  gaps.forEach(([c, kind]) => w.tree(c, r + 3.6, kind, 0.6));
  [[6, TILES.bush], [20.5, TILES.bushDark], [40, TILES.bush], [52.3, TILES.bushDark], [66, TILES.bush], [80.4, TILES.bushDark]].forEach(([c, bush]) => w.tile(c, r - 0.5, bush, 3));

  w.block(0, BANK, 17, 4);
  w.block(43, BANK, COLS - 43, 4);
  w.block(0, BANK + 4, COLS, ROWS - BANK - 4);
  const kinds = [TILES.treeDark, TILES.tree, TILES.treeDark, TILES.treeDry];
  for (let i = 0; i < 8; i++) w.tree(i * 2, BANK + 2.2 + (i % 3) * 0.8, kinds[i % 4]);
  for (let i = 0; 43.2 + i * 2 < COLS; i++) w.tree(43.2 + i * 2, BANK + 2.2 + (i % 3) * 0.8, kinds[(i + 1) % 4]);
  for (let i = 0; i * 2.6 < COLS; i++) if (i * 2.6 < 15 || i * 2.6 > 45) w.tree(i * 2.6, ROWS + 0.2 - (i % 3) * 0.5, kinds[i % 4], 0.6);
  w.prop(25, BANK + 2.4, TILES.bench);
  w.tile(19, BANK + 2.7, TILES.bush, 3);
  w.tile(38.5, BANK + 0.6, TILES.bushDark, 3);
  w.spot('creek', 30, BANK + 3.6, 20);
}

function fiesta(w) {
  [['paso2', 2.9], ['paso', 4.4], ['paso3', 10.6], ['paso', 23.4], ['paso2', 64.4], ['paso3', 66.2], ['paso', 68.3], ['paso2', 81.9]].forEach(([key, c]) =>
    w.thing(key, c, MAIN + 0.3, { solid: 0.4 }),
  );
  ['paso3', 'paso'].forEach((key, i) => w.thing(key, 3.2 + i * 14.2, UPPER + 0.35, { solid: 0.4 }));
  [45.5, 46.5, 42.4].forEach((c) => w.sachets(c, MAIN));
  w.thing('motor', 16.9, MAIN + 0.75, { solid: 1.2 });
  w.thing('tricycle_parked', 58.9, MAIN + 0.95, { solid: 1.7 });
  w.thing('tricycle_red', 61.1, MAIN + 0.95, { solid: 1.7, flip: true });
  w.sign(60, MAIN - 1.6, t('signs.toda'), '#2f4a6b');
  w.paint(44, MAIN + STREET + 0.5, t('signs.noPee'));
  w.paint(15, UPPER + STREET + 0.5, t('signs.noLoitering'), '#2f4a6b');
}

function people(w) {
  w.person('lola', 7.4, MAIN + 0.6, 'lola');
  w.person('tonyo', 20.3, MAIN + 0.7, 'tonyo');
  w.person('cora', 43.5, MAIN + 0.25, 'cora');
  w.person('linda', 12.6, UPPER + 0.7, 'linda');
  w.person('vendor', 34.7, 9.6, 'vendor');
  w.person('kid', 24.6, 6.8, 'kid', 1.5, true);
  w.person('rosa', 81.9, 4.6, 'rosa');
  w.person('karding', 86.4, 4.6, 'karding');
  w.person('mila', 77.5, MAIN + 0.25, 'mila');
  w.person('berto', 84.5, MAIN + 0.25, 'berto');
  w.spot('cat', 22.7, MAIN - 0.6, 30);
}
