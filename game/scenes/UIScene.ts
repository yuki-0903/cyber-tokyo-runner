import * as Phaser from "phaser";
import {
  gameEvents,
  type GameOverPayload,
  type HealthPayload,
  type ScorePayload
} from "@/game/systems/GameEvents";
import { UI_ASSET_BASE } from "@/game/config/assets";
import { UIManager } from "@/game/ui/UIManager";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

export class UIScene extends Phaser.Scene {
  private ui?: UIManager;
  private scoreText?: Phaser.GameObjects.Text;
  private bestText?: Phaser.GameObjects.Text;
  private hpFill?: Phaser.GameObjects.Image;
  private titleLayer?: Phaser.GameObjects.Container;
  private gameOverLayer?: Phaser.GameObjects.Container;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private readonly hpFillWidth = 352;

  constructor() {
    super("UIScene");
  }

  preload() {
    this.load.image("uiButtonStart", `${UI_ASSET_BASE}/button_start.png`);
    this.load.image("uiButtonRetry", `${UI_ASSET_BASE}/button_retry.png`);
    this.load.image("uiPanelScore", `${UI_ASSET_BASE}/panel_score.png`);
    this.load.image("uiHpBarFrame", `${UI_ASSET_BASE}/hp_bar_frame.png`);
    this.load.image("uiHpBarFill", `${UI_ASSET_BASE}/hp_bar_fill.png`);
    this.load.image("uiPopupFrame", `${UI_ASSET_BASE}/popup_frame.png`);
  }

  create() {
    this.ui = new UIManager(this);
    this.cameras.main.setScroll(0, 0);
    this.createKeyboardShortcuts();
    this.createHud();
    this.createTitle();
    this.registerEvents();
  }

  private createHud() {
    if (!this.ui) {
      return;
    }

    this.ui.createImage("uiPanelScore", 102, 54, 190, 74, 90);
    this.ui.createLabel("SCORE", 48, 34, 12, 101, [0, 0.5]);
    this.scoreText = this.ui.createLabel("0", 48, 58, 25, 101, [0, 0.5]);

    this.ui.createImage("uiPanelScore", GAME_WIDTH - 102, 54, 190, 74, 90);
    this.ui.createLabel("BEST", GAME_WIDTH - 156, 34, 12, 101, [0, 0.5]);
    this.bestText = this.ui.createLabel("0", GAME_WIDTH - 156, 58, 25, 101, [0, 0.5]);

    this.hpFill = this.add
      .image(GAME_WIDTH / 2, 42, "uiHpBarFill")
      .setDisplaySize(this.hpFillWidth, 18)
      .setScrollFactor(0)
      .setDepth(96);
    this.hpFill.setOrigin(0, 0.5);
    this.hpFill.setPosition(GAME_WIDTH / 2 - this.hpFillWidth / 2, 42);

    this.ui.createImage("uiHpBarFrame", GAME_WIDTH / 2, 42, 384, 40, 97);
  }

  private createTitle() {
    if (!this.ui) {
      return;
    }

    this.titleLayer?.destroy(true);
    this.titleLayer = this.add.container(0, 0).setDepth(130).setScrollFactor(0);

    const title = this.ui.createLabel("CYBER TOKYO RUNNER", GAME_WIDTH / 2, 190, 34, 131);
    const hint = this.ui.createLabel("SPACE TO START / ARROW KEYS", GAME_WIDTH / 2, 238, 16, 131);
    const button = this.ui.createButton({
      key: "uiButtonStart",
      label: "START",
      x: GAME_WIDTH / 2,
      y: 322,
      width: 360,
      height: 96,
      onClick: () => this.startFromTitle()
    });

    this.titleLayer.add([title, hint, button]);
  }

  private createKeyboardShortcuts() {
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey?.on("down", () => {
      if (!this.titleLayer || this.gameOverLayer) {
        return;
      }

      this.startFromTitle();
    });
  }

  private startFromTitle() {
    if (!this.titleLayer) {
      return;
    }

    this.hideTitle();
    gameEvents.emit("ui:start");
  }

  private showGameOver(payload: GameOverPayload) {
    if (!this.ui) {
      return;
    }

    this.gameOverLayer?.destroy(true);
    this.gameOverLayer = this.add.container(0, 0).setDepth(140).setScrollFactor(0);

    const popup = this.ui.createImage("uiPopupFrame", GAME_WIDTH / 2, 260, 620, 155, 140);
    const title = this.ui.createLabel("GAME OVER", GAME_WIDTH / 2, 238, 30, 141);
    const score = this.ui.createLabel(`SCORE ${payload.score}`, GAME_WIDTH / 2, 280, 18, 141);
    const button = this.ui.createButton({
      key: "uiButtonRetry",
      label: "RETRY",
      x: GAME_WIDTH / 2,
      y: 348,
      width: 300,
      height: 80,
      onClick: () => {
        this.hideGameOver();
        gameEvents.emit("ui:restart");
      }
    });

    this.gameOverLayer.add([popup, title, score, button]);
    this.tweens.add({
      targets: this.gameOverLayer,
      alpha: { from: 0, to: 1 },
      y: { from: 16, to: 0 },
      duration: 260,
      ease: "Sine.easeOut"
    });
  }

  private hideTitle() {
    if (!this.titleLayer) {
      return;
    }

    this.tweens.add({
      targets: this.titleLayer,
      alpha: 0,
      y: -16,
      duration: 180,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.titleLayer?.destroy(true);
        this.titleLayer = undefined;
      }
    });
  }

  private hideGameOver() {
    this.gameOverLayer?.destroy(true);
    this.gameOverLayer = undefined;
  }

  private updateScore(payload: ScorePayload) {
    this.scoreText?.setText(String(payload.score));
    this.bestText?.setText(String(payload.bestScore));

    if (this.scoreText) {
      this.tweens.add({
        targets: this.scoreText,
        scale: { from: 1.16, to: 1 },
        duration: 130,
        ease: "Sine.easeOut"
      });
    }
  }

  private updateHealth(payload: HealthPayload) {
    if (!this.hpFill) {
      return;
    }

    const ratio = Phaser.Math.Clamp(payload.hp / payload.maxHp, 0, 1);
    this.tweens.add({
      targets: this.hpFill,
      displayWidth: Math.max(1, this.hpFillWidth * ratio),
      duration: 160,
      ease: "Sine.easeOut"
    });
  }

  private registerEvents() {
    gameEvents.on("score:changed", (payload) => this.updateScore(payload));
    gameEvents.on("health:changed", (payload) => this.updateHealth(payload));
    gameEvents.on("game:over", (payload) => this.showGameOver(payload));
    gameEvents.on("game:restart", () => {
      this.hideGameOver();
    });
  }
}
