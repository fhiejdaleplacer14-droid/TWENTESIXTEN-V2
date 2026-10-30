import Phaser from 'phaser';
import { PIXEL } from './Fonts.js';

const RADIUS = 54;
const DEAD = 0.18;

export default class TouchPad {
  constructor(scene, { act, look }) {
    this.scene = scene;
    this.vector = { x: 0, y: 0 };
    this.stickId = null;
    this.on = false;
    const { width, height } = scene.scale;
    const depth = 1200;
    this.home = { x: 120, y: height - 120 };

    this.base = scene.add.circle(this.home.x, this.home.y, RADIUS + 8, 0x17110d, 0.35).setStrokeStyle(2, 0xf3d9a4, 0.5).setDepth(depth);
    this.knob = scene.add.circle(this.home.x, this.home.y, 24, 0xf3d9a4, 0.55).setDepth(depth + 1);

    const button = (x, y, r, label, size, onPress) => {
      const ring = scene.add.circle(x, y, r, 0x17110d, 0.45).setStrokeStyle(2, 0xf3d9a4, 0.75).setDepth(depth);
      const text = scene.add.text(x, y, label, { fontFamily: PIXEL, fontSize: size, fontStyle: 'bold', color: '#f3d9a4' }).setOrigin(0.5).setDepth(depth + 1);
      ring.setInteractive(new Phaser.Geom.Circle(r, r, r + 10), Phaser.Geom.Circle.Contains);
      ring.on('pointerdown', () => {
        scene.tweens.add({ targets: [ring, text], scale: { from: 0.86, to: 1 }, duration: 160 });
        onPress();
      });
      return { ring, text, parts: [ring, text] };
    };
    this.act = button(width - 92, height - 104, 44, 'E', '26px', act);
    this.photo = button(width - 178, height - 62, 28, 'Q', '18px', () => look('photo'));
    this.letter = button(width - 160, height - 150, 28, 'R', '18px', () => look('letter'));
    this.all = [this.base, this.knob, ...this.act.parts, ...this.photo.parts, ...this.letter.parts];
    this.all.forEach((o) => o.setVisible(false));
    this.items = new Set();

    scene.input.addPointer(2);
    scene.input.on('pointerdown', (p, over) => this.down(p, over, act));
    scene.input.on('pointermove', (p) => this.move(p));
    scene.input.on('pointerup', (p) => this.up(p));
    scene.input.on('pointerupoutside', (p) => this.up(p));
  }

  static likely() {
    return Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  show() {
    if (this.on) return;
    this.on = true;
    this.all.forEach((o) => o.setVisible(true));
    this.carry(this.items);
  }

  hush(on) {
    if (this.hushed === on || !this.on) return;
    this.hushed = on;
    if (on) this.up({ id: this.stickId });
    this.all.forEach((o) => o.setVisible(!on));
    if (!on) this.carry(this.items);
  }

  carry(items) {
    this.items = items;
    if (!this.on || this.hushed) return;
    this.photo.parts.forEach((o) => o.setVisible(items.has('photo')));
    this.letter.parts.forEach((o) => o.setVisible(items.has('letter')));
  }

  dim(on) {
    if (!this.on) return;
    this.scene.tweens.add({ targets: [this.base, this.knob, ...this.photo.parts, ...this.letter.parts], alpha: on ? 0.15 : 1, duration: 400 });
  }

  down(p, over, act) {
    if (!p.wasTouch) return;
    this.show();
    if (over.length) return;
    if (this.hushed) act();
    else if (p.x < this.scene.scale.width * 0.45 && this.stickId === null) {
      this.stickId = p.id;
      this.origin = { x: p.x, y: p.y };
      this.base.setPosition(p.x, p.y);
      this.knob.setPosition(p.x, p.y);
    } else if (p.x >= this.scene.scale.width * 0.45) {
      act();
    }
  }

  move(p) {
    if (p.id !== this.stickId) return;
    const dx = p.x - this.origin.x;
    const dy = p.y - this.origin.y;
    const len = Math.hypot(dx, dy);
    const k = len > RADIUS ? RADIUS / len : 1;
    this.knob.setPosition(this.origin.x + dx * k, this.origin.y + dy * k);
    const push = Math.min(1, len / RADIUS);
    this.vector = push < DEAD ? { x: 0, y: 0 } : { x: (dx / len) * push, y: (dy / len) * push };
  }

  up(p) {
    if (p.id !== this.stickId) return;
    this.stickId = null;
    this.vector = { x: 0, y: 0 };
    this.base.setPosition(this.home.x, this.home.y);
    this.knob.setPosition(this.home.x, this.home.y);
  }
}
