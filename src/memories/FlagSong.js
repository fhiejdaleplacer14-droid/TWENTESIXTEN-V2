import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import MiniGame from './MiniGame.js';

const SONG = [
  [1.2, 392], [1.8, 392], [2.4, 440], [3.0, 392], [3.6, 523], [4.6, 494],
  [5.6, 392], [6.2, 392], [6.8, 440], [7.4, 392], [8.0, 587], [9.0, 523],
  [10.0, 523], [10.6, 659], [11.2, 587], [12.0, 523], [12.8, 494], [13.8, 523],
];
const NEED = 12;
const WINDOW = 0.16;
const LEAD = 2.2;

export default class FlagSong extends MiniGame {
  constructor(scene, at, done) {
    super(scene, at, done);
    const box = this.panel(560, 70);
    this.lane = { x0: box.x + 50, x1: box.x + box.w - 20, y: box.y + box.h / 2 };
    this.gfx = this.mark(this.ui.add.graphics());
    this.notes = SONG.map(([time, freq]) => ({ time, freq, state: 'coming' }));
    this.clock = -0.5;
    this.hits = 0;
    this.wrong = 0;
    this.flash = 0;
    this.title.setText(t('games.school.how'));
  }

  press() {
    const note = this.notes.find((n) => n.state === 'coming' && Math.abs(n.time - this.clock) < WINDOW);
    if (note) {
      note.state = 'hit';
      this.hits += 1;
      this.flash = 0.18;
      sound.tone(note.freq, 0.3, { type: 'triangle', vol: 0.05 });
    } else {
      this.wrong += 1;
      sound.tone(140, 0.08, { type: 'square', vol: 0.02 });
    }
  }

  update(delta) {
    if (this.over) return;
    this.clock += delta / 1000;
    this.flash -= delta / 1000;
    for (const n of this.notes) if (n.state === 'coming' && this.clock - n.time > WINDOW) n.state = 'missed';
    this.status.setText(t('games.school.status', { n: this.sung, total: SONG.length }));
    this.draw();
    if (this.clock > SONG[SONG.length - 1][0] + 0.6) this.end(this.sung >= NEED);
  }

  get sung() {
    return Math.max(0, this.hits - this.wrong);
  }

  draw() {
    const { gfx, lane } = this;
    gfx.clear();
    gfx.lineStyle(2, 0x6b513a).lineBetween(lane.x0, lane.y, lane.x1, lane.y);
    gfx.lineStyle(3, this.flash > 0 ? 0xfff3d6 : 0xe8c14a).strokeCircle(lane.x0, lane.y, 16);
    for (const n of this.notes) {
      if (n.state === 'hit') continue;
      const k = (n.time - this.clock) / LEAD;
      if (k > 1 || k < -0.2) continue;
      const x = lane.x0 + (lane.x1 - lane.x0) * k;
      gfx.fillStyle(n.state === 'missed' ? 0x6b513a : 0xf3d9a4).fillCircle(x, lane.y - (n.freq - 470) / 12, 8);
    }
  }
}
