import * as Phaser from "phaser";
import { ASSET_BASE } from "@/game/config/assets";
import { gameEvents } from "@/game/systems/GameEvents";
import { gameServices } from "@/game/systems/GameServices";
import type { RuntimeGameState, SpawnConfig } from "@/game/types/GameState";

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;

export class GameScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private enemies?: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private targetX = WORLD_WIDTH / 2;
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
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.scene.launch("UIScene");
    this.createBackground();
    this.createPlayer();
    this.createEnemies();
    this.createInput();
    this.createEvents();
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

  private createBackground() {
    this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "sky").setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);

    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "farBackground")
      .setOrigin(0)
      .setTileScale(WORLD_WIDTH / 1774, WORLD_HEIGHT / 887)
      .setScrollFactor(0.25);

    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "buildings")
      .setOrigin(0)
      .setTileScale(WORLD_WIDTH / 1774, WORLD_HEIGHT / 887)
      .setScrollFactor(0.55);

    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "foreground")
      .setOrigin(0)
      .setTileScale(WORLD_WIDTH / 1774, WORLD_HEIGHT / 887)
      .setDepth(5);
  }

  private createPlayer() {
    this.anims.create({
      key: "girl-walk",
      frames: this.anims.generateFrameNumbers("girlWalk", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT - 72, "girlWalk", 0);
    this.player.setDepth(8);
    this.player.setScale(2);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(16, 24, true);
    this.player.play("girl-walk");
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

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.state.phase !== "playing") {
        return;
      }

      if (!pointer.wasTouch) {
        return;
      }

      this.targetX = Phaser.Math.Clamp(pointer.x, 32, WORLD_WIDTH - 32);
    });
  }

  private createEvents() {
    gameEvents.on("ui:start", () => this.startGame());
    gameEvents.on("ui:restart", () => this.startGame());
  }

  private updatePlayer(delta: number) {
    if (!this.player) {
      return;
    }

    const distance = this.targetX - this.player.x;
    const keyDirection = this.getKeyboardDirection();
    const step = 520 * (delta / 1000);

    if (keyDirection !== 0) {
      const nextX = this.player.x + keyDirection * step;
      this.player.x = Phaser.Math.Clamp(nextX, 32, WORLD_WIDTH - 32);
      this.targetX = this.player.x;
      this.player.setFlipX(keyDirection < 0);
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

  private updateEnemies() {
    this.enemies?.children.each((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (enemy.y > WORLD_HEIGHT + 48) {
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

    const x = Phaser.Math.Between(36, WORLD_WIDTH - 36);
    const enemy = this.enemies.create(x, -96, "fallingObstacle") as Phaser.Physics.Arcade.Sprite;
    const speed = Math.min(
      this.spawnConfig.speedMax,
      this.spawnConfig.speedStart + this.state.score * this.spawnConfig.difficultyRamp * 100
    );

    enemy.setDepth(7);
    enemy.setDisplaySize(28, 92);
    enemy.setVelocityY(speed);
    enemy.setAngularVelocity(Phaser.Math.Between(-24, 24));
    enemy.body?.setSize(16, 68, true);
  }

  private prepareGame() {
    this.state.phase = "ready";
    this.state.score = 0;
    this.state.hp = this.state.maxHp;
    this.scoreTimer = 0;
    this.spawnTimer = this.spawnConfig.initialDelayMs;
    this.targetX = WORLD_WIDTH / 2;
    this.enemies?.clear(true, true);

    if (this.player) {
      this.player.enableBody(true, WORLD_WIDTH / 2, WORLD_HEIGHT - 72, true, true);
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
    this.targetX = WORLD_WIDTH / 2;
    this.enemies?.clear(true, true);

    if (this.player) {
      this.player.enableBody(true, WORLD_WIDTH / 2, WORLD_HEIGHT - 72, true, true);
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
