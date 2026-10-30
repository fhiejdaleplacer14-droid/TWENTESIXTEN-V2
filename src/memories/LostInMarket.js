import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import MiniGame, { T } from './MiniGame.js';

const TIME = 35;
const KID_SPEED = 95;
const CROWD = ['rudy', 'ising', 'ben', 'liza', 'nena', 'karding', 'rosa', 'berto', 'mila', 'tonyo', 'ising', 'linda', 'cora', 'jun'];
const box = { x: 77 * T, y: 4.2 * T, w: 14 * T, h: 7.2 * T };

export default class LostInMarket extends MiniGame {
  static zoom = 1.1;

  constructor(scene, at, done) {
    super(scene, at, done);
    this.kid = this.person('kid_me', 79 * T, 10.6 * T);
    this.crowd = CROWD.map((look) => this.wanderer(look));
    this.lola = this.wanderer('lola', { x: Phaser.Math.Between(86, 90) * T, y: Phaser.Math.FloatBetween(4.6, 6.5) * T });
    this.lola.slow = true;
    this.left = TIME;
    this.shout = 0;
    this.look(() => this.kid);
    this.title.setText(t('games.market.how'));
  }

  wanderer(look, at = null) {
    const p = at || { x: box.x + Math.random() * box.w, y: box.y + Math.random() * box.h };
    const who = this.person(look, p.x, p.y, 2);
    who.wait = Math.random() * 1500;
    return who;
  }

  press() {
    if (this.shout > 0 || this.over) return;
    this.shout = 3.5;
    this.say(this.kid, t('games.market.shout'));
    sound.blip();
    this.scene.time.delayedCall(700, () => !this.over && this.say(this.lola, t('games.market.answer'), 1300));
  }

  update(delta) {
    const dt = delta / 1000;
    if (this.over) return;
    this.left -= dt;
    this.shout -= dt;
    this.status.setText(t('games.market.time', { s: Math.max(0, Math.ceil(this.left)) }));
    const go = this.scene.heading();
    this.walk(this.kid, go.x * KID_SPEED * dt, go.y * KID_SPEED * dt, box);
    for (const who of [...this.crowd, this.lola]) this.drift(who, delta);
    if (Phaser.Math.Distance.Between(this.kid.x, this.kid.y, this.lola.x, this.lola.y) < 28) {
      this.stand(this.lola, 'down');
      this.say(this.lola, t('games.market.found'), 1600);
      sound.select();
      return this.end(true);
    }
    if (this.left <= 0) {
      this.say(this.lola, t('games.market.calling'), 1600);
      this.scene.tweens.add({ targets: this.lola, x: this.kid.x + 20, y: this.kid.y, duration: 1000, onUpdate: () => this.place(this.lola) });
      this.end(false);
    }
  }

  drift(who, delta) {
    if (who.wait > 0) {
      who.wait -= delta;
      this.stand(who);
      this.place(who);
      return;
    }
    if (!who.to) who.to = { x: box.x + Math.random() * box.w, y: box.y + Math.random() * box.h };
    if (this.toward(who, who.to, who.slow ? 26 : 40, delta, box)) {
      who.to = null;
      who.wait = 800 + Math.random() * 2600;
    }
  }
}
