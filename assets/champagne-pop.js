(() => {
  const active = new WeakMap();
  const noiseBuffers = new WeakMap();
  const between = (a, b) => a + Math.random() * (b - a);

  function soundBurst(manager) {
    const audio = manager?.context;
    if (!audio || audio.state === 'closed') return () => {};
    const now = audio.currentTime;
    if (!noiseBuffers.has(audio)) {
      const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 1.22), audio.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      noiseBuffers.set(audio, buffer);
    }

    const cork = audio.createOscillator();
    cork.type = 'triangle';
    cork.frequency.setValueAtTime(760, now);
    cork.frequency.exponentialRampToValueAtTime(87, now + 0.065);
    cork.frequency.exponentialRampToValueAtTime(52, now + 0.2);
    const thump = audio.createGain();
    thump.gain.setValueAtTime(0.001, now);
    thump.gain.exponentialRampToValueAtTime(0.42, now + 0.003);
    thump.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

    const spray = audio.createBufferSource();
    spray.buffer = noiseBuffers.get(audio);
    const fizzFilter = audio.createBiquadFilter();
    fizzFilter.type = 'bandpass';
    fizzFilter.Q.value = 0.65;
    fizzFilter.frequency.setValueAtTime(3900, now);
    fizzFilter.frequency.exponentialRampToValueAtTime(6100, now + 0.43);
    fizzFilter.frequency.exponentialRampToValueAtTime(2200, now + 1.18);
    const fizz = audio.createGain();
    fizz.gain.setValueAtTime(0.001, now);
    fizz.gain.exponentialRampToValueAtTime(0.37, now + 0.004);
    fizz.gain.exponentialRampToValueAtTime(0.055, now + 0.055);
    fizz.gain.exponentialRampToValueAtTime(0.19, now + 0.16);
    fizz.gain.exponentialRampToValueAtTime(0.001, now + 1.19);

    const out = manager.destination || audio.destination;
    // A short broadband crack cuts through the longer, filtered fizz.
    const snap = audio.createGain();
    snap.gain.setValueAtTime(0.001, now);
    snap.gain.linearRampToValueAtTime(0.36, now + 0.0015);
    snap.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
    const mix = audio.createDynamicsCompressor();
    mix.threshold.value = -8;
    mix.knee.value = 4;
    mix.ratio.value = 9;
    mix.attack.value = 0.002;
    mix.release.value = 0.09;
    mix.connect(out);
    spray.connect(snap).connect(mix);
    cork.connect(thump).connect(mix);
    spray.connect(fizzFilter).connect(fizz).connect(mix);
    cork.start(now);
    cork.stop(now + 0.22);
    spray.start(now);
    spray.stop(now + 1.2);
    return () => {
      cork.stop();
      spray.stop();
      for (const node of [cork, thump, spray, fizzFilter, fizz, snap, mix]) node.disconnect();
    };
  }

  function drawBubble(g, x, y, r, alpha) {
    g.fillStyle(0x75dbdb, alpha * 0.35).fillCircle(x, y, r);
    g.lineStyle(4.5, 0x205673, alpha * 0.9).strokeCircle(x, y, r);
    g.lineStyle(2.4, 0xffec9c, alpha).strokeCircle(x, y, r - 0.7);
    g.fillStyle(0xffffff, alpha).fillEllipse(x-r*0.32, y-r*0.47, r*0.59, r*0.26);
    g.fillStyle(0xffb8e1, alpha).fillCircle(x+r*0.42, y+r*0.44, r*0.14);
  }

  // The idle stream shows where the fizz originates even before the first throw.
  window.bottleFizz = function bottleFizz(scene, x, y) {
    const layer = scene.add.graphics().setDepth(14);
    const quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
    return (time, aiming) => {
      layer.clear();
      if (!aiming) return;
      for (let i = 0; i < 8; i++) {
        const age = ((quiet ? 0 : time / 2000) + i / 8) % 1;
        drawBubble(layer, x + 35 + age*62 + 8*Math.sin(age*7+i),
          y - age*118, 4+age*8, Math.min(1,(1-age)*5));
      }
    };
  };

  window.champagnePop = function champagnePop(scene, x, y, angle) {
    active.get(scene)?.();
    const quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stopSound = soundBurst(scene.sound);
    const foam = scene.add.graphics().setPosition(x, y).setDepth(14);
    // A tight muzzle plume establishes the shot direction. Lighter foam fans
    // out over the far edge in a crosswind, then falls back into the pool.
    const bubbles = Array.from({length: quiet ? 14 : 94}, (_, i) => {
      const shower = !quiet && i >= 38;
      const theta = shower ? between(-1.25, -0.1) : angle + between(-0.8, 0.85);
      const speed = shower ? between(370, 860) : between(110, 620);
      const life = shower ? between(1.05, 1.6) : between(0.7, 1.25);
      return {shower, vx: Math.cos(theta) * speed, vy: Math.sin(theta) * speed,
        radius: between(5, shower ? 14 : 19), phase: between(0, Math.PI * 2),
        delay: i < 18 ? 0 : between(0, 0.22), life};
    });
    const floaters = Array.from({length: quiet ? 0 : 36}, (_, i) => ({
      dx: between(-140, 760), dy: between(-140, 110), r: between(10, 25),
      delay: i / 36 * 0.8, phase: between(0, Math.PI * 2)
    }));
    const clock = {t: 0};
    const label = scene.add.text(x + 3, y - 35, 'POP!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '40px', fontStyle: 'bold italic',
      color: '#fff19e', stroke: '#522234', strokeThickness: 7
    }).setDepth(19).setOrigin(0.5, 1).setAngle(-10);
    function draw() {
      const t = clock.t;
      foam.clear();
      if (!quiet && t < 0.18) {
        foam.lineStyle(7 * (1 - t / 0.18), 0xffecb7, 1 - t / 0.18)
          .strokeCircle(0, 0, 6 + t * 235);
      }
      for (const b of bubbles) {
        const age = t - b.delay;
        if (age < 0 || age > b.life) continue;
        const drag = b.shower ? 0.48 : 1.55;
        const travel = quiet ? 0.10 : (1 - Math.exp(-drag * age)) / drag;
        const bx = b.vx * travel + (b.shower ? age * 105 + age * 12 * Math.sin(age * 8 + b.phase) : 0);
        const by = b.vy * travel + (quiet ? 0 : (b.shower ? 165 : 68) * age * age);
        const opacity = Math.min(1, (b.life - age) * 8);
        const r = b.radius * (0.72 + age * 0.58);
        if (!quiet && age > b.life - 0.12) {
          const burst = 1 - (b.life - age) / 0.12;
          for (let n = 0; n < 4; n++) {
            const direction = b.phase + n * Math.PI / 2;
            const dx = Math.cos(direction), dy = Math.sin(direction);
            const d = r + burst * 10;
            foam.lineStyle(2, 0xfff8df, opacity).lineBetween(bx + dx*d, by + dy*d,
              bx + dx*(d+4), by + dy*(d+4));
          }
          continue;
        }
        drawBubble(foam, bx, by, r, opacity);
      }
      for (const b of floaters) {
        const age = t - b.delay;
        if (age <= 0) continue;
        const spread = 1 - Math.exp(-age * 2.2);
        const bx = b.dx * spread + Math.sin(age * 3 + b.phase) * 10 * spread;
        const by = b.dy * spread - age * 28;
        drawBubble(foam, bx, by, b.r * (0.55 + 0.45 * spread), Math.min(1, (3.3-t)*2));
      }
      label.setY(y - 35 - (quiet ? 0 : Math.min(23, t * 60))).setAlpha(Math.max(0, 1 - t * 1.65));
    }
    let tween;
    function clear() {
      if (active.get(scene) !== clear) return;
      active.delete(scene);
      scene.events.off('shutdown', clear);
      tween?.stop();
      stopSound();
      label.destroy();
      foam.destroy();
    }
    active.set(scene, clear);
    scene.events.once('shutdown', clear);
    draw();
    tween = scene.tweens.add({targets: clock, t: 3.3, duration: 3300, onUpdate: draw, onComplete: clear});
    return clear;
  };
})();
