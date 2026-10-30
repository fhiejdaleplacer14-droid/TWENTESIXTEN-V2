import sound from './Sound.js';
import music from './Music.js';
import stage from '../stage/Stage.js';

const T = 32;

export default class Daylight {
  constructor(scene) {
    this.scene = scene;
    this.phase = 'afternoon';
    this.extra = [];
    this.lights = new Map();
    stage.look.set('afternoon', 0);
  }

  set(phase, duration = 5000) {
    this.phase = phase;
    stage.look.set(phase, duration / 1000);
    if (phase === 'dusk') sound.setAmbience('dusk');
    if (phase === 'golden' && duration > 1 && !this.sung) {
      this.sung = true;
      music.cue('golden');
    }
    if (this.scene.life) this.scene.life.setPhase(phase);
  }

  update() {
    for (const e of this.extra) {
      if (!this.lights.has(e)) this.lights.set(e, stage.light(0, 0, 0.6, e.colour || '#fff0c0', 6));
      const entry = this.lights.get(e);
      entry.light.position.set(e.x / T, e.height ?? 0.6, e.y / T);
      entry.base = 6 * (e.alpha ?? 1);
    }
  }
}
