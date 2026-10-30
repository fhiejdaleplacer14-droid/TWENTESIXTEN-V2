import Phaser from 'phaser';
import sound from '../systems/Sound.js';
import { S, T } from './World.js';
import Traffic from './Traffic.js';
import { PIXEL } from '../systems/Fonts.js';
import { t } from '../systems/Lang.js';
import residents from '../data/residents.json';

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const chance = (p) => Math.random() < p;
const inside = (r, pad = 0) => ({ x: rand(r.x + pad, r.x + r.w - pad), y: rand(r.y + pad, r.y + r.h - pad) });
const dist = (a, b) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

export const facing = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');

class Actor {
  constructor(life, texture, x, y, { scale = S, speed = 46, id = null, h = T } = {}) {
    const { scene } = life;
    Object.assign(this, { life, texture, x, y, speed, h, pace: speed, target: null, wait: 0, lift: 0, dir: 'down' });
    this.directional = scene.anims.exists(`${texture}_walk_down`);
    this.shadow = scene.add.ellipse(x, y - 1, 10 * scale, 3 * scale, 0x000000, 0.22).setDepth(4);
    this.sprite = scene.add.sprite(x, y, texture, this.directional ? 'down_0' : undefined).setOrigin(0.5, 1).setScale(scale);
    this.spot = id ? life.world.spot(id, x / T, (y - h / 2) / T, h) : null;
    life.things.push(this.sprite, this.shadow);
    this.place();
  }

  place() {
    this.sprite.setPosition(this.x, this.y).setDepth(5 + this.y / 1000);
    this.sprite.lift3d = -this.lift / T;
    this.shadow.setPosition(this.x, this.y - 1);
    if (this.spot) {
      this.spot.x = this.x;
      this.spot.y = this.y - this.h / 2;
    }
  }

  stand() {
    this.sprite.anims.stop();
    if (this.directional) this.sprite.setFrame(`${this.dir}_0`);
    else this.sprite.setTexture(this.texture);
    this.place();
  }

  look(dx, dy) {
    this.dir = facing(dx, dy);
    if (!this.directional && Math.abs(dx) > 1) this.sprite.setFlipX(dx < 0);
    this.stand();
  }

  hop() {
    this.life.scene.tweens.add({ targets: this, lift: -9, duration: 160, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  }

  move(delta) {
    if (!this.target) {
      this.stand();
      return false;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const far = Math.hypot(dx, dy);
    const step = (this.pace * delta) / 1000;
    if (this.directional) {
      this.dir = facing(dx, dy);
      this.sprite.anims.play(`${this.texture}_walk_${this.dir}`, true);
    } else {
      if (Math.abs(dx) > 1) this.sprite.setFlipX(dx < 0);
      this.sprite.anims.play(`${this.texture}_walk`, true);
    }
    if (far <= step) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.target = null;
    } else {
      this.x += (dx / far) * step;
      this.y += (dy / far) * step;
    }
    this.place();
    return !this.target;
  }
}

const NEEDS = ['hunger', 'errand', 'rest', 'social', 'fun', 'calm'];
const NEED_RATE = 1 / 28;
const HOME_PULL = { afternoon: 1, golden: 1.6, sunset: 5, dusk: 90 };

class Resident extends Actor {
  constructor(life, id, who, places) {
    const home = who.door ? places.doors[who.door] : { ...places.walk.nodes[who.exit], node: who.exit };
    super(life, id, home.x, home.y, { id, speed: who.speed || 46, scale: who.kid ? 1.5 : S });
    Object.assign(this, { id, who, home, graph: places.walk, spots: places.spots, node: home.node, path: [], doing: null, last: null, state: 'inside', timer: rand(0, 14000), chat: 0, shy: rand(4000, 12000), said: 0, hidden: true });
    this.needs = Object.fromEntries(NEEDS.map((n) => [n, rand(0, 1)]));
    this.needs.home = 0;
    this.spot.talk = () => this.talk();
    this.sprite.setAlpha(0);
    this.shadow.setAlpha(0);
    this.place();
  }

  place() {
    super.place();
    if (this.hidden) this.spot.x = -9999;
  }

  update(delta) {
    const pull = HOME_PULL[this.life.phase];
    for (const n of NEEDS) this.needs[n] += (this.who.needs?.[n] ?? 1) * NEED_RATE * (delta / 1000);
    this.needs.home += 0.35 * pull * NEED_RATE * (delta / 1000);
    this.shy -= delta;
    const dark = pull > 50;

    if (this.chat > 0) {
      this.chat -= delta;
    } else if (this.state === 'inside') {
      this.timer -= delta;
      if ((this.timer <= 0 && !dark) || this.life.gathering) this.comeOut();
    } else if (this.state === 'think') {
      this.decide();
    } else if (this.state === 'travel') {
      if (!this.target && this.path.length) this.target = this.path.shift();
      if (this.target) this.move(delta);
      else this.arrive();
    } else if (this.state === 'help') {
      if (this.target) {
        if (this.move(delta)) {
          const { player } = this.life.scene;
          this.look(player.x - this.x, player.y - this.y);
          this.life.emote(this, pick(t('emotes.tita')), 2200);
          this.timer = 2800;
        }
      } else if ((this.timer -= delta) <= 0) this.state = 'think';
    } else {
      this.timer -= delta;
      if (chance(delta / 3000)) this.mingle();
      if (this.state === 'stay' && (this.timer <= 0 || dark)) this.leave();
    }
  }

  decide() {
    const options = this.spots
      .filter((s) => s !== this.last && s.users.length < s.room && (!s.kids || this.who.kid))
      .map((s) => ({ spot: s, score: this.needs[s.need] * rand(0.75, 1.25) - this.life.route(this.node, s.node).length * 0.02 }));
    options.push({ spot: null, score: this.needs.home * rand(0.8, 1.2) });
    const { spot } = options.reduce((best, o) => (o.score > best.score ? o : best));
    const wake = this.life.gathering && this.life.gathering[this.life.residents.indexOf(this)];
    const goal = wake
      ? { kind: 'wake', need: 'home', node: 1, x: wake.x, y: wake.y, users: [], face: 'up' }
      : spot || { kind: 'home', need: 'home', node: this.home.node, x: this.home.x, y: this.home.y, users: [], face: 'up' };
    const slot = goal.users.length;
    goal.users.push(this);
    this.doing = goal;
    this.path = [
      ...this.life.route(this.node, goal.node).map((n) => ({ x: this.graph.nodes[n].x + rand(-7, 7), y: this.graph.nodes[n].y + rand(-4, 4) })),
      { x: goal.x + slot * 28, y: goal.y },
    ];
    this.node = goal.node;
    this.pace = this.speed * rand(0.85, 1.15) * (goal.kind === 'home' && this.life.phase === 'dusk' ? 1.3 : 1);
    this.state = 'travel';
    if (goal.kind !== 'wake' && chance(0.5)) this.life.emote(this, t(`emotes.thoughts.${goal.need}`));
  }

  arrive() {
    const { kind, face } = this.doing;
    this.look({ left: -1, right: 1 }[face] || 0, { up: -1, down: 1 }[face] || 0);
    if (kind === 'home') {
      this.state = 'inside';
      this.hidden = true;
      this.timer = rand(9000, 24000);
      this.life.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, duration: 500, onComplete: () => this.place() });
    } else {
      this.state = kind === 'wake' ? 'wake' : 'stay';
      this.timer = rand(7000, 16000) * (kind === 'hangout' || kind === 'bench' ? 1.6 : 1);
    }
  }

  mingle() {
    const others = this.doing.users.filter((u) => u !== this && u.state === 'stay');
    if (others.length) {
      const other = pick(others);
      this.look(other.x - this.x, other.y - this.y);
      this.life.emote(this, pick(t('emotes.chatter')));
    } else if (chance(0.5)) this.look(rand(-1, 1), rand(-0.3, 1));
  }

  leave() {
    this.doing.users.splice(this.doing.users.indexOf(this), 1);
    this.needs[this.doing.need] = 0;
    this.last = this.doing;
    this.state = 'think';
  }

  comeOut() {
    this.hidden = false;
    this.needs.home = 0;
    this.doing = null;
    this.state = 'think';
    this.look(0, 1);
    this.life.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 1, duration: 500 });
  }

  help(x, y) {
    if (this.doing) this.doing.users.splice(this.doing.users.indexOf(this), 1);
    this.doing = null;
    this.path = [];
    this.state = 'help';
    this.target = { x: x + (this.x < x ? -26 : 26), y: y + 6 };
    this.pace = this.speed * 2.4;
    this.chat = 0;
  }

  talk() {
    const kind = this.doing ? this.doing.kind : 'hangout';
    const now = t(`residents.${this.state === 'travel' ? 'going' : 'doing'}.${kind}`);
    const lines = t(`residents.lines.${this.id}`);
    const own = lines[this.said++ % lines.length];
    return [`@${this.id}: ${now}`, `@${this.id}: ${own}`];
  }
}

class Wanderer extends Actor {
  constructor(life, texture, area, { curious = false, timid = false, crows = false, pause = [800, 3000], ...opts } = {}) {
    const p = inside(area, 10);
    super(life, texture, p.x, p.y, opts);
    Object.assign(this, { area, curious, timid, crows, pause });
    this.wait = rand(0, 1500);
  }

  clamp(p) {
    return { x: Phaser.Math.Clamp(p.x, this.area.x + 8, this.area.x + this.area.w - 8), y: Phaser.Math.Clamp(p.y, this.area.y + 8, this.area.y + this.area.h - 8) };
  }

  update(delta) {
    const { player } = this.life.scene;
    const threat = this.timid && [player, ...this.life.dogs].find((d) => d !== this && dist(d, this) < 54);
    if (threat && this.pace < 80) {
      const away = Math.atan2(this.y - threat.y, this.x - threat.x) + rand(-0.6, 0.6);
      this.target = this.clamp({ x: this.x + Math.cos(away) * 90, y: this.y + Math.sin(away) * 90 });
      this.pace = 105;
      this.wait = 0;
      this.hop();
      if (this.life.near(this.x, this.y, 360)) sound.cluck();
    }
    if (this.curious && !this.fetch && !this.chasing && chance(delta / 9000)) {
      this.chasing = this.life.actors.find((a) => a.timid && dist(a, this) < 170);
      this.chase = 1800;
    }
    if (this.chasing) {
      this.chase -= delta;
      this.target = { x: this.chasing.x, y: this.chasing.y };
      this.pace = 115;
      this.wait = 0;
      if (this.chase <= 0) {
        this.chasing = null;
        this.target = null;
        this.pace = this.speed;
        if (this.life.near(this.x, this.y, 300)) sound.bark();
      }
    }
    if (this.wait > 0) {
      this.wait -= delta;
    } else if (!this.target) {
      const mood = Math.random();
      this.pace = this.speed * rand(0.7, 1.1);
      if (this.curious && dist(player, this) < 240 && mood < 0.5) {
        this.target = this.clamp({ x: player.x + rand(-36, 36), y: player.y + 24 });
      } else if (this.curious && mood > 0.85) {
        this.pace = this.speed * 1.6;
        this.target = inside(this.area, 10);
      } else {
        this.target = this.clamp({ x: this.x + rand(-150, 150), y: this.y + rand(-60, 60) });
      }
    } else if (this.move(delta)) {
      this.stand();
      this.pace = this.speed;
      this.wait = rand(...this.pause) * (chance(0.2) ? 3 : 1);
      if (this.curious && chance(0.12) && this.life.near(this.x, this.y, 300)) {
        sound.bark();
        this.life.emote(this, '!');
      }
      if (this.crows && chance(0.1) && this.life.near(this.x, this.y, 380)) {
        sound.crow();
        this.life.emote(this, t('emotes.crow'));
      }
    }
  }
}

class Baller extends Actor {
  constructor(life, court) {
    super(life, 'baller', court.x + court.w / 2 + 40, court.y + court.h - 60, { speed: 66, id: 'baller' });
    this.court = court;
    this.hoop = { x: court.x + court.w / 2, y: court.y + 26 };
    this.ballShadow = life.scene.add.ellipse(0, 0, 9, 4, 0x000000, 0.22).setDepth(4);
    this.ball = life.scene.add.circle(0, 0, 4.5, 0xd9772f).setStrokeStyle(1, 0x7a3b1c);
    life.things.push(this.ball, this.ballShadow);
    this.clock = 0;
    this.possession();
  }

  possession() {
    const { court, hoop } = this;
    const kind = pick(['layup', 'mid', 'mid', 'far', 'far']);
    const spot = {
      layup: () => ({ x: hoop.x + rand(-54, 54), y: hoop.y + rand(46, 70) }),
      mid: () => ({ x: hoop.x + rand(-110, 110), y: hoop.y + rand(96, 130) }),
      far: () => ({ x: rand(court.x + 40, court.x + court.w - 40), y: rand(court.y + court.h - 60, court.y + court.h - 22) }),
    }[kind];
    this.route = chance(0.4) ? [{ x: rand(court.x + 50, court.x + court.w - 50), y: rand(hoop.y + 110, court.y + court.h - 24) }, spot()] : [spot()];
    this.accuracy = { layup: 0.8, mid: 0.55, far: 0.35 }[kind];
    this.pace = this.speed * rand(0.85, 1.35);
    this.target = this.route.shift();
    this.state = 'dribble';
  }

  setBall(x, groundY, height) {
    this.ball.setPosition(x, groundY + 2).setDepth(5 + (groundY + 2) / 1000);
    this.ball.lift3d = height / T;
    this.ballShadow.setPosition(x, groundY);
  }

  update(delta) {
    this.clock += delta;
    const side = { left: -11, right: 11, up: 9, down: -9 }[this.dir];
    if (this.state === 'dribble') {
      this.setBall(this.x + side, this.y, 3 + Math.abs(Math.sin(this.clock * 0.011)) * 13);
      if (this.move(delta)) {
        if (this.route.length) {
          this.target = this.route.shift();
        } else {
          this.state = 'aim';
          this.wait = rand(350, 1500);
          this.look(this.hoop.x - this.x, this.hoop.y - this.y);
        }
      }
    } else if (this.state === 'aim' || this.state === 'rest') {
      this.setBall(this.x + side, this.y, this.state === 'aim' ? 19 : 3 + Math.abs(Math.sin(this.clock * 0.006)) * 12);
      this.wait -= delta;
      if (this.wait > 0) return;
      if (this.state === 'rest') return this.possession();
      this.state = 'shot';
      this.t = 0;
      this.made = chance(this.accuracy);
      this.from = { x: this.x, y: this.y };
      this.to = { x: this.hoop.x + (this.made ? 0 : pick([-1, 1]) * rand(9, 18)), y: this.hoop.y + 4 };
      this.hop();
    } else if (this.state === 'shot') {
      this.t = Math.min(1, this.t + delta / 750);
      const x = Phaser.Math.Linear(this.from.x, this.to.x, this.t);
      const ground = Phaser.Math.Linear(this.from.y, this.to.y, this.t);
      this.setBall(x, ground, 19 + (40 - 19) * this.t + Math.sin(this.t * Math.PI) * 46);
      this.place();
      if (this.t === 1) {
        this.state = 'fall';
        this.t = 0;
        this.roll = this.made ? rand(-14, 14) : rand(-70, 70);
        if (this.made && chance(0.5)) {
          this.hop();
          this.life.emote(this, '!');
        } else if (!this.made && chance(0.3)) this.life.emote(this, '...');
      }
    } else if (this.state === 'fall') {
      const before = this.t;
      this.t = Math.min(1, this.t + delta / 900);
      const ground = this.to.y + this.t * (this.made ? 30 : 52);
      this.setBall(this.to.x + this.roll * this.t, ground, 40 * (1 - this.t) * Math.abs(Math.cos(this.t * Math.PI * 2.5)));
      this.place();
      if (before < 0.2 && this.t >= 0.2 && this.life.near(this.x, this.y, 330)) sound.thud();
      if (this.t === 1) {
        this.state = 'fetch';
        this.pace = this.speed * rand(0.9, 1.5);
        this.target = { x: this.ball.x - 8, y: this.ballShadow.y + 3 };
      }
    } else if (this.move(delta)) {
      if (chance(0.22)) {
        this.state = 'rest';
        this.wait = rand(2200, 5200);
        this.look(0, 1);
      } else this.possession();
    } else {
      this.setBall(this.ball.x, this.ballShadow.y, 0);
    }
  }
}

export default class Life {
  constructor(scene, world, places) {
    this.scene = scene;
    this.world = world;
    this.things = [];
    this.graph = places.walk;
    this.phase = 'afternoon';
    this.residents = Object.entries(residents.people).map(([id, who]) => new Resident(this, id, who, places));
    this.actors = [
      new Baller(this, places.court),
      ...this.residents,
      ...places.streets.map((street) => new Wanderer(this, 'dog', street, { id: 'dog', speed: 70, curious: true, h: 20 })),
      ...[0, 1].map(() => new Wanderer(this, 'chicken', places.lot, { speed: 26, timid: true, pause: [400, 2200] })),
      new Wanderer(this, 'rooster', places.lot, { speed: 30, timid: true, crows: true, pause: [700, 2600] }),
      ...[0, 1, 2].map(() => new Wanderer(this, 'chicken', places.hens, { speed: 26, timid: true, pause: [400, 2200] })),
    ];
    this.dogs = this.actors.filter((a) => a.texture === 'dog');
    this.traffic = new Traffic(this, places.lanes);

    this.flutter = places.bushes.map((home, i) => {
      const dot = scene.add.image(home.x, home.y, 'dot').setTint(i % 2 ? 0xfff2a8 : 0xffffff).setDepth(6);
      dot.lift3d = 0.5 + (i % 3) * 0.15;
      scene.tweens.add({ targets: dot, scaleX: 0.2, duration: 110, yoyo: true, repeat: -1 });
      this.things.push(dot);
      return { dot, home, target: home };
    });

    this.things.push(
      ...places.smoke.map(({ x, y }) => Object.assign(scene.add.particles(x, y, 'dot', { lifespan: 2400, speedY: { min: -22, max: -12 }, speedX: { min: -5, max: 9 }, scale: { start: 0.6, end: 2.4 }, alpha: { start: 0.35, end: 0 }, tint: 0xe8e2d6, frequency: 380 }).setDepth(6), { lift3d: 1.1 })),
      Object.assign(scene.add.particles(places.tree.x, places.tree.y, 'dot', { x: { min: -50, max: 50 }, y: { min: -20, max: 30 }, lifespan: 5200, speedY: { min: 10, max: 20 }, speedX: { min: 4, max: 20 }, scale: 0.9, alpha: { start: 0.9, end: 0 }, tint: [0x8fc46a, 0xd9a43b, 0x6fb35f], frequency: 1100 }).setDepth(6), { lift3d: 3.4 }),
    );

    scene.time.addEvent({ delay: 9000, loop: true, callback: () => this.flock() });
    scene.time.delayedCall(2500, () => this.flock());
  }

  idle(p, delta) {
    const { player, story, memory } = this.scene;
    const key = p.sprite.texture.key;
    if (this.near(p.x, p.y, 96) || story.busy || (memory && memory.active)) {
      p.target = null;
      p.sprite.anims.stop();
      if (!p.still || this.near(p.x, p.y, 96)) p.sprite.setFrame(`${facing(player.x - p.x, player.y - 16 - p.y)}_0`);
      return;
    }
    if (p.target) {
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const far = Math.hypot(dx, dy);
      const step = (p.pace * delta) / 1000;
      const dir = facing(dx, dy);
      if (far <= step) {
        Object.assign(p, { x: p.target.x, y: p.target.y, target: null, timer: rand(1800, 5200) });
        p.sprite.anims.stop();
        p.sprite.setFrame(`${p.still ? dir : chance(0.7) ? 'down' : dir}_0`);
      } else {
        p.x += (dx / far) * step;
        p.y += (dy / far) * step;
        p.sprite.anims.play(`${key}_walk_${dir}`, true);
      }
      p.sprite.setPosition(p.x, p.y);
      p.shadow.setPosition(p.x, p.y - 1);
      Object.assign(p.spot, { x: p.x, y: p.y - T / 2 });
      return;
    }
    p.timer -= delta;
    if (p.timer > 0) return;
    p.timer = rand(1600, 5200);
    if (!p.still && chance(0.45)) {
      p.sprite.setFrame(`${chance(0.6) ? 'down' : pick(['left', 'right', 'down'])}_0`);
      return;
    }
    const home = Math.hypot(p.x - p.home.x, p.y - p.home.y) > 6 && chance(0.6);
    for (let tries = 0; tries < 4; tries++) {
      const to = home ? { ...p.home } : { x: p.home.x + rand(-1.3, 1.3) * T, y: p.home.y + rand(-0.1, 0.4) * T };
      if (home || this.clear(to, p)) {
        p.target = to;
        p.pace = rand(24, 34);
        return;
      }
    }
  }

  clear(to, p) {
    const { physics } = this.scene;
    if (!physics || !physics.overlapRect) return true;
    const hit = (x, y) => physics.overlapRect(x - 7, y - 5, 14, 6, false, true).length > 0;
    return !hit(to.x, to.y) && !hit((to.x + p.x) / 2, (to.y + p.y) / 2);
  }

  gather(points) {
    this.gathering = points;
    for (const r of this.residents) {
      if (r.state !== 'stay' && r.state !== 'travel') continue;
      r.target = null;
      r.path = [];
      r.leave();
    }
  }

  help(x, y) {
    if (this.gathering) return;
    const free = this.residents.filter((r) => !r.hidden && !r.who.kid && r.state !== 'help' && dist(r, { x, y }) < 560);
    if (!free.length) return;
    free.reduce((a, b) => (dist(a, { x, y }) < dist(b, { x, y }) ? a : b)).help(x, y);
  }

  setPhase(phase) {
    this.phase = phase;
  }

  route(from, to) {
    const came = { [from]: -1 };
    const queue = [from];
    while (queue.length && !(to in came)) {
      const n = queue.shift();
      for (const m of this.graph.edges[n]) {
        if (!(m in came)) {
          came[m] = n;
          queue.push(m);
        }
      }
    }
    const path = [];
    for (let n = to; n !== -1 && n !== undefined; n = came[n]) path.unshift(n);
    return path;
  }

  near(x, y, range) {
    const { player } = this.scene;
    return Phaser.Math.Distance.Between(player.x, player.y, x, y) < range;
  }

  emote(actor, mark, hold = 1100) {
    if (!this.near(actor.x, actor.y, 420)) return;
    const y = actor.y - actor.sprite.displayHeight - 4;
    const bubble = this.scene.add
      .text(actor.x, y, mark, { fontFamily: PIXEL, fontSize: '13px', fontStyle: 'bold', color: '#17110d', backgroundColor: '#f3e7cf', padding: { x: 4, y: 1 } })
      .setOrigin(0.5, 1)
      .setDepth(760);
    bubble.ground3d = actor.y;
    this.scene.tweens.add({ targets: bubble, y: y - 8, alpha: 0, delay: hold, duration: 500, onComplete: () => bubble.destroy() });
  }

  flock() {
    if (chance(0.3)) return;
    const view = this.scene.cameras.main.worldView;
    const y = view.y + rand(30, view.height * 0.5);
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const bird = this.scene.add.sprite(view.x - 30 - i * rand(14, 26), y + rand(-18, 18), 'bird_a').setScale(S).setDepth(750);
      bird.lift3d = 4 + rand(0, 1.5);
      bird.anims.play({ key: 'bird_fly', startFrame: i % 2 });
      this.scene.tweens.add({ targets: bird, x: view.right + 60, y: bird.y - rand(10, 60), duration: rand(6500, 8000), onComplete: () => bird.destroy() });
    }
  }

  setVisible(on) {
    const indoors = new Set(this.residents.filter((r) => r.hidden).flatMap((r) => [r.sprite, r.shadow]));
    const standing = this.world.people.map((p) => p.sprite);
    this.scene.tweens.add({ targets: [...this.things.filter((t) => !indoors.has(t)), ...standing], alpha: on ? 1 : 0, duration: 600 });
  }

  update(delta) {
    const { player, story } = this.scene;
    this.traffic.update(delta);
    for (const actor of this.actors) {
      if (story.busy && actor.spot && this.near(actor.x, actor.y, 90)) actor.look(player.x - actor.x, player.y - actor.y);
      else actor.update(delta);
    }

    for (const a of this.residents) {
      for (const b of this.residents) {
        if (a === b || a.shy > 0 || b.shy > 0 || a.state !== 'travel' || b.state !== 'travel' || dist(a, b) > 46) continue;
        [a, b].forEach((w, i) => {
          w.chat = 3400;
          w.shy = rand(20000, 40000);
          w.look(i ? a.x - b.x : b.x - a.x, i ? a.y - b.y : b.y - a.y);
        });
        this.emote(a, '...');
        this.scene.time.delayedCall(1500, () => this.emote(b, pick(t('emotes.replies'))));
      }
    }

    for (const p of this.world.people) this.idle(p, delta);

    for (const f of this.flutter) {
      const d = Phaser.Math.Distance.Between(f.dot.x, f.dot.y, f.target.x, f.target.y);
      if (d < 3) f.target = { x: f.home.x + rand(-40, 40), y: f.home.y + rand(-26, 26) };
      else f.dot.setPosition(f.dot.x + ((f.target.x - f.dot.x) / d) * delta * 0.04, f.dot.y + ((f.target.y - f.dot.y) / d) * delta * 0.04);
    }
  }
}
