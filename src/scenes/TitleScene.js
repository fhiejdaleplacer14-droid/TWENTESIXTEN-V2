import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import settings, { saveSettings } from '../systems/Settings.js';
import { loadSave } from '../systems/Save.js';
import { PIXEL, SERIF } from '../systems/Fonts.js';
import { t, LANGS, lang, setLang, guessLang } from '../systems/Lang.js';
import TouchPad from '../systems/TouchPad.js';
import stage from '../stage/Stage.js';

const GOLD = '#f3d9a4';
const DIM = '#a89678';
const LEFT = 78;
const PANEL_X = 588;
const PANEL_H = 370;
const KEYS = ['W A S D', 'SHIFT', 'E', 'Q', 'R'];
const SETTINGS = ['volume', 'textSpeed', 'effects', 'language', 'fullscreen'];

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create({ reopen = null, row = 0 } = {}) {
    const { height } = this.scale;
    const quick = Boolean(reopen);
    this.save = loadSave();
    this.menu = this.save ? ['continue', 'newGame', 'controls', 'settings', 'credits'] : ['start', 'controls', 'settings', 'credits'];
    this.touch = TouchPad.likely();
    this.scene.launch('Backdrop');
    this.scene.bringToTop();
    this.events.once('shutdown', () => this.scene.stop('Backdrop'));

    if (!this.textures.exists('menushade')) {
      const tex = this.textures.createCanvas('menushade', 640, 4);
      const ctx = tex.getContext();
      const g = ctx.createLinearGradient(0, 0, 640, 0);
      g.addColorStop(0, 'rgba(14,9,6,0.96)');
      g.addColorStop(0.6, 'rgba(14,9,6,0.8)');
      g.addColorStop(1, 'rgba(14,9,6,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 640, 4);
      tex.refresh();
    }
    this.add.image(0, 0, 'menushade').setOrigin(0).setDisplaySize(700, height);

    const title = this.add.text(LEFT - 3, 112, 'TWENTESIXTEN', { fontFamily: SERIF, fontSize: '54px', color: '#f8e7c0', letterSpacing: 5 }).setShadow(0, 3, '#0b0705', 8, false, true);
    const rule = this.add.rectangle(LEFT, 192, 330, 2, 0xf3d9a4, 0.8).setOrigin(0, 0.5).setScale(0, 1);

    this.marker = this.add.rectangle(LEFT, 0, 4, 22, 0xf3d9a4).setOrigin(0, 0.5).setAlpha(0);
    this.items = this.menu.map((id, i) => {
      const item = this.add.text(LEFT + 20, 238 + i * 40, t(`ui.menu.${id}`), { fontFamily: PIXEL, fontSize: '23px', color: DIM }).setOrigin(0, 0.5).setAlpha(0);
      item.setInteractive({ useHandCursor: true });
      item.on('pointerover', () => this.state === 'main' && this.select(i));
      item.on('pointerdown', () => {
        if (this.state === 'language') return;
        if (this.state !== 'main') this.back();
        this.select(i);
        this.confirm();
      });
      return item;
    });
    this.hint = this.add.text(LEFT, height - 44, '', { fontFamily: PIXEL, fontSize: '13px', color: DIM }).setAlpha(0);
    if (this.save) {
      const goal = t(`story.objectives.${this.save.objective}`);
      const where = goal.length > 38 ? `${goal.slice(0, 37)}…` : goal;
      this.note = this.add.text(LEFT + 170, this.items[0].y + 1, where, { fontFamily: PIXEL, fontSize: '13px', fontStyle: 'italic', color: DIM }).setOrigin(0, 0.5).setAlpha(0);
    }

    this.panel = this.add.container(PANEL_X, 104).setAlpha(0);
    this.panel.add(this.add.rectangle(0, 0, 344, PANEL_H, 0x140e0a, 0.88).setOrigin(0).setStrokeStyle(1, 0xf3d9a4, 0.7));
    this.panel.add(this.add.rectangle(24, 58, 296, 1, 0xf3d9a4, 0.4).setOrigin(0));
    this.heading = this.add.text(24, 22, '', { fontFamily: SERIF, fontSize: '22px', color: GOLD, letterSpacing: 2 });
    this.body = this.add.container(24, 78);
    this.panel.add([this.heading, this.body]);

    this.state = 'main';
    this.index = 0;
    this.row = 0;
    this.leaving = false;
    const first = !settings.lang;

    const later = (ms) => (quick ? 0 : ms);
    this.cameras.main.fadeIn(later(1400), 0, 0, 0);
    stage.fadeTo(0, 0);
    this.time.delayedCall(30, () => stage.fadeTo(1, later(1400)));
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, y: 108, duration: later(1600), delay: later(500), ease: 'Sine.easeOut' });
    this.tweens.add({ targets: rule, scaleX: 1, duration: later(900), delay: later(1300), ease: 'Cubic.easeOut' });
    if (!first) {
      this.items.forEach((item, i) => this.tweens.add({ targets: item, alpha: 1, x: { from: LEFT + 6, to: LEFT + 20 }, duration: later(500), delay: later(1700 + i * 120), ease: 'Sine.easeOut' }));
      this.tweens.add({ targets: [this.marker, this.note].filter(Boolean), alpha: 1, duration: later(600), delay: later(2300) });
    }
    this.tweens.add({ targets: this.hint, alpha: 1, duration: later(600), delay: later(2300) });

    this.select(0, true);
    if (first) {
      const guess = guessLang();
      this.row = LANGS.findIndex(([code]) => code === guess);
      this.open('language', later(1700));
    } else if (reopen) {
      this.select(this.menu.indexOf(reopen), true);
      this.row = row;
      this.open(reopen, 0);
    }
    this.setHint();

    const keys = this.input.keyboard;
    keys.on('keydown', (e) => {
      sound.init();
      const k = e.code;
      if (k === 'ArrowUp' || k === 'KeyW') this.step(-1);
      else if (k === 'ArrowDown' || k === 'KeyS') this.step(1);
      else if (k === 'ArrowLeft' || k === 'KeyA') this.adjust(-1);
      else if (k === 'ArrowRight' || k === 'KeyD') this.adjust(1);
      else if (k === 'Enter' || k === 'Space' || k === 'KeyE') this.confirm();
      else if (k === 'Escape' || k === 'Backspace') this.back();
    });
    this.input.on('pointerdown', () => sound.init());
    if (this.input.gamepad) {
      this.input.gamepad.on('down', (pad, button) => {
        sound.init();
        const act = { 12: () => this.step(-1), 13: () => this.step(1), 14: () => this.adjust(-1), 15: () => this.adjust(1), 0: () => this.confirm(), 1: () => this.back() }[button.index];
        if (act) act();
      });
    }
  }

  select(i, quiet = false) {
    if (i === this.index && !quiet) return;
    this.index = i;
    if (!quiet) sound.blip();
    this.items.forEach((item, n) => {
      item.setColor(n === i ? '#fff3d6' : DIM);
      this.tweens.add({ targets: item, x: LEFT + (n === i ? 30 : 20), duration: 160, ease: 'Sine.easeOut' });
    });
    this.tweens.add({ targets: this.marker, y: this.items[i].y, duration: 160, ease: 'Sine.easeOut' });
  }

  step(by) {
    if (this.leaving) return;
    if (this.state === 'main') return this.select(Phaser.Math.Wrap(this.index + by, 0, this.menu.length));
    const rows = { settings: SETTINGS.length, language: LANGS.length }[this.state];
    if (!rows) return;
    this.row = Phaser.Math.Wrap(this.row + by, 0, rows);
    sound.blip();
    this.fill();
  }

  adjust(by, wrap = false) {
    if (this.state !== 'settings' || this.leaving) return;
    const which = SETTINGS[this.row];
    if (which === 'volume') settings.volume = wrap ? Phaser.Math.Wrap(settings.volume + by, 0, 11) : Phaser.Math.Clamp(settings.volume + by, 0, 10);
    if (which === 'textSpeed') settings.textSpeed = Phaser.Math.Wrap(settings.textSpeed + by, 0, 3);
    if (which === 'effects') settings.effects = Phaser.Math.Wrap(settings.effects + by, 0, 3);
    if (which === 'fullscreen') this.scale.toggleFullscreen();
    if (which === 'language') {
      const now = LANGS.findIndex(([code]) => code === lang());
      return this.relanguage(LANGS[Phaser.Math.Wrap(now + by, 0, LANGS.length)][0], 'settings', this.row);
    }
    saveSettings();
    sound.setVolume();
    sound.select();
    this.time.delayedCall(60, () => this.fill());
  }

  relanguage(code, reopen, row = 0) {
    setLang(code);
    sound.select();
    this.scene.restart({ reopen, row });
  }

  confirm() {
    if (this.leaving) return;
    if (this.state === 'language') return this.relanguage(LANGS[this.row][0], null);
    if (this.state === 'settings') return this.adjust(1, true);
    if (this.state !== 'main') return this.back();
    const choice = this.menu[this.index];
    sound.select();
    if (choice === 'continue') return this.start(this.save);
    if (choice === 'start' || choice === 'newGame') return this.start(null);
    this.row = 0;
    this.open(choice);
  }

  open(state, delay = 0) {
    this.state = state;
    this.fill();
    this.setHint();
    this.tweens.add({ targets: this.panel, alpha: 1, x: { from: PANEL_X + 20, to: PANEL_X }, duration: 260, delay, ease: 'Sine.easeOut' });
  }

  back() {
    if (this.state === 'main' || this.state === 'language' || this.leaving) return;
    this.state = 'main';
    sound.page();
    this.setHint();
    this.tweens.add({ targets: this.panel, alpha: 0, x: PANEL_X + 20, duration: 200 });
  }

  start(save) {
    this.leaving = true;
    this.tweens.add({ targets: this.items[this.index], x: LEFT + 44, duration: 500, ease: 'Sine.easeOut' });
    this.cameras.main.fadeOut(1100, 0, 0, 0);
    stage.fadeTo(0, 1100);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Neighborhood', { save }));
  }

  setHint() {
    const hints = t(`ui.hints.${this.touch ? 'touch' : 'keys'}`);
    this.hint.setText(hints[this.state] || hints.other);
  }

  fill() {
    this.heading.setText(this.state === 'language' ? t('ui.pickLanguage') : t(`ui.menu.${this.state}`)).setFontSize(this.state === 'language' ? 17 : 22);
    this.body.removeAll(true);
    const line = (x, y, text, color = '#f3e7cf', size = 15) => this.body.add(this.add.text(x, y, text, { fontFamily: PIXEL, fontSize: `${size}px`, color }));

    if (this.state === 'controls') {
      ['walk', 'run', 'talk', 'photo', 'letter'].forEach((what, i) => {
        const cap = this.add.text(0, i * 38, KEYS[i], { fontFamily: PIXEL, fontSize: '15px', fontStyle: 'bold', color: '#17110d', backgroundColor: GOLD, padding: { x: 8, y: 4 } });
        this.body.add(cap);
        line(0, i * 38 + 25, t(`ui.controls.${what}`), DIM, 14);
      });
      ['gamepad', 'touch'].forEach((how, i) => {
        line(0, 204 + i * 42, t(`ui.controls.${how}Label`), GOLD, 15);
        line(0, 204 + i * 42 + 19, t(`ui.controls.${how}`), DIM, 13);
      });
    } else if (this.state === 'credits') {
      t('ui.credits').forEach((text, i) => line(0, i * 16, text, text.startsWith(' ') ? '#f3e7cf' : GOLD, 13));
    } else if (this.state === 'language') {
      LANGS.forEach(([code, name], i) => this.choice(i, i * 56, name, '', () => this.relanguage(code, null)));
    } else {
      const s = t('ui.settings');
      const values = {
        volume: '■'.repeat(settings.volume) + '□'.repeat(10 - settings.volume),
        textSpeed: s.speeds[settings.textSpeed],
        effects: s.effectLevels[settings.effects],
        language: LANGS.find(([code]) => code === lang())[1],
        fullscreen: this.scale.isFullscreen ? s.on : s.off,
      };
      SETTINGS.forEach((which, i) =>
        this.choice(i, i * 52, s[which], values[which], () => {
          this.row = i;
          this.adjust(1, true);
        }),
      );
    }
  }

  choice(i, y, label, value, onPick) {
    const on = i === this.row;
    const tall = value ? 46 : 40;
    if (on) this.body.add(this.add.rectangle(-10, y - 8, 316, tall, 0xf3d9a4, 0.1).setOrigin(0));
    const text = (dy, words, color, size) => this.body.add(this.add.text(0, y + dy, words, { fontFamily: PIXEL, fontSize: `${size}px`, color }));
    if (value) {
      text(0, label, on ? '#fff3d6' : DIM, 15);
      text(19, `${on ? '‹ ' : '  '}${value}${on ? ' ›' : ''}`, on ? GOLD : DIM, 14);
    } else {
      text(2, `${on ? '› ' : '  '}${label}`, on ? '#fff3d6' : DIM, 19);
    }
    const hit = this.add.zone(-10, y - 8, 316, tall).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onPick);
    this.body.add(hit);
  }
}
