(() => {
  const dancers = [
    { x: 640, style: 'coral', tint: 0xffffff },
    { x: 740, style: 'teal', tint: 0xffffff },
    { x: 840, style: 'coral', tint: 0xffdee8 },
    { x: 940, style: 'teal', tint: 0xffebc5 }
  ];

  class CorkLine {
    static height = 185;
    static floor = 360;

    constructor(scene, lead, shadow) {
      this.lead = lead;
      this.shadow = shadow;
      this.group = scene.add.container(0, 0);
      this.cast = dancers.map(({style, tint}, index) => {
        const shade = scene.add.ellipse(0, 0, 47, 5, 0x39282a, 0.24);
        const figure = scene.add.image(0, 0, 'toon-' + style + '-back')
          .setOrigin(0.5, 1).setTint(tint).setFlipX(index >= 2);
        this.group.add([shade, figure]);
        return {shade, figure};
      });
      this.cue = scene.add.graphics();
      this.cue.fillStyle(0x452535).fillTriangle(-11, -13, 11, -13, 0, 2);
      this.cue.fillStyle(0xffdb67).fillTriangle(-8, -11, 8, -11, 0, -1);
      this.group.add(this.cue);
      this.update(0, 0);
    }

    show(visible) {
      this.group.setVisible(visible);
    }

    position(index, t) {
      const phase = index * 1.47;
      return {
        x: dancers[index].x + 10 * Math.sin(t * 2.1 + phase),
        y: CorkLine.floor - 9 * Math.abs(Math.sin(t * 4.3 + phase))
      };
    }

    update(t, activeIndex) {
      for (let index = 0; index < this.cast.length; index++) {
        const {shade, figure} = this.cast[index];
        const active = index === activeIndex;
        const {x, y} = this.position(index, t);
        shade.setVisible(!active);
        figure.setVisible(!active);
        if (active) {
          this.lead.setTint(dancers[index].tint).setFlipX(index >= 2);
          this.cue.setPosition(x, y - CorkLine.height - 8);
        } else {
          const beat = Math.sin(t * 4.3 + index * 1.47);
          const scale = CorkLine.height / figure.height;
          shade.setPosition(x, CorkLine.floor - 2).setScale(1 - 0.09 * Math.abs(beat), 1);
          figure.setPosition(x, y).setScale(scale, scale * (1 + 0.02 * beat))
            .setAngle(2.6 * beat);
        }
      }
    }
  }

  window.CorkLine = CorkLine;
})();
