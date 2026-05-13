import * as Phaser from "phaser";
import {
  gameEvents,
  type GameOverPayload,
  type HealthPayload,
  type ScorePayload
} from "@/game/systems/GameEvents";
import { UI_ASSET_BASE } from "@/game/config/assets";
import { UIManager } from "@/game/ui/UIManager";

const BASE_GAME_WIDTH = 960;
const BASE_GAME_HEIGHT = 540;

export class UIScene extends Phaser.Scene {
  private ui?: UIManager;
  private hudLayer?: Phaser.GameObjects.Container;
  private scoreText?: Phaser.GameObjects.Text;
  private bestText?: Phaser.GameObjects.Text;
  private hpFill?: Phaser.GameObjects.Image;
  private titleLayer?: Phaser.GameObjects.Container;
  private gameOverLayer?: Phaser.GameObjects.Container;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private hpFillWidth = 352;
  private currentScore = 0;
  private currentBestScore = 0;
  private currentHp = 100;
  private currentMaxHp = 100;
  private isTitleVisible = false;
  private lastGameOverPayload?: GameOverPayload;

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
    this.configureCamera();
    this.createKeyboardShortcuts();
    this.createHud();
    this.createTitle();
    this.registerEvents();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  private createHud() {
    if (!this.ui) {
      return;
    }

    this.hudLayer?.destroy(true);
    this.hudLayer = this.add.container(0, 0).setDepth(90).setScrollFactor(0);

    const width = this.gameWidth;
    const scale = this.uiScale;
    const compact = width < 700;
    const margin = 28 * scale;
    const panelWidth = 190 * scale;
    const panelHeight = 74 * scale;
    const panelY = margin + panelHeight / 2;
    const labelInset = 54 * scale;
    const labelSize = 12 * scale;
    const valueSize = 25 * scale;
    const labelY = panelY - 14 * scale;
    const valueY = panelY + 8 * scale;
    const scorePanelX = margin + panelWidth / 2;
    const bestPanelX = width - margin - panelWidth / 2;
    const hpY = compact ? margin + panelHeight + 34 * scale : 42 * scale;
    const availableHudWidth = Math.max(1, width - margin * 2);
    const hpFrameWidth = compact
      ? Math.min(384 * scale, Math.max(180 * scale, availableHudWidth))
      : Math.min(384 * scale, Math.max(280 * scale, width * 0.4));
    const hpFrameHeight = 40 * scale;
    const hpFillHeight = 18 * scale;

    this.hpFillWidth = Math.max(1, hpFrameWidth - 32 * scale);

    const scorePanel = this.ui.createImage(
      "uiPanelScore",
      scorePanelX,
      panelY,
      panelWidth,
      panelHeight,
      90
    );
    const scoreLabel = this.ui.createLabel(
      "SCORE",
      scorePanelX - panelWidth / 2 + labelInset,
      labelY,
      labelSize,
      101,
      [0, 0.5]
    );
    this.scoreText = this.ui.createLabel(
      String(this.currentScore),
      scorePanelX - panelWidth / 2 + labelInset,
      valueY,
      valueSize,
      101,
      [0, 0.5]
    );

    const bestPanel = this.ui.createImage(
      "uiPanelScore",
      bestPanelX,
      panelY,
      panelWidth,
      panelHeight,
      90
    );
    const bestLabel = this.ui.createLabel(
      "BEST",
      bestPanelX - panelWidth / 2 + labelInset,
      labelY,
      labelSize,
      101,
      [0, 0.5]
    );
    this.bestText = this.ui.createLabel(
      String(this.currentBestScore),
      bestPanelX - panelWidth / 2 + labelInset,
      valueY,
      valueSize,
      101,
      [0, 0.5]
    );

    this.hpFill = this.add
      .image(width / 2 - this.hpFillWidth / 2, hpY, "uiHpBarFill")
      .setDisplaySize(this.hpFillDisplayWidth, hpFillHeight)
      .setScrollFactor(0)
      .setDepth(96);
    this.hpFill.setOrigin(0, 0.5);

    const hpFrame = this.ui.createImage("uiHpBarFrame", width / 2, hpY, hpFrameWidth, hpFrameHeight, 97);

    this.hudLayer.add([
      scorePanel,
      scoreLabel,
      this.scoreText,
      bestPanel,
      bestLabel,
      this.bestText,
      this.hpFill,
      hpFrame
    ]);
  }

  private createTitle() {
    if (!this.ui) {
      return;
    }

    this.titleLayer?.destroy(true);
    this.titleLayer = this.add.container(0, 0).setDepth(130).setScrollFactor(0);
    this.isTitleVisible = true;

    const width = this.gameWidth;
    const height = this.gameHeight;
    const scale = this.uiScale;
    const titleSize = 34 * scale;
    const hintSize = 16 * scale;
    const buttonWidth = 360 * scale;
    const buttonHeight = 96 * scale;
    const centerX = width / 2;
    const titleY = Phaser.Math.Clamp(height * 0.35, 120 * scale, 210 * scale);
    const hintY = titleY + 48 * scale;
    const buttonY = Phaser.Math.Clamp(height * 0.6, hintY + 74 * scale, height - 88 * scale);

    const title = this.ui.createLabel("CYBER TOKYO RUNNER", centerX, titleY, titleSize, 131);
    const hint = this.ui.createLabel("SPACE TO START / ARROW KEYS", centerX, hintY, hintSize, 131);
    const button = this.ui.createButton({
      key: "uiButtonStart",
      label: "START",
      x: centerX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      labelSize: 30 * scale,
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

    this.tryMobileFullscreen();
    this.hideTitle();
    gameEvents.emit("ui:start");
  }

  private tryMobileFullscreen() {
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

    if (!isTouchDevice || !this.scale.fullscreen.available || this.scale.isFullscreen) {
      return;
    }

    this.scale.startFullscreen();
  }

  private showGameOver(payload: GameOverPayload) {
    if (!this.ui) {
      return;
    }

    this.lastGameOverPayload = payload;
    this.gameOverLayer?.destroy(true);
    this.gameOverLayer = this.add.container(0, 0).setDepth(140).setScrollFactor(0);

    const width = this.gameWidth;
    const height = this.gameHeight;
    const scale = this.uiScale;
    const centerX = width / 2;
    const centerY = height / 2;
    const availablePopupWidth = Math.max(1, width - 32 * scale);
    const popupWidth = Math.min(620 * scale, Math.max(280 * scale, Math.min(width * 0.72, availablePopupWidth)));
    const popupHeight = 155 * scale;
    const buttonWidth = Math.min(300 * scale, Math.max(220 * scale, Math.min(width * 0.34, availablePopupWidth)));
    const buttonHeight = 80 * scale;

    const popup = this.ui.createImage("uiPopupFrame", centerX, centerY - 8, popupWidth, popupHeight, 140);
    const title = this.ui.createLabel("GAME OVER", centerX, centerY - 30 * scale, 30 * scale, 141);
    const score = this.ui.createLabel(`SCORE ${payload.score}`, centerX, centerY + 14 * scale, 18 * scale, 141);
    const button = this.ui.createButton({
      key: "uiButtonRetry",
      label: "RETRY",
      x: centerX,
      y: centerY + popupHeight / 2 + 52 * scale,
      width: buttonWidth,
      height: buttonHeight,
      labelSize: 30 * scale,
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

    this.isTitleVisible = false;
    this.tweens.add({
      targets: this.titleLayer,
      alpha: 0,
      y: -16,
      duration: 180,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.titleLayer?.destroy(true);
        this.titleLayer = undefined;
        this.isTitleVisible = false;
      }
    });
  }

  private hideGameOver() {
    this.gameOverLayer?.destroy(true);
    this.gameOverLayer = undefined;
    this.lastGameOverPayload = undefined;
  }

  private updateScore(payload: ScorePayload) {
    this.currentScore = payload.score;
    this.currentBestScore = payload.bestScore;
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
    this.currentHp = payload.hp;
    this.currentMaxHp = payload.maxHp;

    if (!this.hpFill) {
      return;
    }

    this.tweens.add({
      targets: this.hpFill,
      displayWidth: this.hpFillDisplayWidth,
      duration: 160,
      ease: "Sine.easeOut"
    });
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

  private get uiScale() {
    return Phaser.Math.Clamp(
      Math.min(this.gameWidth / BASE_GAME_WIDTH, this.gameHeight / BASE_GAME_HEIGHT),
      0.62,
      1.45
    );
  }

  private get hpFillDisplayWidth() {
    const ratio = Phaser.Math.Clamp(this.currentHp / this.currentMaxHp, 0, 1);
    return Math.max(1, this.hpFillWidth * ratio);
  }

  private handleResize() {
    this.configureCamera();
    this.createHud();

    if (this.isTitleVisible) {
      this.createTitle();
    }

    if (this.lastGameOverPayload) {
      this.showGameOver(this.lastGameOverPayload);
    }
  }

  private configureCamera() {
    const camera = this.cameras.main;
    camera.setViewport(0, 0, this.scale.width, this.scale.height);
    camera.setBounds(0, 0, this.gameWidth, this.gameHeight);
    camera.setScroll(0, 0);

    if (this.isRotatedTouchView()) {
      camera.setRotation(Math.PI / 2);
      camera.centerOn(this.gameWidth / 2, this.gameHeight / 2);
      return;
    }

    camera.setRotation(0);
    camera.centerOn(this.gameWidth / 2, this.gameHeight / 2);
  }

  private isRotatedTouchView() {
    if (typeof window === "undefined") {
      return false;
    }

    const isPortraitWindow = window.matchMedia("(orientation: portrait)").matches;
    const isTouchPrimary = window.matchMedia("(pointer: coarse)").matches;

    return isPortraitWindow && (isTouchPrimary || navigator.maxTouchPoints > 0);
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
