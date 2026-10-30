import Phaser from 'phaser';
import Story from '../systems/Story.js';
import Memory from '../systems/Memory.js';
import Daylight from '../systems/Daylight.js';
import sound from '../systems/Sound.js';
import music from '../systems/Music.js';
import stage from '../stage/Stage.js';
import { PIXEL } from '../systems/Fonts.js';
import { writeSave, clearSave } from '../systems/Save.js';
import { t } from '../systems/Lang.js';
import story from '../data/story.json';
import { buildNeighborhood, COLS, ROWS } from '../world/neighborhood.js';
import Life, { facing } from '../world/Life.js';
import Toys from '../world/Toys.js';
import { S, T, SIDE } from '../world/World.js';

const WALK = 120;
const RUN = 200;
const REACH = 58;
const STICK_DEAD = 0.25;

export default class NeighborhoodScene extends Phaser.Scene {
  constructor() {
    super('Neighborhood');
  }

  create({ save = null } = {}) {
    const cam = this.cameras.main;
    cam.setVisible(false);
    this.physics.world.setBounds(0, 0, COLS * T, ROWS * T);
    cam.setBounds(0, 0, COLS * T, ROWS * T);

    const { world, spawn, wake, places } = buildNeighborhood(this);
    this.world = world;
    this.wake = wake;
    this.places = places;
    this.ended = false;
    this.flung = null;
    this.hits = save ? save.hits || 0 : 0;
    this.intent = { x: 0, y: 0 };
    sound.setAmbience('day');

    this.shadow = this.add.ellipse(0, 0, 20, 8, 0x000000, 0.25).setDepth(4);
    const start = save ? { x: save.x, y: save.y } : spawn;
    this.player = this.physics.add.sprite(start.x, start.y, 'player', 'down_0').setScale(S);
    this.dir = 'down';
    this.player.body.setSize(10, 5).setOffset(3, 11);
    this.player.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, world.solids);
    cam.startFollow(this.player, true, 0.1, 0.1);
    stage.attach(this, { follow: () => this.player });
    stage.fadeTo(0, 0);
    this.time.delayedCall(30, () => stage.fadeTo(1, 1200));
    this.sinceStep = 0;

    this.prompt = this.add
      .text(0, 0, 'E', { fontFamily: PIXEL, fontSize: '14px', fontStyle: 'bold', color: '#17110d', backgroundColor: '#f3d9a4', padding: { x: 5, y: 2 } })
      .setOrigin(0.5, 1)
      .setDepth(900)
      .setVisible(false);

    this.daylight = new Daylight(this);
    this.life = new Life(this, world, places);
    this.toys = new Toys(this, world, places, this.life);
    this.life.toys = this.toys;
    this.story = new Story(this);
    this.memory = new Memory(this);
    this.scene.launch('UI', { save });
    this.ui = this.scene.get('UI');
    if (save) this.restore(save);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.shift = this.input.keyboard.addKey('SHIFT');
    this.input.keyboard.on('keydown-E', () => this.act());
    this.input.keyboard.on('keydown-SPACE', () => this.act());
    this.input.keyboard.on('keydown-Q', () => this.look('photo'));
    this.input.keyboard.on('keydown-R', () => this.look('letter'));
    if (this.input.gamepad) {
      this.input.gamepad.on('down', (pad, button) => {
        sound.init();
        if (button.index === 0 || button.index === 1) this.act();
        else if (button.index === 2) this.look('photo');
        else if (button.index === 3) this.look('letter');
      });
    }
    this.events.once('shutdown', () => {
      this.scene.stop('UI');
      music.mute();
    });
  }

  restore(save) {
    this.story.restore(save.flags);
    this.daylight.set(save.phase, 1);
    if (this.story.flags.has('tin')) this.setWake();
    this.time.delayedCall(1500, () => !this.held && this.story.follow({ id: 'restore', x: this.player.x, y: this.player.y }));
  }

  save() {
    if (this.ended) return;
    const { ui, story: plot, player } = this;
    writeSave({
      flags: [...plot.flags],
      items: [...ui.items],
      objective: ui.objectiveKey,
      errand: ui.errandKey || '',
      found: plot.found(),
      phase: this.daylight.phase,
      hits: this.hits,
      x: Math.round(player.x),
      y: Math.round(player.y),
      at: Date.now(),
    });
  }

  get held() {
    return this.ended || !!this.flung || !this.ui.dialogue || this.ui.dialogue.active || this.ui.open || this.story.busy || this.memory.active;
  }

  push() {
    return this.held ? { x: 0, y: 0 } : this.intent;
  }

  knock(lane) {
    if (this.held) return false;
    const { player } = this;
    const feet = player.y + T / 2;
    this.hits += 1;
    this.flung = {
      vx: lane.dir * (lane.speed * 2 + 120 + Math.random() * 80),
      vy: (feet < lane.y - 8 ? -1 : 1) * (90 + Math.random() * 60),
      h: 0,
      vh: 330,
      spin: lane.dir * -14,
      road: this.places.roads.find((r) => lane.y > r.y && lane.y < r.y + r.h),
      bounced: false,
      down: 0,
    };
    player.body.setVelocity(0);
    player.body.enable = false;
    this.stand();
    this.prompt.setVisible(false);
    stage.shake(0.35, 600);
    sound.bonk();
    this.life.help(player.x, feet);
    return true;
  }

  fly(delta) {
    const { player } = this;
    const f = this.flung;
    const dt = delta / 1000;
    if (f.down > 0) {
      f.down -= delta;
      if (f.down <= 0) this.getUp();
      return;
    }
    if (f.down < 0) return;
    f.vh -= 900 * dt;
    f.h += f.vh * dt;
    player.x = Phaser.Math.Clamp(player.x + f.vx * dt, T, (COLS - 1) * T);
    let feet = player.y + T / 2 + f.vy * dt;
    if (f.road) feet = Phaser.Math.Clamp(feet, f.road.y - SIDE * T + 10, f.road.y + f.road.h + SIDE * T - 6);
    player.y = feet - T / 2;
    player.spin3d = (player.spin3d || 0) + f.spin * dt;
    if (f.h <= 0) {
      f.h = 0;
      if (!f.bounced && f.vh < -150) {
        f.bounced = true;
        f.vh *= -0.35;
        f.vx *= 0.5;
        f.vy *= 0.5;
        sound.thud();
        stage.shake(0.12, 250);
      } else {
        f.down = 1400;
        player.spin3d = Math.sign(f.vx || 1) * -Math.PI / 2;
        this.life.emote({ x: player.x, y: feet, sprite: player }, t('emotes.dazed'), 1100);
      }
    }
    player.lift3d = f.h / T;
  }

  getUp() {
    const { player } = this;
    const { road } = this.flung;
    this.flung.down = -1;
    player.spin3d = 0;
    player.lift3d = 0;
    const feet = player.y + T / 2;
    const done = () => {
      this.flung = null;
      player.body.enable = true;
      player.body.reset(player.x, player.y);
      this.stand();
    };
    if (!road || feet < road.y || feet > road.y + road.h) return done();
    const to = feet < road.y + road.h / 2 ? road.y - T * 0.8 : road.y + road.h + T * 0.8;
    this.dir = to < feet ? 'up' : 'down';
    player.anims.play(`player_walk_${this.dir}`, true);
    this.tweens.add({ targets: player, y: to - T / 2, duration: 700, onComplete: done });
  }

  act() {
    if (this.memory.game && !this.ui.dialogue.active) return this.memory.game.press();
    if (this.ended) return;
    if (this.ui.open) this.ui.toggle();
    else if (this.ui.dialogue.active) this.ui.dialogue.advance();
    else if (!this.held && this.nearest && this.nearest.use) this.nearest.use();
    else if (!this.held && this.nearest) {
      this.dir = facing(this.nearest.x - this.player.x, this.nearest.y - this.player.y);
      this.stand();
      this.ui.hideHelp();
      sound.select();
      this.story.interact(this.nearest);
    }
  }

  look(item) {
    if (this.ended || this.ui.dialogue.active || this.story.busy || this.memory.active) return;
    this.ui.toggle(item);
  }

  setWake() {
    const { world, wake } = this;
    world.hidePerson('lola');
    Object.entries(wake.people).forEach(([id, [c, r]]) => world.movePerson(id, c, r));
    world.setWake(wake);
    this.life.gather(wake.slots);
  }

  runEnding() {
    const { player, wake } = this;
    this.ended = true;
    clearSave();
    this.prompt.setVisible(false);
    player.body.setVelocity(0);
    player.body.enable = false;
    this.ui.setCinematic(true);
    player.anims.play(`player_walk_${facing(wake.seat.x - player.x, wake.seat.y - player.y)}`, true);
    this.tweens.add({
      targets: player,
      x: wake.seat.x,
      y: wake.seat.y,
      duration: 2600,
      onComplete: () => {
        this.dir = 'down';
        this.stand();
      },
    });
    stage.zoomTo(1.4, 12000);

    const lola = this.add.sprite(wake.beside.x, wake.beside.y, 'lola', 'down_0').setOrigin(0.5, 1).setScale(S).setAlpha(0).setDepth(5 + wake.beside.y / 1000);
    this.tweens.add({ targets: lola, alpha: 0.8, delay: 4500, duration: 2500 });
    this.time.delayedCall(4500, () => music.cue('ending'));
    this.time.delayedCall(6500, () => this.ui.whisper(t('story.whisper')));
    this.tweens.add({ targets: lola, alpha: 0, delay: 13000, duration: 3500 });
    const closing = t('story.closing');
    closing.forEach((line, i) => this.time.delayedCall(17500 + i * 6200, () => this.ui.whisper(line)));
    const end = 17500 + closing.length * 6200 + 600;
    this.time.delayedCall(end, () => this.ui.showTitle());
    this.time.delayedCall(end + 6000, () => this.scene.launch('Credits', { hits: this.hits }));
  }

  update(time, delta) {
    const { player } = this;
    const body = player.body;
    if (body.enable) body.setVelocity(0);

    let moving = false;
    const pad = this.input.gamepad && this.input.gamepad.pad1;
    const running = this.shift.isDown || (pad && (pad.R1 > 0.5 || pad.R2 > 0.5));
    const pace = running ? RUN : WALK;
    if (this.flung) this.fly(delta);
    else if (!this.held) {
      const left = this.cursors.left.isDown || this.wasd.A.isDown;
      const right = this.cursors.right.isDown || this.wasd.D.isDown;
      const up = this.cursors.up.isDown || this.wasd.W.isDown;
      const down = this.cursors.down.isDown || this.wasd.S.isDown;
      if (left || right || up || down) {
        if (left) body.setVelocityX(-pace);
        else if (right) body.setVelocityX(pace);
        if (up) body.setVelocityY(-pace);
        else if (down) body.setVelocityY(pace);
        body.velocity.normalize().scale(pace);
        moving = body.velocity.lengthSq() > 0;
        if (moving) this.dir = body.velocity.x ? facing(body.velocity.x, 0) : facing(0, body.velocity.y);
      } else {
        const stick = this.stick();
        const len = Math.hypot(stick.x, stick.y);
        if (len > 0) {
          const speed = pace * Math.max(0.45, Math.min(1, len));
          body.setVelocity((stick.x / len) * speed, (stick.y / len) * speed);
          moving = true;
          this.dir = facing(stick.x, stick.y);
        }
      }
    }

    this.intent = moving ? { x: body.velocity.x, y: body.velocity.y } : { x: 0, y: 0 };

    if (moving) {
      player.anims.play(`player_walk_${this.dir}`, true);
      player.anims.timeScale = running ? 1.7 : 1;
      this.sinceStep += delta;
      if (this.sinceStep > (running ? 140 : 220)) {
        this.sinceStep = 0;
        this.footstep();
      }
    } else if (!this.ended && !this.flung) {
      this.stand();
    }
    this.life.update(delta);
    this.toys.update(delta);
    if (this.memory.game) this.memory.game.update(delta);
    this.listen();

    for (const zone of story.zones) {
      const [c, r, w, h] = zone.rect;
      const inside = player.x > c * T && player.x < (c + w) * T && player.y > r * T && player.y < (r + h) * T;
      if (inside && !this.held && this.story.holds(zone)) this.story.interact({ id: zone.id, x: player.x, y: player.y });
    }

    this.nearest = null;
    let best = REACH;
    for (const it of this.world.interactables) {
      const d = Phaser.Math.Distance.Between(player.x, player.y, it.x, it.y);
      if (d < best) {
        best = d;
        this.nearest = it;
      }
    }
    const show = this.nearest && !this.held;
    this.prompt.setVisible(!!show);
    if (show) {
      this.prompt.setPosition(this.nearest.x, this.nearest.y - this.nearest.h / 2 - 10 + Math.sin(time / 220) * 2);
      this.prompt.ground3d = this.nearest.y + this.nearest.h / 2;
    }

    const feet = player.y + T / 2;
    this.shadow.setPosition(player.x, feet - 1).setScale(1 - Math.min(0.5, (player.lift3d || 0) / 4));
    this.daylight.update();
  }

  listen() {
    const on = !this.ended && !['sunset', 'dusk'].includes(this.daylight.phase);
    const far = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.places.radio.x, this.places.radio.y) / T;
    const near = Math.pow(Math.max(0, 1 - far / 10), 1.5);
    music.radio(on ? near * (this.memory.active ? 0.15 : 1) : 0);
  }

  heading() {
    const key = (a, b) => (a.isDown || b.isDown ? 1 : 0);
    const x = key(this.cursors.right, this.wasd.D) - key(this.cursors.left, this.wasd.A);
    const y = key(this.cursors.down, this.wasd.S) - key(this.cursors.up, this.wasd.W);
    const len = Math.hypot(x, y);
    if (len) return { x: x / len, y: y / len };
    const stick = this.stick();
    const push = Math.hypot(stick.x, stick.y);
    return push > 1 ? { x: stick.x / push, y: stick.y / push } : stick;
  }

  stick() {
    const touch = this.ui.touch && this.ui.touch.vector;
    if (touch && (touch.x || touch.y)) return touch;
    const pad = this.input.gamepad && this.input.gamepad.pad1;
    if (!pad) return { x: 0, y: 0 };
    if (pad.left || pad.right || pad.up || pad.down) return { x: pad.left ? -1 : pad.right ? 1 : 0, y: pad.up ? -1 : pad.down ? 1 : 0 };
    const { x, y } = pad.leftStick;
    return Math.hypot(x, y) < STICK_DEAD ? { x: 0, y: 0 } : { x, y };
  }

  stand() {
    this.player.anims.stop();
    this.player.anims.timeScale = 1;
    this.player.setFrame(`${this.dir}_0`);
  }

  footstep() {
    sound.step();
  }
}
