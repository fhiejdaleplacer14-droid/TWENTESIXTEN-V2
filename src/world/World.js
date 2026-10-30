import * as THREE from 'three';
import stage, { PITCH, DROP } from '../stage/Stage.js';
import { city, span, TILES } from '../art/tiles.js';
import { Sheet, texture, courtSurface, canvas, roadTile, sidewalkTile } from '../stage/paint.js';
import { lambert, solid, ground, house, board, words, awning, sachets as hang, plankFence, chainFence, banderitas, post } from '../stage/build.js';
import * as M from '../stage/models.js';
import settle, { settlePanes } from '../stage/settle.js';

export { city, span, TILES };

export const S = 2;
export const T = 16 * S;
export const SIDE = 2;
export const ROAD = 4;
export const STREET = SIDE * 2 + ROAD;

const PX = M.PX;
const TREE_PX = PX * 3;
const ROOF = new Map([
  [TILES.roof.red, '#a8473a'],
  [TILES.roof.slate, '#56606e'],
  [TILES.roof.gray, '#7d8388'],
  [TILES.roof.tan, '#b08a5a'],
]);
const AWNINGS = new Map([
  [city(23, 11), [23, 24, 25]],
  [city(27, 11), [27, 28, 29]],
]);
const PROPS = new Map([
  [TILES.bench, () => M.bench(31)],
  [TILES.cart, () => M.cart('#c9382f')],
  [TILES.cartGreen, () => M.cart('#3d8a55')],
  [TILES.crates, () => M.crate('#8fc46a')],
  [TILES.crate, () => M.crate('#c9382f')],
  [TILES.box, () => M.box()],
  [TILES.car, () => M.car()],
  [TILES.tires, () => M.tires()],
  [TILES.barrel, () => M.barrel()],
]);
const THINGS = {
  paso: () => M.pot('plain'),
  paso2: () => M.pot('flowers'),
  paso3: () => M.pot('snake'),
  motor: () => M.motorbike(),
  tricycle: () => M.tricycle('#3a5fa8', '#2d4b86', true),
  tricycle_parked: () => M.tricycle('#3a5fa8', '#2d4b86', false),
  tricycle_red: () => M.tricycle('#c2504d', '#9a3a37', false),
};
const TREES = new Map([
  [TILES.tree, 'green'],
  [TILES.treeDark, 'dark'],
  [TILES.treeDry, 'dry'],
]);
const trees = new Map();

export default class World {
  constructor(scene, cols, rows) {
    this.scene = scene;
    this.cols = cols;
    this.rows = rows;
    this.solids = scene.physics.add.staticGroup();
    this.interactables = [];
    this.people = [];
    this.cast = {};
    this.houses = [];
    this.draw = !stage.built;
    stage.built = true;
    this.g = stage.static;
    this.sheet = new Sheet(scene.textures.get('city').getSourceImage());
    this.textures = new Map();
  }

  tileTexture(frame) {
    const key = `tile${frame}`;
    if (!this.textures.has(key)) this.textures.set(key, texture(this.sheet.tile(frame)));
    return this.textures.get(key);
  }

  gridTexture(rows) {
    const key = JSON.stringify(rows);
    if (!this.textures.has(key)) this.textures.set(key, texture(this.sheet.grid(rows)));
    return this.textures.get(key);
  }

  finish() {
    if (!this.draw) return;
    stage.panes = settlePanes(this.g, stage.panes);
    stage.settled = settle(this.g);
  }

  place(model, x, z, { turn = 0, scale = PX, origin = null, y = null } = {}) {
    const mesh = model.toMesh(scale, { origin });
    mesh.position.set(x, y ?? stage.groundAt(z), z);
    mesh.rotation.y = turn;
    this.g.add(mesh);
    return mesh;
  }

  standee(source, x, z, wTiles, hTiles) {
    const map = texture(source);
    const geo = new THREE.PlaneGeometry(wTiles, hTiles);
    geo.translate(0, hTiles / 2, 0);
    const mesh = new THREE.Mesh(geo, lambert({ map, alphaTest: 0.5, side: THREE.DoubleSide }));
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
    mesh.castShadow = true;
    mesh.position.set(x, 0, z);
    mesh.rotation.x = -PITCH;
    this.g.add(mesh);
  }

  fill(c, r, w, h, frame, depth = 0) {
    if (this.draw) ground(this.g, c, r, c + w, r + h, 0.002 + depth * 0.003, this.tileTexture(frame));
  }

  flat(c, r, rows, depth = 0.5) {
    if (this.draw) ground(this.g, c, r, c + rows[0].length, r + rows.length, 0.004 + depth * 0.003, this.gridTexture(rows), false);
  }

  street(r, { crossings = [] } = {}) {
    if (!this.draw) return;
    const top = r + SIDE;
    const bottom = top + ROAD;
    stage.roads.push([top, bottom]);
    const x0 = -30;
    const x1 = this.cols + 30;
    const walk = this.paintTexture('sidewalk', sidewalkTile);
    ground(this.g, x0, r, x1, top, 0.006, walk);
    ground(this.g, x0, bottom, x1, bottom + SIDE, 0.006, walk);
    ground(this.g, x0, top, x1, bottom, -DROP, this.paintTexture('road', roadTile));
    for (const [z, side] of [[top, -1], [bottom, 1]]) {
      const curb = solid(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, DROP + 0.02, 0.16), lambert({ color: '#d9d2c2' })));
      curb.position.set((x0 + x1) / 2, -DROP / 2 + 0.01, z + side * 0.08);
      this.g.add(curb);
    }
    const marks = [];
    for (let x = x0 + 0.5; x < x1; x += 2) {
      if (!crossings.some((c) => Math.abs(x + 0.5 - c) < 2)) marks.push([x + 0.5, top + ROAD / 2, 1, 0.07, '#efe7c8']);
    }
    const stripes = [];
    for (const c of crossings) {
      for (let k = 0; k < 7; k++) marks.push([c, top + 0.32 + k * 0.56, 2, 0.28, '#eeeae0']);
      for (let i = -6; i < 6; i++) for (const [z, side] of [[top, -1], [bottom, 1]]) stripes.push([c + i * 0.5 + 0.25, z + side * 0.08, i % 2 ? '#2b2b2b' : '#f2efe6']);
    }
    for (let x = 6 + (r % 7); x < this.cols; x += 17) marks.push([x, top + ROAD * 0.7, 0.62, 0.62, '#4a4a48', true]);
    for (let x = 3 + (r % 5); x < this.cols; x += 11) for (const [gx, gz] of [[x, bottom - 0.15], [x + 5, top + 0.15]]) this.grate(marks, gx, gz);
    this.paintMarks(marks);
    if (stripes.length) {
      const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, DROP + 0.03, 0.17), lambert({}), stripes.length);
      stripes.forEach(([x, z, colour], i) => {
        blocks.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, -DROP / 2 + 0.01, z));
        blocks.setColorAt(i, new THREE.Color(colour));
      });
      blocks.receiveShadow = true;
      this.g.add(blocks);
    }
  }

  grate(marks, x, z) {
    marks.push([x, z, 0.62, 0.22, '#8d9090']);
    for (let i = 0; i < 5; i++) marks.push([x - 0.24 + i * 0.12, z, 0.05, 0.14, '#3f4244', false, 0.003]);
  }

  paintMarks(marks) {
    const square = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const round = new THREE.CircleGeometry(0.5, 12).rotateX(-Math.PI / 2);
    for (const [geo, keep] of [[square, (m) => !m[5]], [round, (m) => m[5]]]) {
      const list = marks.filter(keep);
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(geo, lambert({ polygonOffset: true, polygonOffsetFactor: -2 }), list.length);
      list.forEach(([x, z, w, d, colour, , lift = 0], i) => {
        mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, -DROP + 0.004 + lift, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, d)));
        mesh.setColorAt(i, new THREE.Color(colour));
      });
      mesh.receiveShadow = true;
      this.g.add(mesh);
    }
  }

  paintTexture(key, paint) {
    if (!this.textures.has(key)) this.textures.set(key, texture(paint()));
    return this.textures.get(key);
  }

  creek(top) {
    if (!this.draw) return;
    const ripples = canvas(64, 64, (ctx) => {
      ctx.fillStyle = '#3d7f8f';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = 'rgba(191,230,234,0.45)';
      for (let i = 0; i < 26; i++) ctx.fillRect((i * 37) % 64, (i * 23) % 64, 4 + (i % 5), 1);
    });
    const map = texture(ripples);
    const water = ground(this.g, -20, top, this.cols + 20, this.rows + 6, -0.06, map);
    map.repeat.set(0.5, 0.5);
    water.material = new THREE.MeshLambertMaterial({ map, transparent: true, opacity: 0.92 });
    stage.updaters.push((time) => map.offset.set(time * 0.02, Math.sin(time * 0.6) * 0.02));
    ground(this.g, -20, top - 0.3, this.cols + 20, top + 0.15, -0.02, this.tileTexture(city(10, 26)));
  }

  block(c, r, w, h) {
    this.solids.add(this.scene.add.zone((c + w / 2) * T, (r + h / 2) * T, w * T, h * T));
  }

  fence(c, r, n, h = 0.9) {
    if (this.draw) plankFence(this.g, this.sheet, TILES.fence, c, c + n, r + 0.5, h);
    this.block(c, r, n, 1);
  }

  shadow() {
    return null;
  }

  longShadow(img) {
    return img;
  }

  prop(c, baseR, rows, solidFoot = true) {
    const w = rows[0].length;
    if (this.draw) {
      const model = PROPS.get(rows);
      if (model) this.place(model(), c + w / 2, baseR - 0.35);
      else this.standee(this.sheet.grid(rows), c + w / 2, baseR - 0.2, w, rows.length);
    }
    if (solidFoot) this.block(c + 0.1, baseR - 0.35, w - 0.2, 0.35);
  }

  tile(c, r, frame) {
    if (!this.draw) return;
    if (frame === TILES.bush || frame === TILES.bushDark) this.place(M.bush(frame === TILES.bushDark), c + 0.5, r + 0.8);
    else this.flat(c, r, [[frame]]);
  }

  stamp(c, r, rows, depth) {
    if (!this.draw) return;
    if (rows === TILES.pool) this.place(M.fountain(), c + 1.5, r + 1.4);
    else if (rows === TILES.laundry) this.place(M.laundry(), c + 4, r + 0.8);
    else this.flat(c, r, rows, depth);
  }

  tree(c, baseR, rows = TILES.tree, scale = 1) {
    if (!this.draw) return;
    const kind = TREES.get(rows) || 'green';
    const shape = Math.abs(Math.round(c * 7 + baseR * 3)) % 5;
    const key = `${kind}${shape}`;
    if (!trees.has(key)) trees.set(key, M.tree(shape + 1, 0.6, kind).toMesh(TREE_PX));
    const mesh = trees.get(key).clone();
    mesh.position.set(c + 0.5, 0, baseR - 0.5);
    mesh.rotation.y = c * 1.7;
    mesh.scale.setScalar(scale);
    this.g.add(mesh);
  }

  bigTree(c, baseR) {
    if (this.draw) this.place(M.tree(42, 1.05, 'green'), c, baseR - 0.4, { scale: TREE_PX, turn: 0.4 });
  }

  flagpole(c, baseR) {
    if (this.draw) this.place(M.flagpole(), c, baseR - 0.2, { origin: { x: 0, y: 0, z: 0 } });
  }

  cat(c, baseR) {
    if (this.draw) this.place(M.barrel(true), c, baseR - 0.3);
    this.block(c - 0.3, baseR - 0.35, 0.6, 0.35);
  }

  court({ c, r, w, h }) {
    if (!this.draw) return;
    ground(this.g, c, r, c + w, r + h, 0.016, texture(courtSurface(this.sheet, w, h, TILES.asphalt)), false);
    this.place(M.hoop(), c + w / 2, r + 0.3, { origin: { x: 0, y: 0, z: 0 } });
    for (const x of [c, c + w]) chainFence(this.g, x, r, x, r + h, 1.4);
  }

  pole(c, baseR) {
    const x = c + 0.3;
    const z = baseR - 0.1;
    if (this.draw) {
      this.place(M.lampPost(), x, z, { origin: { x: 0, y: 0, z: 0 } });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
      const lamp = { x, y: 51 * PX, z: z + 14 * PX, bulb };
      bulb.position.set(lamp.x, lamp.y - 0.04, lamp.z);
      this.g.add(bulb);
      stage.lamps.push(lamp);
    }
    this.block(x - 0.12, z - 0.12, 0.24, 0.24);
    return new THREE.Vector3(x, 3.42, z);
  }

  wire(tops, { flags = false, across = STREET - 0.35 } = {}) {
    if (!this.draw) return;
    const ends = [new THREE.Vector3(-25, tops[0].y, tops[0].z), ...tops, new THREE.Vector3(this.cols + 25, tops[0].y, tops[0].z)];
    const strings = [];
    for (let i = 0; i < ends.length - 1; i++) {
      strings.push([ends[i], ends[i + 1], 0.35, flags]);
      const lower = (v, dy, dz) => v.clone().add(new THREE.Vector3(0, dy, dz));
      strings.push([lower(ends[i], -0.25, 0.05), lower(ends[i + 1], -0.25, 0.05), 0.55, false], [lower(ends[i], -0.45, -0.04), lower(ends[i + 1], -0.45, -0.04), 0.8, false]);
    }
    if (flags) {
      for (let i = 0; i < tops.length - 1; i++) {
        const far = new THREE.Vector3((tops[i].x + tops[i + 1].x) / 2, 2.1, tops[i].z + across);
        post(this.g, far.x, far.z, 2.15);
        strings.push([tops[i], far, 0.6], [far, tops[i + 1], 0.6]);
      }
    }
    stage.updaters.push(banderitas(this.g, strings));
  }

  roof(c, r, w, h, frame) {
    if (this.draw) house(this.g, this.sheet, { c, w, z: r + h, depth: h, wall: TILES.wall.block, rows: 1.5, roof: ROOF.get(frame) || '#7d8388', rise: 0.7, show: 'back' });
  }

  building(c, w, base, roof, wall, { wallRows = 2, roofRows = 3, front = [], upper = [] } = {}) {
    const stripes = AWNINGS.get(upper[0]);
    const spec = { c, w, z: base, depth: Math.min(5, wallRows + roofRows), rows: wallRows };
    if (this.draw) {
      const built = house(this.g, this.sheet, { ...spec, wall, front, upper: stripes ? [] : upper, roof: ROOF.get(roof), flat: Boolean(stripes), lit: [TILES.window, TILES.shopWindow] });
      stage.panes.push(...built.panes);
      if (stripes) awning(this.g, this.sheet, c, w, base, 2.15, stripes);
    }
    this.houses.push({ ...spec, rise: stripes ? 0.16 : 1.1 });
    this.block(c, base - spec.depth, w, spec.depth);
  }

  sign(c, r, text, color = '#8a3a1e') {
    if (!this.draw) return;
    const width = Math.min(3.2, Math.max(1, text.length * 0.2 + 0.5));
    const h = this.houses.find((b) => c >= b.c && c <= b.c + b.w && r < b.z && r > b.z - b.depth - 0.6);
    if (h) {
      board(this.g, text, c, h.rows - 0.45, h.z + 0.06, width, color);
      return;
    }
    const z = r + 1.4;
    for (const dx of [-width / 2 + 0.1, width / 2 - 0.1]) post(this.g, c + dx, z - 0.05, 1.75, '#5c6467');
    board(this.g, text, c, 1.75, z, width, color);
  }

  arch(c, w, r, text) {
    for (const x of [c, c + w - 0.3]) this.block(x, r - 0.15, 0.3, 0.3);
    if (!this.draw) return;
    const paint = lambert({ color: '#e9dfc6' });
    const trim = lambert({ color: '#3f6fa8' });
    for (const x of [c + 0.15, c + w - 0.15]) {
      const pillar = solid(new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.3), paint));
      pillar.position.set(x, 1.3, r);
      const cap = solid(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), trim));
      cap.position.set(x, 2.67, r);
      this.g.add(pillar, cap);
    }
    const beam = solid(new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.18, 0.24), trim));
    beam.position.set(c + w / 2, 2.62, r);
    this.g.add(beam);
    board(this.g, text, c + w / 2, 2.25, r + 0.14, w + 0.6, '#2f4a6b');
  }

  sachets(c, z) {
    if (this.draw) hang(this.g, c, z);
  }

  paint(c, r, text, color = '#b5372f') {
    if (this.draw) words(this.g, text, color, c, 0.5, Math.floor(r) + 0.57, text.length * 0.17);
  }

  cross(c) {
    const h = this.houses.find((b) => c >= b.c && c <= b.c + b.w);
    if (this.draw && h) this.place(M.cross(), c, h.z - 0.3, { y: h.rows + h.rise * 0.6 });
  }

  thing(key, c, baseR, { solid: foot = 0.5, flip = false } = {}) {
    if (this.draw) {
      if (THINGS[key]) this.place(THINGS[key](), c, baseR - 0.3, { turn: flip ? Math.PI : 0 });
      else {
        const src = this.scene.textures.get(key).getSourceImage();
        this.standee(src, c, baseR - 0.1, src.width / 16, src.height / 16);
      }
    }
    if (foot) this.block(c - foot / 2, baseR - 0.3, foot, 0.3);
  }

  person(id, c, r, texture, scale = S, still = false) {
    const x = c * T;
    const y = r * T;
    const shadow = this.scene.add.ellipse(x, y - 1, 10 * scale, 3 * scale, 0x000000, 0.22);
    const sprite = this.scene.add.sprite(x, y, texture, 'down_0').setOrigin(0.5, 1).setScale(scale);
    const who = { sprite, shadow, spot: this.spot(id, c, r - 0.5, T), x, y, home: { x, y }, still, target: null, timer: 1000 + Math.random() * 3000 };
    this.cast[id] = who;
    this.people.push(who);
    return sprite;
  }

  movePerson(id, c, r) {
    const who = this.cast[id];
    Object.assign(who, { x: c * T, y: r * T, home: { x: c * T, y: r * T }, target: null });
    who.sprite.setPosition(who.x, who.y);
    who.shadow.setPosition(who.x, who.y - 1);
    Object.assign(who.spot, { x: who.x, y: who.y - T / 2 });
  }

  hidePerson(id) {
    const who = this.cast[id];
    who.sprite.setVisible(false);
    who.shadow.setVisible(false);
    who.spot.x = -9999;
    this.people = this.people.filter((p) => p !== who);
  }

  spot(id, c, r, h = T) {
    const it = { id, x: c * T, y: r * T, h };
    this.interactables.push(it);
    return it;
  }

  setWake(wake) {
    const add = (model, x, z, opts = {}) => {
      const mesh = model.toMesh(opts.scale || PX);
      mesh.position.set(x, stage.groundAt(z), z);
      mesh.rotation.y = opts.turn || 0;
      return stage.add(mesh);
    };
    const t = wake.canopy;
    add(M.tent(80), t.c + 2.6, t.r + 1.7);
    add(M.table(), wake.table.c + 0.9, wake.table.r - 0.3);
    wake.chairs.forEach(({ x, y }) => {
      add(M.chair(), x / T, y / T - 0.3, { turn: Math.PI }).material.emissive.set('#5a5048');
    });
    wake.lights.forEach(({ x, y }) => {
      const bulb = stage.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff3c4' })));
      bulb.position.set(x / T, 2.05, y / T + 1.2);
      stage.light(x / T, y / T + 1.6, 1.9, '#ffd9a0', 9, { always: true, distance: 8 });
    });
  }
}
