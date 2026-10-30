import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import * as M from '../stage/models.js';
import { T } from './World.js';

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const GRAVITY = 900;
const RUN = 170;

const KINDS = {
  bucket: { model: () => M.bucket(), size: 16, mass: 0.5, drag: 260, tips: true, rolls: 70 },
  redBucket: { model: () => M.bucket('#c2504d'), size: 16, mass: 0.5, drag: 260, tips: true, rolls: 70 },
  box: { model: () => M.box(), size: 20, mass: 0.6, drag: 420, tips: false },
  chair: { model: () => M.chair(), size: 20, fixed: true },
  bin: { model: () => M.bin(), size: 20, fixed: true },
};

export default class Toys {
  constructor(scene, world, places, life) {
    Object.assign(this, { scene, world, life });
    const { physics, player } = scene;
    this.things = [];
    this.group = physics.add.group();
    for (const { kind, c, r, turn = 0 } of places.loose) this.add(kind, c * T, r * T, turn);
    this.makeBall(places.ball);

    physics.add.collider(this.group, world.solids);
    physics.add.collider(this.group, this.group);
    physics.add.collider(player, this.group, (_, thing) => this.bump(thing, scene.push()));
    physics.add.collider(this.ball, world.solids, () => this.ballHitWall());
    physics.add.collider(this.ball, this.group, (_, thing) => this.bump(thing, this.ball.body.velocity));
    physics.add.overlap(player, this.ball, () => this.kick());
    life.things.push(...this.things, this.ball, this.ballShadow);
  }

  add(kind, x, y, turn) {
    const k = KINDS[kind];
    const thing = this.scene.add.zone(x, y, k.size, k.size);
    Object.assign(thing, { kind: k, model3d: k.model, turn3d: turn, tip3d: { angle: 0, x: 1, y: 0 }, alpha: 1, h: 0, vh: 0, spot: null });
    this.things.push(thing);
    if (k.fixed) {
      this.world.solids.add(thing);
      return thing;
    }
    this.group.add(thing);
    thing.body.setDrag(k.drag).setBounce(0.35).setMass(k.mass).setCollideWorldBounds(true);
    return thing;
  }

  makeBall(at) {
    const { scene } = this;
    this.ballShadow = scene.add.ellipse(at.x, at.y, 10, 4, 0x000000, 0.22);
    this.ball = scene.add.circle(at.x, at.y, 5, 0xd9483a);
    scene.physics.add.existing(this.ball);
    this.ball.body.setCircle(5).setBounce(0.7).setDrag(150).setCollideWorldBounds(true);
    Object.assign(this.ball, { home: at, h: 0, vh: 0, still: 0, kicked: 0 });
  }

  bump(thing, push) {
    const speed = Math.hypot(push.x, push.y);
    if (speed > RUN && thing.kind.tips && !thing.spot) this.tip(thing, push.x, push.y);
  }

  tip(thing, dx, dy) {
    const { scene } = this;
    const len = Math.hypot(dx, dy) || 1;
    thing.tip3d.x = dx / len;
    thing.tip3d.y = dy / len;
    scene.tweens.add({ targets: thing.tip3d, angle: Math.PI / 2, duration: 380, ease: 'Bounce.easeOut' });
    thing.body.setDrag(thing.kind.rolls);
    thing.body.velocity.x += (dx / len) * 90;
    thing.body.velocity.y += (dy / len) * 90;
    if (this.life.near(thing.x, thing.y, 420)) sound.clatter();
    thing.spot = { id: 'loose', x: thing.x, y: thing.y - 8, h: 24, use: () => this.right(thing) };
    this.world.interactables.push(thing.spot);
  }

  right(thing) {
    this.world.interactables.splice(this.world.interactables.indexOf(thing.spot), 1);
    thing.spot = null;
    thing.body.setVelocity(0).setDrag(thing.kind.drag);
    this.scene.tweens.add({ targets: thing.tip3d, angle: 0, duration: 260, ease: 'Back.easeOut' });
    sound.thud();
  }

  kick() {
    const { scene, ball } = this;
    if (scene.held || scene.flung || ball.h > 14 || scene.time.now - ball.kicked < 300) return;
    const push = scene.push();
    let dx = push.x;
    let dy = push.y;
    if (!dx && !dy) {
      dx = ball.x - scene.player.x;
      dy = ball.y - (scene.player.y + 12);
    }
    const len = Math.hypot(dx, dy) || 1;
    const hard = Math.hypot(push.x, push.y) > RUN;
    this.launch(ball, (dx / len) * (hard ? 380 : 220), (dy / len) * (hard ? 380 : 220), hard ? 300 : 150);
    sound.kick();
  }

  launch(ball, vx, vy, up) {
    ball.body.setVelocity(vx, vy);
    ball.vh = up;
    ball.h = Math.max(ball.h, 1);
    ball.kicked = this.scene.time.now;
    ball.still = 0;
  }

  ballHitWall() {
    const v = this.ball.body.velocity;
    if (Math.hypot(v.x, v.y) > 120 && this.life.near(this.ball.x, this.ball.y, 380)) sound.thud();
  }

  hitBy(x, y, half, dir, speed) {
    for (const thing of [...this.things.filter((th) => !th.kind.fixed), this.ball]) {
      if (Math.abs(thing.x - x) > half + 8 || Math.abs(thing.y - (y - 8)) > 20 || thing.h > 20) continue;
      const side = thing.y < y - 8 ? -1 : 1;
      const vx = dir * (speed * 2.2 + rand(60, 140));
      const vy = side * rand(140, 240);
      if (thing === this.ball) {
        this.launch(thing, vx, vy, 360);
      } else {
        thing.body.setVelocity(vx, vy);
        thing.vh = rand(200, 300);
        thing.h = 1;
        if (thing.kind.tips && !thing.spot) this.tip(thing, vx, vy);
      }
      if (this.life.near(thing.x, thing.y, 420)) sound.clatter();
    }
  }

  update(delta) {
    const dt = delta / 1000;
    for (const thing of this.things) {
      this.fly(thing, dt);
      thing.lift3d = thing.h / T;
      if (thing.spot) Object.assign(thing.spot, { x: thing.x, y: thing.y - 8 });
    }
    const { ball } = this;
    const bounced = this.fly(ball, dt);
    if (bounced > 160 && this.life.near(ball.x, ball.y, 380)) sound.thud();
    ball.lift3d = ball.h / T;
    ball.body.setDrag(ball.h > 0 ? 25 : 150);
    this.ballShadow.setPosition(ball.x, ball.y + 3).setScale(1 - Math.min(0.5, ball.h / 120));
    this.ballGame(delta);
  }

  fly(thing, dt) {
    if (thing.h <= 0 && thing.vh <= 0) return 0;
    thing.vh -= GRAVITY * dt;
    thing.h += thing.vh * dt;
    if (thing.h > 0) return 0;
    const hit = -thing.vh;
    thing.h = 0;
    thing.vh = hit > 90 ? hit * 0.5 : 0;
    return hit;
  }

  ballGame(delta) {
    const { ball, life, scene } = this;
    const speed = Math.hypot(ball.body.velocity.x, ball.body.velocity.y);
    ball.still = speed < 10 && ball.h === 0 ? ball.still + delta : 0;
    for (const dog of life.dogs) {
      const d = Phaser.Math.Distance.Between(dog.x, dog.y, ball.x, ball.y);
      if (!dog.fetch && (speed > 60 || (d < 160 && ball.still < 4000)) && d < 300 && scene.time.now > (dog.rest || 0)) dog.fetch = 4000;
      if (!dog.fetch) continue;
      dog.fetch -= delta;
      dog.wait = 0;
      dog.pace = 120;
      dog.target = { x: ball.x, y: ball.y + 4 };
      if (d < 16 && ball.h < 8) {
        const toward = Math.atan2(scene.player.y - ball.y, scene.player.x - ball.x) + rand(-1.2, 1.2);
        this.launch(ball, Math.cos(toward) * rand(110, 190), Math.sin(toward) * rand(110, 190), 60);
        if (Math.random() < 0.4 && life.near(dog.x, dog.y, 360)) {
          sound.bark();
          life.emote(dog, '!');
        }
        dog.fetch = Math.random() < 0.6 ? dog.fetch : 0;
      }
      if (dog.fetch <= 0) {
        dog.fetch = 0;
        dog.target = null;
        dog.pace = dog.speed;
        dog.rest = scene.time.now + rand(2500, 6000);
      }
    }
    if (ball.still < 900 || ball.returned) return;
    const by = life.residents.find((r) => !r.hidden && r.state !== 'help' && Phaser.Math.Distance.Between(r.x, r.y, ball.x, ball.y) < 54);
    if (!by) return;
    ball.returned = true;
    by.look(ball.x - by.x, ball.y - by.y);
    life.emote(by, pick(t('emotes.kickBack')));
    scene.time.delayedCall(450, () => {
      ball.returned = false;
      const dx = scene.player.x - ball.x;
      const dy = scene.player.y + 12 - ball.y;
      const len = Math.hypot(dx, dy) || 1;
      const pace = Math.min(320, 120 + len * 0.6);
      this.launch(ball, (dx / len) * pace, (dy / len) * pace, 180);
      sound.kick();
    });
  }
}
