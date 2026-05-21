import * as Phaser from "phaser";
import { ASSET_BASE, AUDIO_ASSET_BASE } from "@/game/config/assets";
import { gameEvents } from "@/game/systems/GameEvents";
import { gameServices } from "@/game/systems/GameServices";
import { loadAudioSettings, type AudioSettings } from "@/game/systems/AudioSettings";
import { ObstacleManager } from "@/game/systems/ObstacleManager";
import { PickupManager } from "@/game/systems/PickupManager";
import type { RuntimeGameState } from "@/game/types/GameState";

const BACKGROUND_SOURCE_WIDTH = 1774;
const BACKGROUND_SOURCE_HEIGHT = 887;
const BASE_GAME_WIDTH = 960;
const BASE_GAME_HEIGHT = 540;
const PLAYER_BOTTOM_OFFSET = 72;
const PLAYER_MARGIN_X = 32;
const PLAYER_BASE_SCALE = 2.55;
const START_OBSTACLE_DELAY_MS = 1220;
const BGM_MAIN_KEY = "bgmMainLoop";
const START_SE_KEY = "seStart";
const HIT_SE_KEY = "seHit";
const HEAL_SE_KEY = "seHealPickup";
const BGM_START_DELAY_MS = 520;
const HEAL_AMOUNT = 25;
const FULL_HP_PICKUP_SCORE = 5;
type LoopingBgm = Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;

export class GameScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private obstacleManager?: ObstacleManager;
  private pickupManager?: PickupManager;
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
  private bgm?: LoopingBgm;
  private bgmStartEvent?: Phaser.Time.TimerEvent;
  private audioSettings: AudioSettings = loadAudioSettings();
  private eventDisposers: Array<() => void> = [];
  private didRegisterPageLifecycle = false;
  private didCleanup = false;
  private lastHitSoundAt = -1000;
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
    this.load.image("sky", `${ASSET_BASE}/backgrounds/parallax/cyberpunk-tokyo-sky.webp`);
    this.load.image(
      "farBackground",
      `${ASSET_BASE}/backgrounds/parallax/cyberpunk-tokyo-far-background.webp`
    );
    this.load.image("buildings", `${ASSET_BASE}/backgrounds/parallax/cyberpunk-tokyo-buildings.webp`);
    this.load.image("foreground", `${ASSET_BASE}/backgrounds/parallax/cyberpunk-tokyo-foreground.webp`);
    this.load.spritesheet("girlWalk", `${ASSET_BASE}/sprites/cyberpunk-girl-walk-32x32.webp`, {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet("tiles", `${ASSET_BASE}/tilesets/cyberpunk-tokyo-32x32-tileset.png`, {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.audio(BGM_MAIN_KEY, `${AUDIO_ASSET_BASE}/bgm_main_loop.mp3`);
    this.load.audio(START_SE_KEY, `${AUDIO_ASSET_BASE}/se_start.mp3`);
    this.load.audio(HIT_SE_KEY, `${AUDIO_ASSET_BASE}/se_hit.mp3`);
    this.load.audio(HEAL_SE_KEY, `${AUDIO_ASSET_BASE}/se_recovery.mp3`);
    ObstacleManager.preload(this);
    PickupManager.preload(this);
  }

  create() {
    this.cameras.main.setBackgroundColor("#05070f");
    this.resizeWorld();
    this.scene.launch("UIScene");
    this.createBackground();
    this.createPlayer();
    ObstacleManager.prepareTextures(this);
    this.createObstacles();
    this.createPickups();
    this.createInput();
    this.createEvents();
    this.createLifecycleEvents();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.prepareGame();
  }

  update(_time: number, delta: number) {
    if (this.state.phase !== "playing" || !this.player || !this.obstacleManager || !this.pickupManager) {
      return;
    }

    this.updatePlayer(delta);
    this.obstacleManager.update(delta, this.state.score);
    this.pickupManager.update(delta, {
      score: this.state.score
    });
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

  private createPickups() {
    this.pickupManager = new PickupManager(this, {
      getGameWidth: () => this.gameWidth,
      getGameHeight: () => this.gameHeight,
      getScreenScale: () => this.screenScale,
      getPlayerX: () => this.player?.x ?? this.gameWidth / 2
    });

    this.physics.add.overlap(this.player!, this.pickupManager.group, (_player, pickup) => {
      this.collectPickup(pickup as Phaser.Physics.Arcade.Sprite);
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
    this.eventDisposers.push(
      gameEvents.on("audio:settings-changed", (settings) => this.applyAudioSettings(settings)),
      gameEvents.on("ui:start-sound", () => this.playStartSound()),
      gameEvents.on("ui:start", () => this.startGame()),
      gameEvents.on("ui:restart", () => this.startGame())
    );
  }

  private createLifecycleEvents() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupScene, this);

    if (typeof window === "undefined" || this.didRegisterPageLifecycle) {
      return;
    }

    window.addEventListener("pagehide", this.handlePageHide);
    window.addEventListener("beforeunload", this.handlePageHide);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.didRegisterPageLifecycle = true;
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
    this.pickupManager?.reset();

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
    this.queueBgmStart();
    this.state.score = 0;
    this.state.hp = this.state.maxHp;
    this.scoreTimer = 0;
    this.targetX = this.gameWidth / 2;
    this.touchDirection = 0;
    this.hideHoldTouchEffect();
    this.resetHitStop();
    this.obstacleManager?.reset(START_OBSTACLE_DELAY_MS);
    this.pickupManager?.reset(START_OBSTACLE_DELAY_MS + 1400);

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
    this.playHitSound();
    gameEvents.emit("health:changed", {
      hp: this.state.hp,
      maxHp: this.state.maxHp
    });

    this.playDamageFeedback(hitX, hitY);

    if (this.state.hp <= 0) {
      void this.gameOver();
    }
  }

  private collectPickup(pickup: Phaser.Physics.Arcade.Sprite) {
    if (this.state.phase !== "playing" || !pickup.active) {
      return;
    }

    const pickupX = pickup.x;
    const pickupY = pickup.y;
    this.pickupManager?.collect(pickup);
    this.playHealSound();
    this.playPickupCollectFeedback(pickupX, pickupY);

    const healAmount = Math.min(HEAL_AMOUNT, this.state.maxHp - this.state.hp);
    if (healAmount > 0) {
      this.state.hp += healAmount;
      gameEvents.emit("health:changed", {
        hp: this.state.hp,
        maxHp: this.state.maxHp
      });
    } else {
      this.state.score += FULL_HP_PICKUP_SCORE;
      this.state.bestScore = Math.max(this.state.bestScore, this.state.score);
      gameEvents.emit("score:changed", {
        score: this.state.score,
        bestScore: this.state.bestScore
      });
    }

    gameEvents.emit("pickup:healed", {
      hp: this.state.hp,
      maxHp: this.state.maxHp,
      amount: healAmount
    });
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

  private playPickupCollectFeedback(x: number, y: number) {
    this.spawnPickupBurstParticles(x, y);
    this.spawnPickupHudParticles(x, y);
    this.cameras.main.flash(90, 120, 255, 120, false);
  }

  private spawnPickupBurstParticles(x: number, y: number) {
    const particleCount = 13;

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount + Phaser.Math.FloatBetween(-0.18, 0.18);
      const distance = Phaser.Math.Between(20, 72) * this.screenScale;
      const size = Phaser.Math.FloatBetween(2.2, 5.4) * this.screenScale;
      const color = index % 4 === 0 ? 0xd8ff22 : index % 4 === 1 ? 0x8eff4a : index % 4 === 2 ? 0x22d7ff : 0xffffff;
      const particle = this.add
        .circle(x, y, size, color, 0.88)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(34);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: { from: 1, to: 0.22 },
        duration: Phaser.Math.Between(210, 390),
        ease: "Sine.easeOut",
        onComplete: () => particle.destroy()
      });
    }
  }

  private spawnPickupHudParticles(x: number, y: number) {
    const target = this.getHpHudWorldPoint();
    const particleCount = 7;

    for (let index = 0; index < particleCount; index += 1) {
      const startX = x + Phaser.Math.FloatBetween(-10, 10) * this.screenScale;
      const startY = y + Phaser.Math.FloatBetween(-10, 10) * this.screenScale;
      const particle = this.add
        .circle(startX, startY, Phaser.Math.FloatBetween(2.4, 4.2) * this.screenScale, 0xd8ff22, 0.86)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(35);

      this.tweens.add({
        targets: particle,
        x: target.x + Phaser.Math.FloatBetween(-34, 34) * this.screenScale,
        y: target.y + Phaser.Math.FloatBetween(-8, 8) * this.screenScale,
        alpha: { from: 0.92, to: 0 },
        scale: { from: 1, to: 0.5 },
        delay: index * 28,
        duration: 440 + index * 18,
        ease: "Sine.easeInOut",
        onComplete: () => particle.destroy()
      });
    }
  }

  private getHpHudWorldPoint() {
    const scale = this.screenScale;
    const compact = this.gameWidth < 700;
    const margin = 28 * scale;
    const panelHeight = 92 * scale;

    return {
      x: this.gameWidth / 2,
      y: compact ? margin + panelHeight + 34 * scale : 42 * scale
    };
  }

  private playHitSound() {
    if (!this.audioSettings.seEnabled) {
      return;
    }

    const now = this.time.now;
    if (now - this.lastHitSoundAt < 140) {
      return;
    }

    this.lastHitSoundAt = now;
    this.sound.play(HIT_SE_KEY, { volume: 0.62 });
  }

  private playHealSound() {
    if (!this.audioSettings.seEnabled) {
      return;
    }

    this.sound.play(HEAL_SE_KEY, { volume: 0.62 });
  }

  private playStartSound() {
    if (!this.audioSettings.seEnabled) {
      return;
    }

    this.sound.play(START_SE_KEY, { volume: 0.68 });
  }

  private queueBgmStart() {
    this.bgmStartEvent?.remove(false);

    if (!this.audioSettings.bgmEnabled) {
      return;
    }

    if (this.bgm?.isPlaying) {
      this.bgm.setVolume(0.42);
      return;
    }

    this.bgmStartEvent = this.time.delayedCall(BGM_START_DELAY_MS, () => {
      this.playBgm();
      this.bgmStartEvent = undefined;
    });
  }

  private async gameOver() {
    if (this.state.phase === "gameOver") {
      return;
    }

    this.state.phase = "gameOver";
    this.duckBgmForGameOver();
    this.touchDirection = 0;
    this.hideHoldTouchEffect();
    this.resetHitStop();
    this.player?.setVelocity(0, 0);
    this.player?.setAlpha(0.55);
    this.obstacleManager?.pause();
    this.pickupManager?.pause();
    this.state.bestScore = Math.max(this.state.bestScore, this.state.score);

    gameEvents.emit("game:over", {
      score: this.state.score,
      bestScore: this.state.bestScore
    });

    await gameServices.leaderboard.submitScore(this.state.score);
  }

  private playBgm() {
    if (!this.audioSettings.bgmEnabled) {
      return;
    }

    if (!this.sound.locked && !this.bgm) {
      this.bgm = this.sound.add(BGM_MAIN_KEY, {
        loop: true,
        volume: 0.42
      }) as LoopingBgm;
    }

    if (!this.bgm) {
      return;
    }

    if (!this.bgm.isPlaying) {
      this.bgm.play();
    }

    this.tweens.addCounter({
      from: this.bgm.volume,
      to: 0.42,
      duration: 420,
      ease: "Sine.easeOut",
      onUpdate: (tween) => {
        this.bgm?.setVolume(tween.getValue() ?? 0.42);
      }
    });
  }

  private duckBgmForGameOver() {
    if (!this.audioSettings.bgmEnabled || !this.bgm) {
      return;
    }

    this.tweens.addCounter({
      from: this.bgm.volume,
      to: 0.24,
      duration: 520,
      ease: "Sine.easeOut",
      onUpdate: (tween) => {
        this.bgm?.setVolume(tween.getValue() ?? 0.24);
      }
    });
  }

  private applyAudioSettings(settings: AudioSettings) {
    this.audioSettings = settings;

    if (!settings.bgmEnabled) {
      this.bgmStartEvent?.remove(false);
      this.bgmStartEvent = undefined;
      this.bgm?.pause();
      return;
    }

    if (this.state.phase === "playing") {
      this.playBgm();
      return;
    }

    if (this.state.phase === "gameOver") {
      if (!this.sound.locked && !this.bgm) {
        this.bgm = this.sound.add(BGM_MAIN_KEY, {
          loop: true,
          volume: 0.24
        }) as LoopingBgm;
      }

      if (!this.bgm) {
        return;
      }

      if (!this.bgm.isPlaying) {
        this.bgm.play();
      }

      this.bgm.setVolume(0.24);
    }
  }

  private readonly handlePageHide = () => {
    this.stopAudio();
  };

  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      this.stopAudio();
    }
  };

  private cleanupScene() {
    if (this.didCleanup) {
      return;
    }

    this.didCleanup = true;
    this.stopAudio();
    this.resetHitStop();
    this.hideHoldTouchEffect();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.eventDisposers.forEach((dispose) => dispose());
    this.eventDisposers = [];

    if (typeof window !== "undefined" && this.didRegisterPageLifecycle) {
      window.removeEventListener("pagehide", this.handlePageHide);
      window.removeEventListener("beforeunload", this.handlePageHide);
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      this.didRegisterPageLifecycle = false;
    }
  }

  private stopAudio() {
    this.bgmStartEvent?.remove(false);
    this.bgmStartEvent = undefined;

    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = undefined;
    }

    this.sound.stopAll();
  }
}
