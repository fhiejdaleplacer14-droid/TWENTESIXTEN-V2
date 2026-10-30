import Phaser from 'phaser';
import Dialogue from '../systems/Dialogue.js';
import TouchPad from '../systems/TouchPad.js';
import sound from '../systems/Sound.js';
import { PIXEL, SERIF } from '../systems/Fonts.js';
import { t } from '../systems/Lang.js';
import story from '../data/story.json';
import { city } from '../world/World.js';

const FONT = PIXEL;
const BAR = 50;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create({ save = null } = {}) {
    const { width, height } = this.scale;
    const touch = TouchPad.likely();
    this.items = new Set();
    this.open = null;

    this.bars = [this.add.rectangle(0, -BAR, width, BAR, 0x0b0705).setOrigin(0), this.add.rectangle(0, height, width, BAR, 0x0b0705).setOrigin(0)];

    this.objective = this.add
      .text(20, 18, '', { fontFamily: FONT, fontSize: '15px', color: '#f3e7cf', backgroundColor: '#17110dcc', padding: { x: 11, y: 7 } })
      .setAlpha(0);
    this.errand = this.add.text(20, 56, '', { fontFamily: FONT, fontSize: '13px', color: '#e8c79a', backgroundColor: '#17110dcc', padding: { x: 11, y: 5 } }).setVisible(false);
    this.keys = this.add.text(20, height - 32, '', { fontFamily: FONT, fontSize: '14px', color: '#f3d9a4', stroke: '#17110d', strokeThickness: 3 });
    this.help = this.add
      .text(width / 2, height - 30, t(touch ? 'ui.hud.helpTouch' : 'ui.hud.helpKeys'), { fontFamily: FONT, fontSize: '15px', color: '#f3e7cf', stroke: '#17110d', strokeThickness: 3 })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.help, alpha: 0, delay: 9000, duration: 1500 });

    this.found = this.add.text(width - 20, height - 32, '', { fontFamily: FONT, fontSize: '14px', color: '#f3d9a4', stroke: '#17110d', strokeThickness: 3 }).setOrigin(1, 0);
    this.dialogue = new Dialogue(this);
    this.photo = this.makePhoto(width / 2, height / 2 - 30).setVisible(false);
    this.letter = this.makeLetter(width / 2, height / 2).setVisible(false);

    this.title = this.add.text(width / 2, height - 150, 'TWENTESIXTEN', { fontFamily: SERIF, fontSize: '48px', color: '#f3d9a4', letterSpacing: 4 }).setOrigin(0.5).setAlpha(0);

    const world = this.scene.get('Neighborhood');
    this.world = world;
    this.touch = new TouchPad(this, { act: () => world.act(), look: (item) => world.look(item) });
    if (touch) this.touch.show();

    this.setObjective(save ? save.objective : story.start.objective, true);
    if (save) {
      this.setErrand(save.errand || '', true);
      save.items.forEach((item) => this.give(item, true));
      this.setMemories(save.found, story.memories.length);
    }
  }

  update() {
    this.touch.hush(this.dialogue.active || !!this.open || this.world.ended);
  }

  setObjective(key, quiet = false) {
    this.objectiveKey = key;
    const text = t(`story.objectives.${key}`);
    if (!quiet) sound.objective();
    this.tweens.add({
      targets: this.objective,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        this.objective.setText(text);
        this.tweens.add({ targets: this.objective, alpha: 1, duration: 600 });
      },
    });
  }

  setErrand(key, quiet = false) {
    this.errandKey = key;
    this.errand.setText(key ? t('ui.hud.errand', { text: t(`story.errands.${key}`) }) : '').setVisible(!!key);
    if (key && !quiet) sound.select();
  }

  setMemories(found, total) {
    const text = found ? t('ui.hud.memories', { n: found, total }) : '';
    if (text === this.found.text) return;
    this.found.setText(text);
    this.tweens.add({ targets: this.found, scale: { from: 1.25, to: 1 }, duration: 500, ease: 'Back.easeOut' });
  }

  setCinematic(on) {
    const { height } = this.scale;
    this.tweens.add({ targets: this.bars[0], y: on ? 0 : -BAR, duration: 700, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.bars[1], y: on ? height - BAR : height, duration: 700, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: [this.objective, this.errand, this.keys, this.found], alpha: on ? 0 : 1, duration: 400 });
    this.touch.dim(on);
    this.hideHelp();
  }

  hideHelp() {
    this.tweens.killTweensOf(this.help);
    this.help.setVisible(false);
  }

  give(item, quiet = false) {
    this.items.add(item);
    if (!quiet) sound.select();
    this.keys.setText([this.items.has('photo') && t('ui.hud.photo'), this.items.has('letter') && t('ui.hud.letter')].filter(Boolean).join('     '));
    this.touch.carry(this.items);
  }

  toggle(item) {
    if (this.open) {
      this[this.open].setVisible(false);
      const same = this.open === item;
      this.open = null;
      sound.page();
      const done = this.onClose;
      this.onClose = null;
      if (done) done();
      if (done || same || !item) return true;
    }
    if (!item || !this.items.has(item)) return false;
    if (item === 'letter') this.setLetter(t('story.letter'), t('ui.hud.foldAgain'));
    if (item === 'photo') this.caption.setText(t(this.items.has('letter') ? 'story.photo.after' : 'story.photo.before'));
    this.open = item;
    this[item].setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this[item], alpha: 1, duration: 250 });
    sound.page();
    return true;
  }

  setLetter(lines, hint) {
    this.letterText.setText(lines.join('\n'));
    this.letterHint.setText(hint);
  }

  read(lines, done) {
    this.setLetter(lines, t('ui.hud.foldIt'));
    this.open = 'letter';
    this.onClose = done;
    this.letter.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.letter, alpha: 1, duration: 600 });
    sound.page();
  }

  whisper(text) {
    const { width, height } = this.scale;
    const line = this.add
      .text(width / 2, height - 200, text, { fontFamily: FONT, fontSize: '22px', fontStyle: 'italic', color: '#fff3d6', align: 'center', stroke: '#2a1c12', strokeThickness: 5, wordWrap: { width: width - 160 } })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: line, alpha: 1, duration: 1600, hold: 2600, yoyo: true });
  }

  makePhoto(x, y) {
    const box = this.add.container(x, y).setDepth(1100);
    const dim = this.add.rectangle(0, 30, 1000, 600, 0x0b0705, 0.72);
    const print = this.add.container(0, 0).setScale(1.5);
    const paper = this.add.rectangle(0, 0, 236, 196, 0xf2ead8).setAngle(-2);
    const sky = this.add.rectangle(0, -14, 208, 144, 0xd9c7a0);
    box.add([dim, print]);
    print.add([paper, sky]);
    for (let c = 0; c < 7; c++) {
      print.add(this.add.image(-96 + c * 32, -70, 'city', city(2, 5)).setScale(2).setOrigin(0.5));
      print.add(this.add.image(-96 + c * 32, -38, 'city', c === 0 ? city(23, 11) : c === 6 ? city(25, 11) : city(24, 11)).setScale(2).setOrigin(0.5));
      print.add(this.add.image(-96 + c * 32, -6, 'city', c === 2 || c === 3 ? city(27, 15) : city(2, 8)).setScale(2).setOrigin(0.5));
    }
    print.add(this.add.rectangle(0, 34, 208, 48, 0xb9b3a4));
    [['kid_c', -56], ['kid_me', -18], ['kid_b', 22], ['kid_a', 58]].forEach(([look, dx]) => print.add(this.add.image(dx, 30, look, 'down_0').setScale(2).setOrigin(0.5, 1)));
    print.add(this.add.image(-18, 22, 'tin'));
    print.add(this.add.rectangle(38, 50, 30, 16, 0x2a1c12, 0.3));
    print.add(this.add.ellipse(38, 39, 18, 16, 0x2a1c12, 0.3));
    print.add(this.add.rectangle(0, -14, 208, 144, 0x9a6a2f, 0.3));
    this.caption = this.add.text(0, 168, '', { fontFamily: FONT, fontSize: '16px', color: '#f3e7cf', align: 'center', lineSpacing: 6, wordWrap: { width: 640 } }).setOrigin(0.5, 0);
    box.add(this.caption);
    box.add(this.add.text(0, -196, t('ui.hud.putAway'), { fontFamily: FONT, fontSize: '13px', color: '#a8896a' }).setOrigin(0.5));
    return box;
  }

  makeLetter(x, y) {
    const box = this.add.container(x, y).setDepth(1100);
    box.add(this.add.rectangle(0, 0, 1000, 600, 0x0b0705, 0.72));
    box.add(this.add.rectangle(5, 6, 420, 420, 0x000000, 0.35).setAngle(1.5));
    const paper = this.add.rectangle(0, 0, 420, 420, 0xefe4c6).setAngle(1.5);
    box.add(paper);
    for (let i = 0; i < 14; i++) box.add(this.add.rectangle(0, -158 + i * 25, 372, 1, 0x9db3c4, 0.5).setAngle(1.5));
    this.letterText = this.add.text(-180, -188, '', { fontFamily: FONT, fontSize: '18px', fontStyle: 'italic', color: '#33415c', lineSpacing: 4 }).setAngle(1.5);
    this.letterHint = this.add.text(0, 228, '', { fontFamily: FONT, fontSize: '13px', color: '#a8896a' }).setOrigin(0.5);
    box.add([this.letterText, this.letterHint]);
    return box;
  }

  showTitle() {
    this.tweens.add({ targets: [this.objective, this.errand, this.keys, this.found], alpha: 0, duration: 800 });
    this.tweens.add({ targets: this.title, alpha: 1, duration: 3500 });
  }
}
