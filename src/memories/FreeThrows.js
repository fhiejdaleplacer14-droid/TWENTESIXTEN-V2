import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import MiniGame, { T } from './MiniGame.js';

const SHOTS = 3;
const NEED = 2;
const RIM = { dy: -0.1 * T, lift: 2.42 };

export default class FreeThrows extends MiniGame {
  constructor(scene, at, done) {
    super(scene, at, done);
    this.rim = { x: at.x, y: at.y + RIM.dy };
    this.kid = this.person('kid_me', at.x - 4, at.y + 2.7 * T);
    this.stand(this.kid, 'up');
    this.ball = scene.add.circle(this.kid.x + 9, this.kid.y - 2, 5, 0xd9772f).setStrokeStyle(1, 0x7a3b1c);
    this.ball.lift3d = 0.75;
    this.things.push(this.ball);
    this.look(() => ({ x: at.x, y: at.y + 1.9 * T }));
    Object.assign(this, { shot: 0, made: 0, clock: 0, state: 'aim' });
    const { width, height } = this.ui.scale;
    this.meter = { x: width - 120, y: height / 2 - 110, w: 26, h: 220 };
    this.gfx = this.mark(this.ui.add.graphics());
    this.title.setText(t('games.court.how'));
    this.score();
    this.aim();
  }

  aim() {
    const size = [0.24, 0.18, 0.13][this.shot];
    this.zone = { from: 0.62 - size / 2 + Phaser.Math.FloatBetween(-0.12, 0.2), size };
    this.speed = [1.5, 1.9, 2.4][this.shot];
    this.state = 'aim';
    this.clock = Phaser.Math.FloatBetween(0, 3);
  }

  score() {
    this.status.setText(t('games.court.score', { made: this.made, shot: this.shot, total: SHOTS }));
  }

  get marker() {
    return (Math.sin(this.clock * this.speed) + 1) / 2;
  }

  press() {
    if (this.state !== 'aim') return;
    const m = this.marker;
    const { from, size } = this.zone;
    const inside = m >= from && m <= from + size;
    const close = !inside && m >= from - size * 0.6 && m <= from + size * 1.6;
    this.result = inside ? 'in' : close && Math.random() < 0.35 ? 'in' : 'out';
    this.state = 'flight';
    this.t = 0;
    this.from = { x: this.ball.x, y: this.ball.y, lift: this.ball.lift3d };
    this.miss = this.result === 'in' ? 0 : Phaser.Math.Between(0, 1) ? 1 : -1;
    this.scene.tweens.add({ targets: this.kid, y: this.kid.y - 3, yoyo: true, duration: 140 });
    sound.kick();
  }

  update(delta) {
    this.clock += delta / 1000;
    if (this.state === 'flight') this.fly(delta);
    else if (this.state === 'fall') this.fall(delta);
    else if (this.state === 'wait' && (this.pause -= delta / 1000) <= 0) {
      this.ball.setPosition(this.kid.x + 9, this.kid.y - 2);
      this.ball.lift3d = 0.75;
      this.aim();
    }
    this.place(this.kid);
    this.draw();
  }

  fly(delta) {
    this.t = Math.min(1, this.t + delta / 850);
    const k = this.t;
    const to = { x: this.rim.x + this.miss * 10, y: this.rim.y };
    this.ball.x = Phaser.Math.Linear(this.from.x, to.x, k);
    this.ball.y = Phaser.Math.Linear(this.from.y, to.y, k);
    this.ball.lift3d = Phaser.Math.Linear(this.from.lift, RIM.lift + 0.15, k) + Math.sin(k * Math.PI) * 1.6;
    if (k < 1) return;
    this.state = 'fall';
    this.t = 0;
    if (this.result === 'in') {
      this.made += 1;
      sound.select();
      this.say(this.kid, t('games.court.yes'));
    } else {
      sound.thud();
      this.say(this.kid, t('games.court.no'));
    }
  }

  fall(delta) {
    this.t = Math.min(1, this.t + delta / 900);
    const k = this.t;
    const away = this.result === 'in' ? 0.6 : 1.6;
    this.ball.x = this.rim.x + this.miss * (10 + k * 40);
    this.ball.y = this.rim.y + k * away * T;
    this.ball.lift3d = (RIM.lift + 0.15) * (1 - k) * Math.abs(Math.cos(k * Math.PI * 1.5));
    if (k < 1) return;
    this.shot += 1;
    this.score();
    if (this.shot === SHOTS) return this.end(this.made >= NEED);
    if (this.made + (SHOTS - this.shot) < NEED) return this.end(false);
    this.state = 'wait';
    this.pause = 0.5;
  }

  draw() {
    const { gfx, meter: m, zone } = this;
    gfx.clear();
    if (this.over) return;
    gfx.fillStyle(0x17110d, 0.85).fillRoundedRect(m.x - 8, m.y - 8, m.w + 16, m.h + 16, 6);
    gfx.fillStyle(0x3a2c20, 1).fillRect(m.x, m.y, m.w, m.h);
    gfx.fillStyle(0xe8c14a, 1).fillRect(m.x, m.y + m.h * (1 - zone.from - zone.size), m.w, m.h * zone.size);
    const y = m.y + m.h * (1 - this.marker);
    gfx.fillStyle(0xfff3d6, 1).fillRect(m.x - 6, y - 2, m.w + 12, 4);
  }
}
