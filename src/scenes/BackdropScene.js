import Phaser from 'phaser';
import Daylight from '../systems/Daylight.js';
import stage from '../stage/Stage.js';
import Life from '../world/Life.js';
import { buildNeighborhood, COLS, ROWS, MAIN } from '../world/neighborhood.js';
import { T } from '../world/World.js';

export default class BackdropScene extends Phaser.Scene {
  constructor() {
    super('Backdrop');
  }

  create() {
    const cam = this.cameras.main;
    cam.setVisible(false); 
    cam.setBounds(0, 0, COLS * T, ROWS * T);
    const { world, places } = buildNeighborhood(this);
    this.player = { x: -9999, y: -9999 };
    this.story = { busy: false };
    this.drift = (time) => ({ x: (46 + Math.sin(time / 40) * 34) * T, y: (MAIN + 4.5) * T });
    stage.attach(this, { drift: this.drift });
    this.daylight = new Daylight(this);
    this.life = new Life(this, world, places);
    this.daylight.set('sunset', 0);
  }

  update(time, delta) {
    const at = this.drift(performance.now() / 1000);
    this.cameras.main.centerOn(at.x, at.y - 3 * T);
    this.life.update(delta);
    this.daylight.update();
  }
}
