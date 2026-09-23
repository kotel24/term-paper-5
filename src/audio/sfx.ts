type Ctx = AudioContext;

export class Sfx {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private motor: { osc: OscillatorNode[]; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private drill: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  muted = false;

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const b = this.ctx.createBufferSource();
      b.buffer = this.ctx.createBuffer(1, 1, 22050);
      b.connect(this.master);
      b.start(0);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private ready(): Ctx | null {
    if (!this.ctx || !this.master || this.muted) return null;
    return this.ctx;
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, peak: number, delay = 0): void {
    const c = this.ready();
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    this.env(g, t, peak, 0.005, dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(freq: number, q: number, dur: number, peak: number, delay = 0, type: BiquadFilterType = 'bandpass'): void {
    const c = this.ready();
    if (!c || !this.noise) return;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    this.env(g, t, peak, 0.003, dur);
    s.connect(f).connect(g).connect(this.master!);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  tap(): void {
    this.tone('sine', 900, 600, 0.06, 0.12);
  }

  click(): void {
    this.burst(3200, 4, 0.03, 0.5);
    this.tone('square', 1800, 900, 0.02, 0.05);
  }

  clunk(): void {
    this.tone('sine', 160, 60, 0.18, 0.5);
    this.burst(900, 1.2, 0.08, 0.35);
  }

  metal(): void {
    this.tone('triangle', 2400, 2200, 0.25, 0.08);
    this.tone('sine', 3700, 3600, 0.18, 0.05);
    this.burst(5000, 8, 0.05, 0.2);
  }

  ratchet(count: number, span: number): void {
    for (let i = 0; i < count; i++) {
      this.burst(2600 + Math.random() * 800, 6, 0.025, 0.3, (i * span) / count);
    }
  }

  whoosh(): void {
    const c = this.ready();
    if (!c || !this.noise) return;
    const t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.5;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    s.connect(f).connect(g).connect(this.master!);
    s.start(t);
    s.stop(t + 0.5);
  }

  success(): void {
    [660, 880, 1320].forEach((f, i) => this.tone('sine', f, f, 0.22, 0.14, i * 0.08));
  }

  done(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.35, 0.12, i * 0.1));
  }

  error(): void {
    this.tone('sawtooth', 220, 180, 0.22, 0.12);
    this.tone('sawtooth', 233, 190, 0.22, 0.1, 0.02);
    this.tone('square', 180, 150, 0.2, 0.06, 0.26);
  }

  sweep(): void {
    this.burst(2400, 0.8, 0.28, 0.18, 0, 'highpass');
  }

  setMotor(level: number): void {
    const c = this.ready();
    if (!c) return;
    if (!this.motor) {
      const gain = c.createGain();
      gain.gain.value = 0;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      const osc = [c.createOscillator(), c.createOscillator(), c.createOscillator()];
      osc[0].type = 'sawtooth';
      osc[1].type = 'square';
      osc[2].type = 'sine';
      const mix = [0.06, 0.02, 0.12];
      osc.forEach((o, i) => {
        const g = c.createGain();
        g.gain.value = mix[i];
        o.connect(g).connect(filter);
        o.start();
      });
      filter.connect(gain).connect(this.master!);
      this.motor = { osc, gain, filter };
    }
    const t = c.currentTime;
    const l = Math.max(0, Math.min(1, level));
    const base = 40 + l * 70;
    this.motor.osc[0].frequency.setTargetAtTime(base, t, 0.05);
    this.motor.osc[1].frequency.setTargetAtTime(base * 2.01, t, 0.05);
    this.motor.osc[2].frequency.setTargetAtTime(base * 0.5, t, 0.05);
    this.motor.filter.frequency.setTargetAtTime(300 + l * 900, t, 0.05);
    this.motor.gain.gain.setTargetAtTime(l > 0.01 ? 0.25 + l * 0.55 : 0, t, 0.08);
  }

  setDrill(level: number): void {
    const c = this.ready();
    if (!c || !this.noise) return;
    if (!this.drill) {
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 3;
      filter.frequency.value = 1800;
      const gain = c.createGain();
      gain.gain.value = 0;
      s.connect(filter).connect(gain).connect(this.master!);
      s.start();
      this.drill = { gain, filter };
    }
    const t = c.currentTime;
    this.drill.gain.gain.setTargetAtTime(level * 0.35, t, 0.06);
    this.drill.filter.frequency.setTargetAtTime(1400 + level * 1600 + Math.random() * 300, t, 0.05);
  }

  stopLoops(): void {
    this.setMotor(0);
    this.setDrill(0);
  }
}

export const sfx = new Sfx();
