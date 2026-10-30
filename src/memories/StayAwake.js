import { t } from '../systems/Lang.js';
import sound from '../systems/Sound.js';
import MiniGame from './MiniGame.js';

const TIME = 22;
const OPEN = 0.3;

export default class StayAwake extends MiniGame {
  constructor(scene, at, done) {
    super(scene, at, done);
    this.lids = this.mark(this.ui.add.graphics()).setDepth(1050);
    this.shut = 0;
    this.clock = 0;
    this.title.setText(t('games.chapel.how'));
  }

  press() {
    this.shut = Math.max(0, this.shut - OPEN);
    sound.blip();
  }

  update(delta) {
    if (this.over) return;
    const dt = delta / 1000;
    this.clock += dt;
    const sleepy = 0.12 + this.clock * 0.012 + Math.max(0, Math.sin(this.clock * 1.3)) * 0.12;
    this.shut = Math.min(1, this.shut + sleepy * dt);
    this.status.setText(t('games.chapel.status', { s: Math.max(0, Math.ceil(TIME - this.clock)) }));
    this.draw();
    if (this.shut >= 1) return this.end(false);
    if (this.clock >= TIME) this.end(true);
  }

  draw() {
    const { width, height } = this.ui.scale;
    const reach = (height / 2) * this.shut;
    this.lids.clear().fillStyle(0x0b0705, 0.97);
    this.lids.fillRect(0, 0, width, reach).fillRect(0, height - reach, width, reach);
  }
}
