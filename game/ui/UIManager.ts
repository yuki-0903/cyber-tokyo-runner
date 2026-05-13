import * as Phaser from "phaser";

interface ImageButtonConfig {
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  labelSize?: number;
  onClick: () => void;
}

export class UIManager {
  constructor(private readonly scene: Phaser.Scene) {}

  createImage(
    key: string,
    x: number,
    y: number,
    width: number,
    height: number,
    depth = 100
  ) {
    return this.scene.add
      .image(x, y, key)
      .setDisplaySize(width, height)
      .setScrollFactor(0)
      .setDepth(depth);
  }

  createLabel(
    text: string,
    x: number,
    y: number,
    size: number,
    depth = 101,
    origin: Phaser.Math.Vector2 | [number, number] = [0.5, 0.5]
  ) {
    const [originX, originY] = Array.isArray(origin) ? origin : [origin.x, origin.y];

    return this.scene.add
      .text(x, y, text, {
        fontFamily: "Orbitron, Arial, sans-serif",
        fontSize: `${size}px`,
        fontStyle: "800",
        color: "#eaf8ff",
        align: "center",
        stroke: "#061427",
        strokeThickness: 4,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#22d7ff",
          blur: 8,
          fill: true
        }
      })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(depth);
  }

  createButton(config: ImageButtonConfig) {
    const container = this.scene.add
      .container(config.x, config.y)
      .setScrollFactor(0)
      .setDepth(120);

    const image = this.scene.add
      .image(0, 0, config.key)
      .setDisplaySize(config.width, config.height)
      .setInteractive({ useHandCursor: true });

    const label = this.scene.add
      .text(0, 0, config.label, {
        fontFamily: "Orbitron, Arial, sans-serif",
        fontSize: `${config.labelSize ?? 30}px`,
        fontStyle: "900",
        color: "#eaf8ff",
        align: "center",
        stroke: "#061427",
        strokeThickness: Math.max(3, Math.round((config.labelSize ?? 30) / 6)),
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#22d7ff",
          blur: 10,
          fill: true
        }
      })
      .setOrigin(0.5);

    container.add([image, label]);
    container.setSize(config.width, config.height);

    image.on("pointerover", () => {
      this.scene.tweens.add({
        targets: container,
        scale: 1.045,
        duration: 120,
        ease: "Sine.easeOut"
      });
      this.scene.tweens.add({
        targets: image,
        alpha: 1,
        duration: 120
      });
    });

    image.on("pointerout", () => {
      this.scene.tweens.add({
        targets: container,
        scale: 1,
        duration: 140,
        ease: "Sine.easeOut"
      });
    });

    image.on("pointerdown", () => {
      this.scene.tweens.add({
        targets: container,
        scale: 0.965,
        duration: 70,
        yoyo: true,
        ease: "Sine.easeInOut",
        onComplete: config.onClick
      });
    });

    this.scene.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      y: { from: config.y + 14, to: config.y },
      duration: 260,
      ease: "Back.easeOut"
    });

    return container;
  }
}
