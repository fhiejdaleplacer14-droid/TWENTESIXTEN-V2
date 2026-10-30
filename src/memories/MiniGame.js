import stage from '../stage/Stage.js';
import { PIXEL } from '../systems/Fonts.js';
import { facing } from '../world/Life.js';

export const T = 32;

export default class MiniGame {
  constructor(scene, at, done) {
    Object.assign(this, { scene, at, done, ui: scene.ui, things: [], marks: [], meshes: [], over: false });
    this.follow = stage.follow;
    scene.player.setAlpha(0);
    scene.shadow.setAlpha(0);
    this.ui.touch.dim(false);
    const { width } = this.ui.scale;
    this.title = this.mark(this.ui.add.text(width / 2, 62, '', { fontFamily: PIXEL, fontSize: '17px', color: '#fff3d6', stroke: '#2a1c12', strokeThickness: 5, align: 'center' }).setOrigin(0.5, 0));
    this.status = this.mark(this.ui.add.text(width / 2, 88, '', { fontFamily: PIXEL, fontSize: '15px', color: '#f3d9a4', stroke: '#2a1c12', strokeThickness: 4 }).setOrigin(0.5, 0));
  }

  mark(obj) {
    this.marks.push(obj.setDepth(1100));
    return obj;
  }

  mesh(m) {
    this.meshes.push(stage.add(m));
    return m;
  }

  person(look, x, y, scale = 1.5) {
    const sprite = this.scene.add.sprite(x, y, look, 'down_0').setOrigin(0.5, 1).setScale(scale);
    const shadow = this.scene.add.ellipse(x, y - 1, 10 * scale, 3 * scale, 0x000000, 0.22);
    const who = { sprite, shadow, look, x, y, dir: 'down' };
    this.things.push(sprite, shadow);
    return who;
  }

  walk(who, dx, dy, box) {
    if (dx || dy) {
      who.dir = facing(dx, dy);
      who.sprite.anims.play(`${who.look}_walk_${who.dir}`, true);
      who.x = Math.min(box.x + box.w, Math.max(box.x, who.x + dx));
      who.y = Math.min(box.y + box.h, Math.max(box.y, who.y + dy));
    } else this.stand(who);
    this.place(who);
  }

  stand(who, dir = who.dir) {
    who.dir = dir;
    who.sprite.anims.stop();
    who.sprite.setFrame(`${dir}_0`);
  }

  place(who) {
    who.sprite.setPosition(who.x, who.y);
    who.shadow.setPosition(who.x, who.y - 1);
  }

  toward(who, to, speed, delta, box) {
    const dx = to.x - who.x;
    const dy = to.y - who.y;
    const far = Math.hypot(dx, dy);
    const step = (speed * delta) / 1000;
    if (far <= step) {
      this.walk(who, dx, dy, box);
      return true;
    }
    this.walk(who, (dx / far) * step, (dy / far) * step, box);
    return false;
  }

  look(at) {
    stage.follow = () => at();
  }

  say(who, text, hold) {
    this.scene.life.emote({ x: who.x, y: who.y, sprite: who.sprite }, text, hold);
  }

  end(won, lines = null) {
    if (this.over) return;
    this.over = true;
    this.scene.time.delayedCall(1100, () => {
      this.clear();
      this.done(won, lines);
    });
  }

  panel(w, h, colour = 0x17110d) {
    const { width, height } = this.ui.scale;
    const box = { x: width / 2 - w / 2, y: height / 2 - h / 2 - 10, w, h };
    this.mark(this.ui.add.rectangle(width / 2, box.y + h / 2, w + 12, h + 12, colour, 0.92).setStrokeStyle(2, 0xf3d9a4));
    return box;
  }

  clear() {
    this.things.forEach((t) => t.destroy());
    this.marks.forEach((m) => m.destroy());
    this.meshes.forEach((m) => m.removeFromParent());
    stage.follow = this.follow;
    this.scene.player.setAlpha(1);
    this.scene.shadow.setAlpha(1);
    this.ui.touch.dim(true);
  }

  update() {}

  press() {}
}

MiniGame.zoom = 1.15;
