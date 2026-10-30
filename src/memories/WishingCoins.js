import * as THREE from 'three';
import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import MiniGame, { T } from './MiniGame.js';

const COINS = 3;
const NEED = 2;
const BASIN = 1.25 * T;
const FOUNTAIN = { dx: 0, dy: -1.7 * T };

export default class WishingCoins extends MiniGame {
  constructor(scene, at, done) {
    super(scene, at, done);
    this.pool = { x: at.x + FOUNTAIN.dx, y: at.y + FOUNTAIN.dy };
    this.kid = this.person('kid_me', at.x, at.y + 1.6 * T);
    this.stand(this.kid, 'up');
    this.ring = this.mesh(new THREE.Mesh(new THREE.RingGeometry(0.26, 0.4, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff9a1f', transparent: true, opacity: 0.95, depthWrite: false, depthTest: false })));
    this.ring.renderOrder = 10;
    this.coin = scene.add.circle(this.kid.x, this.kid.y, 3, 0xe8c14a).setStrokeStyle(1, 0x9a7a2a).setVisible(false);
    this.things.push(this.coin);
    Object.assign(this, { thrown: 0, made: 0, clock: 0, state: 'side' });
    this.look(() => ({ x: at.x, y: at.y - 0.4 * T }));
    this.title.setText(t('games.fountain.how'));
    this.score();
  }

  score() {
    this.status.setText(t('games.fountain.status', { made: this.made, thrown: this.thrown, total: COINS }));
  }

  get target() {
    const swing = this.state === 'side' ? Math.sin(this.clock * 1.9) * 0.75 : this.angle;
    const far = this.state === 'side' ? 2.9 * T : (1.6 + (Math.sin(this.clock * 2.3) + 1) * 1.6) * T;
    return { x: this.kid.x + Math.sin(swing) * far, y: this.kid.y - 8 - Math.cos(swing) * far, swing };
  }

  press() {
    if (this.state === 'side') {
      this.angle = this.target.swing;
      this.state = 'far';
      this.clock = Math.random() * 3;
    } else if (this.state === 'far') {
      this.to = this.target;
      this.state = 'flight';
      this.t = 0;
      this.coin.setPosition(this.kid.x, this.kid.y - 4).setVisible(true);
      sound.blip();
    }
  }

  update(delta) {
    if (this.over) return;
    this.clock += delta / 1000;
    const aim = this.target;
    this.ring.visible = this.state === 'side' || this.state === 'far';
    this.ring.position.set(aim.x / T, 0.05, aim.y / T);
    if (this.state !== 'flight') return;
    this.t = Math.min(1, this.t + delta / 800);
    this.coin.x = Phaser.Math.Linear(this.kid.x, this.to.x, this.t);
    this.coin.y = Phaser.Math.Linear(this.kid.y - 4, this.to.y, this.t);
    this.coin.lift3d = 0.6 + Math.sin(this.t * Math.PI) * 1.8 - this.t * 0.6;
    if (this.t < 1) return;
    const inside = Phaser.Math.Distance.Between(this.to.x, this.to.y, this.pool.x, this.pool.y) < BASIN;
    this.thrown += 1;
    if (inside) {
      this.made += 1;
      sound.splash();
      this.say(this.kid, t('games.fountain.in'));
    } else {
      sound.thud();
      this.say(this.kid, t('games.fountain.out'));
    }
    this.coin.setVisible(false);
    this.score();
    if (this.thrown === COINS || this.made + (COINS - this.thrown) < NEED) return this.end(this.made >= NEED);
    this.state = 'side';
  }
}
