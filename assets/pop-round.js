(() => {
  const width = 1000;
  const height = 500;
  const gravity = 440;
  const launch = { x: 226, y: 292 };
  const launcherScale = 3;
  const projectileRadius = 12 * launcherScale;
  const stage = { x: 800, floor: CorkLine.floor, height: CorkLine.height };
  const faceY = stage.floor - stage.height * 0.83;
  const seatY = stage.floor - stage.height * 0.46;
  const modes = { cork: 'ChampaignKing', dog: 'Hotdog Eating Contest' };
  let selectedMode = 'cork';
  let activeScene;
  window.addEventListener('party-select', ({ detail }) => {
    const mode = typeof detail === 'string' ? detail : detail?.mode;
    if (!Object.hasOwn(modes, mode)) return;
    selectedMode = mode;
    activeScene?.resetRound();
  });
  const pool = { y: 420, color: 0x8defff };
  const maxThrows = 3;
  const gold = 0xffcf50;
  const controls = Object.fromEntries(
    ['game', 'throw', 'restart', 'mode', 'score', 'throws', 'status', 'angle', 'power',
      'boost', 'angleValue', 'powerValue'].map(id => [id, document.getElementById(id)])
  );

  if (!window.Phaser) {
    controls.status.textContent = 'The game engine couldn’t load. Reload the page to try again.';
    return;
  }

  class PoolRound extends Phaser.Scene {
    preload() {
      this.load.image('scenery', 'pool-scenery.webp');
      this.load.image('cork', 'corky-pop-opaque.png');
      this.load.image('dog', 'party-hotdog.png');
      this.load.image('bottle', 'party-bottle.png');
      for (const person of ['coral', 'teal']) {
        for (const view of ['front', 'back']) {
          const key = 'toon-' + person + '-' + view;
          this.load.image(key, key + '.png');
        }
      }
    }

    create() {
      this.mode = 'cork';
      this.add.image(width / 2, height / 2, 'scenery').setDisplaySize(width, height);
      this.previousTrail = this.add.graphics();
      this.aim = this.add.graphics();
      this.bonusBubbles = [[391, 180], [498, 137], [604, 119]].map(([x, y]) => {
        const shell = this.add.circle(0, 0, 22, 0xffda64, 0.83).setStrokeStyle(4, 0x723548);
        const glint = this.add.ellipse(-7, -12, 13, 5, 0xffffff);
        const value = this.add.text(0, 1, '25', {fontFamily:'system-ui', fontStyle:'bold',
          fontSize:'18px', color:'#442136'}).setOrigin(0.5);
        return this.add.container(x, y, [shell, glint, value]).setDepth(11);
      });

      // Anchor the contestant's mark to a springboard over the pool.
      const board = this.board = this.add.graphics();
      board.fillStyle(0x477d80).fillRoundedRect(564, stage.floor - 3, 460, 12, 5);
      board.fillStyle(0xe5cb9b).fillRoundedRect(562, stage.floor - 8, 460, 10, 5);
      board.fillStyle(0xf5e7c0).fillRect(570, stage.floor - 7, 443, 3);
      this.shadow = this.add.ellipse(stage.x, stage.floor - 2, 66, 7, 0x312124, 0.23);
      this.contestant = this.add.image(stage.x, stage.floor, 'toon-coral-back').setOrigin(0.5, 1);
      this.hotdogHit = this.add.image(stage.x, faceY + 3, 'dog').setVisible(false);
      this.hotdogHit.setScale(51 / this.hotdogHit.width);
      this.corkLine = new CorkLine(this, this.contestant, this.shadow);
      this.hand = new BottleHand(this, launch.x, launch.y);
      this.hand.grip.setScale(1.65);
      this.catchers = new window.PoolCatchers(this);
      this.catchCue = this.add.graphics().setDepth(12);
      this.quip = this.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif', fontStyle: 'bold italic', fontSize: '24px',
        color: '#fff3a8', stroke: '#53233f', strokeThickness: 6
      }).setOrigin(0.5, 1).setDepth(20).setVisible(false);
      this.drink = this.add.image(stage.x, faceY, 'bottle').setOrigin(0.5, 0).setVisible(false);
      this.drink.setScale(94 / this.drink.height);
      this.bottle = this.add.image(launch.x, launch.y, 'bottle').setOrigin(0.5, 0);
      this.bottle.setScale(145 * launcherScale / this.bottle.height);
      this.drawIdleFizz = window.bottleFizz(this, launch.x, launch.y);
      this.reactionTimers = [];

      this.actor = this.add.image(launch.x, launch.y, 'cork').setDisplaySize(72, 72);
      this.projectile = this.physics.add.body(
        launch.x - projectileRadius, launch.y - projectileRadius, projectileRadius * 2, projectileRadius * 2
      );
      this.projectile.setCircle(projectileRadius);
      this.seats = Array.from({length: 4}, () => this.physics.add.staticBody(stage.x, seatY, 46, 38));
      this.face = this.physics.add.staticBody(stage.x - 20, faceY - 20, 40, 40);
      const water = this.physics.add.staticBody(0, pool.y + projectileRadius, width, 40);
      this.seats.forEach((seat, index) => {
        this.physics.add.overlap(this.projectile, seat, () => {
          if (!this.inFlight) return;
          this.leadIndex = index;
          this.showDancer();
          this.dance(0);
          this.finishThrow(true);
        }, () => this.mode === 'cork');
      });
      this.physics.add.overlap(this.projectile, water, () => this.finishThrow(false));
      this.physics.world.on('worldstep', this.sampleFlight, this);

      const events = new AbortController();
      const listen = (control, event, action) => control?.addEventListener(event, action, { signal: events.signal });
      this.band = new window.PoolFunk(this);
      const music = document.querySelector('#music');
      let enabled = true;
      try { enabled = localStorage.getItem('pool-funk') !== 'off'; } catch {}
      let started = false;
      this.startGroove = () => {
        if (!enabled || started || !this.sound.context) return;
        this.sound.context.resume().catch(() => {});
        this.band.start();
        started = true;
        music.setAttribute('aria-pressed', 'true');
        music.textContent = '♫ Music on';
      };
      listen(music, 'click', () => {
        enabled = !started;
        if (started) {
          this.band.stop();
          started = false;
          music.setAttribute('aria-pressed', 'false');
          music.textContent = '♫ Play funk';
        } else this.startGroove();
        try { localStorage.setItem('pool-funk', enabled ? 'on' : 'off'); } catch {}
      });
      listen(document.querySelector('#replay-intro'), 'click', () => {
        if (started) this.band.stop();
      });
      listen(document.querySelector('#party-intro'), 'close', () => {
        if (started) this.band.start();
      });
      this.events.once('shutdown', () => this.band.stop());
      listen(controls.throw, 'click', () => this.startThrow());
      listen(controls.restart, 'click', () => this.resetRound());
      listen(controls.mode, 'click', () => {
        selectedMode = this.mode === 'cork' ? 'dog' : 'cork';
        this.resetRound();
      });
      listen(controls.boost, 'click', () => this.boost());
      listen(controls.angle, 'input', () => this.drawAim());
      listen(controls.power, 'input', () => this.drawAim());
      this.input.on('pointerdown', this.beginPull, this);
      this.input.on('pointermove', this.aimPull, this);
      this.input.on('pointerup', this.releasePull, this);
      this.input.on('pointerupoutside', () => { this.pull = null; });
      this.events.once('shutdown', () => events.abort());
      activeScene = this;
      this.resetRound();
      window.dispatchEvent(new Event('party-ready'));
    }

    dressContestant(view) {
      this.contestant.setTexture('toon-' + this.person + '-' + view);
      this.contestant.setScale(stage.height / this.contestant.height);
    }

    nextContestant() {
      this.popped = 0;
      for (const bubble of this.bonusBubbles) bubble.setVisible(this.mode === 'cork');
      this.leadIndex = this.throws % 4;
      this.showDancer();
      this.danceTime = 0;
      this.dance(0);
      this.hotdogHit.setVisible(false);
      this.drink.setVisible(false);
    }

    showDancer() {
      this.person = this.leadIndex % 2 === 0 ? 'coral' : 'teal';

      this.contestant.setPosition(stage.x, stage.floor).setAngle(0);
      this.dressContestant('back');
    }

    dance(delta) {
      this.danceTime += Math.min(delta, 50) / 1000;
      const t = this.danceTime;
      this.corkLine.update(t, this.leadIndex);
      const {x, y} = this.corkLine.position(this.leadIndex, t);
      this.contestant.setPosition(x, y);
      this.shadow.setX(x);
      this.seats.forEach((seat, index) => {
        const pos = this.corkLine.position(index, t);
        seat.x = pos.x - seat.width / 2;
        seat.y = pos.y - stage.height * 0.46 - seat.height / 2;
        seat.updateCenter();
      });
      this.face.x = x - this.face.width / 2;
      this.face.y = this.contestant.y - this.contestant.displayHeight * 0.83 - this.face.height / 2;
      this.face.updateCenter();
    }

    after(delay, callback) {
      this.reactionTimers.push(this.time.delayedCall(delay, callback));
    }

    tone(start, end, duration, type = 'sine') {
      const audio = this.sound.context;
      if (audio?.state !== 'running') return;
      const osc = audio.createOscillator();
      const envelope = audio.createGain();
      const now = audio.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(start, now);
      osc.frequency.exponentialRampToValueAtTime(end, now + duration);
      envelope.gain.setValueAtTime(0.001, now);
      envelope.gain.exponentialRampToValueAtTime(0.13, now + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(envelope).connect(audio.destination);
      osc.start(now);
      osc.stop(now + duration);
      osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
    }

    react() {
      const markX = this.contestant.x;
      const lines = ['KISS MY BUBBLES!', 'OH, FIZZ ME!', 'CHEEKY!', 'BOTTOMS UP!'];
      this.quip.setText(lines[this.leadIndex]).setVisible(true);
      this.quip.setPosition(Phaser.Math.Clamp(markX, this.quip.width / 2 + 8,
        width - this.quip.width / 2 - 8), this.contestant.y - stage.height - 18);
      this.after(1150, () => this.quip.setVisible(false));
      const faceY = this.face.center.y;
      this.band.duck();
      this.clearVoice = window.contestantVoice(this, this.leadIndex);
      this.tweens.add({targets: this.contestant, angle: -5, duration: 95, yoyo: true});
      this.tweens.add({ targets: this.contestant, scaleX: this.contestant.scaleX * 0.17,
        delay: 110, duration: 115 });
      this.after(230, () => {
        this.dressContestant('front');
        const normalScale = this.contestant.scaleX;
        this.contestant.scaleX *= 0.17;
        this.tweens.add({ targets: this.contestant, scaleX: normalScale, duration: 145 });
        this.drink.setVisible(true).setPosition(markX + 31, faceY + 46).setAngle(-12);
        this.tweens.add({ targets: this.drink, x: markX + 3, y: faceY + 4, angle: -106, duration: 430, ease: 'Sine.InOut' });
      });
      this.after(680, () => this.tone(135, 70, 0.18));
      this.after(925, () => this.tone(160, 80, 0.15));
      this.after(1090, () => {
        this.splash(markX + 4, faceY + 3, 0xffefcd, 23);
        this.tone(95, 240, 0.22, 'triangle');
        this.tweens.add({ targets: this.drink, angle: -28, x: markX + 33, y: faceY + 49, duration: 250 });
      });
    }

    resetRound() {
      this.inFlight = false;
      this.pull = null;
      this.projectile.stop().setEnable(false);
      this.score = 0;
      this.throws = 0;
      this.path = [];
      this.previousTrail.clear();
      for (const timer of this.reactionTimers) timer.remove(false);
      this.reactionTimers.length = 0;
      this.tweens.killTweensOf([this.contestant, this.drink, this.hotdogHit]);
      this.reacting = false;
      this.mode = selectedMode;
      this.clearSauce?.();
      this.clearFizz?.();
      this.clearVoice?.();
      this.hand.reset();
      this.quip.setVisible(false);
      this.serve = null;
      this.catchStreak = 0;
      this.catchCue.clear();
      const foodFight = this.mode === 'dog';
      this.catchers.reset();
      this.catchers.show(foodFight);
      this.corkLine.show(!foodFight);
      for (const item of [this.board, this.shadow, this.contestant]) item.setVisible(!foodFight);
      controls.boost.hidden = foodFight;
      document.querySelector('#aim-hint').textContent = foodFight
        ? 'Power picks a swimmer. Throw on the green cue for a mouth catch. Angle sets the arc.'
        : 'For a drag shot, pull the launcher down and left, then release.';
      this.nextContestant();
      this.actor.setVisible(true).setDepth(15).setTexture(this.mode).setRotation(0).setPosition(launch.x, launch.y);
      this.actor.setScale((this.mode === 'cork' ? 64 * launcherScale : 82) / this.actor.width);
      controls.mode.textContent = this.mode === 'cork' ? 'Switch to Hotdog Eating Contest' : 'Switch to ChampaignKing';
      controls.throw.textContent = this.mode === 'cork' ? 'Pop Corky!' : 'Toss hotdog!';
      this.syncControls(this.mode === 'cork' ? 'Pop the three gold bubbles and land a cheeky shot for a Fizz Jackpot.' : 'Serve a hotdog! Face splat +100 • Mouth catch +300.');
      this.drawAim();
    }

    syncControls(message) {
      controls.score.textContent = this.score;
      controls.throws.textContent = this.throws;
      controls.status.textContent = message;
      controls.throw.disabled = this.inFlight || this.reacting || this.throws >= maxThrows;
      controls.mode.disabled = this.inFlight;
      controls.angle.disabled = this.inFlight || this.reacting;
      controls.power.disabled = this.inFlight || this.reacting;
      if (controls.boost) {
        controls.boost.disabled = this.mode !== 'cork' || !this.inFlight || this.boosted;
      }
    }

    getVelocity() {
      const angle = Phaser.Math.DegToRad(controls.angle.valueAsNumber);
      const speed = 350 + controls.power.valueAsNumber * 4;
      return this.physics.velocityFromRotation(-angle, speed);
    }

    beginPull(pointer) {
      if (this.inFlight || this.reacting || this.throws >= maxThrows || this.pull ||
          Phaser.Math.Distance.Between(pointer.x, pointer.y, launch.x, launch.y) > (this.mode === 'cork' ? 108 : 58)) return;

      this.pull = { id: pointer.id, x: pointer.x, y: pointer.y, ready: false };
    }

    aimPull(pointer) {
      if (!this.pull || this.pull.id !== pointer.id) return;

      const left = this.pull.x - pointer.x;
      const down = pointer.y - this.pull.y;
      const distance = Math.hypot(left, down);
      this.pull.ready = left > 0 && down > 0 && distance >= 14;
      if (!this.pull.ready) return;

      controls.angle.valueAsNumber = Math.round(Phaser.Math.RadToDeg(Math.atan2(down, left)));
      controls.power.valueAsNumber = Math.round(distance);
      this.drawAim();
    }

    releasePull(pointer) {
      if (!this.pull || this.pull.id !== pointer.id) return;

      this.aimPull(pointer);
      const ready = this.pull.ready;
      this.pull = null;
      if (ready) this.startThrow();
    }

    drawAim() {
      if (controls.angleValue) controls.angleValue.value = controls.angle.value + '°';
      if (controls.powerValue) controls.powerValue.value = controls.power.value + '%';
      const velocity = this.getVelocity();
      this.bottle.setRotation(velocity.angle() + Math.PI / 2);
      this.hand.aim(velocity.angle(), true);
      this.aim.clear();
      if (this.inFlight || this.reacting || this.throws === maxThrows) return;

      for (let time = 0.09; time < 0.46; time += 0.06) {
        this.aim.fillStyle(0x402038, 0.7).fillCircle(
          launch.x + velocity.x * time, launch.y + velocity.y * time + gravity * time ** 2 / 2, 5
        );
        this.aim.fillStyle(0xfff3ce).fillCircle(
          launch.x + velocity.x * time, launch.y + velocity.y * time + gravity * time ** 2 / 2, 3
        );
      }
    }

    startThrow() {
      if (this.inFlight || this.reacting || this.throws >= maxThrows) return;
      const velocity = this.getVelocity();
      const audio = this.sound.context;
      if (audio?.state === 'suspended') audio.resume().catch(() => {});
      this.reacting = true;
      this.pull = null;
      const openAtRelease = this.mode === 'dog' && this.catchers.target(this.catcherIndex()).open;
      this.startGroove();
      this.hand.windUp();
      this.syncControls('Thumb on the cork…');
      this.after(145, () => {
        this.reacting = false;
        this.hand.flick();
        this.band.duck();
        this.clearFizz = window.champagnePop(this, launch.x, launch.y, velocity.angle());
        this.launchShot(velocity, openAtRelease);
      });
    }

    launchShot(velocity, openAtRelease) {
      this.inFlight = true;
      this.pull = null;
      this.boosted = false;
      this.throws += 1;
      this.path = [{ ...launch }];
      if (this.mode === 'dog') {
        const index = this.catcherIndex();
        const target = this.catchers.target(index);
        this.serve = {index, caught: openAtRelease, elapsed: 0,
          duration: 600 + (target.x - launch.x) * 0.85,
          height: 45 + controls.angle.valueAsNumber * 1.8};
        this.catchers.reach(index, openAtRelease);
        this.catchCue.clear();
        this.aim.clear();
        this.actor.setDepth(15);
        this.syncControls('Order up!');
        return;
      }
      this.projectile.reset(launch.x - projectileRadius, launch.y - projectileRadius);
      this.projectile.setEnable(true).setVelocity(velocity.x, velocity.y);
      this.actor.setPosition(launch.x, launch.y).setRotation(0);
      this.aim.clear();

      this.syncControls('Corky is flying!');
    }

    catcherIndex() {
      const fraction = (controls.power.valueAsNumber - 25) / 75;
      return Math.round(fraction * (this.catchers.count - 1));
    }

    updateServe(delta) {
      const shot = this.serve;
      const mouth = this.catchers.target(shot.index);
      shot.elapsed += Math.min(delta, 65);
      const t = Math.min(1, shot.elapsed / shot.duration);
      const endX = mouth.x + (shot.caught ? 0 : 7);
      const endY = mouth.y - (shot.caught ? 0 : 6);
      const x = Phaser.Math.Linear(launch.x, endX, t);
      const y = Phaser.Math.Linear(launch.y, endY, t) - 4 * shot.height * t * (1 - t);
      this.actor.setPosition(x, y).setRotation(Math.sin(t * Math.PI * 2) * 0.6);
      this.path.push({x, y});
      if (t < 1) return;
      this.serve = null;
      this.inFlight = false;
      this.reacting = true;
      this.drawTrail();
      this.catchers.react(shot.index, shot.caught);
      this.band.duck();
      this.clearVoice = window.contestantVoice(this, shot.index);
      this.clearSauce = window.sauceShow(this, x, y, shot.caught);
      window.dispatchEvent(new CustomEvent('pop-impact', {detail:{x:x / width, y:y / height, color:0xffcf38}}));
      this.catchStreak = shot.caught ? this.catchStreak + 1 : 0;
      const points = shot.caught ? 300 + (this.catchStreak - 1) * 100 : 100;
      this.score += points;
      const result = shot.caught ? 'Mouth catch! +' + points : 'Face splat! +100';
      this.syncControls(result);
      this.actor.setVisible(false);
      if (!shot.caught) {
        this.hotdogHit.setDepth(16).setVisible(true).setPosition(x, y).setAngle(-12);
        this.tweens.add({targets:this.hotdogHit, y:y+24, angle:28, delay:160, duration:210,
          onComplete:() => this.hotdogHit.setVisible(false)});
      }
      this.after(1250, () => {
        this.reacting = false;
        this.actor.setVisible(true);
        this.syncControls(result + (this.throws === maxThrows ? ' Round complete!' : ' Next serve!'));
        this.drawAim();
        this.reactionTimers.length = 0;
      });
    }

    boost() {
      if (this.mode !== 'cork' || !this.inFlight || this.boosted) return;
      this.boosted = true;
      const { velocity, center } = this.projectile;
      this.projectile.setVelocity(velocity.x + 150, velocity.y - 95);
      this.splash(center.x, center.y, 0xa4ffff, 15);
      this.syncControls('Bubble boost! Corky caught a little extra fizz.');
    }

    sampleFlight() {
      if (!this.inFlight || this.serve) return;

      const { center } = this.projectile;
      this.path.push({ x: center.x, y: center.y });
      for (const bubble of this.bonusBubbles) {
        if (!bubble.visible || Math.hypot(bubble.x-center.x, bubble.y-center.y) > projectileRadius + 22) continue;
        bubble.setVisible(false);
        this.popped++;
        this.score += 25;
        this.splash(bubble.x, bubble.y, gold, 16);
        this.tone(500 + 125*this.popped, 900 + 150*this.popped, 0.13, 'sine');
        this.syncControls('Gold bubble! +25');
      }
      if (center.x > width + 36 || center.y > height + 36) this.finishThrow(false);
    }

    finishThrow(hit) {
      if (!this.inFlight) return;
      const { x, y } = this.projectile.center;
      const impactX = Phaser.Math.Clamp(x, 0, width);
      const impactY = Math.min(y, pool.y);
      const color = hit ? gold : pool.color;
      this.inFlight = false;
      this.projectile.stop().setEnable(false);
      this.path.push({ x: impactX, y: impactY });
      this.drawTrail();
      this.drawAim();
      this.splash(impactX, impactY, color, hit ? 25 : 15);
      window.dispatchEvent(new CustomEvent('pop-impact', {
        detail: { x: impactX / width, y: Phaser.Math.Clamp(impactY / height, 0, 1), color }
      }));

      let message = 'Splash! That one landed in the pool.';
      if (hit) {
        const jackpot = this.popped === this.bonusBubbles.length;
        this.score += jackpot ? 300 : 100;
        this.react();
        if (jackpot) {
          this.quip.setText('FIZZ JACKPOT!').setX(Phaser.Math.Clamp(impactX, 120, width - 120));
          this.splash(impactX, impactY - 60, 0xff95c9, 36);
        }
        message = jackpot ? 'Fizz jackpot! All three gold bubbles and a hit! +300' : 'Cheeky shot! +100. Bottoms up!';
      }
      this.reacting = true;
      this.syncControls(message);
      this.after(hit && this.mode === 'cork' ? 1590 : 710, () => {
        this.reacting = false;
        if (this.throws < maxThrows) {
          this.nextContestant();
          this.syncControls(message + ' Next contestant!');
          this.drawAim();
        } else {
          this.syncControls(message + ' Round complete. Select New round to play again.');
        }
        this.reactionTimers.length = 0;
      });
    }

    drawTrail() {
      this.previousTrail.clear().fillStyle(0x402038, 0.58);
      for (let index = 0; index < this.path.length; index += 4) {
        const { x, y } = this.path[index];
        this.previousTrail.fillCircle(x, y, 4);
      }
      this.previousTrail.fillStyle(0xfff3ce, 0.85);
      for (let index = 0; index < this.path.length; index += 4) {
        const { x, y } = this.path[index];
        this.previousTrail.fillCircle(x, y, 2);
      }
    }

    splash(x, y, color, count) {
      for (let index = 0; index < count; index++) {
        const angle = index / count * Math.PI * 2;
        const distance = Phaser.Math.Between(24, 88);
        const dot = this.add.circle(x, y, Phaser.Math.Between(2, 5), color);
        this.tweens.add({
          targets: dot,
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance - 25,
          alpha: 0,
          duration: Phaser.Math.Between(290, 530),
          ease: 'Quad.Out',
          onComplete: () => dot.destroy()
        });
      }
    }

    update(time, delta) {
      this.drawIdleFizz(time, !this.inFlight && !this.reacting && this.throws < maxThrows);
      if (this.mode === 'dog') {
        this.catchers.update(delta);
        if (this.serve) return this.updateServe(delta);
        this.catchCue.clear();
        if (!this.reacting && this.throws < maxThrows) {
          const {x, y, open} = this.catchers.target(this.catcherIndex());
          const tip = y - 34;
          this.catchCue.fillStyle(0x32192e).fillTriangle(x-13,tip-15,x+13,tip-15,x,tip+3);
          this.catchCue.fillStyle(open ? 0x67ff96 : 0xff8bab).fillTriangle(x-10,tip-13,x+10,tip-13,x,tip);
        }
      } else if (!this.reacting && (this.inFlight || this.throws < maxThrows)) this.dance(delta);
      if (this.inFlight) {
        const { center, velocity } = this.projectile;
        this.actor.setPosition(center.x, center.y).setRotation(Math.atan2(velocity.y, velocity.x) * 0.65);
      } else {
        this.actor.setPosition(launch.x + 4, launch.y - 12 + Math.sin(time / 220) * 3).setRotation(0);
      }
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: controls.game,
    width,
    height,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    backgroundColor: '#9be3e1',
    physics: { default: 'arcade', arcade: { gravity: { y: gravity } } },
    scene: PoolRound
  });
})();
