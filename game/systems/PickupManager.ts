import * as Phaser from "phaser";
import { PICKUP_ASSET_BASE } from "@/game/config/assets";

interface PickupManagerConfig {
  getGameWidth: () => number;
  getGameHeight: () => number;
  getScreenScale: () => number;
  getPlayerX: () => number;
}

interface PickupUpdateContext {
  score: number;
}

interface PickupSpawnConfig {
  scoreInterval: number;
  maxActive: number;
  speedMin: number;
  speedMax: number;
  riskySpawnChance: number;
}

const ENERGY_DRINK_KEY = "pickupEnergyDrink";
const ENERGY_DRINK_ANIM_KEY = "pickup-energy-drink-pulse";
const PICKUP_DEPTH = 10;
const PICKUP_GLOW_DEPTH = PICKUP_DEPTH - 1;
const BODY_WIDTH = 18;
const BODY_HEIGHT = 24;
type PickupGlow = Phaser.GameObjects.Arc & {
  body?: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
};
const SPAWN_CONFIG: PickupSpawnConfig = {
  scoreInterval: 100,
  maxActive: 1,
  speedMin: 92,
  speedMax: 138,
  riskySpawnChance: 0.42
};

export class PickupManager {
  public readonly group: Phaser.Physics.Arcade.Group;

  private nextSpawnScore = SPAWN_CONFIG.scoreInterval;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: PickupManagerConfig
  ) {
    this.group = this.scene.physics.add.group({
      allowGravity: false,
      immovable: false,
      maxSize: SPAWN_CONFIG.maxActive
    });
    this.ensureAnimations();
  }

  static preload(scene: Phaser.Scene) {
    scene.load.spritesheet(
      ENERGY_DRINK_KEY,
      `${PICKUP_ASSET_BASE}/energy_drink_pickup_sheet_32.png`,
      {
        frameWidth: 32,
        frameHeight: 32
      }
    );
  }

  update(delta: number, context: PickupUpdateContext) {
    this.updateActivePickups();

    if (
      context.score < this.nextSpawnScore ||
      this.group.countActive(true) >= SPAWN_CONFIG.maxActive
    ) {
      return;
    }

    this.spawn(context);
    this.nextSpawnScore += SPAWN_CONFIG.scoreInterval;
  }

  reset(_initialDelayMs = 0) {
    this.clear();
    this.nextSpawnScore = SPAWN_CONFIG.scoreInterval;
  }

  pause() {
    this.group.children.each((child) => {
      const pickup = child as Phaser.Physics.Arcade.Sprite;
      this.scene.tweens.killTweensOf(pickup);
      this.killGlowTweens(pickup);
      pickup.setVelocity(0, 0);
      pickup.setAngularVelocity(0);
      return true;
    });
  }

  collect(pickup: Phaser.Physics.Arcade.Sprite) {
    if (!pickup.active) {
      return;
    }

    pickup.setActive(false);
    if (pickup.body) {
      pickup.body.enable = false;
      pickup.setVelocity(0, 0);
      pickup.setAngularVelocity(0);
    }

    this.scene.tweens.killTweensOf(pickup);
    this.killGlowTweens(pickup);

    const glow = this.getGlow(pickup);
    if (glow) {
      this.scene.tweens.add({
        targets: glow,
        scale: 0.22,
        alpha: 0,
        duration: 150,
        ease: "Back.easeIn",
        onComplete: () => glow.setVisible(false)
      });
    }

    this.scene.tweens.add({
      targets: pickup,
      scale: 0,
      alpha: 0,
      angle: pickup.angle + 48,
      duration: 150,
      ease: "Back.easeIn",
      onComplete: () => this.recyclePickup(pickup)
    });
  }

  private ensureAnimations() {
    if (this.scene.anims.exists(ENERGY_DRINK_ANIM_KEY)) {
      return;
    }

    this.scene.anims.create({
      key: ENERGY_DRINK_ANIM_KEY,
      frames: this.scene.anims.generateFrameNumbers(ENERGY_DRINK_KEY, { start: 0, end: 2 }),
      frameRate: 6,
      repeat: -1,
      yoyo: true
    });
  }

  private clear() {
    this.group.children.each((child) => {
      this.recyclePickup(child as Phaser.Physics.Arcade.Sprite);
      return true;
    });
  }

  private updateActivePickups() {
    const gameHeight = this.config.getGameHeight();
    const screenScale = this.config.getScreenScale();
    const destroyY = gameHeight + 90 * screenScale;

    this.group.children.each((child) => {
      const pickup = child as Phaser.Physics.Arcade.Sprite;
      this.syncGlow(pickup);
      if (pickup.active && pickup.y > destroyY) {
        this.recyclePickup(pickup);
      }
      return true;
    });
  }

  private spawn(context: PickupUpdateContext) {
    const screenScale = this.config.getScreenScale();
    const gameWidth = this.config.getGameWidth();
    const margin = 44 * screenScale;
    const x = this.getSpawnX(gameWidth, margin);
    const y = -44 * screenScale;
    const pickup = this.group.get(x, y, ENERGY_DRINK_KEY, 0) as Phaser.Physics.Arcade.Sprite | null;

    if (!pickup) {
      return;
    }

    this.setupPickup(pickup, context);
  }

  private setupPickup(pickup: Phaser.Physics.Arcade.Sprite, context: PickupUpdateContext) {
    const screenScale = this.config.getScreenScale();
    const sizeScale = Phaser.Math.FloatBetween(0.92, 1.12);
    const displaySize = 50 * screenScale * sizeScale;
    const difficultyBoost = Phaser.Math.Clamp(context.score / 900, 0, 0.35);
    const speed = Phaser.Math.FloatBetween(
      SPAWN_CONFIG.speedMin,
      SPAWN_CONFIG.speedMax + 44 * difficultyBoost
    ) * screenScale;
    const drift = Phaser.Math.FloatBetween(-18, 18) * screenScale;

    pickup
      .enableBody(true, pickup.x, pickup.y, true, true)
      .setDepth(PICKUP_DEPTH)
      .setOrigin(0.5)
      .setDisplaySize(displaySize, displaySize)
      .setAlpha(1)
      .setAngle(Phaser.Math.FloatBetween(-6, 6))
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setVelocity(drift, speed)
      .setAngularVelocity(Phaser.Math.FloatBetween(-18, 18));

    pickup.body?.setSize(BODY_WIDTH, BODY_HEIGHT, true);
    pickup.play(ENERGY_DRINK_ANIM_KEY, true);
    this.setupGlow(pickup, displaySize);

    this.scene.tweens.add({
      targets: pickup,
      scaleX: pickup.scaleX * 1.05,
      scaleY: pickup.scaleY * 1.05,
      alpha: { from: 0.88, to: 1 },
      duration: Phaser.Math.Between(520, 760),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.scene.tweens.add({
      targets: pickup,
      x: pickup.x + Phaser.Math.FloatBetween(-18, 18) * screenScale,
      angle: pickup.angle + Phaser.Math.FloatBetween(-8, 8),
      duration: Phaser.Math.Between(900, 1280),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private setupGlow(pickup: Phaser.Physics.Arcade.Sprite, displaySize: number) {
    const glow = this.getOrCreateGlow(pickup);
    const radius = displaySize * 0.62;

    glow
      .setPosition(pickup.x, pickup.y)
      .setRadius(radius)
      .setDepth(PICKUP_GLOW_DEPTH)
      .setAlpha(0.34)
      .setScale(1)
      .setVisible(true)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.killTweensOf(glow);
    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.22, to: 0.48 },
      scale: { from: 0.84, to: 1.18 },
      duration: Phaser.Math.Between(560, 760),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private getOrCreateGlow(pickup: Phaser.Physics.Arcade.Sprite) {
    const existingGlow = this.getGlow(pickup);
    if (existingGlow) {
      return existingGlow;
    }

    const glow = this.scene.add
      .circle(pickup.x, pickup.y, 28, 0xbaff18, 0.34)
      .setStrokeStyle(2, 0xf3ff94, 0.5)
      .setDepth(PICKUP_GLOW_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD) as PickupGlow;

    pickup.setData("glow", glow);
    return glow;
  }

  private getGlow(pickup: Phaser.Physics.Arcade.Sprite) {
    return pickup.getData("glow") as PickupGlow | undefined;
  }

  private syncGlow(pickup: Phaser.Physics.Arcade.Sprite) {
    const glow = this.getGlow(pickup);
    if (!glow || !pickup.visible) {
      return;
    }

    glow.setPosition(pickup.x, pickup.y);
  }

  private killGlowTweens(pickup: Phaser.Physics.Arcade.Sprite) {
    const glow = this.getGlow(pickup);
    if (!glow) {
      return;
    }

    this.scene.tweens.killTweensOf(glow);
  }

  private getSpawnX(gameWidth: number, margin: number) {
    if (Math.random() < SPAWN_CONFIG.riskySpawnChance) {
      return Phaser.Math.Clamp(
        this.config.getPlayerX() + Phaser.Math.FloatBetween(-132, 132) * this.config.getScreenScale(),
        margin,
        Math.max(margin, gameWidth - margin)
      );
    }

    return Phaser.Math.Between(margin, Math.max(margin, gameWidth - margin));
  }

  private recyclePickup(pickup: Phaser.Physics.Arcade.Sprite) {
    this.scene.tweens.killTweensOf(pickup);
    this.killGlowTweens(pickup);
    this.getGlow(pickup)?.setVisible(false);
    pickup.stop();
    pickup.setActive(false);
    pickup.setVisible(false);
    pickup.setAlpha(1);
    pickup.setScale(1);
    pickup.setVelocity(0, 0);
    pickup.setAngularVelocity(0);
    pickup.disableBody(true, true);
  }
}
