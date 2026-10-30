import sound from '../systems/Sound.js';
import { t } from '../systems/Lang.js';
import { S } from './World.js';

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const BRAKE = 260;
const PICK_UP = 80;
const RECKLESS = 0.25;
const KINDS = [
  { key: 'jeepney', speed: 92, weight: 0.65 },
  { key: 'tricycle', speed: 74, weight: 0.35 },
];

export default class Traffic {
  constructor(life, lanes) {
    this.life = life;
    const { scene } = life;
    this.lanes = lanes.map((lane) => {
      const sprite = scene.add.sprite(0, lane.y, 'jeepney').setOrigin(0.5, 1).setScale(S).setVisible(false);
      const shadow = scene.add.ellipse(0, lane.y - 2, 80, 10, 0x000000, 0.22).setDepth(4).setVisible(false);
      const block = scene.add.zone(-999, lane.y - 10, 80, 18);
      scene.physics.add.existing(block, true);
      if (scene.player.body) scene.physics.add.collider(scene.player, block);
      const lights = { x: 0, y: 0, scale: 0.9, tint: 0xfff0c0, alpha: 0 };
      if (scene.daylight) scene.daylight.extra.push(lights);
      const dust = scene.add.particles(0, lane.y, 'dot', { lifespan: 900, speedX: { min: -10, max: 10 }, speedY: { min: -16, max: -6 }, scale: { start: 1, end: 3.2 }, alpha: { start: 0.3, end: 0 }, tint: 0xd8cfbb, frequency: 70, emitting: false });
      dust.lift3d = 0.05;
      life.things.push(sprite, shadow, dust);
      return { ...lane, sprite, shadow, block, lights, dust, x: null, speed: 0, timer: rand(3000, 26000), honk: 0, bob: 0 };
    });
  }

  spawn(lane) {
    const roll = Math.random();
    const kind = roll < KINDS[0].weight ? KINDS[0] : KINDS[1];
    lane.kind = kind;
    lane.x = lane.from;
    lane.pace = kind.speed * rand(0.9, 1.15);
    lane.speed = lane.pace;
    lane.reckless = Math.random() < RECKLESS;
    lane.sprite.setTexture(kind.key).setFlipX(lane.dir < 0).setVisible(true);
    lane.half = lane.sprite.displayWidth / 2;
    lane.shadow.setSize(lane.half * 1.8, 10).setVisible(true);
    lane.block.setSize(lane.half * 1.9, 18);
    lane.block.body.setSize(lane.half * 1.9, 18);
  }

  blocked(lane) {
    const others = this.life.actors.filter((a) => !a.hidden && a.sprite.alpha > 0.2).map((a) => ({ x: a.x, y: a.y }));
    const feet = this.feet();
    const ahead = (p, far) => {
      const d = (p.x - lane.x) * lane.dir;
      return d > 0 && d < lane.half + far && Math.abs(p.y - lane.y) < 30;
    };
    return others.some((p) => ahead(p, 46)) || (feet && !lane.reckless && ahead(feet, 40));
  }

  feet() {
    const { player } = this.life.scene;
    return player.body && player.body.enable ? { x: player.x, y: player.y + 16 } : null;
  }

  hits(lane) {
    const feet = this.feet();
    return feet && Math.abs(feet.x - lane.x) < lane.half + 6 && feet.y > lane.y - 26 && feet.y < lane.y + 6;
  }

  knock(lane) {
    const { scene } = this.life;
    if (!scene.knock || !scene.knock(lane)) return;
    sound.honk();
    this.life.emote({ x: lane.x, y: lane.y, sprite: lane.sprite }, pick(t('emotes.hit')), 2400);
    lane.honk = 3000;
  }

  update(delta) {
    for (const lane of this.lanes) {
      if (lane.x === null) {
        lane.timer -= delta;
        if (lane.timer <= 0 && !(lane.main && this.life.gathering)) this.spawn(lane);
        continue;
      }
      lane.honk -= delta;
      lane.bob += delta;
      const dt = delta / 1000;
      const want = this.blocked(lane) ? 0 : lane.pace;
      lane.speed = lane.speed > want ? Math.max(want, lane.speed - BRAKE * dt) : Math.min(want, lane.speed + PICK_UP * dt);
      const stopped = lane.speed < 4;
      const feet = this.feet();
      const coming = feet && lane.reckless && (feet.x - lane.x) * lane.dir > 0 && (feet.x - lane.x) * lane.dir < 260 && Math.abs(feet.y - lane.y) < 40;
      if ((stopped && want === 0) || coming) {
        if (lane.honk <= 0 && this.life.near(lane.x, lane.y, 360)) {
          sound.honk();
          this.life.emote({ x: lane.x + lane.half * 0.6 * lane.dir, y: lane.y, sprite: lane.sprite }, t('emotes.honk'));
          lane.honk = coming ? rand(900, 1400) : rand(2400, 3600);
        }
      } else if (lane.honk < 600) lane.honk = 600;
      lane.x += lane.dir * lane.speed * dt;
      if (lane.speed > 25) {
        if (this.hits(lane)) this.knock(lane);
        if (this.life.toys) this.life.toys.hitBy(lane.x, lane.y, lane.half, lane.dir, lane.speed);
      }
      lane.dust.setPosition(lane.x - lane.dir * lane.half * 0.8, lane.y - 2);
      if (lane.speed > 40 !== lane.dust.emitting) lane.speed > 40 ? lane.dust.start() : lane.dust.stop();
      const shake = stopped ? (Math.floor(lane.bob / 70) % 2) * -1 : Math.floor(lane.bob / 160) % 3 === 0 ? -1 : 0;
      lane.sprite.setPosition(Math.round(lane.x), lane.y + shake).setDepth(5 + lane.y / 1000);
      lane.shadow.setPosition(lane.x, lane.y - 2);
      lane.block.setPosition(lane.x, lane.y - 10);
      lane.block.body.updateFromGameObject();
      Object.assign(lane.lights, { x: lane.x + lane.dir * (lane.half + 26), y: lane.y - 6, alpha: 1 });
      if ((lane.x - lane.to) * lane.dir > 0) {
        lane.x = null;
        lane.dust.stop();
        lane.sprite.setVisible(false);
        lane.shadow.setVisible(false);
        lane.block.setPosition(-999, lane.y);
        lane.block.body.updateFromGameObject();
        lane.lights.alpha = 0;
        lane.timer = rand(14000, 40000);
      }
    }
  }
}
