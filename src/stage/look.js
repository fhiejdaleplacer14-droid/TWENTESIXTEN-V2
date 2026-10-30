import * as THREE from 'three';
import settings from '../systems/Settings.js';
import { skyGradient, texture } from './paint.js';

export const HOURS = {
  afternoon: { sun: [[-0.6, 1.1, 0.7], '#fff1d8', 2.4], sky: ['#c4dcf2', '#7a6a4c', 1.15], fog: '#d7e2e4', bg: ['#86b8e2', '#e6eef0'], lamps: 0, panes: 0, bloom: 0.15 },
  golden: { sun: [[-1, 0.6, 0.5], '#ffc27a', 2.6], sky: ['#f2cda4', '#5a4030', 0.9], fog: '#ebbd8e', bg: ['#e8a464', '#ffdcaa'], lamps: 0, panes: 0.15, bloom: 0.25 },
  sunset: { sun: [[-1, 0.3, 0.32], '#ff8656', 2.3], sky: ['#c77791', '#3a2a30', 0.75], fog: '#b46a7c', bg: ['#46386c', '#ff9466'], lamps: 0.55, panes: 0.55, bloom: 0.45 },
  dusk: { sun: [[-0.7, 0.9, -0.4], '#7d8ccc', 0.45], sky: ['#3c4a86', '#151522', 0.6], fog: '#1d2546', bg: ['#0c1230', '#2c3666'], lamps: 1, panes: 1, bloom: 0.7 },
};
const LAMP_LIGHTS = 6;
const LAMP_POWER = 9;

export default class Look {
  constructor(stage) {
    this.stage = stage;
    const { scene } = stage;
    this.sun = new THREE.DirectionalLight('#ffffff', 2);
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun, this.sun.target);
    this.sky = new THREE.HemisphereLight('#ffffff', '#444444', 1);
    scene.add(this.sky);
    this.pool = Array.from({ length: LAMP_LIGHTS }, () => {
      const light = new THREE.PointLight('#ffc477', 0, 9, 1.4);
      scene.add(light);
      return light;
    });
    scene.fog = new THREE.Fog('#ffffff', 30, 72);
    this.memory = 0;
    this.current = HOURS.afternoon;
    this.set('afternoon', 0);
  }

  set(hour, seconds = 5) {
    this.from = JSON.parse(JSON.stringify(this.current));
    this.to = HOURS[hour];
    this.hour = hour;
    this.t = seconds ? 0 : 1;
    this.length = seconds || 1;
    this.blend(this.t);
  }

  setMemory(on) {
    this.memoryTarget = on ? 1 : 0;
  }

  blend(k) {
    const a = this.from;
    const b = this.to;
    const lerp = (x, y) => x + (y - x) * k;
    const colour = (x, y) => `#${new THREE.Color(x).lerp(new THREE.Color(y), k).getHexString()}`;
    this.current = {
      sun: [a.sun[0].map((v, i) => lerp(v, b.sun[0][i])), colour(a.sun[1], b.sun[1]), lerp(a.sun[2], b.sun[2])],
      sky: [colour(a.sky[0], b.sky[0]), colour(a.sky[1], b.sky[1]), lerp(a.sky[2], b.sky[2])],
      fog: colour(a.fog, b.fog),
      bg: [colour(a.bg[0], b.bg[0]), colour(a.bg[1], b.bg[1])],
      lamps: lerp(a.lamps, b.lamps),
      panes: lerp(a.panes, b.panes),
      bloom: lerp(a.bloom, b.bloom),
    };
    const c = this.current;
    const { scene } = this.stage;
    if (scene.background) scene.background.dispose();
    scene.background = texture(skyGradient(c.bg[0], c.bg[1]));
    scene.background.magFilter = THREE.LinearFilter;
  }

  update(dt, focus) {
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / this.length);
      this.blend(this.t * this.t * (3 - 2 * this.t));
    }
    this.memory += ((this.memoryTarget || 0) - this.memory) * Math.min(1, dt * 2);
    const c = this.current;
    const m = this.memory;
    const warm = new THREE.Color('#ffd98a');
    this.sun.color.set(c.sun[1]).lerp(warm, m * 0.5);
    this.sun.intensity = c.sun[2] * (1 + m * 0.2);
    this.sky.color.set(c.sky[0]).lerp(warm, m * 0.6);
    this.sky.groundColor.set(c.sky[1]);
    this.sky.intensity = c.sky[2] + m * 0.5;
    this.stage.scene.fog.color.set(c.fog).lerp(warm, m * 0.6);
    this.sun.castShadow = settings.effects > 0;
    this.sun.shadow.mapSize.setScalar(settings.effects > 1 ? 2048 : 1024);
    if (this.sun.shadow.map && this.sun.shadow.map.width !== this.sun.shadow.mapSize.x) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
    this.stage.bloom.enabled = settings.effects > 0;
    this.stage.bloom.strength = c.bloom + m * 0.35;

    const d = new THREE.Vector3(...c.sun[0]).normalize();
    this.sun.position.copy(focus).addScaledVector(d, 45);
    this.sun.target.position.copy(focus);

    const lamps = this.stage.lamps;
    const near = lamps
      .map((l) => ({ l, d: (l.x - focus.x) ** 2 + (l.z - focus.z) ** 2 }))
      .sort((p, q) => p.d - q.d)
      .slice(0, LAMP_LIGHTS);
    this.pool.forEach((light, i) => {
      const lamp = near[i]?.l;
      light.intensity = lamp ? c.lamps * LAMP_POWER : 0;
      if (lamp) light.position.set(lamp.x, lamp.y - 0.1, lamp.z);
    });
    for (const lamp of lamps) lamp.bulb.visible = c.lamps > 0.05;
    for (const pane of this.stage.panes) {
      pane.material.opacity = c.panes * 0.85;
      pane.visible = c.panes > 0.01;
    }
    for (const { light, base, always } of this.stage.lights) light.intensity = base * (always ? 1 : c.lamps);
  }
}
