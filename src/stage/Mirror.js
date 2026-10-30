import * as THREE from 'three';
import { jeepney, tricycle, PX } from './models.js';

const T = 32;
const SIZE = 1.1;
const MODELS = { jeepney: () => jeepney(), tricycle: () => tricycle('#3a5fa8', '#2d4b86', true) };

export default class Mirror {
  constructor(stage, scene) {
    this.stage = stage;
    this.scene = scene;
    this.twins = new Map();
    this.textures = new Map();
    this.group = stage.add(new THREE.Group());
  }

  sync(dt) {
    const seen = new Set();
    for (const obj of this.scene.children.list) {
      if (obj.no3d || !obj.active) continue;
      let twin = this.twins.get(obj);
      if (!twin) {
        twin = this.make(obj);
        if (!twin) {
          obj.no3d = true;
          continue;
        }
        this.twins.set(obj, twin);
      }
      seen.add(obj);
      twin.sync(obj, dt);
    }
    for (const [obj, twin] of this.twins) {
      if (seen.has(obj)) continue;
      twin.dispose();
      this.twins.delete(obj);
    }
  }

  make(obj) {
    if (obj.model3d) return new Prop(this, obj);
    switch (obj.type) {
      case 'Sprite':
      case 'Image':
        return MODELS[obj.texture.key] ? new Model(this, obj) : new Billboard(this, obj);
      case 'Ellipse':
        return new Blob(this);
      case 'Arc':
        return new Ball(this, obj);
      case 'ParticleEmitter':
        return new Particles(this);
      case 'Text':
        return new Label(this);
      default:
        return null;
    }
  }

  texture(key) {
    if (!this.textures.has(key)) {
      const source = this.scene.textures.get(key).getSourceImage();
      const tex = new THREE.Texture(source);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      this.textures.set(key, tex);
    }
    return this.textures.get(key);
  }

  dispose() {
    for (const twin of this.twins.values()) twin.dispose();
    this.twins.clear();
    this.group.removeFromParent();
  }
}

const groundOf = (obj) => obj.y + (1 - (obj.originY ?? 0.5)) * (obj.displayHeight || 0);

class Billboard {
  constructor(mirror, obj) {
    this.mirror = mirror;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    const additive = obj.blendMode === 1 || obj.blendMode === 'ADD';
    this.material = additive
      ? new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      : new THREE.MeshLambertMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.32 });
    this.mesh = new THREE.Mesh(geo, this.material);
    if (!additive) {
      this.mesh.castShadow = true;
      this.depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
      this.mesh.customDepthMaterial = this.depth;
    }
    mirror.group.add(this.mesh);
  }

  sync(obj) {
    const { mesh, material } = this;
    const show = obj.visible && obj.alpha > 0.01;
    mesh.visible = show;
    if (!show) return;
    const key = obj.texture.key;
    if (this.key !== key) {
      this.key = key;
      this.map = this.mirror.texture(key).clone();
      this.map.needsUpdate = true;
      material.map = this.map;
      if (material.emissiveMap !== undefined) material.emissiveMap = this.map;
      if (this.depth) this.depth.map = this.map;
      material.needsUpdate = true;
      if (this.depth) this.depth.needsUpdate = true;
    }
    const f = obj.frame;
    const w = f.source.width;
    const h = f.source.height;
    this.map.repeat.set(f.cutWidth / w, f.cutHeight / h);
    this.map.offset.set(f.cutX / w, 1 - (f.cutY + f.cutHeight) / h);
    const tint = obj.tintTopLeft ?? 0xffffff;
    material.color.setHex(tint);
    material.transparent = obj.alpha < 0.99 || material.blending === THREE.AdditiveBlending;
    material.opacity = obj.alpha;
    mesh.castShadow = obj.alpha > 0.5 && material.blending !== THREE.AdditiveBlending;
    const sx = (Math.abs(obj.displayWidth) / T) * SIZE;
    const sy = (Math.abs(obj.displayHeight) / T) * SIZE;
    mesh.scale.set(obj.flipX ? -sx : sx, sy, 1);
    const z = groundOf(obj) / T;
    mesh.position.set(obj.x / T, (obj.lift3d || 0) + this.mirror.stage.groundAt(z), z);
    mesh.quaternion.copy(this.mirror.stage.camera.quaternion);
    if (obj.spin3d) mesh.rotateZ(obj.spin3d);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.material.dispose();
    this.map?.dispose();
  }
}

class Model {
  constructor(mirror, obj) {
    this.mirror = mirror;
    this.key = obj.texture.key;
    this.mesh = MODELS[this.key]().toMesh(PX);
    mirror.group.add(this.mesh);
  }

  sync(obj) {
    if (obj.texture.key !== this.key) {
      this.mesh.removeFromParent();
      this.key = obj.texture.key;
      this.mesh = (MODELS[this.key] ? MODELS[this.key]() : MODELS.jeepney()).toMesh(PX);
      this.mirror.group.add(this.mesh);
    }
    this.mesh.visible = obj.visible && obj.alpha > 0.01;
    const z = groundOf(obj) / T - 0.45;
    this.mesh.position.set(obj.x / T, (obj.lift3d || 0) + this.mirror.stage.groundAt(z), z);
    this.mesh.rotation.y = obj.flipX ? Math.PI : 0;
  }

  dispose() {
    this.mesh.removeFromParent();
  }
}

const UP = new THREE.Vector3(0, 1, 0);
class Prop {
  constructor(mirror, obj) {
    this.mirror = mirror;
    this.mesh = obj.model3d().toMesh(PX);
    this.mesh.geometry.computeBoundingBox();
    this.half = Math.max(...['x', 'z'].map((k) => this.mesh.geometry.boundingBox.max[k]));
    this.yaw = new THREE.Quaternion();
    this.tip = new THREE.Quaternion();
    this.axis = new THREE.Vector3();
    mirror.group.add(this.mesh);
  }

  sync(obj) {
    const { mesh } = this;
    const alpha = obj.alpha ?? 1;
    mesh.visible = obj.visible !== false && alpha > 0.01;
    mesh.material.transparent = alpha < 0.99;
    mesh.material.opacity = alpha;
    const z = obj.y / T;
    const tip = obj.tip3d || { angle: 0, x: 1, y: 0 };
    const len = Math.hypot(tip.x, tip.y) || 1;
    this.axis.set(tip.y / len, 0, -tip.x / len);
    this.tip.setFromAxisAngle(this.axis, tip.angle);
    this.yaw.setFromAxisAngle(UP, obj.turn3d || 0);
    mesh.quaternion.copy(this.tip).multiply(this.yaw);
    mesh.position.set(obj.x / T, this.mirror.stage.groundAt(z) + (obj.lift3d || 0) + Math.sin(tip.angle) * this.half, z);
  }

  dispose() {
    this.mesh.removeFromParent();
  }
}

let blobTexture;
class Blob {
  constructor(mirror) {
    if (!blobTexture) {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 32);
      blobTexture = new THREE.CanvasTexture(c);
    }
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false, color: '#000000' }));
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.renderOrder = 1;
    this.stage = mirror.stage;
    mirror.group.add(this.mesh);
  }

  sync(obj) {
    this.mesh.visible = obj.visible && obj.alpha > 0.01;
    this.mesh.material.opacity = Math.min(0.55, (obj.fillAlpha ?? 0.25) * 2.2) * obj.alpha;
    this.mesh.scale.set(((obj.width * obj.scaleX) / T) * 1.4, ((obj.height * obj.scaleY) / T) * 2.2, 1);
    this.mesh.position.set(obj.x / T, 0.025 + this.stage.groundAt(obj.y / T), obj.y / T);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.material.dispose();
  }
}

class Ball {
  constructor(mirror, obj) {
    this.stage = mirror.stage;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshLambertMaterial({ color: obj.fillColor }));
    this.mesh.castShadow = true;
    mirror.group.add(this.mesh);
  }

  sync(obj) {
    const r = (obj.radius * obj.scaleX) / T;
    this.mesh.visible = obj.visible && obj.alpha > 0.01;
    this.mesh.scale.setScalar(r * 1.3);
    this.mesh.position.set(obj.x / T, (obj.lift3d || 0) + r + this.stage.groundAt(obj.y / T), obj.y / T);
  }

  dispose() {
    this.mesh.removeFromParent();
  }
}

class Particles {
  constructor(mirror) {
    this.mirror = mirror;
    this.points = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, vertexColors: false }), 64);
    this.points.count = 0;
    this.points.frustumCulled = false;
    mirror.group.add(this.points);
    this.m = new THREE.Matrix4();
    this.c = new THREE.Color();
  }

  sync(obj) {
    const alive = obj.alive || [];
    const cam = this.mirror.stage.camera.quaternion;
    const n = Math.min(alive.length, 64);
    const opacity = alive.reduce((sum, p) => sum + p.alpha, 0) / Math.max(1, alive.length);
    this.points.material.opacity = Math.min(1, opacity * 1.4);
    for (let i = 0; i < n; i++) {
      const p = alive[i];
      const wx = p.worldPosition ? p.worldPosition.x : obj.x + p.x;
      const wy = p.worldPosition ? p.worldPosition.y : obj.y + p.y;
      const size = (4 * p.scaleX) / T;
      this.m.compose(new THREE.Vector3(wx / T, (obj.lift3d || 0) + (obj.y - wy) / T, obj.y / T), cam, new THREE.Vector3(size, size, size));
      this.points.setMatrixAt(i, this.m);
      this.points.setColorAt(i, this.c.setHex(p.tint ?? 0xffffff));
    }
    this.points.count = n;
    this.points.instanceMatrix.needsUpdate = true;
    if (this.points.instanceColor) this.points.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.points.removeFromParent();
  }
}

class Label {
  constructor(mirror) {
    this.mirror = mirror;
    this.ui = mirror.scene.scene.get('UI');
  }

  sync(obj) {
    const { ui } = this;
    if (!ui || !ui.sys.isActive()) return;
    if (!this.text) {
      const s = obj.style;
      this.text = ui.add
        .text(0, 0, obj.text, { fontFamily: s.fontFamily, fontSize: s.fontSize, fontStyle: s.fontStyle, color: s.color, backgroundColor: s.backgroundColor, padding: obj.padding })
        .setOrigin(0.5, 1)
        .setDepth(950);
    }
    const ground = obj.ground3d ?? obj.y;
    const at = this.mirror.stage.project(obj.x, ground, (ground - obj.y) / T, this.mirror.scene.game);
    if (this.text.text !== obj.text) this.text.setText(obj.text);
    this.text.setPosition(Math.round(at.x), Math.round(at.y)).setAlpha(obj.alpha).setVisible(obj.visible && !at.behind);
  }

  dispose() {
    this.text?.destroy();
  }
}
