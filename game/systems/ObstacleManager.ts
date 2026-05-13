import * as Phaser from "phaser";
import {
  TOKYO_CYBER_DEBRIS_OBSTACLES,
  type ObstacleAsset
} from "@/game/config/obstacles";

interface ObstacleManagerConfig {
  getGameWidth: () => number;
  getGameHeight: () => number;
  getScreenScale: () => number;
}

interface SpawnConfig {
  initialDelayMs: number;
  minDelayMs: number;
  speedStart: number;
  speedMax: number;
  difficultyRamp: number;
}

const SPAWN_CONFIG: SpawnConfig = {
  initialDelayMs: 920,
  minDelayMs: 310,
  speedStart: 112,
  speedMax: 360,
  difficultyRamp: 0.013
};

const HAZARD_DEPTH = 7;
const BODY_SCALE = 0.58;

export class ObstacleManager {
  public readonly group: Phaser.Physics.Arcade.Group;

  private spawnTimer = SPAWN_CONFIG.initialDelayMs;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: ObstacleManagerConfig
  ) {
    this.group = this.scene.physics.add.group({
      allowGravity: false,
      immovable: false
    });
  }

  static preload(scene: Phaser.Scene) {
    for (const obstacle of TOKYO_CYBER_DEBRIS_OBSTACLES) {
      scene.load.image(obstacle.key, obstacle.path);
    }
  }

  update(delta: number, score: number) {
    this.updateActiveObstacles();

    this.spawnTimer -= delta;
    if (this.spawnTimer > 0) {
      return;
    }

    this.spawn(score);
    this.spawnTimer = this.getNextDelay(score);
  }

  reset(initialDelayMs = SPAWN_CONFIG.initialDelayMs) {
    this.clear();
    this.spawnTimer = initialDelayMs;
  }

  pause() {
    this.group.children.each((child) => {
      const obstacle = child as Phaser.Physics.Arcade.Sprite;
      this.scene.tweens.killTweensOf(obstacle);
      obstacle.setVelocity(0, 0);
      obstacle.setAngularVelocity(0);
      return true;
    });
  }

  private clear() {
    this.group.children.each((child) => {
      this.destroyObstacle(child as Phaser.Physics.Arcade.Sprite);
      return true;
    });
    this.group.clear(true, true);
  }

  private updateActiveObstacles() {
    const gameHeight = this.config.getGameHeight();
    const screenScale = this.config.getScreenScale();
    const destroyY = gameHeight + 130 * screenScale;

    this.group.children.each((child) => {
      const obstacle = child as Phaser.Physics.Arcade.Sprite;
      if (obstacle.y > destroyY) {
        this.destroyObstacle(obstacle);
      }
      return true;
    });
  }

  private spawn(score: number) {
    const asset = Phaser.Utils.Array.GetRandom(TOKYO_CYBER_DEBRIS_OBSTACLES);
    const screenScale = this.config.getScreenScale();
    const gameWidth = this.config.getGameWidth();
    const margin = Math.max(34 * screenScale, asset.displayWidth * screenScale * 0.55);
    const x = Phaser.Math.Between(margin, Math.max(margin, gameWidth - margin));
    const y = -Math.max(asset.displayHeight * screenScale, 78 * screenScale);
    const obstacle = this.group.create(x, y, asset.key) as Phaser.Physics.Arcade.Sprite;

    this.setupObstacle(obstacle, asset, score);
  }

  private setupObstacle(
    obstacle: Phaser.Physics.Arcade.Sprite,
    asset: ObstacleAsset,
    score: number
  ) {
    const screenScale = this.config.getScreenScale();
    const sizeScale = Phaser.Math.FloatBetween(0.86, 1.14);
    const speed = this.getFallSpeed(score) * screenScale;
    const width = asset.displayWidth * screenScale * sizeScale;
    const height = asset.displayHeight * screenScale * sizeScale;

    obstacle
      .setDepth(HAZARD_DEPTH)
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setVelocityY(speed)
      .setAlpha(1)
      .setBlendMode(Phaser.BlendModes.NORMAL);

    obstacle.body?.setSize(
      asset.sourceWidth * BODY_SCALE,
      asset.sourceHeight * BODY_SCALE,
      true
    );

    this.applyCategoryMotion(obstacle, asset);
  }

  private applyCategoryMotion(
    obstacle: Phaser.Physics.Arcade.Sprite,
    asset: ObstacleAsset
  ) {
    const screenScale = this.config.getScreenScale();

    switch (asset.category) {
      case "drone":
        obstacle.setAngularVelocity(this.randomSigned(70, 145));
        obstacle.setVelocityX(Phaser.Math.FloatBetween(-12, 12) * screenScale);
        break;
      case "neon-sign":
        obstacle.setAngularVelocity(this.randomSigned(8, 24));
        this.scene.tweens.add({
          targets: obstacle,
          alpha: Phaser.Math.FloatBetween(0.62, 0.78),
          duration: Phaser.Math.Between(80, 150),
          yoyo: true,
          repeat: -1,
          ease: "Stepped"
        });
        break;
      case "hologram-ad":
        obstacle.setAngularVelocity(this.randomSigned(6, 18));
        this.scene.tweens.add({
          targets: obstacle,
          alpha: Phaser.Math.FloatBetween(0.58, 0.75),
          duration: Phaser.Math.Between(260, 420),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
        break;
      case "data":
        obstacle.setAngularVelocity(this.randomSigned(170, 290));
        obstacle.setVelocityX(Phaser.Math.FloatBetween(-26, 26) * screenScale);
        break;
      case "umbrella":
        obstacle.setAngularVelocity(this.randomSigned(5, 12));
        obstacle.setVelocityX(Phaser.Math.FloatBetween(-10, 10) * screenScale);
        this.scene.tweens.add({
          targets: obstacle,
          x: obstacle.x + Phaser.Math.FloatBetween(-28, 28) * screenScale,
          duration: Phaser.Math.Between(760, 1040),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
        break;
      case "baton":
        obstacle.setAngularVelocity(this.randomSigned(120, 210));
        break;
      case "display":
        obstacle.setAngularVelocity(this.randomSigned(18, 42));
        this.scene.tweens.add({
          targets: obstacle,
          alpha: 0.82,
          duration: Phaser.Math.Between(160, 260),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
        break;
      default:
        obstacle.setAngularVelocity(this.randomSigned(28, 86));
        obstacle.setVelocityX(Phaser.Math.FloatBetween(-8, 8) * screenScale);
        break;
    }
  }

  private getFallSpeed(score: number) {
    const difficulty = Phaser.Math.Clamp(score / 130, 0, 1);
    const scoreBoost = score * SPAWN_CONFIG.difficultyRamp * 100;
    const minSpeed = SPAWN_CONFIG.speedStart + scoreBoost;
    const maxSpeed = Phaser.Math.Linear(205, SPAWN_CONFIG.speedMax, difficulty);

    return Phaser.Math.FloatBetween(minSpeed, Math.max(minSpeed + 18, maxSpeed));
  }

  private getNextDelay(score: number) {
    const ramp = Math.min(560, score * 5.8);
    const variance = Phaser.Math.Between(-55, 75);

    return Math.max(
      SPAWN_CONFIG.minDelayMs,
      SPAWN_CONFIG.initialDelayMs - ramp + variance
    );
  }

  private destroyObstacle(obstacle: Phaser.Physics.Arcade.Sprite) {
    this.scene.tweens.killTweensOf(obstacle);
    obstacle.destroy();
  }

  private randomSigned(min: number, max: number) {
    const value = Phaser.Math.FloatBetween(min, max);
    return Phaser.Math.Between(0, 1) === 0 ? -value : value;
  }
}
