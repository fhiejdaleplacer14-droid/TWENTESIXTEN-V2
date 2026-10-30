import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import settings, { saveSettings } from '../systems/Settings.js';
import Look from './look.js';
import Mirror from './Mirror.js';

export const T = 32;
const CAMERA = new THREE.Vector3(0, 10, 15);
export const PITCH = Math.atan2(CAMERA.y, CAMERA.z);
export const DROP = 0.1;
const SLOW_FPS = 40;
const SLOW_FOR = 5000;
const KEEP = new URLSearchParams(location.search).has('keepfx');

class Stage {
  init(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.static = new THREE.Group();
    this.dynamic = new THREE.Group();
    this.scene.add(this.static, this.dynamic);
    this.camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 160);
    this.composer = new EffectComposer(this.renderer);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(480, 270), 0.3, 0.5, 0.82);
    [new RenderPass(this.scene, this.camera), this.bloom, new OutputPass()].forEach((p) => this.composer.addPass(p));
    this.updaters = [];
    this.lamps = [];
    this.panes = [];
    this.roads = [];
    this.lights = [];
    this.look = new Look(this);
    this.focus = new THREE.Vector3(46, 0.6, 22);
    this.zoom = 1;
    this.built = false;
    this.slowSince = 0;
    this.fadeTo(0, 0);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = [1, Math.min(window.devicePixelRatio, 1.5), Math.min(window.devicePixelRatio, 2)][settings.effects] || 1;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.quality = settings.effects;
  }

  attach(scene, { follow = null, drift = null } = {}) {
    if (this.attached) this.detach();
    this.attached = scene;
    this.follow = follow;
    this.drift = drift;
    this.mirror = new Mirror(this, scene);
    this.zoom = 1;
    this.zoomTween = null;
    const start = follow ? follow() : drift(0);
    this.focus.set(start.x / T, 0.6, start.y / T - 2);
    scene.events.once('shutdown', () => this.attached === scene && this.detach());
  }

  detach() {
    this.mirror.dispose();
    this.mirror = null;
    this.attached = null;
    for (const l of this.lights) l.light.removeFromParent();
    this.lights = [];
    this.dynamic.clear();
  }

  groundAt(z) {
    for (const [a, b] of this.roads) if (z > a && z < b) return -DROP;
    return 0;
  }

  add(object) {
    this.dynamic.add(object);
    return object;
  }

  light(x, z, height, colour, power, { always = false, distance = 7 } = {}) {
    const light = new THREE.PointLight(colour, 0, distance, 1.4);
    light.position.set(x, height, z);
    this.dynamic.add(light);
    const entry = { light, base: power, always };
    this.lights.push(entry);
    return entry;
  }

  shake(strength = 0.2, ms = 500) {
    this.shaking = { strength, ms, t: 0 };
  }

  zoomTo(zoom, ms = 1000) {
    this.zoomTween = { from: this.zoom, to: zoom, t: 0, ms };
  }

  fadeTo(opacity, ms = 1000) {
    this.canvas.style.transition = `opacity ${ms}ms ease`;
    this.canvas.style.opacity = String(opacity);
  }

  project(x, y, lift, game) {
    const p = new THREE.Vector3(x / T, lift, y / T).project(this.camera);
    const box = game.canvas.getBoundingClientRect();
    const sx = ((p.x + 1) / 2) * window.innerWidth;
    const sy = ((1 - p.y) / 2) * window.innerHeight;
    return { x: ((sx - box.left) / box.width) * game.scale.width, y: ((sy - box.top) / box.height) * game.scale.height, behind: p.z > 1 };
  }

  frame(dt) {
    if (!this.attached) {
      this.renderer.clear();
      return;
    }
    const time = performance.now() / 1000;
    if (this.quality !== settings.effects) this.resize();
    this.watchSpeed();
    this.mirror.sync(dt);
    for (const u of this.updaters) u(time, dt);

    if (this.zoomTween) {
      const z = this.zoomTween;
      z.t = Math.min(1, z.t + (dt * 1000) / z.ms);
      const k = z.t * z.t * (3 - 2 * z.t);
      this.zoom = z.from + (z.to - z.from) * k;
      if (z.t === 1) this.zoomTween = null;
    }
    const target = this.follow ? this.follow() : this.drift(time);
    const want = new THREE.Vector3(Math.min(84, Math.max(8, target.x / T)), 0.6, Math.min(42, Math.max(9, target.y / T - 2)));
    this.focus.lerp(want, 1 - Math.pow(0.003, dt));
    this.camera.position.copy(CAMERA).divideScalar(this.zoom).add(this.focus);
    this.camera.lookAt(this.focus);
    if (this.shaking) {
      const s = this.shaking;
      s.t += dt * 1000;
      const k = Math.max(0, 1 - s.t / s.ms) * s.strength;
      this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, 0));
      if (s.t >= s.ms) this.shaking = null;
    }
    this.look.update(dt, this.focus);
    this.composer.render(dt);
  }

  watchSpeed() {
    if (settings.effects === 0 || KEEP) return;
    const fps = this.attached.game.loop.actualFps;
    const now = performance.now();
    if (fps >= SLOW_FPS) this.slowSince = 0;
    else if (!this.slowSince) this.slowSince = now;
    else if (now - this.slowSince > SLOW_FOR) {
      settings.effects -= 1;
      saveSettings();
      this.slowSince = 0;
    }
  }
}

export default new Stage();
