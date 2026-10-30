import Phaser from 'phaser';
import stage from '../stage/Stage.js';
import music from '../systems/Music.js';
import sound from '../systems/Sound.js';
import { t, nameOf } from '../systems/Lang.js';

const SPEED = 38;
const CAST = ['lola', 'tonyo', 'cora', 'linda', 'mila', 'berto', 'rosa', 'karding', 'vendor'];
const TEAM = [
  ['fhiej', 'Fhiej Dale Placer', -7],
  ['aira', 'Aira Jane Montero', 4],
  ['jomar', 'Jomar Ceballos', -3],
];

export default class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  create({ hits = 0 } = {}) {
    this.done = false;
    this.started = this.time.now;
    this.film();
    stage.fadeTo(0, 2500);
    const ui = this.scene.get('UI');
    if (ui && ui.title) {
      ui.tweens.killTweensOf(ui.title);
      ui.tweens.add({ targets: ui.title, alpha: 0, duration: 1500 });
    }
    this.sing(['ili', 'dandansoy']);
    this.roll(hits);

    const go = () => this.time.now - this.started > 3000 && this.finish();
    this.input.keyboard.on('keydown-SPACE', go);
    this.input.keyboard.on('keydown-E', go);
    this.input.keyboard.on('keydown-ENTER', go);
    this.input.on('pointerdown', go);
    if (this.input.gamepad) this.input.gamepad.on('down', go);
    this.events.once('shutdown', () => this.clear());
  }

  sing(songs, i = 0) {
    if (this.done) return;
    this.song = music.play(songs[i % songs.length], 'guitar', sound.master, 0.9);
    if (this.song) this.time.delayedCall((this.song.length + 1.5) * 1000, () => this.sing(songs, i + 1));
  }

  film() {
    const video = document.getElementById('film');
    if (!video) return;
    if (!video.src) video.src = 'assets/ending/kites.mp4';
    video.playbackRate = 0.8;
    video.currentTime = 0;
    video.play().catch(() => {});
    video.style.opacity = '1';
    this.video = video;
  }

  roll(hits) {
    const box = document.getElementById('credits');
    if (!box) return;
    this.box = box;
    box.replaceChildren();
    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    };
    const roll = el('div', 'roll');
    roll.append(el('div', 'title', 'TWENTESIXTEN'), el('div', 'gap'));

    roll.append(el('div', 'head', t('credits.starring')));
    const face = (id) => {
      const img = el('img');
      img.src = this.textures.get(`face_${id}`).getSourceImage().toDataURL();
      img.alt = '';
      return img;
    };
    for (const id of CAST) {
      const row = el('div', 'cast');
      row.append(face(id), el('span', '', nameOf(id)));
      roll.append(row);
    }
    roll.append(el('div', 'head', t('credits.and')));
    const you = el('div', 'cast');
    you.append(face('player'), el('span', '', t('credits.you')));
    roll.append(you, el('div', 'gap'));

    roll.append(el('div', 'head', t('credits.by')));
    const team = el('div', 'team');
    TEAM.forEach(([id, name, tilt], i) => {
      const member = el('div', 'member');
      const sticker = el('img', 'sticker');
      sticker.src = `assets/ending/sticker-${id}.png`;
      sticker.alt = name;
      sticker.style.setProperty('--tilt', `${tilt}deg`);
      sticker.style.animationDelay = `${-i * 0.7}s`;
      const label = el('div', 'name', name);
      label.style.transform = `rotate(${tilt / 2}deg)`;
      member.append(sticker, label);
      team.append(member);
    });
    roll.append(team, el('div', 'gap'));

    for (const line of [...t('ui.credits'), '', t('credits.footage'), t('credits.footageBy')]) {
      if (!line) roll.append(el('div', 'line', '\u00a0'));
      else roll.append(el('div', line.startsWith(' ') ? 'line' : 'head', line.trim()));
    }
    if (hits) roll.append(el('div', 'gap'), el('div', 'line', t('story.hits', { n: hits })));
    roll.append(el('div', 'gap'));

    this.card = el('div', 'card', t('credits.thanks'));
    box.append(roll, this.card, el('div', 'skip', t('credits.skip')));
    box.style.display = 'block';
    requestAnimationFrame(() => {
      box.classList.add('on');
      const unit = Math.min(window.innerWidth / 960, window.innerHeight / 540);
      const travel = window.innerHeight + roll.offsetHeight;
      roll.style.transition = `transform ${travel / (SPEED * unit)}s linear 2.2s`;
      roll.style.transform = `translateY(${-travel}px)`;
      roll.addEventListener('transitionend', () => (this.card.style.opacity = '1'), { once: true });
    });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    if (this.song) this.song.stop(1.2);
    if (this.box) this.box.style.transition = 'opacity 0.9s ease';
    if (this.box) this.box.style.opacity = '0';
    if (this.video) this.video.style.opacity = '0';
    this.time.delayedCall(950, () => {
      this.scene.stop('Neighborhood');
      this.scene.start('Title');
    });
  }

  clear() {
    if (this.box) {
      this.box.replaceChildren();
      this.box.classList.remove('on');
      Object.assign(this.box.style, { display: 'none', opacity: '', transition: '' });
    }
    if (this.video) {
      this.video.style.opacity = '0';
      const video = this.video;
      setTimeout(() => video.pause(), 2000);
    }
  }
}
