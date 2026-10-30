import sound from './Sound.js';
import settings from './Settings.js';
import { PIXEL } from './Fonts.js';
import { nameOf } from './Lang.js';

const TYPE_DELAY = [36, 22, 9];

export default class Dialogue {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.onDone = null;

    const { width, height } = scene.scale;
    const depth = 1000;
    this.box = scene.add.rectangle(width / 2, height - 76, width - 120, 112, 0x17110d, 0.94).setStrokeStyle(2, 0xf3d9a4).setDepth(depth);
    this.inner = scene.add.rectangle(width / 2, height - 76, width - 130, 102).setStrokeStyle(1, 0x6b513a).setDepth(depth);
    this.plate = scene.add
      .text(84, height - 147, '', { fontFamily: PIXEL, fontSize: '17px', fontStyle: 'bold', color: '#17110d', backgroundColor: '#f3d9a4', padding: { x: 10, y: 4 } })
      .setDepth(depth + 1);
    this.text = scene.add
      .text(84, height - 116, '', { fontFamily: PIXEL, fontSize: '19px', color: '#f3e7cf', lineSpacing: 6, wordWrap: { width: width - 170 } })
      .setDepth(depth + 1);
    this.hint = scene.add.text(width - 92, height - 42, '▼', { fontFamily: PIXEL, fontSize: '14px', color: '#f3d9a4' }).setDepth(depth + 1);
    scene.tweens.add({ targets: this.hint, y: height - 38, duration: 420, yoyo: true, repeat: -1 });
    this.faceY = height - 73;
    this.frame = scene.add.rectangle(116, height - 76, 88, 88, 0x3a2c20).setStrokeStyle(2, 0x8a6a48).setDepth(depth + 1);
    this.face = scene.add.image(116, this.faceY, 'face_lola').setScale(6).setDepth(depth + 1);
    this.memoryText = scene.add
      .text(width / 2, height - 96, '', { fontFamily: PIXEL, fontSize: '21px', fontStyle: 'italic', color: '#fff3d6', align: 'center', lineSpacing: 8, stroke: '#2a1c12', strokeThickness: 5, wordWrap: { width: width - 200 } })
      .setOrigin(0.5)
      .setDepth(depth + 1);
    this.setVisible(false);
  }

  setVisible(v) {
    const boxed = v && !this.memory;
    [this.box, this.inner, this.text].forEach((o) => o.setVisible(boxed));
    [this.plate, this.hint, this.frame, this.face].forEach((o) => o.setVisible(false));
    this.memoryText.setVisible(v && this.memory);
  }

  start(lines, onDone, { memory = false } = {}) {
    if (this.active || !lines || !lines.length) {
      if (onDone && !this.active) onDone();
      return;
    }
    this.active = true;
    this.memory = memory;
    this.lines = lines;
    this.index = 0;
    this.onDone = onDone || null;
    this.setVisible(true);
    this.show();
  }

  show() {
    const { width } = this.scene.scale;
    const line = this.lines[this.index];
    const match = /^@(\w+): (.*)$/s.exec(line);
    const speaker = match && !this.memory ? match[1] : null;
    const face = speaker && this.scene.textures.exists(`face_${speaker}`) ? `face_${speaker}` : null;
    this.full = match ? match[2] : line;
    this.plate.setText(speaker ? nameOf(speaker) : '').setVisible(!!speaker).setX(face ? 72 : 84);
    this.frame.setVisible(!!face);
    this.face.setVisible(!!face);
    if (face && this.face.texture.key !== face) {
      this.face.setTexture(face);
      this.scene.tweens.add({ targets: [this.face, this.frame], alpha: { from: 0, to: 1 }, duration: 180 });
    }
    this.text.setX(face ? 176 : 84).setWordWrapWidth(face ? width - 260 : width - 170);
    this.text.setColor(speaker ? '#f3e7cf' : '#d9c8a6');
    this.target = this.memory ? this.memoryText : this.text;
    this.target.setText('');
    this.hint.setVisible(false);
    this.shown = 0;
    this.typing = this.scene.time.addEvent({ delay: TYPE_DELAY[settings.textSpeed] * (this.memory ? 1.7 : 1), repeat: this.full.length - 1, callback: () => this.type() });
  }

  type() {
    this.shown += 1;
    this.target.setText(this.full.slice(0, this.shown));
    if (this.shown % 3 === 0 && this.full[this.shown - 1] !== ' ') sound.blip();
    this.face.setY(this.faceY - (this.shown % 8 < 4 ? 2 : 0));
    if (this.shown >= this.full.length) this.finishLine();
  }

  finishLine() {
    if (this.typing) this.typing.remove();
    this.typing = null;
    this.target.setText(this.full);
    this.face.setY(this.faceY);
    this.hint.setVisible(!this.memory);
  }

  advance() {
    if (!this.active) return;
    if (this.typing) {
      this.finishLine();
      return;
    }
    this.index += 1;
    if (this.index < this.lines.length) {
      this.show();
      return;
    }
    this.active = false;
    this.setVisible(false);
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  }
}
