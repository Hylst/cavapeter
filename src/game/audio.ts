import { Howl } from 'howler';

// ─── WAV encode ──────────────────────────────
function encodeWav(samples: Float32Array, rate = 44100): string {
  const buf  = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const str  = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0,'RIFF'); view.setUint32(4, 36 + samples.length * 2, true);
  str(8,'WAVE'); str(12,'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36,'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
}

// ─── Oscillators ─────────────────────────────
type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle';
function osc(t: number, freq: number, type: WaveType): number {
  const p = (t * freq) % 1;
  switch (type) {
    case 'sine':     return Math.sin(2 * Math.PI * p);
    case 'square':   return p < 0.5 ? 1 : -1;
    case 'sawtooth': return 2 * p - 1;
    case 'triangle': return 1 - 4 * Math.abs(p - 0.5);
  }
}
function adsr(t: number, dur: number, a: number, d: number, s: number, r: number): number {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (t - a) / d * (1 - s);
  if (t < dur - r) return s;
  if (t < dur) return s * (1 - (t - (dur - r)) / r);
  return 0;
}

// ─── Synth helpers ───────────────────────────
function tone(freq: number, dur: number, type: WaveType = 'sine', vol = 0.4): string {
  const rate = 44100, n = Math.ceil(dur * rate), buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    buf[i] = osc(t, freq, type) * adsr(t, dur, 0.005, 0.05, 0.5, 0.06) * vol;
  }
  return encodeWav(buf, rate);
}

function chord(freqs: number[], dur: number, type: WaveType = 'sine', vol = 0.3): string {
  const rate = 44100, n = Math.ceil(dur * rate), buf = new Float32Array(n);
  const v = vol / freqs.length;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = adsr(t, dur, 0.01, 0.05, 0.6, 0.12);
    buf[i] = freqs.reduce((s, f) => s + osc(t, f, type) * env * v, 0);
  }
  return encodeWav(buf, rate);
}

function sweep(f0: number, f1: number, dur: number, type: WaveType = 'sine', vol = 0.4): string {
  const rate = 44100, n = Math.ceil(dur * rate), buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const f = f0 + (f1 - f0) * (t / dur);
    buf[i] = osc(t, f, type) * adsr(t, dur, 0.005, 0.02, 0.5, 0.08) * vol;
  }
  return encodeWav(buf, rate);
}

function noise(dur: number, vol = 0.3, decay = 0.08): string {
  const rate = 44100, n = Math.ceil(dur * rate), buf = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.exp(-t / decay) * vol;
    const white = Math.random() * 2 - 1;
    last = last + 0.12 * (white - last);
    buf[i] = last * env;
  }
  return encodeWav(buf, rate);
}

// ─── Sound FX library ────────────────────────
const FX = {
  paddle:    new Howl({ src: [tone(260, 0.06, 'triangle', 0.4)],                   format: ['wav'] }),
  wall:      new Howl({ src: [tone(165, 0.04, 'triangle', 0.25)],                  format: ['wav'] }),
  brick:     new Howl({ src: [sweep(1100, 560, 0.08, 'square', 0.22)],             format: ['wav'] }),
  hardBrick: new Howl({ src: [sweep(520, 240, 0.11, 'sawtooth', 0.22)],            format: ['wav'] }),
  powerup:   new Howl({ src: [chord([523,659,784,1047], 0.26, 'sine', 0.28)],      format: ['wav'] }),
  life:      new Howl({ src: [chord([523,659,784,1047,1319], 0.42, 'sine', 0.28)], format: ['wav'] }),
  levelComplete: new Howl({ src: [chord([523,659,784,1047,1319,1568], 0.52, 'triangle', 0.26)], format: ['wav'] }),
  gameOver:  new Howl({ src: [sweep(440, 95, 0.85, 'sawtooth', 0.35)],             format: ['wav'] }),
  laser:     new Howl({ src: [sweep(2200, 650, 0.08, 'square', 0.22)],             format: ['wav'] }),
  explosion: new Howl({ src: [noise(0.22, 0.3, 0.14)],                            format: ['wav'] }),
  bomb:      new Howl({ src: [noise(0.30, 0.35, 0.18)],                            format: ['wav'] }),
};

let sfxOn = true;
export function setSFXEnabled(v: boolean) { sfxOn = v; }
export function setMusicEnabled(_v: boolean) { /* managed externally */ }

export function playSound(name: keyof typeof FX) {
  if (!sfxOn) return;
  try {
    FX[name]?.volume(name === 'explosion' || name === 'bomb' ? 0.4 : 1);
    FX[name]?.play();
  } catch { /* ignore */ }
}

// ─── Ambient Music (level-aware) ─────────────
class AmbientMusic {
  private actx: AudioContext | null = null;
  private master: GainNode | null = null;
  private running = false;
  private timer: number | null = null;
  private step = 0;
  private tempo = 118;
  private nextBeat = 0;
  private levelIdx = 0;

  // Scales per level-group (A-based, degrees in semitones)
  private readonly SCALE = [0,2,3,5,7,9,10,12,14,15,17,19];
  // Chord progressions per level-group
  private readonly PROG_GROUPS = [
    [[0,2,4,7],[2,4,6,7],[5,7,9,0],[3,5,7,9]],     // 1-6  Dorian
    [[0,3,5,7],[2,5,7,9],[5,8,10,0],[3,5,8,9]],     // 7-12  Phrygian
    [[0,3,5,7],[1,4,6,8],[5,8,10,0],[4,6,9,11]],    // 13-18 Harmonic minor
    [[0,2,5,7],[1,3,6,8],[5,7,10,0],[4,6,9,11]],    // 19-24 Lydian
  ];

  private ctx(): AudioContext {
    if (!this.actx)
      this.actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return this.actx;
  }

  start(level = 1) {
    this.levelIdx = Math.min(level - 1, 23);
    if (this.running) { this.updateTempo(); return; }
    const C = this.ctx();
    if (C.state === 'suspended') C.resume();
    this.master = C.createGain();
    this.master.gain.value = 0.13;
    this.master.connect(C.destination);
    this.running  = true;
    this.nextBeat = C.currentTime + 0.05;
    this.step = 0;
    this.updateTempo();
    this.schedule();
  }

  stop() {
    this.running = false;
    if (this.timer) { window.clearTimeout(this.timer); this.timer = null; }
    if (this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx().currentTime, 0.15);
      setTimeout(() => { this.master?.disconnect(); this.master = null; }, 700);
    }
  }

  private updateTempo() {
    // tempo ramps up per level: 110 at L1 → 165 at L24
    this.tempo = 110 + this.levelIdx * 2.4;
  }

  private schedule() {
    if (!this.running) return;
    const C = this.ctx();
    while (this.nextBeat < C.currentTime + 0.15) {
      this.playBeat(this.step, this.nextBeat);
      this.nextBeat += 60 / this.tempo / 2;
      this.step++;
    }
    this.timer = window.setTimeout(() => this.schedule(), 20);
  }

  private freq(degree: number, oct = 0): number {
    return 110 * Math.pow(2, (this.SCALE[degree % this.SCALE.length] + oct * 12) / 12);
  }

  private getProg(): number[][] {
    const grp = Math.min(Math.floor(this.levelIdx / 6), this.PROG_GROUPS.length - 1);
    return this.PROG_GROUPS[grp];
  }

  private playBeat(step: number, t: number) {
    const C = this.ctx();
    const beat = step % 8;
    const prog = this.getProg();
    const chord = prog[Math.floor(step / 8) % prog.length];
    const intensity = Math.min(1, this.levelIdx / 20);

    // ── chord / arp ──
    if (beat === 0 || beat === 4) {
      chord.forEach((deg, i) => {
        const osc  = C.createOscillator();
        const gain = C.createGain();
        osc.type = i === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.value = this.freq(deg);
        osc.detune.value = (i % 2 === 0 ? 1 : -1) * 4;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.032 - i * 0.004 + intensity * 0.015, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain); gain.connect(this.master!);
        osc.start(t); osc.stop(t + 0.6);
      });
    }

    // ── sub-bass ──
    if (beat === 0 || beat === 5) {
      const osc  = C.createOscillator();
      const gain = C.createGain();
      osc.type = 'square';
      osc.frequency.value = this.freq(chord[0], -1);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06 + intensity * 0.025, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(gain); gain.connect(this.master!);
      osc.start(t); osc.stop(t + 0.4);
    }

    // ── pad ──
    if (beat === 0) {
      chord.slice(0, 3).forEach((deg, i) => {
        const osc  = C.createOscillator();
        const gain = C.createGain();
        osc.type = 'sine';
        osc.frequency.value = this.freq(deg, 1);
        osc.detune.value = (i - 1) * 8;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.016, t + 0.15);
        gain.gain.linearRampToValueAtTime(0.016, t + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc.connect(gain); gain.connect(this.master!);
        osc.start(t); osc.stop(t + 1.0);
      });
    }

    // ── lead melody (grows with level) ──
    if (this.levelIdx >= 5 && (beat === 2 || beat === 6)) {
      const deg = chord[(step / 2) % chord.length | 0];
      const osc  = C.createOscillator();
      const gain = C.createGain();
      osc.type = 'square';
      osc.frequency.value = this.freq(deg, 1);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.018 + intensity * 0.015, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain); gain.connect(this.master!);
      osc.start(t); osc.stop(t + 0.3);
    }

    // ── snare on 3 & 7 ──
    if (beat === 3 || beat === 7) {
      const bsz  = Math.ceil(C.sampleRate * 0.08);
      const bbuf = C.createBuffer(1, bsz, C.sampleRate);
      const bd   = bbuf.getChannelData(0);
      for (let i = 0; i < bsz; i++) bd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (C.sampleRate * 0.012));
      const ns   = C.createBufferSource();
      const flt  = C.createBiquadFilter();
      const gain = C.createGain();
      ns.buffer = bbuf;
      flt.type = 'bandpass'; flt.frequency.value = 3500 + intensity * 1200;
      gain.gain.setValueAtTime(0.020, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      ns.connect(flt); flt.connect(gain); gain.connect(this.master!);
      ns.start(t);
    }

    // ── hi-hat ──
    if (beat % 2 === 1) {
      const bsz  = Math.ceil(C.sampleRate * 0.03);
      const bbuf = C.createBuffer(1, bsz, C.sampleRate);
      const bd   = bbuf.getChannelData(0);
      for (let i = 0; i < bsz; i++) bd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (C.sampleRate * 0.004));
      const ns   = C.createBufferSource();
      const flt  = C.createBiquadFilter();
      const gain = C.createGain();
      ns.buffer = bbuf;
      flt.type = 'highpass'; flt.frequency.value = 9000;
      gain.gain.setValueAtTime(0.012, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      ns.connect(flt); flt.connect(gain); gain.connect(this.master!);
      ns.start(t);
    }

    // ── kick ──
    if (beat === 0) {
      const osc  = C.createOscillator();
      const gain = C.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      gain.gain.setValueAtTime(0.20, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain); gain.connect(this.master!);
      osc.start(t); osc.stop(t + 0.2);
    }
  }
}

export const ambientMusic = new AmbientMusic();
