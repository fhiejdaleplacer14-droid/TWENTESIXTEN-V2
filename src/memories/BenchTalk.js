import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import { PIXEL } from '../systems/Fonts.js';
import MiniGame from './MiniGame.js';

export default class BenchTalk extends MiniGame {
  constructor(scene, at, done) {
    super(scene, at, done);
    this.choices = t('games.bench.choices');
    const { width, height } = this.ui.scale;
    this.rows = this.choices.map((c, i) =>
      this.mark(this.ui.add.text(width / 2, height - 190 + i * 34, c.say, { fontFamily: PIXEL, fontSize: '18px', color: '#f3e7cf', stroke: '#2a1c12', strokeThickness: 5 }).setOrigin(0.5)),
    );
    this.pick = 0;
    this.held = 0;
    this.title.setText(t('games.bench.how'));
    this.show();
  }

  show() {
    this.rows.forEach((row, i) => row.setColor(i === this.pick ? '#e8c14a' : '#f3e7cf').setText(`${i === this.pick ? '▸ ' : '  '}${this.choices[i].say}`));
  }

  update() {
    if (this.over) return;
    const y = Math.round(this.scene.heading().y);
    if (y && y !== this.held) {
      this.pick = (this.pick + y + this.choices.length) % this.choices.length;
      sound.blip();
      this.show();
    }
    this.held = y;
  }

  press() {
    if (this.over) return;
    const c = this.choices[this.pick];
    this.scene.story.flags.add(`bench_${c.key}`);
    sound.select();
    this.end(true, [c.say, c.reply, c.after].filter(Boolean));
  }
}
