// Draw the grip in bottle-local coordinates. The thumb pivots separately at its knuckle.
class BottleHand {
  constructor(scene, x, y) {
    const ink = 0x592f3a, skin = 0xe99161, light = 0xffbc86;
    this.scene = scene;
    this.grip = scene.add.container(x, y).setDepth(10);
    const palm = scene.add.graphics();
    palm.fillStyle(ink).fillRoundedRect(-108, -2, 76, 49, 21);
    palm.fillStyle(skin).fillRoundedRect(-105, 1, 70, 43, 18);
    palm.fillStyle(0x135b62).fillRoundedRect(-126, 6, 42, 39, 9);
    palm.fillStyle(0x39ccb7).fillRoundedRect(-96, 6, 9, 39, 4);
    for (let i = 0; i < 4; i++) {
      const dx = -88 + i * 12, dy = 5 - Math.sin(i * .9) * 5;
      palm.fillStyle(ink).fillRoundedRect(dx, dy - 16, 17, 34, 8);
      palm.fillStyle(light).fillRoundedRect(dx + 2, dy - 14, 13, 29, 7);
      palm.fillStyle(0xffdbb7).fillRoundedRect(dx + 4, dy - 11, 9, 8, 4);
    }
    this.thumb = scene.add.graphics().setPosition(-44, 18);
    this.thumb.fillStyle(ink).fillRoundedRect(-10, -9, 53, 20, 10);
    this.thumb.fillStyle(light).fillRoundedRect(-8, -7, 49, 16, 8);
    this.thumb.fillStyle(0xffddbd).fillRoundedRect(26, -6, 12, 9, 4);
    this.grip.add([palm, this.thumb]);
    this.reset();
  }
  aim(rotation, visible) { this.grip.setRotation(rotation).setVisible(visible); }
  reset() {
    this.scene.tweens.killTweensOf(this.thumb);
    this.thumb.setRotation(-0.4);
  }
  windUp() {
    this.reset();
    this.scene.tweens.add({targets:this.thumb, rotation:0.18, duration:130, ease:'Sine.Out'});
  }
  flick() {
    this.scene.tweens.add({targets:this.thumb, rotation:-0.78, duration:45, ease:'Quad.Out',
      onComplete:() => this.scene.tweens.add({targets:this.thumb, rotation:-0.4, duration:240, delay:70})});
  }
}
