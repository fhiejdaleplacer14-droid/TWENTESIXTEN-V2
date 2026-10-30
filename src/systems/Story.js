import story from '../data/story.json';
import memories from '../data/memories.json';
import { t } from './Lang.js';

export default class Story {
  constructor(scene) {
    this.scene = scene;
    this.flags = new Set();
    this.busy = false;
  }

  holds(rule) {
    const all = (rule.if || []).every((f) => (f[0] === '!' ? !this.flags.has(f.slice(1)) : this.flags.has(f)));
    const any = !rule.anyOf || rule.anyOf.some((f) => this.flags.has(f));
    return all && any && (!rule.count || this.found() >= rule.count);
  }

  found() {
    return story.memories.filter((m) => this.flags.has(m)).length;
  }

  interact(it) {
    if (this.busy) return;
    const rules = it.talk ? [{ steps: [{ lines: it.talk() }] }] : story.rules[it.id] || [{ steps: [{ say: it.id }] }];
    const rule = rules.find((r) => this.holds(r));
    if (rule) this.play(rule, it);
  }

  play(rule, it) {
    this.busy = true;
    const steps = [...(rule.steps || [])];
    const next = () => {
      const step = steps.shift();
      if (!step) return this.finish(rule, it);
      if (step.memory) return this.scene.memory.play({ ...memories[step.memory], id: step.memory, lines: t(`memories.${step.memory}`) }, it, next);
      if (step.read) return this.scene.ui.read(t(`story.${step.read}`), next);
      const said = step.lines || t(`dialogue.${step.say}`);
      return this.scene.ui.dialogue.start(Array.isArray(said) ? said : null, next);
    };
    next();
  }

  finish(rule, it) {
    (rule.set || []).forEach((f) => this.flags.add(f));
    if (rule.give) this.scene.ui.give(rule.give);
    if (rule.phase) this.scene.daylight.set(rule.phase);
    if (rule.objective) this.scene.ui.setObjective(rule.objective);
    if (rule.errand !== undefined) this.scene.ui.setErrand(rule.errand);
    if (rule.event) this.scene[rule.event]();
    const found = this.found();
    this.scene.ui.setMemories(found, story.memories.length);
    if (found === story.memories.length) this.flags.add('all_memories');
    this.busy = false;
    if (rule.ending) return this.scene.runEnding();
    this.scene.save();
    this.follow(it);
  }

  follow(it) {
    const next = story.derived.find((r) => this.holds(r));
    if (next) this.play(next, it);
  }

  restore(flags) {
    flags.forEach((f) => this.flags.add(f));
  }
}
