import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import MiniGame from './MiniGame.js';

const COINS = 4;
const PER_COIN = 5;
const LIVES = 3;
const SHIP = 190;

export default class Pisonet extends MiniGame {
  constructor(scene, at, done) {
    super(scene, at, done);
    this.screen = this.panel(380, 250, 0x0d1a12);
    this.gfx = this.mark(this.ui.add.graphics());
    const s = this.screen;
    this.ship = { x: s.x + s.w / 2, y: s.y + s.h - 22 };
    this.blocks = [];
    this.clock = 0;
    this.next = 0.4;
    this.lives = LIVES;
    this.hurt = 0;
    this.title.setText(t('games.pisonet.how'));
  }

  update(delta) {
    if (this.over) return;
    const dt = delta / 1000;
    const s = this.screen;
    this.clock += dt;
    this.hurt -= dt;
    this.ship.x = Phaser.Math.Clamp(this.ship.x + this.scene.heading().x * SHIP * dt, s.x + 12, s.x + s.w - 12);
    this.next -= dt;
    if (this.next <= 0) {
      const size = Phaser.Math.Between(14, 34);
      this.blocks.push({ x: s.x + Math.random() * (s.w - size), y: s.y, w: size, h: 12, v: 70 + this.clock * 4 + Math.random() * 40 });
      this.next = Math.max(0.22, 0.75 - this.clock * 0.025);
    }
    for (const b of this.blocks) b.y += b.v * dt;
    this.blocks = this.blocks.filter((b) => b.y < s.y + s.h);
    const hit = this.blocks.find((b) => this.ship.x > b.x - 8 && this.ship.x < b.x + b.w + 8 && this.ship.y > b.y - 6 && this.ship.y < b.y + b.h + 6);
    if (hit && this.hurt <= 0) {
      this.blocks.splice(this.blocks.indexOf(hit), 1);
      this.lives -= 1;
      this.hurt = 1;
      sound.thud();
      if (this.lives <= 0) return this.end(false);
    }
    const coin = Math.min(COINS, Math.floor(this.clock / PER_COIN) + 1);
    if (coin !== this.coin) {
      this.coin = coin;
      sound.blip();
    }
    this.status.setText(t('games.pisonet.status', { coin, total: COINS, lives: this.lives }));
    this.draw();
    if (this.clock >= COINS * PER_COIN) this.end(true);
  }

  draw() {
    const { gfx, screen: s, ship } = this;
    gfx.clear();
    gfx.fillStyle(0x0d1a12, 1).fillRect(s.x, s.y, s.w, s.h);
    gfx.fillStyle(0x7ee08a, 1);
    for (const b of this.blocks) gfx.fillRect(b.x, b.y, b.w, b.h);
    if (this.hurt <= 0 || Math.floor(this.hurt * 10) % 2) {
      gfx.fillStyle(0xf3d9a4, 1).fillTriangle(ship.x, ship.y - 10, ship.x - 9, ship.y + 7, ship.x + 9, ship.y + 7);
    }
    const left = 1 - ((this.clock % PER_COIN) / PER_COIN);
    gfx.fillStyle(0xe8c14a, 1).fillRect(s.x, s.y + s.h - 4, s.w * left, 4);
  }
}
