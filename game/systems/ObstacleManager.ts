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
const CLEAN_TEXTURE_SUFFIX = "-clean";
const EDGE_COLOR_SEARCH_RADIUS = 3;
const SOLID_ALPHA_FOR_COLOR_SAMPLE = 96;
const PALE_EDGE_ALPHA_LIMIT = 238;
const PALE_EDGE_MIN_CHANNEL = 188;
const PALE_EDGE_MAX_SPREAD = 62;

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

  static prepareTextures(scene: Phaser.Scene) {
    for (const obstacle of TOKYO_CYBER_DEBRIS_OBSTACLES) {
      const texture = scene.textures.get(obstacle.key);
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

      const cleanKey = this.getCleanTextureKey(obstacle.key);
      if (scene.textures.exists(cleanKey)) {
        scene.textures.get(cleanKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
        continue;
      }

      const sourceImage = texture.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
      const canvas = document.createElement("canvas");
      canvas.width = sourceImage.width;
      canvas.height = sourceImage.height;

      const context = canvas.getContext("2d");
      if (!context) {
        continue;
      }

      context.drawImage(sourceImage, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const sourcePixels = new Uint8ClampedArray(pixels);

      for (let index = 0; index < pixels.length; index += 4) {
        this.cleanEdgePixel(pixels, sourcePixels, index, canvas.width, canvas.height);
      }

      context.putImageData(imageData, 0, 0);
      scene.textures.addCanvas(cleanKey, canvas);
      scene.textures.get(cleanKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
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
    const obstacle = this.group.create(x, y, this.getRenderTextureKey(asset)) as Phaser.Physics.Arcade.Sprite;

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

  private getRenderTextureKey(asset: ObstacleAsset) {
    const cleanKey = ObstacleManager.getCleanTextureKey(asset.key);
    return this.scene.textures.exists(cleanKey) ? cleanKey : asset.key;
  }

  private static getCleanTextureKey(key: string) {
    return `${key}${CLEAN_TEXTURE_SUFFIX}`;
  }

  private static cleanEdgePixel(
    pixels: Uint8ClampedArray,
    sourcePixels: Uint8ClampedArray,
    index: number,
    width: number,
    height: number
  ) {
    const alpha = pixels[index + 3];

    if (alpha < 252) {
      const bleedColor = this.findNearestSolidColor(sourcePixels, index, width, height);
      if (bleedColor) {
        pixels[index] = bleedColor.red;
        pixels[index + 1] = bleedColor.green;
        pixels[index + 2] = bleedColor.blue;
      }
    }

    if (alpha < 24) {
      pixels[index + 3] = 0;
      return;
    }

    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const minChannel = Math.min(red, green, blue);
    const maxChannel = Math.max(red, green, blue);
    const isPaleEdge =
      alpha < PALE_EDGE_ALPHA_LIMIT &&
      minChannel > PALE_EDGE_MIN_CHANNEL &&
      maxChannel - minChannel < PALE_EDGE_MAX_SPREAD;

    if (isPaleEdge) {
      pixels[index + 3] = Math.round(alpha * 0.08);
      return;
    }

    if (alpha < 76) {
      pixels[index + 3] = Math.round(alpha * 0.72);
    }
  }

  private static findNearestSolidColor(
    pixels: Uint8ClampedArray,
    index: number,
    width: number,
    height: number
  ) {
    const pixelIndex = index / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    let red = 0;
    let green = 0;
    let blue = 0;
    let samples = 0;

    for (let radius = 1; radius <= EDGE_COLOR_SEARCH_RADIUS; radius += 1) {
      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== radius) {
            continue;
          }

          const sampleX = x + offsetX;
          const sampleY = y + offsetY;
          if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) {
            continue;
          }

          const sampleIndex = (sampleY * width + sampleX) * 4;
          const sampleAlpha = pixels[sampleIndex + 3];
          if (sampleAlpha < SOLID_ALPHA_FOR_COLOR_SAMPLE) {
            continue;
          }

          const sampleRed = pixels[sampleIndex];
          const sampleGreen = pixels[sampleIndex + 1];
          const sampleBlue = pixels[sampleIndex + 2];
          if (this.isPaleMattePixel(sampleRed, sampleGreen, sampleBlue, sampleAlpha)) {
            continue;
          }

          red += sampleRed;
          green += sampleGreen;
          blue += sampleBlue;
          samples += 1;
        }
      }

      if (samples > 0) {
        return {
          red: Math.round(red / samples),
          green: Math.round(green / samples),
          blue: Math.round(blue / samples)
        };
      }
    }

    return undefined;
  }

  private static isPaleMattePixel(red: number, green: number, blue: number, alpha: number) {
    const minChannel = Math.min(red, green, blue);
    const maxChannel = Math.max(red, green, blue);

    return (
      alpha < PALE_EDGE_ALPHA_LIMIT &&
      minChannel > PALE_EDGE_MIN_CHANNEL &&
      maxChannel - minChannel < PALE_EDGE_MAX_SPREAD
    );
  }

  private randomSigned(min: number, max: number) {
    const value = Phaser.Math.FloatBetween(min, max);
    return Phaser.Math.Between(0, 1) === 0 ? -value : value;
  }
}
