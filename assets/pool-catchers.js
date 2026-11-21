// Pool-party cast, ordered from the far lane to the near lane in the 1000 × 500 course.
(() => {
  const lanes = [
    { x: 637, water: 384, height: 178, style: 'coral', tube: 0xff8664 },
    { x: 737, water: 391, height: 185, style: 'teal', tube: 0x67d3ba },
    { x: 837, water: 383, height: 174, style: 'coral', tube: 0xffcf55 },
    { x: 940, water: 394, height: 188, style: 'teal', tube: 0x9a8ce2 }
  ];

  class PoolCatchers {
    constructor(scene) {
      this.scene = scene;
      this.layer = scene.add.container(0, 0);
      this.swimmers = lanes.map((lane, index) => this.makeSwimmer(lane, index));
      this.swimmers.sort((a, b) => a.lane.x - b.lane.x);
      this.count = this.swimmers.length;
      this.reset();
      this.show(false);
    }

    makeSwimmer(lane, index) {
      const add = this.scene.add;
      const raft = add.container(lane.x, lane.water);
      const ringWidth = lane.height * 0.58;
      const ringHeight = ringWidth * 0.24;
      const ripple = add.ellipse(0, 7, ringWidth + 19, ringHeight + 4, 0x78e9ec, 0.16)
        .setStrokeStyle(2, 0xcafff6, 0.75);
      const shadow = add.ellipse(0, 4, ringWidth, ringHeight, 0x216779, 0.7);
      const ring = add.ellipse(0, -2, ringWidth, ringHeight, lane.tube)
        .setStrokeStyle(2, 0x634d59);
      const hole = add.ellipse(0, -4, ringWidth * 0.66, ringHeight * 0.49, 0x385b64);
      const body = add.container(0, 0);
      const image = add.image(0, 0, 'toon-' + lane.style + '-front').setOrigin(0.5, 0);
      const cut = 0.51;
      const mirrored = index === 2 || index === 3;
      image.setScale(lane.height / image.height).setFlipX(mirrored)
        .setCrop(0, 0, image.width, Math.round(image.height * cut));
      image.y = -lane.height * cut;
      const mouthOffset = lane.style === 'coral' ? 0.059 : 0.012;
      const mouthX = image.displayWidth * mouthOffset * (mirrored ? -1 : 1);
      const mouthY = image.y + lane.height * 0.215;
      const mouth = add.ellipse(mouthX, mouthY, lane.height * 0.047, lane.height * 0.04, 0x582338)
        .setStrokeStyle(1, 0xe6756a);
      const tongue = add.ellipse(mouthX, mouthY + lane.height * 0.014, lane.height * 0.028, lane.height * 0.01, 0xff8282);
      const smear = add.graphics().setPosition(mouthX, mouthY);
      body.add([image, mouth, tongue, smear]);
      const rim = add.graphics();
      // The bright inflated front lip occludes the submerged edge of the sprite.
      const edgeY = angle => -2 + Math.sin(angle) * ringHeight * 0.41;
      for (let n = 0; n < 24; n++) {
        const a = n * Math.PI / 24, b = (n + 1) * Math.PI / 24;
        rim.lineStyle(ringHeight * 0.29, n % 8 < 2 ? 0xffefc7 : lane.tube, 1)
          .lineBetween(Math.cos(a) * ringWidth * 0.45, edgeY(a), Math.cos(b) * ringWidth * 0.45, edgeY(b));
      }
      raft.add([ripple, shadow, ring, hole, body, rim]);
      this.layer.add(raft);
      return {lane, raft, body, mouth, tongue, mouthX, mouthY, smear, ripple,
        phase: index * 1.78, open: false, hitTime: 0, caught: false, hits: 0};
    }

    show(visible) { this.layer.setVisible(visible); }

    reset() {
      this.time = 0;
      for (const swimmer of this.swimmers) {
        swimmer.hitTime = 0;
        swimmer.caught = false;
        swimmer.reaching = null;
        swimmer.hits = 0;
        swimmer.smear.clear();
        this.pose(swimmer);
      }
    }

    update(delta) {
      if (!this.layer.visible) return;
      const dt = Math.min(delta, 80) / 1000;
      this.time += dt;
      for (const swimmer of this.swimmers) {
        swimmer.hitTime = Math.max(0, swimmer.hitTime - dt);
        if (swimmer.hitTime < 0.57) this.pose(swimmer);
      }
    }

    pose(swimmer) {
      const {lane, phase, body, raft} = swimmer;
      const t = this.time;
      const beat = Math.sin(t * 4.2 + phase);
      const bite = Math.sin(t * 3.3 + phase);
      swimmer.open = swimmer.reaching ?? (bite > 0.24);
      raft.setPosition(lane.x + 13 * Math.sin(t * 1.75 + phase), lane.water + 3 * Math.cos(t * 2.1 + phase));
      const celebration = swimmer.caught ? Math.sin(swimmer.hitTime * 18) * swimmer.hitTime * 22 : 0;
      body.setPosition(beat * 3, -2 - 4 * Math.abs(beat) - celebration);
      body.setRotation(swimmer.reaching === null ? 0.075 * Math.sin(t * 2.4 + phase) : -0.14);
      swimmer.ripple.setScale(1 + 0.035 * beat, 1 + 0.09 * beat);
      swimmer.mouth.setVisible(swimmer.open);
      swimmer.tongue.setVisible(swimmer.open);
    }

    target(index) {
      const {raft, body, mouthX, mouthY, open} = this.swimmers[index];
      const cos = Math.cos(body.rotation), sin = Math.sin(body.rotation);
      return {x: raft.x + body.x + mouthX * cos - mouthY * sin,
        y: raft.y + body.y + mouthX * sin + mouthY * cos, open};
    }

    reach(index, open) {
      this.swimmers[index].reaching = open;
    }

    react(index, caught) {
      const swimmer = this.swimmers[index];
      swimmer.reaching = null;
      swimmer.hitTime = 0.9;
      swimmer.caught = caught;
      swimmer.hits++;
      const size = swimmer.lane.height / 260;
      const sauces = [0xf9bc22, 0xcf373b, 0xfff2cf];
      for (let i = 0; i < 9; i++) {
        const angle = (i + swimmer.hits * 0.35) * 2.4;
        const x = Math.cos(angle) * (caught ? 10 : 16) * size;
        const y = Math.sin(angle) * 7 * size + 1;
        swimmer.smear.fillStyle(sauces[i % 3], 0.96)
          .fillEllipse(x, y, (4 + i % 4) * size, (3 + i % 2) * size);
        if (i % 3 === 0) swimmer.smear.fillRoundedRect(x - size, y, size * 2, size * 6, size);
      }
    }
  }

  window.PoolCatchers = PoolCatchers;
})();
