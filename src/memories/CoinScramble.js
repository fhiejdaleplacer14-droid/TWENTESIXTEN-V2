import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import MiniGame, { T } from './MiniGame.js';

const TIME = 14;
const COINS = 10;
const KID_SPEED = 100;

export default class CoinScramble extends MiniGame {
  constructor(scene, at, done) {
    super(scene, at, done);
    this.box = { x: at.x - 4.5 * T, y: at.y + 0.9 * T, w: 9 * T, h: 1.5 * T };
    this.kid = this.person('kid_me', at.x, at.y + 1.5 * T);
    this.coins = Array.from({ length: COINS }, () => {
      const coin = scene.add.circle(this.kid.x, this.kid.y - 2, 3, 0xe8c14a).setStrokeStyle(1, 0x9a7a2a);
      const a = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(90, 170);
      Object.assign(coin, { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.5, lift3d: 0.1, age: 0 });
      this.things.push(coin);
      return coin;
    });
    sound.clatter();
    this.got = 0;
    this.left = TIME;
    this.look(() => ({ x: at.x, y: at.y + 1.4 * T }));
    this.title.setText(t('games.store.how'));
  }

  update(delta) {
    if (this.over) return;
    const dt = delta / 1000;
    this.left -= dt;
    const go = this.scene.heading();
    this.walk(this.kid, go.x * KID_SPEED * dt, go.y * KID_SPEED * dt, this.box);
    const { box } = this;
    for (const c of this.coins) {
      if (!c.active) continue;
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= Math.pow(0.55, dt);
      c.vy *= Math.pow(0.55, dt);
      if (c.x < box.x || c.x > box.x + box.w) c.vx *= -1;
      if (c.y < box.y || c.y > box.y + box.h) c.vy *= -1;
      c.x = Phaser.Math.Clamp(c.x, box.x, box.x + box.w);
      c.y = Phaser.Math.Clamp(c.y, box.y, box.y + box.h);
      if (Math.random() < dt * 0.5 && Math.hypot(c.vx, c.vy) < 30) {
        c.vx = Phaser.Math.Between(-80, 80);
        c.vy = Phaser.Math.Between(-30, 30);
      }
      if (c.age > 0.5 && Phaser.Math.Distance.Between(c.x, c.y, this.kid.x, this.kid.y - 4) < 16) {
        c.destroy();
        this.got += 1;
        sound.blip();
      }
    }
    this.status.setText(t('games.store.status', { n: this.got, total: COINS, s: Math.max(0, Math.ceil(this.left)) }));
    if (this.got === COINS) return this.end(true);
    if (this.left <= 0) this.end(false);
  }
}
