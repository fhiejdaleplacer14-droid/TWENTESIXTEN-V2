import * as THREE from 'three';
import { city } from '../art/tiles.js';
import { texture, tinRoof, signBoard, paintedWords } from './paint.js';
import Voxels from './voxel.js';
import { PX } from './models.js';

export const lambert = (opts) => new THREE.MeshLambertMaterial(opts);

export function solid(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const grounds = new WeakMap();
export function ground(group, x0, z0, x1, z1, y, map, repeat = true) {
  const w = x1 - x0;
  const d = z1 - z0;
  const geo = new THREE.PlaneGeometry(w, d);
  if (repeat) {
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
  }
  if (!grounds.has(map)) grounds.set(map, lambert({ map }));
  const mesh = new THREE.Mesh(geo, grounds.get(map));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x0 + w / 2, y, z0 + d / 2);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function house(group, sheet, { c, w, z, depth, wall, rows = 2, front = [], upper = [], roof = '#a8473a', flat = false, rise = 1.1, show = 'front', lit = [] }) {
  const lines = rows === 3 ? [5, 6, 8] : [5, 8];
  const face = lines.map((r) => Array.from({ length: w }, (_, i) => city(wall + (i === 0 ? 1 : i === w - 1 ? 3 : 2), r)));
  const facade = sheet.grid(face);
  const ctx = facade.getContext('2d');
  const shown = Math.min(rows, lines.length);
  [upper, front].forEach((row, i) => row.forEach((f, dc) => f !== null && f !== undefined && sheet.draw(ctx, f, dc * 16, (shown - 2 + i) * 16)));
  const sides = lambert({ map: texture(sheet.grid(lines.map((r) => Array.from({ length: Math.max(1, Math.round(depth)) }, () => city(wall + 2, r))))) });
  const box = solid(walls(w, rows, depth, [sides, sides, null, null, show === 'front' ? lambert({ map: texture(facade) }) : sides, sides]));
  box.position.set(c + w / 2, rows / 2, z - depth / 2);
  group.add(box);

  const panes = [];
  [upper, front].forEach((row, i) =>
    row.forEach((f, dc) => {
      if (!lit.includes(f)) return;
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ color: '#ffc766', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      pane.position.set(c + dc + 0.5, i === 1 ? 0.5 : 1.5, z + 0.02);
      group.add(pane);
      panes.push(pane);
    }),
  );

  if (flat) {
    const slab = solid(new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.16, depth + 0.12), lambert({ color: '#a39d92' })));
    slab.position.set(c + w / 2, rows + 0.08, z - depth / 2);
    group.add(slab);
  } else {
    group.add(gable(c, z - depth, w, depth, rows, rise, texture(tinRoof(roof)), sides));
  }
  return { box, panes, c, w, z, depth, rows, rise: flat ? 0.16 : rise };
}

function walls(w, h, d, faces) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const index = geo.index.array;
  const materials = [...new Set(faces.filter(Boolean))];
  const order = [];
  geo.clearGroups();
  materials.forEach((m, mi) => {
    const start = order.length;
    faces.forEach((f, i) => f === m && order.push(...index.slice(i * 6, i * 6 + 6)));
    geo.addGroup(start, order.length - start, mi);
  });
  geo.setIndex(order);
  return new THREE.Mesh(geo, materials);
}

function gable(x0, z0, w, depth, h, rise, roofMap, wallMat) {
  const ov = 0.3;
  const zm = z0 + depth / 2;
  const a = { x: x0 - ov, z: z0 - ov };
  const b = { x: x0 + w + ov, z: z0 + depth + ov };
  const yE = h - 0.12;
  const yR = h + rise;
  const slope = Math.hypot(depth / 2 + ov, rise + 0.12);
  const slopes = [
    [[a.x, yE, b.z, 0, 0], [b.x, yE, b.z, b.x - a.x, 0], [b.x, yR, zm, b.x - a.x, slope], [a.x, yR, zm, 0, slope]],
    [[b.x, yE, a.z, 0, 0], [a.x, yE, a.z, b.x - a.x, 0], [a.x, yR, zm, b.x - a.x, slope], [b.x, yR, zm, 0, slope]],
  ];
  const pos = [];
  const uvs = [];
  for (const q of slopes) {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(q[i][0], q[i][1], q[i][2]);
      uvs.push(q[i][3], q[i][4]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const group = new THREE.Group();
  group.add(solid(new THREE.Mesh(geo, lambert({ map: roofMap, side: THREE.DoubleSide }))));
  const ends = new THREE.BufferGeometry();
  const ep = [];
  const eu = [];
  for (const x of [x0, x0 + w]) {
    ep.push(x, h, z0, x, h, z0 + depth, x, yR - 0.05, zm);
    eu.push(0, 0, depth, 0, depth / 2, rise);
  }
  ends.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
  ends.setAttribute('uv', new THREE.Float32BufferAttribute(eu, 2));
  ends.computeVertexNormals();
  const endMat = wallMat.clone();
  endMat.side = THREE.DoubleSide;
  group.add(solid(new THREE.Mesh(ends, endMat)));
  return group;
}

export function decal(group, source, x, y, z, width) {
  const h = (width * source.height) / source.width;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, h), lambert({ map: texture(source), transparent: true, alphaTest: 0.1 }));
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function board(group, text, x, y, z, width, colour) {
  const face = decal(group, signBoard(text, colour), x, y, z + 0.04, width);
  const back = solid(new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, face.geometry.parameters.height + 0.06, 0.06), lambert({ color: '#6b4a2a' })));
  back.position.set(x, y, z);
  group.add(back);
}

export function words(group, text, colour, x, y, z, width) {
  return decal(group, paintedWords(text, colour), x, y, z, width);
}

export function awning(group, sheet, c, w, z, y, frames) {
  const stripes = sheet.grid([Array.from({ length: w }, (_, i) => city(frames[i === 0 ? 0 : i === w - 1 ? 2 : 1], 11))]);
  const mesh = solid(new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 1), lambert({ map: texture(stripes) })));
  mesh.position.set(c + w / 2, y - 0.22, z + 0.48);
  mesh.rotation.x = 0.42;
  group.add(mesh);
  return mesh;
}

export function sachets(group, x, z) {
  const strip = new Voxels();
  const colours = ['#c9382f', '#e8c14a', '#2f4f9a', '#3aa6a0', '#e07a3a'];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 3; row++) strip.box(col * 4, -row * 4 - (col % 2), 0, col * 4 + 3, -row * 4 - (col % 2) + 3, 1, colours[(col + row * 2) % 5]);
  }
  strip.box(-1, 3, 0, 16, 4, 1, '#5c4630');
  const mesh = strip.toMesh(PX);
  mesh.position.set(x, 0.6, z + 0.08);
  group.add(mesh);
}

export function plankFence(group, sheet, frame, x0, x1, z, h = 0.9) {
  const mesh = solid(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, 0.12), lambert({ map: texture(sheet.tile(frame), x1 - x0, 1) })));
  mesh.position.set((x0 + x1) / 2, h / 2, z);
  group.add(mesh);
  return mesh;
}

export function chainFence(group, x0, z0, x1, z1, h, colour = '#9aa3a6') {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = colour;
  for (let i = 0; i < 8; i++) {
    g.fillRect(i, i, 1, 1);
    g.fillRect(7 - i, i, 1, 1);
  }
  const mesh = solid(new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.02), lambert({ map: texture(c, len * 2, h * 2), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide })));
  mesh.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  mesh.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  group.add(mesh);
}

export function banderitas(group, strings) {
  const colours = ['#c9382f', '#e8c14a', '#2f4f9a', '#3aa6a0', '#e58fa8', '#f2efe6'].map((c) => new THREE.Color(c));
  const spots = [];
  const wire = lambert({ color: '#2b2420' });
  for (const [a, b, sag, flags = true] of strings) {
    const pts = [];
    const n = Math.max(2, Math.round(a.distanceTo(b) / 0.42));
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const p = a.clone().lerp(b, k);
      p.y -= sag * 4 * k * (1 - k);
      pts.push(p);
      if (flags && i > 0 && i < n) spots.push({ p, yaw: Math.atan2(-(b.z - a.z), b.x - a.x) });
    }
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.012, 3), wire));
  }
  if (!spots.length) return () => {};
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute([-0.1, 0, 0, 0.1, 0, 0, 0, -0.24, 0], 3));
  shape.computeVertexNormals();
  const flags = new THREE.InstancedMesh(shape, lambert({ side: THREE.DoubleSide }), spots.length);
  flags.castShadow = true;
  spots.forEach((s, i) => flags.setColorAt(i, colours[i % colours.length]));
  group.add(flags);
  const m = new THREE.Matrix4();
  const one = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3(1, 0, 0);
  const q = new THREE.Quaternion();
  const sway = new THREE.Quaternion();
  return (time) => {
    spots.forEach((s, i) => {
      q.setFromAxisAngle(up, s.yaw).multiply(sway.setFromAxisAngle(side, Math.sin(time * 2.2 + s.p.x * 0.7 + i * 0.3) * 0.45));
      flags.setMatrixAt(i, m.compose(s.p, q, one));
    });
    flags.instanceMatrix.needsUpdate = true;
  };
}

export function post(group, x, z, h, colour = '#8a7a52') {
  const mesh = solid(new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.07), lambert({ color: colour })));
  mesh.position.set(x, h / 2, z);
  group.add(mesh);
}
