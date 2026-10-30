import Phaser from 'phaser';
import { TILE, DIRS, CAST, recolor } from '../art/cast.js';
import { DRAWN, paint } from '../art/drawn.js';
import { loadSave } from '../systems/Save.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const frame = { frameWidth: TILE, frameHeight: TILE };
    this.load.spritesheet('city', 'assets/images/kenney-roguelike-modern-city.png', frame);
    this.load.image('people', 'assets/images/kenney-rpg-urban-characters.png');
  }

  create() {
    for (const [key, who] of Object.entries(CAST)) this.makePerson(key, who);
    for (const [key, { size, rects }] of Object.entries(DRAWN)) {
      this.canvas(key, size[0], size[1], (ctx) => paint(ctx, rects));
    }
    this.makeWalk('dog');
    this.makeWalk('chicken', 2);
    this.makeWalk('rooster', 3);
    this.anims.create({ key: 'bird_fly', frames: [{ key: 'bird_a' }, { key: 'bird_b' }], frameRate: 7, repeat: -1 });
    this.canvas('dot', 4, 4, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 0, 2, 4);
      ctx.fillRect(0, 1, 4, 2);
    });
    const skip = new URLSearchParams(location.search);
    if (skip.has('debug') && skip.has('play')) this.scene.start('Neighborhood', { save: loadSave() });
    else this.scene.start('Title');
  }

  makePerson(key, who) {
    const tex = this.textures.createCanvas(key, TILE * 4, TILE * 3);
    tex.getContext().drawImage(recolor(this.textures.get('people').getSourceImage(), who), 0, 0);
    tex.refresh();
    this.canvas(`face_${key}`, 14, 13, (face) => face.drawImage(tex.getSourceImage(), TILE + 1, 0, 14, 13, 0, 0, 14, 13));
    DIRS.forEach((dir, col) => {
      for (let n = 0; n < 3; n++) tex.add(`${dir}_${n}`, 0, col * TILE, n * TILE, TILE, TILE);
      const frames = [1, 0, 2, 0].map((n) => ({ key, frame: `${dir}_${n}` }));
      if (!this.anims.exists(`${key}_walk_${dir}`)) this.anims.create({ key: `${key}_walk_${dir}`, frames, frameRate: 8, repeat: -1 });
    });
  }

  makeWalk(key, legRows = 3) {
    const src = this.textures.get(key).getSourceImage();
    const { width: w, height: h } = src;
    const half = Math.floor(w / 2);
    const top = h - legRows;
    ['step1', 'step2'].forEach((suffix, i) => {
      this.canvas(`${key}_${suffix}`, w, h, (ctx) => {
        const lifted = i * half;
        const planted = half - lifted;
        ctx.drawImage(src, 0, 0, w, top, 0, 0, w, top);
        ctx.clearRect(lifted, top - 1, w - half, 1);
        ctx.drawImage(src, lifted, top, w - half, legRows, lifted, top - 1, w - half, legRows);
        ctx.drawImage(src, planted, top, w - half, legRows, planted, top, w - half, legRows);
      });
    });
    if (!this.anims.exists(`${key}_walk`)) {
      this.anims.create({ key: `${key}_walk`, frames: [{ key: `${key}_step1` }, { key }, { key: `${key}_step2` }, { key }], frameRate: 9, repeat: -1 });
    }
  }

  canvas(key, w, h, draw) {
    const tex = this.textures.createCanvas(key, w, h);
    draw(tex.getContext());
    tex.refresh();
  }
}
