import * as THREE from 'three';
import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import { bush, PX } from '../stage/models.js';
import { BANK } from '../world/neighborhood.js';
import MiniGame, { T } from './MiniGame.js';

const KID_SPEED = 85;
const TRIES = 3;
const SIGHT = 8 * T;
const WIDE = 0.56;
const box = { x: 17.6 * T, y: (BANK + 0.5) * T, w: 24.8 * T, h: 3.45 * T };
const START = { x: 18.6 * T, y: (BANK + 1) * T };
const GOAL = { x: 40.2 * T, y: (BANK + 3) * T };
const COVER = [[19.5, 3.5], [26, 2.05], [39, 1.4]].map(([c, r]) => ({ x: c * T, y: (BANK + r) * T }));
const BUSHES = [[23, 1.4], [33.8, 1.3], [36.8, 3.15]].map(([c, r]) => ({ x: c * T, y: (BANK + r) * T }));

export default class CreekSneak extends MiniGame {
  static zoom = 1;

  constructor(scene, at, done) {
    super(scene, at, done);
    this.kid = this.person('kid_me', START.x, START.y);
    this.friend = this.person('kid_a', 41.4 * T, (BANK + 4.25) * T);
    this.friend.sprite.lift3d = -0.3;
    this.tita = this.person('ising', 30 * T, (BANK + 3.4) * T, 2);
    this.cover = [...COVER, ...BUSHES];
    BUSHES.forEach((b, i) => this.mesh(bush(i % 2 === 1).toMesh(PX)).position.set(b.x / T, 0, b.y / T - 0.3));
    this.cone = this.mesh(new THREE.Mesh(new THREE.CircleGeometry(SIGHT / T, 20, -WIDE, WIDE * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0, depthWrite: false })));
    this.cone.renderOrder = 2;
    Object.assign(this, { tries: 0, state: 'wash', timer: 2200, angle: Math.PI / 2, frozen: 0 });
    this.look(() => ({ x: this.kid.x * 0.6 + this.tita.x * 0.4, y: Math.max(this.kid.y, this.tita.y) }));
    this.title.setText(t('games.creek.how'));
    this.score();
  }

  score() {
    this.status.setText(t('games.creek.tries', { n: TRIES - this.tries }));
  }

  hidden() {
    return this.cover.some((c) => Phaser.Math.Distance.Between(this.kid.x, this.kid.y, c.x, c.y) < 0.8 * T);
  }

  seen() {
    const dx = this.kid.x - this.tita.x;
    const dy = this.kid.y - this.tita.y;
    if (Math.hypot(dx, dy) > SIGHT) return false;
    return Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - this.angle)) < WIDE && !this.hidden();
  }

  update(delta) {
    const dt = delta / 1000;
    if (this.over) return;
    this.watch(delta);
    if (this.frozen > 0) {
      this.frozen -= delta;
      if (this.frozen <= 0) {
        Object.assign(this.kid, START);
        this.stand(this.kid, 'right');
        this.place(this.kid);
      }
      return;
    }
    const go = this.scene.heading();
    this.walk(this.kid, go.x * KID_SPEED * dt, go.y * KID_SPEED * dt, box);
    this.kid.sprite.setAlpha(this.hidden() ? 0.6 : 1);
    if (this.kid.x > GOAL.x && this.kid.y > GOAL.y) {
      sound.splash();
      this.say(this.friend, t('games.creek.made'), 1400);
      this.scene.tweens.add({ targets: this.kid.sprite, lift3d: -0.3, y: this.kid.y + 0.8 * T, duration: 500 });
      return this.end(true);
    }
    if (this.state === 'look' && this.seen()) this.caught();
  }

  watch(delta) {
    const { tita } = this;
    this.timer -= delta;
    if (this.state === 'wash') {
      this.angle = Math.PI / 2;
      this.stand(tita, 'down');
      if (this.timer <= 0) {
        this.state = 'warn';
        this.timer = 700;
        this.say(tita, '?', 500);
      }
    } else if (this.state === 'warn') {
      if (this.timer <= 0) {
        this.state = 'look';
        this.timer = Phaser.Math.Between(1600, 2500);
        this.angle = Math.atan2(this.kid.y - tita.y, this.kid.x - tita.x) + Phaser.Math.FloatBetween(-0.25, 0.25);
        this.stand(tita, this.kid.x < tita.x ? 'left' : 'right');
      }
    } else if (this.timer <= 0) {
      this.state = 'wash';
      this.timer = Phaser.Math.Between(1700, 3400);
    }
    this.place(tita);
    const show = { wash: 0, warn: 0.12, look: 0.3 }[this.state];
    this.cone.material.opacity += (show - this.cone.material.opacity) * 0.2;
    this.cone.position.set(tita.x / T, 0.035, tita.y / T);
    this.cone.rotation.y = -this.angle;
  }

  caught() {
    this.tries += 1;
    this.score();
    sound.thud();
    this.say(this.tita, t('games.creek.caught'), 1400);
    this.cone.material.color.set('#ff7a5a');
    this.scene.time.delayedCall(900, () => this.cone.material.color.set('#ffe08a'));
    this.stand(this.kid, 'down');
    this.state = 'wash';
    this.timer = 2600;
    if (this.tries >= TRIES) return this.end(false);
    this.frozen = 900;
  }
}
