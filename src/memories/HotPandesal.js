import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import MiniGame, { T } from './MiniGame.js';

const NEED = 10;
const DROPS = 16;
const FALL = 1.5;
const KID_SPEED = 120;

export default class HotPandesal extends MiniGame {
  constructor(scene, at, done) {
    super(scene, at, done);
    this.row = at.y + 1.2 * T;
    this.span = { x: at.x - 2.6 * T, y: this.row, w: 5.2 * T, h: 0 };
    this.kid = this.person('kid_me', at.x, this.row);
    this.stand(this.kid, 'up');
    this.bread = [];
    this.thrown = 0;
    this.caught = 0;
    this.next = 0.6;
    this.look(() => ({ x: at.x, y: this.row - 0.6 * T }));
    this.title.setText(t('games.bakery.how'));
  }

  drop() {
    const x = this.span.x + Math.random() * this.span.w;
    const roll = this.scene.add.circle(x, this.row, 4, 0xc98a4a).setStrokeStyle(1, 0x8a5a2a);
    Object.assign(roll, { t: 0, lift3d: 2.4 });
    this.things.push(roll);
    this.bread.push(roll);
    this.thrown += 1;
  }

  update(delta) {
    if (this.over) return;
    const dt = delta / 1000;
    const go = this.scene.heading();
    this.walk(this.kid, go.x * KID_SPEED * dt, 0, this.span);
    if (!go.x) this.stand(this.kid, 'up');
    this.next -= dt;
    if (this.next <= 0 && this.thrown < DROPS) {
      this.drop();
      this.next = Phaser.Math.FloatBetween(0.55, 1.1) * (1 - this.thrown / 50);
    }
    for (const roll of this.bread) {
      if (!roll.active) continue;
      roll.t += dt / FALL;
      roll.lift3d = 2.4 * (1 - roll.t * roll.t);
      if (roll.lift3d < 0.6 && Math.abs(roll.x - this.kid.x) < 15) {
        roll.destroy();
        this.caught += 1;
        sound.blip();
      } else if (roll.t >= 1) {
        roll.destroy();
        sound.thud();
      }
    }
    this.status.setText(t('games.bakery.status', { n: this.caught, need: NEED }));
    if (this.caught >= NEED) return this.end(true);
    if (this.thrown === DROPS && this.bread.every((r) => !r.active)) this.end(false);
  }
}
