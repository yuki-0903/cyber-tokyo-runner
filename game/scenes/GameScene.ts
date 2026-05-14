import * as Phaser from "phaser";
import { ASSET_BASE } from "@/game/config/assets";
import { gameEvents } from "@/game/systems/GameEvents";
import { gameServices } from "@/game/systems/GameServices";
import { ObstacleManager } from "@/game/systems/ObstacleManager";
import type { RuntimeGameState } from "@/game/types/GameState";

const BACKGROUND_SOURCE_WIDTH = 1774;
const BACKGROUND_SOURCE_HEIGHT = 887;
const BASE_GAME_WIDTH = 960;
const BASE_GAME_HEIGHT = 540;
const PLAYER_BOTTOM_OFFSET = 72;
const PLAYER_MARGIN_X = 32;
const PLAYER_BASE_SCALE = 2.55;
const START_OBSTACLE_DELAY_MS = 1220;

export class GameScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private obstacleManager?: ObstacleManager;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private sky?: Phaser.GameObjects.Image;
  private farBackground?: Phaser.GameObjects.TileSprite;
  private buildings?: Phaser.GameObjects.TileSprite;
  private foreground?: Phaser.GameObjects.TileSprite;
  private targetX = 0;
  private touchDirection: -1 | 0 | 1 = 0;
  private holdTouchEffect?: Phaser.GameObjects.Container;
  private holdTouchEffectTween?: Phaser.Tweens.Tween;
  private hitStopEvent?: Phaser.Time.TimerEvent;
  private scoreTimer = 0;
  private readonly state: RuntimeGameState = {
    phase: "ready",
    score: 0,
    bestScore: 0,
    hp: 100,
    maxHp: 100
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
    ObstacleManager.preload(this);
  }

  create() {
    this.cameras.main.setBackgroundColor("#05070f");
    this.resizeWorld();
    this.scene.launch("UIScene");
    this.createBackground();
    this.createPlayer();
    ObstacleManager.prepareTextures(this);
    this.createObstacles();
    this.createInput();
    this.createEvents();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.prepareGame();
  }

  update(_time: number, delta: number) {
    if (this.state.phase !== "playing" || !this.player || !this.obstacleManager) {
      return;
    }

    this.updatePlayer(delta);
    this.obstacleManager.update(delta, this.state.score);
    this.updateScore(delta);
  }

  private get gameWidth() {
    if (this.isRotatedTouchView()) {
      return this.scale.height;
    }

    return this.scale.width;
  }

  private get gameHeight() {
    if (this.isRotatedTouchView()) {
      return this.scale.width;
    }

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
    this.configureCamera();
  }

  private configureCamera() {
    const camera = this.cameras.main;
    camera.setViewport(0, 0, this.scale.width, this.scale.height);

    if (this.isRotatedTouchView()) {
      camera.removeBounds();
      camera.setOrigin(0.5, this.gameHeight / (this.gameWidth * 2));
      camera.setRotation(Math.PI / 2);
      camera.setScroll(0, 0);
      return;
    }

    camera.setBounds(0, 0, this.gameWidth, this.gameHeight);
    camera.setOrigin(0, 0);
    camera.setRotation(0);
    camera.setScroll(0, 0);
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

  private createObstacles() {
    this.obstacleManager = new ObstacleManager(this, {
      getGameWidth: () => this.gameWidth,
      getGameHeight: () => this.gameHeight,
      getScreenScale: () => this.screenScale
    });

    this.physics.add.overlap(this.player!, this.obstacleManager.group, (_player, enemy) => {
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

      const direction = this.getTouchDirection(pointer);
      this.touchDirection = direction;

      if (options.shouldPulse) {
        const effectPoint = this.getTouchEffectPoint(pointer);
        this.showHoldTouchEffect(effectPoint.x, effectPoint.y);
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

  private getTouchDirection(pointer: Phaser.Input.Pointer): -1 | 1 {
    const point = this.getPointerWorldPoint(pointer);

    return point.x < this.gameWidth / 2 ? -1 : 1;
  }

  private getTouchEffectPoint(pointer: Phaser.Input.Pointer) {
    return this.getPointerWorldPoint(pointer);
  }

  private getPointerWorldPoint(pointer: Phaser.Input.Pointer) {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  private isRotatedTouchView() {
    if (typeof window === "undefined") {
      return false;
    }

    const isPortraitWindow = window.matchMedia("(orientation: portrait)").matches;
    const isTouchPrimary = window.matchMedia("(pointer: coarse)").matches;

    return isPortraitWindow && (isTouchPrimary || navigator.maxTouchPoints > 0);
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

  private prepareGame() {
    this.state.phase = "ready";
    this.state.score = 0;
    this.state.hp = this.state.maxHp;
    this.scoreTimer = 0;
    this.targetX = this.gameWidth / 2;
    this.touchDirection = 0;
    this.hideHoldTouchEffect();
    this.resetHitStop();
    this.obstacleManager?.reset();

    if (this.player) {
      this.player.enableBody(true, this.gameWidth / 2, this.playerY, true, true);
      this.player.setAlpha(1);
      this.player.setAngle(0);
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
    this.targetX = this.gameWidth / 2;
    this.touchDirection = 0;
    this.hideHoldTouchEffect();
    this.resetHitStop();
    this.obstacleManager?.reset(START_OBSTACLE_DELAY_MS);

    if (this.player) {
      this.player.enableBody(true, this.gameWidth / 2, this.playerY, true, true);
      this.player.setAlpha(1);
      this.player.setAngle(0);
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

    const hitX = enemy.x;
    const hitY = enemy.y;
    enemy.destroy();
    this.state.hp = Math.max(0, this.state.hp - 25);
    gameEvents.emit("health:changed", {
      hp: this.state.hp,
      maxHp: this.state.maxHp
    });

    this.playDamageFeedback(hitX, hitY);

    if (this.state.hp <= 0) {
      void this.gameOver();
    }
  }

  private playDamageFeedback(hitX: number, hitY: number) {
    this.cameras.main.shake(110, 0.006);
    this.showDamageVignette();
    this.startHitStop();
    this.knockBackPlayer(hitX);
    this.spawnHitParticles(hitX, hitY);

    this.tweens.add({
      targets: this.player,
      alpha: { from: 0.35, to: 1 },
      duration: 140,
      repeat: 2,
      ease: "Sine.easeInOut"
    });
  }

  private showDamageVignette() {
    const thickness = 28 * this.screenScale;
    const alpha = 0.22;
    const top = this.add.rectangle(
      this.gameWidth / 2,
      thickness / 2,
      this.gameWidth,
      thickness,
      0xff2e5c,
      alpha
    );
    const bottom = this.add.rectangle(
      this.gameWidth / 2,
      this.gameHeight - thickness / 2,
      this.gameWidth,
      thickness,
      0xff2e5c,
      alpha
    );
    const left = this.add.rectangle(
      thickness / 2,
      this.gameHeight / 2,
      thickness,
      this.gameHeight,
      0xff2e5c,
      alpha
    );
    const right = this.add.rectangle(
      this.gameWidth - thickness / 2,
      this.gameHeight / 2,
      thickness,
      this.gameHeight,
      0xff2e5c,
      alpha
    );
    const vignette = this.add
      .container(0, 0, [top, bottom, left, right])
      .setDepth(80)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: vignette,
      alpha: 0,
      duration: 240,
      ease: "Sine.easeOut",
      onComplete: () => vignette.destroy(true)
    });
  }

  private startHitStop() {
    const world = this.physics.world as Phaser.Physics.Arcade.World & { timeScale: number };
    world.timeScale = 0.58;
    this.hitStopEvent?.remove(false);
    this.hitStopEvent = this.time.delayedCall(70, () => {
      world.timeScale = 1;
      this.hitStopEvent = undefined;
    });
  }

  private resetHitStop() {
    const world = this.physics.world as Phaser.Physics.Arcade.World & { timeScale: number };
    world.timeScale = 1;
    this.hitStopEvent?.remove(false);
    this.hitStopEvent = undefined;
  }

  private knockBackPlayer(hitX: number) {
    if (!this.player) {
      return;
    }

    const direction = this.player.x < hitX ? -1 : 1;
    const knockbackX = this.clampPlayerX(this.player.x + direction * 28 * this.screenScale);
    this.targetX = knockbackX;

    this.tweens.add({
      targets: this.player,
      x: knockbackX,
      angle: direction * -4,
      duration: 75,
      ease: "Sine.easeOut",
      yoyo: true,
      onComplete: () => {
        if (this.player) {
          this.player.angle = 0;
        }
      }
    });
  }

  private spawnHitParticles(x: number, y: number) {
    const particleCount = 8;

    for (let index = 0; index < particleCount; index += 1) {
      const angle = Phaser.Math.FloatBetween(-Math.PI, 0);
      const distance = Phaser.Math.Between(18, 62) * this.screenScale;
      const size = Phaser.Math.Between(2, 5) * this.screenScale;
      const color = index % 3 === 0 ? 0xff4b8d : index % 3 === 1 ? 0x22d7ff : 0xeaf8ff;
      const particle = this.add
        .circle(x, y, size, color, 0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(32);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: { from: 1, to: 0.35 },
        duration: Phaser.Math.Between(180, 320),
        ease: "Sine.easeOut",
        onComplete: () => particle.destroy()
      });
    }
  }

  private async gameOver() {
    if (this.state.phase === "gameOver") {
      return;
    }

    this.state.phase = "gameOver";
    this.touchDirection = 0;
    this.hideHoldTouchEffect();
    this.resetHitStop();
    this.player?.setVelocity(0, 0);
    this.player?.setAlpha(0.55);
    this.obstacleManager?.pause();
    this.state.bestScore = Math.max(this.state.bestScore, this.state.score);

    gameEvents.emit("game:over", {
      score: this.state.score,
      bestScore: this.state.bestScore
    });

    await gameServices.leaderboard.submitScore(this.state.score);
  }
}
