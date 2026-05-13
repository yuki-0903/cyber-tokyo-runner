import * as Phaser from "phaser";
import { ASSET_BASE } from "@/game/config/assets";
import { gameEvents } from "@/game/systems/GameEvents";
import { gameServices } from "@/game/systems/GameServices";
import type { RuntimeGameState, SpawnConfig } from "@/game/types/GameState";

const BACKGROUND_SOURCE_WIDTH = 1774;
const BACKGROUND_SOURCE_HEIGHT = 887;
const BASE_GAME_WIDTH = 960;
const BASE_GAME_HEIGHT = 540;
const PLAYER_BOTTOM_OFFSET = 72;
const PLAYER_MARGIN_X = 32;
const PLAYER_BASE_SCALE = 2;

export class GameScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private enemies?: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private sky?: Phaser.GameObjects.Image;
  private farBackground?: Phaser.GameObjects.TileSprite;
  private buildings?: Phaser.GameObjects.TileSprite;
  private foreground?: Phaser.GameObjects.TileSprite;
  private targetX = 0;
  private touchDirection: -1 | 0 | 1 = 0;
  private holdTouchEffect?: Phaser.GameObjects.Container;
  private holdTouchEffectTween?: Phaser.Tweens.Tween;
  private spawnTimer = 0;
  private scoreTimer = 0;
  private readonly state: RuntimeGameState = {
    phase: "ready",
    score: 0,
    bestScore: 0,
    hp: 100,
    maxHp: 100
  };

  private readonly spawnConfig: SpawnConfig = {
    initialDelayMs: 950,
    minDelayMs: 360,
    speedStart: 120,
    speedMax: 310,
    difficultyRamp: 0.012
  };

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("sky", `${ASSET_BASE}/backgrounds/parallax/cyberpunk-tokyo-sky.png`);
    this.load.image(
      "farBackground",
      `${ASSET_BASE}/backgrounds/parallax/cyberpunk-tokyo-far-background.png`
    );
    this.load.image("buildings", `${ASSET_BASE}/backgrounds/parallax/cyberpunk-tokyo-buildings.png`);
    this.load.image("foreground", `${ASSET_BASE}/backgrounds/parallax/cyberpunk-tokyo-foreground.png`);
    this.load.spritesheet("girlWalk", `${ASSET_BASE}/sprites/cyberpunk-girl-walk-32x32.png`, {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet("tiles", `${ASSET_BASE}/tilesets/cyberpunk-tokyo-32x32-tileset.png`, {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.image(
      "fallingObstacle",
      `${ASSET_BASE}/sprites/falling-cyberpunk-obstacle-cropped.png`
    );
  }

  create() {
    this.cameras.main.setBackgroundColor("#05070f");
    this.resizeWorld();
    this.scene.launch("UIScene");
    this.createBackground();
    this.createPlayer();
    this.createEnemies();
    this.createInput();
    this.createEvents();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.prepareGame();
  }

  update(_time: number, delta: number) {
    if (this.state.phase !== "playing" || !this.player || !this.enemies) {
      return;
    }

    this.updatePlayer(delta);
    this.updateEnemies();
    this.updateSpawning(delta);
    this.updateScore(delta);
  }

  private get gameWidth() {
    return this.scale.width;
  }

  private get gameHeight() {
    return this.scale.height;
  }

  private get playerY() {
    const bottomOffset = PLAYER_BOTTOM_OFFSET * this.screenScale;
    return Math.max(bottomOffset, this.gameHeight - bottomOffset);
  }

  private get screenScale() {
    return Phaser.Math.Clamp(
      Math.min(this.gameWidth / BASE_GAME_WIDTH, this.gameHeight / BASE_GAME_HEIGHT),
      0.62,
      1.45
    );
  }

  private clampPlayerX(x: number) {
    const margin = PLAYER_MARGIN_X * this.screenScale;

    return Phaser.Math.Clamp(
      x,
      margin,
      Math.max(margin, this.gameWidth - margin)
    );
  }

  private resizeWorld() {
    this.physics.world.setBounds(0, 0, this.gameWidth, this.gameHeight);
    this.cameras.main.setBounds(0, 0, this.gameWidth, this.gameHeight);
  }

  private handleResize() {
    this.resizeWorld();
    this.resizeBackground();
    this.targetX = this.clampPlayerX(this.targetX || this.gameWidth / 2);

    if (this.player) {
      this.resizePlayer();
      this.player.x = this.clampPlayerX(this.player.x);
      this.player.y = this.playerY;
    }
  }

  private createBackground() {
    this.sky = this.add.image(0, 0, "sky").setOrigin(0);

    this.farBackground = this.add
      .tileSprite(0, 0, this.gameWidth, this.gameHeight, "farBackground")
      .setOrigin(0)
      .setScrollFactor(0.25);

    this.buildings = this.add
      .tileSprite(0, 0, this.gameWidth, this.gameHeight, "buildings")
      .setOrigin(0)
      .setScrollFactor(0.55);

    this.foreground = this.add
      .tileSprite(0, 0, this.gameWidth, this.gameHeight, "foreground")
      .setOrigin(0)
      .setDepth(5);

    this.resizeBackground();
  }

  private resizeBackground() {
    const width = this.gameWidth;
    const height = this.gameHeight;
    const tileScaleX = width / BACKGROUND_SOURCE_WIDTH;
    const tileScaleY = height / BACKGROUND_SOURCE_HEIGHT;

    this.sky?.setDisplaySize(width, height);

    for (const layer of [this.farBackground, this.buildings, this.foreground]) {
      layer?.setSize(width, height);
      layer?.setTileScale(tileScaleX, tileScaleY);
    }
  }

  private createPlayer() {
    this.anims.create({
      key: "girl-walk",
      frames: this.anims.generateFrameNumbers("girlWalk", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.player = this.physics.add.sprite(this.gameWidth / 2, this.playerY, "girlWalk", 0);
    this.player.setDepth(8);
    this.player.setCollideWorldBounds(true);
    this.resizePlayer();
    this.player.play("girl-walk");
  }

  private resizePlayer() {
    if (!this.player) {
      return;
    }

    this.player.setScale(PLAYER_BASE_SCALE * this.screenScale);
    this.player.body?.setSize(16, 24, true);
  }

  private createEnemies() {
    this.enemies = this.physics.add.group({
      allowGravity: false,
      immovable: false
    });

    this.physics.add.overlap(this.player!, this.enemies, (_player, enemy) => {
      this.damagePlayer(enemy as Phaser.Physics.Arcade.Sprite);
    });
  }

  private createInput() {
    this.cursors = this.input.keyboard?.createCursorKeys();

    const updateTouchDirection = (
      pointer: Phaser.Input.Pointer,
      options: { shouldNudge?: boolean; shouldPulse?: boolean } = {}
    ) => {
      if (this.state.phase !== "playing") {
        return;
      }

      const direction = pointer.x < this.gameWidth / 2 ? -1 : 1;
      this.touchDirection = direction;

      if (options.shouldPulse) {
        this.showHoldTouchEffect(pointer.x, pointer.y);
      }

      if (options.shouldNudge && this.player) {
        this.targetX = this.clampPlayerX(this.player.x + direction * 96 * this.screenScale);
      }
    };

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      updateTouchDirection(pointer, { shouldNudge: true, shouldPulse: true });
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) {
        return;
      }

      updateTouchDirection(pointer);
    });

    this.input.on("pointerup", () => {
      this.touchDirection = 0;
      this.hideHoldTouchEffect();
    });

    this.input.on("pointerupoutside", () => {
      this.touchDirection = 0;
      this.hideHoldTouchEffect();
    });
  }

  private createEvents() {
    gameEvents.on("ui:start", () => this.startGame());
    gameEvents.on("ui:restart", () => this.startGame());
  }

  private showHoldTouchEffect(x: number, y: number) {
    this.holdTouchEffect?.destroy(true);
    this.holdTouchEffectTween?.stop();

    const coreRadius = 18 * this.screenScale;
    const glowRadius = 34 * this.screenScale;
    const ringRadius = 46 * this.screenScale;
    const core = this.add
      .circle(x, y, coreRadius, 0xeaf8ff, 0.42)
      .setStrokeStyle(2 * this.screenScale, 0x22d7ff, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.9);
    const glow = this.add
      .circle(x, y, glowRadius, 0x22d7ff, 0.18)
      .setStrokeStyle(3 * this.screenScale, 0x8eeeff, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.7);
    const ring = this.add
      .circle(x, y, ringRadius, 0xffffff, 0)
      .setStrokeStyle(2 * this.screenScale, 0x8eeeff, 0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.74);

    this.holdTouchEffect = this.add
      .container(0, 0, [glow, ring, core])
      .setDepth(30)
      .setAlpha(1);

    this.tweens.add({
      targets: [glow, ring],
      scale: { from: 0.72, to: 1.18 },
      duration: 180,
      ease: "Sine.easeOut"
    });
    this.holdTouchEffectTween = this.tweens.add({
      targets: [glow, ring],
      alpha: { from: 0.52, to: 0.86 },
      scale: { from: 1, to: 1.12 },
      duration: 580,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private hideHoldTouchEffect() {
    if (!this.holdTouchEffect) {
      return;
    }

    this.holdTouchEffectTween?.stop();
    this.holdTouchEffectTween = undefined;

    this.tweens.add({
      targets: this.holdTouchEffect,
      alpha: 0,
      scale: 1.28,
      duration: 180,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.holdTouchEffect?.destroy(true);
        this.holdTouchEffect = undefined;
      }
    });
  }

  private updatePlayer(delta: number) {
    if (!this.player) {
      return;
    }

    const distance = this.targetX - this.player.x;
    const direction = this.getMoveDirection();
    const step = 520 * this.screenScale * (delta / 1000);

    if (direction !== 0) {
      const nextX = this.player.x + direction * step;
      this.player.x = this.clampPlayerX(nextX);
      this.targetX = this.player.x;
      this.player.setFlipX(direction < 0);
      return;
    }

    if (Math.abs(distance) <= step) {
      this.player.x = this.targetX;
      this.player.setVelocityX(0);
      return;
    }

    this.player.x += Math.sign(distance) * step;
    this.player.setFlipX(distance < 0);
  }

  private getKeyboardDirection() {
    if (!this.cursors) {
      return 0;
    }

    const left = this.cursors.left?.isDown;
    const right = this.cursors.right?.isDown;

    if (left === right) {
      return 0;
    }

    return left ? -1 : 1;
  }

  private getMoveDirection() {
    const keyboardDirection = this.getKeyboardDirection();
    if (keyboardDirection !== 0) {
      return keyboardDirection;
    }

    return this.touchDirection;
  }

  private updateEnemies() {
    this.enemies?.children.each((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (enemy.y > this.gameHeight + 48 * this.screenScale) {
        enemy.destroy();
      }
      return true;
    });
  }

  private updateSpawning(delta: number) {
    this.spawnTimer -= delta;
    if (this.spawnTimer > 0) {
      return;
    }

    this.spawnEnemy();
    const ramp = Math.min(520, this.state.score * 5);
    this.spawnTimer = Math.max(
      this.spawnConfig.minDelayMs,
      this.spawnConfig.initialDelayMs - ramp
    );
  }

  private updateScore(delta: number) {
    this.scoreTimer += delta;
    if (this.scoreTimer < 250) {
      return;
    }

    this.scoreTimer = 0;
    this.state.score += 1;
    this.state.bestScore = Math.max(this.state.bestScore, this.state.score);
    gameEvents.emit("score:changed", {
      score: this.state.score,
      bestScore: this.state.bestScore
    });
  }

  private spawnEnemy() {
    if (!this.enemies) {
      return;
    }

    const margin = 36 * this.screenScale;
    const x = Phaser.Math.Between(margin, Math.max(margin, this.gameWidth - margin));
    const enemy = this.enemies.create(x, -96 * this.screenScale, "fallingObstacle") as Phaser.Physics.Arcade.Sprite;
    const speed = Math.min(
      this.spawnConfig.speedMax,
      this.spawnConfig.speedStart + this.state.score * this.spawnConfig.difficultyRamp * 100
    ) * this.screenScale;

    enemy.setDepth(7);
    enemy.setDisplaySize(28 * this.screenScale, 92 * this.screenScale);
    enemy.setVelocityY(speed);
    enemy.setAngularVelocity(Phaser.Math.Between(-24, 24));
    enemy.body?.setSize(16 * this.screenScale, 68 * this.screenScale, true);
  }

  private prepareGame() {
    this.state.phase = "ready";
    this.state.score = 0;
    this.state.hp = this.state.maxHp;
    this.scoreTimer = 0;
    this.spawnTimer = this.spawnConfig.initialDelayMs;
    this.targetX = this.gameWidth / 2;
    this.touchDirection = 0;
    this.hideHoldTouchEffect();
    this.enemies?.clear(true, true);

    if (this.player) {
      this.player.enableBody(true, this.gameWidth / 2, this.playerY, true, true);
      this.player.setAlpha(1);
      this.player.play("girl-walk", true);
    }

    gameEvents.emit("score:changed", {
      score: this.state.score,
      bestScore: this.state.bestScore
    });
    gameEvents.emit("health:changed", {
      hp: this.state.hp,
      maxHp: this.state.maxHp
    });
    gameEvents.emit("game:ready");
  }

  private startGame() {
    this.state.phase = "playing";
    this.state.score = 0;
    this.state.hp = this.state.maxHp;
    this.scoreTimer = 0;
    this.spawnTimer = 250;
    this.targetX = this.gameWidth / 2;
    this.touchDirection = 0;
    this.hideHoldTouchEffect();
    this.enemies?.clear(true, true);

    if (this.player) {
      this.player.enableBody(true, this.gameWidth / 2, this.playerY, true, true);
      this.player.setAlpha(1);
      this.player.play("girl-walk", true);
    }

    gameEvents.emit("game:restart");
    gameEvents.emit("score:changed", {
      score: this.state.score,
      bestScore: this.state.bestScore
    });
    gameEvents.emit("health:changed", {
      hp: this.state.hp,
      maxHp: this.state.maxHp
    });
    gameEvents.emit("game:start");
  }

  private damagePlayer(enemy: Phaser.Physics.Arcade.Sprite) {
    if (this.state.phase !== "playing") {
      return;
    }

    enemy.destroy();
    this.state.hp = Math.max(0, this.state.hp - 25);
    gameEvents.emit("health:changed", {
      hp: this.state.hp,
      maxHp: this.state.maxHp
    });

    this.tweens.add({
      targets: this.player,
      alpha: { from: 0.35, to: 1 },
      duration: 140,
      repeat: 2,
      ease: "Sine.easeInOut"
    });

    if (this.state.hp <= 0) {
      void this.gameOver();
    }
  }

  private async gameOver() {
    if (this.state.phase === "gameOver") {
      return;
    }

    this.state.phase = "gameOver";
    this.touchDirection = 0;
    this.hideHoldTouchEffect();
    this.player?.setVelocity(0, 0);
    this.player?.setAlpha(0.55);
    this.enemies?.setVelocityY(0);
    this.state.bestScore = Math.max(this.state.bestScore, this.state.score);

    gameEvents.emit("game:over", {
      score: this.state.score,
      bestScore: this.state.bestScore
    });

    await gameServices.leaderboard.submitScore(this.state.score);
  }
}
