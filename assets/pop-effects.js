(() => {
  const layer = document.querySelector('#pop-effects');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const width = 1000;
  const height = 500;

  async function startEffects() {
    if (!window.PIXI) {
      layer.dataset.renderer = 'unavailable';
      return;
    }

    const { Application, Graphics } = window.PIXI;
    const app = new Application();

    try {
      await app.init({
        width,
        height,
        backgroundAlpha: 0,
        antialias: true,
        autoStart: false,
        preference: 'webgl'
      });
    } catch (error) {
      layer.dataset.renderer = 'unavailable';
      console.warn('Pool party effects could not initialize.', error);
      return;
    }

    const graphics = new Graphics();
    const bursts = [];
    app.stage.addChild(graphics);
    layer.append(app.canvas);
    layer.dataset.renderer = 'pixi';

    function paint(ticker) {
      const elapsed = Math.min(ticker.deltaMS / 1000, 0.05);
      graphics.clear();

      for (let index = bursts.length - 1; index >= 0; index -= 1) {
        const burst = bursts[index];
        burst.age += elapsed;
        if (burst.age >= burst.duration) {
          bursts.splice(index, 1);
          continue;
        }

        const progress = burst.age / burst.duration;
        const alpha = 1 - progress;
        const radius = burst.quiet ? 17 : 12 + 58 * progress;
        graphics.circle(burst.x, burst.y, radius)
          .stroke({ color: burst.color, width: 5 * alpha, alpha });
        graphics.circle(burst.x, burst.y, radius - 5)
          .stroke({ color: 0xfff3cb, width: 2, alpha: alpha * 0.8 });

        for (const particle of burst.particles) {
          const x = burst.x + particle.vx * burst.age;
          const y = burst.y + particle.vy * burst.age + 95 * burst.age ** 2;
          graphics.circle(x, y, particle.radius * (1 - 0.45 * progress))
            .fill({ color: particle.color, alpha });
        }
      }

      if (!bursts.length) {
        app.render();
        app.stop();
      }
    }

    app.ticker.add(paint);
    window.addEventListener('pop-impact', ({ detail }) => {
      const { x, y, color } = detail ?? {};
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const quiet = reducedMotion.matches;
      const tint = Number.isFinite(color) ? color : 0xffcc62;
      const particles = quiet ? [] : Array.from({ length: 16 }, (_, index) => {
        const direction = (index + Math.random() * 0.8) * Math.PI / 8;
        const speed = 48 + Math.random() * 125;
        return {
          vx: Math.cos(direction) * speed,
          vy: Math.sin(direction) * speed - 42,
          radius: 2 + Math.random() * 3,
          color: index % 3 === 0 ? 0xfff3cb : tint
        };
      });

      bursts.push({
        x: x * width,
        y: y * height,
        color: tint,
        age: 0,
        duration: quiet ? 0.22 : 0.58,
        quiet,
        particles
      });
      app.start();
    });
  }

  void startEffects();
})();
