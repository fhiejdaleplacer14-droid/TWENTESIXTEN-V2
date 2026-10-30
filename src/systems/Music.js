import sound from './Sound.js';
import songs from '../data/songs.json';

const STEPS = [0, 2, 4, 5, 7, 9, 11];
const SLOTS = ['radio', 'golden', 'ending'];
const KINDS = ['mp3', 'ogg', 'm4a', 'wav'];
const SONG_FOR = { golden: ['dandansoy', 'guitar'], ending: ['ili', 'musicbox'] };
const PLAYLIST = ['bahayKubo', 'leron'];

export function parse(song) {
  const notes = [];
  const chords = [];
  let at = 0;
  const pitch = (degree, up) => song.do * Math.pow(2, (STEPS[(degree - 1) % 7] + 12 * (Math.floor((degree - 1) / 7) + up)) / 12);
  song.lines.forEach((line, i) => {
    const start = at;
    for (const token of line.trim().split(/\s+/)) {
      const m = token.match(/^([0-7])(['°]*)(,*)([-_.]*)$/);
      if (!m) continue;
      let beats = 1;
      for (const mark of m[4]) beats = mark === '-' ? beats + 1 : mark === '_' ? beats / 2 : beats * 1.5;
      const degree = +m[1];
      notes.push({ at, beats, freq: degree ? pitch(degree, m[2].length - m[3].length) : null });
      at += beats;
    }
    const root = song.chords && song.chords[i];
    if (root) chords.push({ at: start, beats: at - start, freqs: [root, root + 2, root + 4].map((d) => pitch(d, -1)) });
  });
  return { notes, chords, beats: at };
}

class Music {
  constructor() {
    this.custom = {};
    this.level = 0;
    if (typeof fetch === 'function' && location.protocol !== 'file:') SLOTS.forEach((slot) => this.probe(slot));
  }

  async probe(slot) {
    for (const kind of KINDS) {
      try {
        const res = await fetch(`music/${slot}.${kind}`, { method: 'HEAD' });
        if (res.ok && (res.headers.get('content-type') || '').startsWith('audio')) {
          this.custom[slot] = `music/${slot}.${kind}`;
          return;
        }
      } catch {
        return;
      }
    }
  }

  get ctx() {
    return sound.ctx;
  }

  play(id, voice, to = sound.master, level = 1) {
    const song = songs[id];
    if (!this.ctx || !song) return null;
    const out = this.ctx.createGain();
    out.gain.value = level;
    out.connect(to);
    const beat = 60 / song.bpm;
    const start = this.ctx.currentTime + 0.1;
    const { notes, chords, beats } = parse(song);
    for (const n of notes) if (n.freq) VOICES[voice].note(this, out, n.freq, start + n.at * beat, n.beats * beat);
    for (const c of chords) VOICES[voice].chord(this, out, c.freqs, start + c.at * beat, c.beats * beat);
    return {
      length: beats * beat,
      stop: (seconds = 1.5) => {
        const now = this.ctx.currentTime;
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + seconds);
        setTimeout(() => out.disconnect(), seconds * 1000 + 100);
      },
    };
  }

  file(url, to, loop) {
    const audio = new Audio(url);
    audio.loop = loop;
    const out = this.ctx.createGain();
    this.ctx.createMediaElementSource(audio).connect(out).connect(to);
    audio.play().catch(() => {});
    return {
      stop: (seconds = 1.5) => {
        const now = this.ctx.currentTime;
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + seconds);
        setTimeout(() => audio.pause(), seconds * 1000 + 100);
      },
    };
  }

  cue(slot) {
    if (!this.ctx) return;
    if (this.custom[slot]) return this.file(this.custom[slot], sound.master, false);
    const [id, voice] = SONG_FOR[slot];
    return this.play(id, voice, sound.master, slot === 'ending' ? 1 : 0.8);
  }

  radio(level) {
    if (!this.ctx) return;
    if (!this.station) this.tune();
    this.level += (level - this.level) * 0.08;
    this.station.gain.value = this.level * 0.9;
  }

  mute() {
    this.level = 0;
    if (this.station) this.station.gain.value = 0;
  }

  tune() {
    const ctx = this.ctx;
    this.station = ctx.createGain();
    this.station.gain.value = 0;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1300;
    band.Q.value = 0.7;
    this.speaker = ctx.createGain();
    this.speaker.connect(band).connect(this.station).connect(sound.master);
    const hiss = ctx.createBufferSource();
    hiss.buffer = sound.noiseBuffer();
    hiss.loop = true;
    const quiet = ctx.createGain();
    quiet.gain.value = 0.012;
    hiss.connect(quiet).connect(this.speaker);
    hiss.start();
    if (this.custom.radio) {
      this.file(this.custom.radio, this.speaker, true);
      return;
    }
    let track = 0;
    const next = () => {
      const song = this.play(PLAYLIST[track++ % PLAYLIST.length], 'radio', this.speaker);
      if (song) setTimeout(next, (song.length + 2.5) * 1000);
    };
    next();
  }
}

const VOICES = {
  musicbox: {
    note(m, out, f, at, len) {
      tone(m.ctx, out, f, at, 2.2, 'sine', 0.06, 0.005, true);
      tone(m.ctx, out, f * 2, at, 0.9, 'triangle', 0.014, 0.003, true);
    },
    chord(m, out, freqs, at, len) {
      freqs.forEach((f) => tone(m.ctx, out, f, at, len + 0.6, 'sine', 0.02, 0.8));
    },
  },
  guitar: {
    note(m, out, f, at, len) {
      tone(m.ctx, out, f, at, Math.max(0.6, len * 1.4), 'triangle', 0.055, 0.004, true);
      tone(m.ctx, out, f / 2, at, Math.max(0.5, len), 'sine', 0.02, 0.004);
    },
    chord(m, out, freqs, at, len) {
      for (let t = 0; t < len - 0.05; t += 1.4) freqs.forEach((f, i) => tone(m.ctx, out, f, at + t + i * 0.07, 1.6, 'triangle', 0.018, 0.004));
    },
  },
  radio: {
    note(m, out, f, at, len) {
      tone(m.ctx, out, f, at, Math.max(0.25, len * 0.9), 'square', 0.05, 0.01);
    },
    chord(m, out, freqs, at, len) {
      for (let t = 0; t < len - 0.05; t += 0.9) {
        tone(m.ctx, out, freqs[0] / 2, at + t, 0.3, 'triangle', 0.07, 0.005);
        freqs.forEach((f) => tone(m.ctx, out, f, at + t + 0.45, 0.22, 'square', 0.012, 0.005));
      }
    },
  },
};

function tone(ctx, out, freq, at, len, type, vol, attack, echo = false) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(out);
  if (echo && sound.echo) gain.connect(sound.echo);
  osc.start(at);
  osc.stop(at + len + 0.05);
}

export default new Music();
