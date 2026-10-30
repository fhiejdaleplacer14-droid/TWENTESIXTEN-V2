import settings from './Settings.js';

const PENTATONIC = [392, 440, 523.25, 587.33, 659.25, 783.99];

class Sound {
  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.setVolume();
    this.master.connect(this.ctx.destination);
    this.echo = this.ctx.createDelay(1);
    this.echo.delayTime.value = 0.36;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.38;
    const dull = this.ctx.createBiquadFilter();
    dull.type = 'lowpass';
    dull.frequency.value = 1800;
    this.echo.connect(dull).connect(feedback).connect(this.echo);
    dull.connect(this.master);
    this.startWind();
    this.setAmbience('day');
  }

  setVolume() {
    if (this.master) this.master.gain.value = settings.volume / 10;
  }

  tone(freq, dur, { type = 'sine', vol = 0.08, delay = 0, slide = 0, attack = 0.01, echo = false } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    if (echo) gain.connect(this.echo);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noise(dur, { vol = 0.05, freq = 800, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  noiseBuffer() {
    if (!this.buffer) {
      this.buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const data = this.buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.buffer;
  }

  blip() { this.tone(520 + Math.random() * 60, 0.05, { type: 'triangle', vol: 0.025 }); }
  step() { this.noise(0.07, { vol: 0.018, freq: 500 + Math.random() * 300 }); }
  select() { this.tone(660, 0.09, { type: 'triangle', vol: 0.05 }); this.tone(880, 0.12, { type: 'triangle', vol: 0.04, delay: 0.07 }); }
  page() { this.noise(0.18, { vol: 0.04, freq: 2400 }); }
  dig() { [0, 0.22, 0.44].forEach((d) => this.noise(0.14, { vol: 0.06, freq: 300, delay: d })); }
  bounce() { [0, 0.42, 0.74, 0.98].forEach((d, i) => this.tone(150, 0.12, { vol: 0.09 - i * 0.02, slide: -70, delay: d })); }
  bark() { [0, 0.16].forEach((d) => this.tone(420, 0.09, { type: 'sawtooth', vol: 0.03, slide: -160, delay: d })); }
  thud() { this.tone(140, 0.12, { vol: 0.06, slide: -60 }); }
  clatter() { [0, 0.09, 0.2].forEach((d, i) => this.noise(0.08, { vol: 0.05 - i * 0.012, freq: 1400 - i * 300, delay: d })); }
  kick() { this.tone(210, 0.08, { vol: 0.06, slide: -90 }); this.noise(0.05, { vol: 0.03, freq: 900 }); }
  splash() { [0, 0.08, 0.2].forEach((d, i) => this.noise(0.3 - i * 0.06, { vol: 0.07 - i * 0.015, freq: 500 + i * 400, delay: d })); }
  cluck() { [0, 0.11, 0.2].forEach((d) => this.tone(700 + Math.random() * 120, 0.06, { type: 'square', vol: 0.012, slide: -200, delay: d })); }
  bonk() { this.tone(260, 0.1, { vol: 0.08, slide: -120 }); this.tone(330, 0.5, { type: 'triangle', vol: 0.05, slide: 520, delay: 0.08 }); }
  objective() { this.tone(587.33, 0.25, { vol: 0.04 }); this.tone(783.99, 0.4, { vol: 0.035, delay: 0.14 }); }
  honk() { [0, 0.2].forEach((d) => [370, 466].forEach((f) => this.tone(f, 0.13, { type: 'square', vol: 0.018, delay: d }))); }
  crow() { [[520, 0.12, 260, 0], [760, 0.16, 120, 0.14], [880, 0.5, -420, 0.32]].forEach(([f, dur, slide, delay]) => this.tone(f, dur, { type: 'sawtooth', vol: 0.014, slide, delay })); }

  melody(length = 6, gap = 0.34) {
    let i = 2;
    for (let n = 0; n < length; n++) {
      i = Math.max(0, Math.min(PENTATONIC.length - 1, i + Math.round(Math.random() * 4 - 2)));
      this.tone(PENTATONIC[i], 1.4, { vol: 0.05, delay: n * gap });
      this.tone(PENTATONIC[i] / 2, 1.8, { vol: 0.025, delay: n * gap });
    }
  }

  startWind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    const lfo = this.ctx.createOscillator();
    const depth = this.ctx.createGain();
    lfo.frequency.value = 0.09;
    depth.gain.value = 0.02;
    lfo.connect(depth).connect(gain.gain);
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    lfo.start();
  }

  setAmbience(mode) {
    if (!this.ctx || this.mode === mode) return;
    this.mode = mode;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.mode === 'day' && Math.random() < 0.35) this.bird();
      if (this.mode === 'dusk') this.cricket();
    }, mode === 'day' ? 900 : 620);
  }

  bird() {
    const base = 2200 + Math.random() * 1400;
    const notes = 2 + Math.floor(Math.random() * 3);
    for (let n = 0; n < notes; n++) this.tone(base, 0.09, { vol: 0.012, slide: 500 - Math.random() * 900, delay: n * 0.13 });
  }

  cricket() {
    for (let n = 0; n < 4; n++) this.tone(4300, 0.035, { type: 'square', vol: 0.004, delay: n * 0.06 });
  }
}

export default new Sound();
