import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CHUNK = 12;

export default function settle(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const merged = [];
  group.traverse((mesh) => {
    if (!mergeable(mesh)) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const centre = box.getCenter(new THREE.Vector3());
    const chunk = `${Math.floor(centre.x / CHUNK)},${Math.floor(centre.z / CHUNK)}`;
    const m = mesh.material;
    const look = m.map ? m.uuid : `${m.side}|${m.emissive.getHexString()}`;
    const key = `${chunk}|${mesh.castShadow}|${mesh.receiveShadow}|${look}`;
    if (!buckets.has(key)) buckets.set(key, { mesh, parts: [] });
    buckets.get(key).parts.push(bake(mesh));
    merged.push(mesh);
  });
  for (const mesh of merged) mesh.removeFromParent();
  for (const { mesh: first, parts } of buckets.values()) {
    const m = first.material;
    const material = m.map ? m : new THREE.MeshLambertMaterial({ vertexColors: true, side: m.side, emissive: m.emissive });
    const mesh = new THREE.Mesh(mergeGeometries(parts), material);
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    group.add(mesh);
  }
  return { before: merged.length, after: buckets.size };
}

export function settlePanes(group, panes) {
  if (!panes.length) return panes;
  const parts = panes.map((pane) => {
    pane.updateMatrixWorld(true);
    const geo = pane.geometry.clone().applyMatrix4(pane.matrixWorld);
    pane.removeFromParent();
    return geo;
  });
  const mesh = new THREE.Mesh(mergeGeometries(parts), panes[0].material);
  group.add(mesh);
  return [mesh];
}

function mergeable(mesh) {
  const m = mesh.material;
  return (
    mesh.isMesh &&
    !mesh.isInstancedMesh &&
    !mesh.customDepthMaterial &&
    !mesh.userData.keep &&
    m instanceof THREE.MeshLambertMaterial &&
    !m.transparent &&
    m.alphaTest === 0
  );
}

function bake(mesh) {
  const geo = mesh.geometry.clone();
  geo.applyMatrix4(mesh.matrixWorld);
  const out = new THREE.BufferGeometry();
  const count = geo.getAttribute('position').count;
  out.setIndex(new THREE.BufferAttribute(geo.index ? Uint32Array.from(geo.index.array) : Uint32Array.from({ length: count }, (_, i) => i), 1));
  out.setAttribute('position', geo.getAttribute('position'));
  out.setAttribute('normal', geo.getAttribute('normal'));
  const m = mesh.material;
  if (m.map) {
    out.setAttribute('uv', geo.getAttribute('uv'));
    return out;
  }
  if (m.vertexColors && geo.getAttribute('color')) {
    const c = geo.getAttribute('color');
    const tint = m.color;
    const colours = new Float32Array(c.count * 3);
    for (let i = 0; i < c.count; i++) colours.set([c.getX(i) * tint.r, c.getY(i) * tint.g, c.getZ(i) * tint.b], i * 3);
    out.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  } else {
    const n = out.getAttribute('position').count;
    const colours = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colours.set([m.color.r, m.color.g, m.color.b], i * 3);
    out.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  }
  return out;
}
