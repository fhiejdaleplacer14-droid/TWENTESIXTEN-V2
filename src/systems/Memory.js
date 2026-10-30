import sound from './Sound.js';
import stage from '../stage/Stage.js';
import { t } from './Lang.js';
import { facing } from '../world/Life.js';
import FreeThrows from '../memories/FreeThrows.js';
import LostInMarket from '../memories/LostInMarket.js';
import CreekSneak from '../memories/CreekSneak.js';
import CoinScramble from '../memories/CoinScramble.js';
import FlagSong from '../memories/FlagSong.js';
import StayAwake from '../memories/StayAwake.js';
import HotPandesal from '../memories/HotPandesal.js';
import WishingCoins from '../memories/WishingCoins.js';
import Pisonet from '../memories/Pisonet.js';
import BenchTalk from '../memories/BenchTalk.js';

const GAMES = { freeThrows: FreeThrows, lostInMarket: LostInMarket, creekSneak: CreekSneak, coinScramble: CoinScramble, flagSong: FlagSong, stayAwake: StayAwake, hotPandesal: HotPandesal, wishingCoins: WishingCoins, pisonet: Pisonet, benchTalk: BenchTalk };

const T = 32;

export default class Memory {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.game = null;
  }

  play(def, at, done) {
    const { scene } = this;
    const flash = scene.ui.cameras.main;
    this.active = true;
    sound.select();
    sound.melody(5);
    if (def.ball) sound.bounce();
    flash.flash(700, 255, 240, 205);
    stage.zoomTo(1.35, 1400);
    stage.look.setMemory(true);
    scene.ui.setCinematic(true);
    scene.life.setVisible(false);

    const ghosts = (def.kids || []).map((k) => {
      const x = at.x + k.dx * T;
      const y = at.y + k.dy * T;
      const kid = scene.add.sprite(x, y, k.look, 'down_0').setOrigin(0.5, 1).setScale(k.scale || 1.5).setDepth(5 + y / 1000).setAlpha(0);
      scene.tweens.add({ targets: kid, alpha: 0.95, duration: 700 });
      if (k.to) {
        const out = `${k.look}_walk_${facing(k.to[0], k.to[1])}`;
        const back = `${k.look}_walk_${facing(-k.to[0], -k.to[1])}`;
        kid.anims.play(out);
        scene.tweens.add({ targets: kid, x: x + k.to[0] * T, y: y + k.to[1] * T, duration: k.ms, yoyo: true, repeat: -1, onYoyo: () => kid.anims.play(back), onRepeat: () => kid.anims.play(out) });
      }
      return kid;
    });
    if (def.ball) {
      const ball = scene.add.circle(at.x + 14, at.y + 40, 5, 0xd9772f).setStrokeStyle(1, 0x7a3b1c).setDepth(6);
      ball.lift3d = 0;
      scene.tweens.add({ targets: ball, lift3d: 1, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
      ghosts.push(ball);
    }

    const finish = () => {
      flash.flash(600, 255, 240, 205);
      stage.zoomTo(1, 900);
      stage.look.setMemory(false);
      scene.tweens.add({ targets: ghosts, alpha: 0, duration: 500, onComplete: () => ghosts.forEach((g) => g.destroy()) });
      scene.ui.setCinematic(false);
      scene.life.setVisible(true);
      scene.time.delayedCall(700, () => {
        this.active = false;
        done();
      });
    };
    const Game = GAMES[def.game];
    if (!Game) {
      scene.time.delayedCall(900, () => scene.ui.dialogue.start(def.lines, finish, { memory: true }));
      return;
    }
    const after = (won, lines) => {
      this.game = null;
      if (won) scene.story.flags.add(`won_${def.id}`);
      stage.zoomTo(1.35, 900);
      scene.ui.dialogue.start([...(lines || [t(`games.${def.id}.${won ? 'won' : 'lost'}`)]), ...def.lines.slice(def.resume)], finish, { memory: true });
    };
    scene.time.delayedCall(900, () =>
      scene.ui.dialogue.start(def.lines.slice(0, def.split), () => {
        stage.zoomTo(Game.zoom, 700);
        this.game = new Game(scene, at, after);
      }, { memory: true }),
    );
  }
}
