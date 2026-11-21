// Original four-bar pool-party groove, swung sixteenths at 112 BPM.
(() => {
  const sixteenth = 60 / 112 / 4;
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
  const harmony = [
    {bass: 38, chord: [60, 65, 69, 76]}, // Dm9
    {bass: 43, chord: [59, 65, 69, 76]}, // G13
    {bass: 38, chord: [60, 65, 69, 74]},
    {bass: 45, chord: [61, 67, 71, 78]}  // A13 turnaround
  ];
  const bassLine = [0, null, null, 12, null, null, 7, null, 0, null, 10, null, null, 7, null, 12];

  window.PoolFunk = class PoolFunk {
    constructor(scene) {
      this.manager = scene.sound;
      this.enabled = false;
      this.voices = new Set();
      this.visibility = () => document.hidden ? this.silence() : this.play();
      document.addEventListener('visibilitychange', this.visibility);
      scene.events.once('shutdown', () => {
        this.stop();
        document.removeEventListener('visibilitychange', this.visibility);
      });
    }

    start() {
      this.enabled = true;
      this.play();
    }

    play() {
      const ctx = this.manager.context;
      if (!this.enabled || document.hidden || this.bus || !ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      this.bus = ctx.createGain();
      this.bus.gain.value = 0.32;
      this.bus.connect(this.manager.destination || ctx.destination);
      if (!this.noise) {
        this.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.24), ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      this.step = 0;
      this.next = ctx.currentTime + 0.03;
      this.tick();
      this.timer = setInterval(() => this.tick(), 40);
    }

    stop() {
      this.enabled = false;
      this.silence();
    }

    silence() {
      clearInterval(this.timer);
      for (const source of this.voices) source.stop();
      this.voices.clear();
      this.bus?.disconnect();
      this.bus = null;
    }

    duck() {
      if (!this.bus) return;
      const now = this.manager.context.currentTime;
      const gain = this.bus.gain;
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(0.105, now, 0.018);
      gain.setTargetAtTime(0.32, now + 0.43, 0.16);
    }

    note(time, length, level, waveform, hz, endHz, filterHz) {
      const ctx = this.manager.context;
      const eq = ctx.createBiquadFilter();
      const env = ctx.createGain();
      const noise = waveform === 'noise';
      const source = noise ? ctx.createBufferSource() : ctx.createOscillator();
      if (noise) source.buffer = this.noise;
      else {
        source.type = waveform;
        source.frequency.setValueAtTime(hz, time);
        if (endHz) source.frequency.exponentialRampToValueAtTime(endHz, time + length * 0.75);
      }
      eq.type = noise ? 'highpass' : 'lowpass';
      eq.frequency.setValueAtTime(filterHz, time);
      if (!noise) eq.frequency.exponentialRampToValueAtTime(Math.max(160, filterHz * 0.48), time + length);
      env.gain.setValueAtTime(0.0001, time);
      env.gain.exponentialRampToValueAtTime(level, time + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, time + length);
      source.connect(eq).connect(env).connect(this.bus);
      this.voices.add(source);
      source.onended = () => {
        this.voices.delete(source);
        source.disconnect(); eq.disconnect(); env.disconnect();
      };
      source.start(time);
      source.stop(time + length + 0.01);
    }

    tick() {
      const now = this.manager.context.currentTime;
      if (this.next < now) this.next = now + 0.02;
      while (this.next < now + 0.15) {
        const step = this.step % 16;
        const bar = Math.floor(this.step / 16) % 4;
        const time = this.next + (step % 2 ? 0.014 : 0);
        const {bass, chord} = harmony[bar];

        if ([0, 6, 10].includes(step) || (bar === 3 && step === 14))
          this.note(time, 0.21, 0.52, 'sine', 135, 47, 1900);
        if (step === 4 || step === 12) {
          this.note(time, 0.14, 0.31, 'noise', 0, 0, 1450);
          this.note(time, 0.075, 0.16, 'triangle', 210, 145, 1100);
        } else if (step === 15 && bar % 2) this.note(time, 0.068, 0.11, 'noise', 0, 0, 2200);
        if (step % 2 === 0 || step === 11 || step === 15)
          this.note(time, step === 14 ? 0.15 : 0.047, step % 4 === 2 ? 0.23 : 0.12, 'noise', 0, 0, 6600);

        const offset = bassLine[step];
        if (offset !== null) {
          const pitch = frequency(bass + (bar === 3 && step === 15 ? -2 : offset));
          this.note(time, step % 8 === 0 ? 0.32 : 0.17, 0.34, 'sawtooth', pitch, 0, 780);
        }
        if ([2, 7, 11].includes(step) || (bar % 2 && step === 14))
          chord.forEach((midi, i) => this.note(time + i * 0.003, 0.15, 0.068, 'triangle', frequency(midi), 0, 3000));
        this.step = (this.step + 1) % 64;
        this.next += sixteenth;
      }
    }
  };
})();
