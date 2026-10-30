import * as THREE from 'three';

export default class Voxels {
  constructor() {
    this.cells = new Map();
  }

  key(x, y, z) {
    return `${x},${y},${z}`;
  }

  set(x, y, z, colour) {
    this.cells.set(this.key(x, y, z), { x, y, z, colour: new THREE.Color(colour) });
    return this;
  }

  clear(x, y, z) {
    this.cells.delete(this.key(x, y, z));
    return this;
  }

  box(x0, y0, z0, x1, y1, z1, colour) {
    for (let x = x0; x < x1; x++) {
      for (let y = y0; y < y1; y++) {
        for (let z = z0; z < z1; z++) {
          if (colour === null) this.clear(x, y, z);
          else this.set(x, y, z, colour);
        }
      }
    }
    return this;
  }

  blob(cx, cy, cz, r, pick) {
    const r2 = r * r;
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      for (let y = Math.floor(cy - r); y <= cy + r; y++) {
        for (let z = Math.floor(cz - r); z <= cz + r; z++) {
          const d = (x - cx) ** 2 + (y - cy) ** 2 * 1.3 + (z - cz) ** 2;
          if (d <= r2) this.set(x, y, z, pick(x, y, z, d / r2));
        }
      }
    }
    return this;
  }

  toMesh(scale, { origin = null, emissive = null } = {}) {
    const cells = [...this.cells.values()];
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const c of cells) {
      for (const a of ['x', 'y', 'z']) {
        min[a] = Math.min(min[a], c[a]);
        max[a] = Math.max(max[a], c[a] + 1);
      }
    }
    const o = origin || { x: (min.x + max.x) / 2, y: min.y, z: (min.z + max.z) / 2 };
    const positions = [];
    const normals = [];
    const colours = [];
    const indices = [];
    for (const c of cells) {
      for (const face of FACES) {
        if (this.cells.has(this.key(c.x + face.dir[0], c.y + face.dir[1], c.z + face.dir[2]))) continue;
        const start = positions.length / 3;
        const shade = face.shade;
        for (const corner of face.corners) {
          positions.push((c.x + corner[0] - o.x) * scale, (c.y + corner[1] - o.y) * scale, (c.z + corner[2] - o.z) * scale);
          normals.push(...face.dir);
          colours.push(c.colour.r * shade, c.colour.g * shade, c.colour.b * shade);
        }
        indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    if (emissive) Object.assign(material, emissive);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

const FACES = [
  { dir: [1, 0, 0], shade: 0.92, corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { dir: [-1, 0, 0], shade: 0.92, corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { dir: [0, 1, 0], shade: 1, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], shade: 0.7, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [0, 0, 1], shade: 0.96, corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { dir: [0, 0, -1], shade: 0.88, corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];
