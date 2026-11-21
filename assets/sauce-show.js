(() => {
  const sauces = [
    { body: 0xe53829, shadow: 0x89252c, shine: 0xff9177 },
    { body: 0xffc620, shadow: 0xd38517, shine: 0xffed8c },
    { body: 0xfff4d3, shadow: 0xcfac80, shine: 0xffffff }
  ];
  const active = new WeakMap();
  const between = (low, high) => low + Math.random() * (high - low);

  function spray(count) {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i + Math.random() * 0.8) * Math.PI * 2 / count;
      const speed = between(100, 420);
      return {
        sauce: sauces[i % sauces.length], u: Math.cos(angle) * speed,
        v: Math.sin(angle) * speed * 0.72 - 95, r: between(3.5, 8.5),
        lag: between(0.045, 0.14)
      };
    });
  }

  function position(p, t) {
    return { x: p.u * t, y: p.v * t + 173 * t * t };
  }

  function paintSauce(g, p, t, alpha) {
    const head = position(p, t);
    const mid = position(p, Math.max(0, t - p.lag * 0.55));
    const tail = position(p, Math.max(0, t - p.lag));
    g.lineStyle(p.r, p.sauce.shadow, alpha)
      .lineBetween(tail.x, tail.y + 1.5, head.x, head.y + 1.5);
    g.lineStyle(p.r * 0.82, p.sauce.body, alpha)
      .lineBetween(tail.x, tail.y, mid.x, mid.y)
      .lineBetween(mid.x, mid.y, head.x, head.y);
    g.fillStyle(p.sauce.shadow, alpha).fillCircle(head.x, head.y + 1, p.r);
    g.fillStyle(p.sauce.body, alpha).fillCircle(head.x, head.y, p.r * 0.91);
    g.fillStyle(p.sauce.shine, alpha).fillCircle(head.x - p.r * 0.3, head.y - p.r * 0.28, p.r * 0.22);
  }

  function star(g, x, y, size, angle, alpha) {
    g.fillStyle(0xffe064, alpha).beginPath();
    for (let i = 0; i < 10; i++) {
      const theta = angle + i * Math.PI / 5;
      const r = i % 2 ? size * 0.42 : size;
      const px = x + r * Math.cos(theta), py = y + r * Math.sin(theta);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath().fillPath();
  }

  window.sauceShow = function sauceShow(scene, x, y, caught) {
    active.get(scene)?.();
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const g = scene.add.graphics().setPosition(x, y).setDepth(50);
    const label = scene.add.text(0, 0, caught ? 'GOLDEN BITE!' : 'SAUCE SPLAT!', {
      fontFamily: 'system-ui, sans-serif', fontStyle: 'bold italic', fontSize: caught ? '38px' : '29px',
      color: caught ? '#ffe36c' : '#fff4d3', stroke: '#462135', strokeThickness: 8
    }).setOrigin(0.5, 1).setDepth(51);
    const halfWidth = label.width / 2 + 6;
    const labelY = Math.max(label.height + 14, y - 31);
    label.setPosition(Phaser.Math.Clamp(x, halfWidth, scene.scale.width - halfWidth), labelY);
    const droplets = spray(quiet ? 12 : caught ? 39 : 30);
    const duration = quiet ? 630 : caught ? 1450 : 1080;
    const clock = { ms: 0 };
    const notes = [];
    scene.tone(caught ? 440 : 183, caught ? 660 : 62, 0.14, caught ? 'triangle' : 'sawtooth');
    if (caught) {
      [659, 784, 1047].forEach((hz, i) => {
        notes.push(scene.time.delayedCall(90 + i * 100, () => scene.tone(hz, hz * 1.08, 0.22, 'triangle')));
      });
    }

    function draw() {
      const progress = clock.ms / duration;
      const alpha = Math.min(1, (1 - progress) * 4);
      const t = quiet ? 0.14 : clock.ms / 1000;
      g.clear();
      for (const droplet of droplets) paintSauce(g, droplet, t, alpha);
      if (caught) {
        const radius = quiet ? 68 : 24 + 145 * Math.min(1, t);
        for (let i = 0; i < 9; i++) {
          const angle = i * Math.PI * 2 / 9 + t * 0.65;
          star(g, Math.cos(angle) * radius, Math.sin(angle) * radius * 0.67, 9, angle, alpha);
        }
      }
      label.setY(labelY - (quiet ? 0 : Math.min(24, t * 28))).setAlpha(alpha);
    }
    let tween;
    function clear() {
      if (active.get(scene) !== clear) return;
      active.delete(scene);
      scene.events.off('shutdown', clear);
      tween?.stop();
      for (const note of notes) note.remove(false);
      g.destroy();
      label.destroy();
    }
    active.set(scene, clear);
    scene.events.once('shutdown', clear);
    draw();
    tween = scene.tweens.add({ targets: clock, ms: duration, duration, onUpdate: draw, onComplete: clear });
    return clear;
  };
})();
