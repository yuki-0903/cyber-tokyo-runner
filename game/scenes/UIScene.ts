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
const HP_FILL_BASE_KEY = "uiHpBarFill";
const HP_FILL_HEALTHY_KEY = "uiHpBarFillHealthy";
const HP_FILL_WARNING_KEY = "uiHpBarFillWarning";
const HP_FILL_DANGER_KEY = "uiHpBarFillDanger";
const HP_FILL_EMPTY_KEY = "uiHpBarFillEmpty";
const HP_FRAME_BASE_KEY = "uiHpBarFrame";
const HP_FRAME_HEALTHY_KEY = "uiHpBarFrameHealthy";
const HP_FRAME_WARNING_KEY = "uiHpBarFrameWarning";
const HP_FRAME_DANGER_KEY = "uiHpBarFrameDanger";
const HP_SCAN_KEY = "uiHpBarScan";

const HP_FILL_VARIANTS = [
  { key: HP_FILL_HEALTHY_KEY, color: { red: 0x00, green: 0xd8, blue: 0xff } },
  { key: HP_FILL_WARNING_KEY, color: { red: 0xff, green: 0xc4, blue: 0x00 } },
  { key: HP_FILL_DANGER_KEY, color: { red: 0xff, green: 0x12, blue: 0x24 } }
] as const;

const HP_FRAME_VARIANTS = [
  { key: HP_FRAME_HEALTHY_KEY, color: { red: 0x00, green: 0x86, blue: 0xd8 } },
  { key: HP_FRAME_WARNING_KEY, color: { red: 0xd8, green: 0xa8, blue: 0x10 } },
  { key: HP_FRAME_DANGER_KEY, color: { red: 0xd8, green: 0x20, blue: 0x30 } }
] as const;

const HP_EMPTY_VARIANTS = [
  { key: HP_FILL_EMPTY_KEY, color: { red: 0x28, green: 0x00, blue: 0x34 } }
] as const;

export class UIScene extends Phaser.Scene {
  private ui?: UIManager;
  private hudLayer?: Phaser.GameObjects.Container;
  private scoreText?: Phaser.GameObjects.Text;
  private bestText?: Phaser.GameObjects.Text;
  private bestPanel?: Phaser.GameObjects.Image;
  private bestPanelBounds?: { x: number; y: number; width: number; height: number };
  private hpEmptyFill?: Phaser.GameObjects.Image;
  private hpFill?: Phaser.GameObjects.Image;
  private hpFrame?: Phaser.GameObjects.Image;
  private titleLayer?: Phaser.GameObjects.Container;
  private gameOverLayer?: Phaser.GameObjects.Container;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private hpFillWidth = 352;
  private hpFillX = 0;
  private hpFillY = 0;
  private currentScore = 0;
  private currentBestScore = 0;
  private currentHp = 100;
  private currentMaxHp = 100;
  private isTitleVisible = false;
  private hasPlayedBestUpdateEffect = false;
  private lastGameOverPayload?: GameOverPayload;

  constructor() {
    super("UIScene");
  }

  preload() {
    this.load.image("uiButtonStart", `${UI_ASSET_BASE}/button_start.png`);
    this.load.image("uiButtonRetry", `${UI_ASSET_BASE}/button_retry.png`);
    this.load.image("uiPanelScore", `${UI_ASSET_BASE}/panel_score.png`);
    this.load.image(HP_FRAME_BASE_KEY, `${UI_ASSET_BASE}/hp_bar_frame.png`);
    this.load.image("uiHpBarFill", `${UI_ASSET_BASE}/hp_bar_fill.png`);
    this.load.image("uiPopupFrame", `${UI_ASSET_BASE}/popup_frame.png`);
  }

  create() {
    this.ui = new UIManager(this);
    this.configureCamera();
    this.createHpBarVariants();
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
    const panelHeight = 92 * scale;
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
    const hpFillHeight = 28 * scale;

    this.hpFillWidth = Math.max(1, hpFrameWidth - 24 * scale);
    this.hpFillX = width / 2 - this.hpFillWidth / 2;
    this.hpFillY = hpY;

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
    this.bestPanel = bestPanel;
    this.bestPanelBounds = {
      x: bestPanelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight
    };
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

    this.hpEmptyFill = this.add
      .image(this.hpFillX, hpY, HP_FILL_EMPTY_KEY)
      .setDisplaySize(this.hpFillWidth, hpFillHeight)
      .setScrollFactor(0)
      .setDepth(95)
      .setAlpha(0.68);
    this.hpEmptyFill.setOrigin(0, 0.5);

    this.hpFill = this.add
      .image(this.hpFillX, hpY, this.hpFillTextureKey)
      .setDisplaySize(this.hpFillDisplayWidth, hpFillHeight)
      .setScrollFactor(0)
      .setDepth(96);
    this.hpFill.setOrigin(0, 0.5);

    this.hpFrame = this.ui
      .createImage(this.hpFrameTextureKey, width / 2, hpY, hpFrameWidth, hpFrameHeight, 97)
      .setAlpha(0.82);
    this.refreshHpBarAppearance();

    this.hudLayer.add([
      scorePanel,
      scoreLabel,
      this.scoreText,
      bestPanel,
      bestLabel,
      this.bestText,
      this.hpEmptyFill,
      this.hpFill,
      this.hpFrame
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
    this.playTitleStartupIntro(title, hint, button, buttonWidth, buttonY);
  }

  private playTitleStartupIntro(
    title: Phaser.GameObjects.Text,
    hint: Phaser.GameObjects.Text,
    button: Phaser.GameObjects.Container,
    buttonWidth: number,
    buttonY: number
  ) {
    const hudItems = this.hudLayer?.getAll() ?? [];

    hudItems.forEach((item, index) => {
      const gameObject = item as Phaser.GameObjects.GameObject & {
        alpha?: number;
        y?: number;
        setAlpha?: (value: number) => typeof item;
      };

      if (!gameObject.setAlpha || typeof gameObject.y !== "number") {
        return;
      }

      this.tweens.killTweensOf(gameObject);
      const targetY = gameObject.y;
      gameObject.setAlpha(0);
      gameObject.y = targetY - 6 * this.uiScale;

      this.tweens.add({
        targets: gameObject,
        alpha: 1,
        y: targetY,
        delay: 90 + index * 34,
        duration: 260,
        ease: "Sine.easeOut"
      });
    });

    this.tweens.killTweensOf([title, hint, button]);
    title.setAlpha(0);
    hint.setAlpha(0);
    button.setAlpha(0);
    button.setScale(0.98);
    button.y = buttonY + 12 * this.uiScale;

    this.time.delayedCall(360, () => title.setAlpha(0.42));
    this.time.delayedCall(440, () => title.setAlpha(0));
    this.time.delayedCall(540, () => title.setAlpha(0.78));
    this.time.delayedCall(620, () => title.setAlpha(0.22));

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 180,
      delay: 720,
      ease: "Sine.easeOut"
    });

    this.tweens.add({
      targets: hint,
      alpha: 1,
      delay: 980,
      duration: 260,
      ease: "Sine.easeOut"
    });

    this.tweens.add({
      targets: button,
      alpha: 1,
      y: buttonY,
      scale: 1,
      delay: 1120,
      duration: 340,
      ease: "Back.easeOut",
      onComplete: () => this.playStartButtonReadyEffect(button, buttonWidth)
    });
  }

  private playStartButtonReadyEffect(button: Phaser.GameObjects.Container, buttonWidth: number) {
    const scan = this.add
      .image(-buttonWidth * 0.4, 0, HP_SCAN_KEY)
      .setDisplaySize(120 * this.uiScale, 72 * this.uiScale)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD);

    button.add(scan);

    this.tweens.add({
      targets: scan,
      x: buttonWidth * 0.4,
      alpha: { from: 0.9, to: 0 },
      duration: 560,
      ease: "Sine.easeOut",
      onComplete: () => scan.destroy()
    });

    this.tweens.add({
      targets: button,
      scale: { from: 1, to: 1.025 },
      yoyo: true,
      duration: 170,
      ease: "Sine.easeOut"
    });
  }

  private createKeyboardShortcuts() {
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey?.on("down", () => {
      if (this.gameOverLayer) {
        this.restartFromGameOver();
        return;
      }

      if (!this.titleLayer || this.gameOverLayer) {
        return;
      }

      this.startFromTitle();
    });

    this.enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.enterKey?.on("down", () => {
      if (this.gameOverLayer) {
        this.restartFromGameOver();
      }
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

  private restartFromGameOver() {
    if (!this.gameOverLayer) {
      return;
    }

    this.hideGameOver();
    gameEvents.emit("ui:restart");
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
      onClick: () => this.restartFromGameOver()
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
    const didUpdateBest = !this.hasPlayedBestUpdateEffect && payload.bestScore > this.currentBestScore;

    this.currentScore = payload.score;
    this.currentBestScore = payload.bestScore;
    this.scoreText?.setText(String(payload.score));
    this.bestText?.setText(String(payload.bestScore));

    if (didUpdateBest && payload.bestScore > 0) {
      this.hasPlayedBestUpdateEffect = true;
      this.playBestUpdateEffect();
    }
  }

  private playBestUpdateEffect() {
    if (!this.hudLayer || !this.bestPanel || !this.bestText || !this.bestPanelBounds) {
      return;
    }

    const { x, y, width, height } = this.bestPanelBounds;

    this.tweens.killTweensOf([this.bestPanel, this.bestText]);
    this.bestPanel.setAlpha(1);
    this.bestText.setAlpha(1);

    const scan = this.add
      .image(x - width * 0.42, y, HP_SCAN_KEY)
      .setDisplaySize(78 * this.uiScale, height * 0.86)
      .setScrollFactor(0)
      .setDepth(103)
      .setAlpha(0.72)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.hudLayer.add(scan);

    this.tweens.add({
      targets: scan,
      x: x + width * 0.42,
      alpha: { from: 0.72, to: 0 },
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => scan.destroy()
    });

    this.tweens.add({
      targets: this.bestPanel,
      alpha: { from: 1, to: 0.84 },
      yoyo: true,
      duration: 130,
      ease: "Sine.easeOut"
    });

    this.tweens.add({
      targets: this.bestText,
      alpha: { from: 1, to: 0.7 },
      yoyo: true,
      duration: 130,
      ease: "Sine.easeOut"
    });
  }

  private updateHealth(payload: HealthPayload) {
    this.currentHp = payload.hp;
    this.currentMaxHp = payload.maxHp;

    if (!this.hpFill) {
      return;
    }

    this.refreshHpBarAppearance();
    this.tweens.killTweensOf(this.hpFill);

    this.tweens.add({
      targets: this.hpFill,
      displayWidth: this.hpFillDisplayWidth,
      duration: 160,
      ease: "Sine.easeOut"
    });
  }

  private playHpIntroCharge() {
    if (!this.hpFill || !this.hpFrame) {
      return;
    }

    this.refreshHpBarAppearance();
    this.tweens.killTweensOf([this.hpFill, this.hpFrame]);
    this.hpFill.setDisplaySize(1, this.hpFill.displayHeight);
    this.hpFill.setAlpha(0.7);

    this.tweens.add({
      targets: this.hpFill,
      displayWidth: this.hpFillDisplayWidth,
      alpha: 1,
      duration: 760,
      ease: "Sine.easeOut",
      onComplete: () => this.playHpChargeCompleteEffect()
    });

    this.tweens.add({
      targets: this.hpFrame,
      alpha: { from: 0.46, to: 0.82 },
      duration: 760,
      ease: "Sine.easeOut"
    });
  }

  private playHpChargeCompleteEffect() {
    if (!this.hpFill || !this.hpFrame) {
      return;
    }

    const flash = this.add
      .image(this.hpFillX, this.hpFillY, HP_FILL_HEALTHY_KEY)
      .setDisplaySize(this.hpFillWidth, this.hpFill.displayHeight)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(99)
      .setAlpha(0.88)
      .setBlendMode(Phaser.BlendModes.ADD);

    const scan = this.add
      .image(this.hpFillX - 30 * this.uiScale, this.hpFillY, HP_SCAN_KEY)
      .setDisplaySize(96 * this.uiScale, 48 * this.uiScale)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0.95)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleY: { from: 1.25, to: 1.7 },
      duration: 260,
      ease: "Sine.easeOut",
      onComplete: () => flash.destroy()
    });

    this.tweens.add({
      targets: scan,
      x: this.hpFillX + this.hpFillWidth + 30 * this.uiScale,
      alpha: { from: 0.95, to: 0 },
      duration: 520,
      ease: "Sine.easeOut",
      onComplete: () => scan.destroy()
    });

    this.tweens.add({
      targets: this.hpFrame,
      alpha: { from: 0.98, to: 0.82 },
      duration: 220,
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
    return Math.max(1, this.hpFillWidth * this.hpRatio);
  }

  private get hpRatio() {
    return Phaser.Math.Clamp(this.currentHp / this.currentMaxHp, 0, 1);
  }

  private get hpFillTextureKey() {
    if (this.hpRatio <= 0.25) {
      return HP_FILL_DANGER_KEY;
    }

    if (this.hpRatio <= 0.5) {
      return HP_FILL_WARNING_KEY;
    }

    return HP_FILL_HEALTHY_KEY;
  }

  private get hpFrameTextureKey() {
    if (this.hpRatio <= 0.25) {
      return HP_FRAME_DANGER_KEY;
    }

    if (this.hpRatio <= 0.5) {
      return HP_FRAME_WARNING_KEY;
    }

    return HP_FRAME_HEALTHY_KEY;
  }

  private refreshHpBarAppearance() {
    if (!this.hpFill || !this.hpFrame) {
      return;
    }

    const fillTextureKey = this.hpFillTextureKey;
    const frameTextureKey = this.hpFrameTextureKey;
    const didChangeFill = this.hpFill.texture.key !== fillTextureKey;
    const didChangeFrame = this.hpFrame.texture.key !== frameTextureKey;

    if (didChangeFill) {
      this.hpFill.setTexture(fillTextureKey);
    }

    if (didChangeFrame) {
      this.hpFrame.setTexture(frameTextureKey);
    }

    if (didChangeFill || didChangeFrame) {
      this.tweens.add({
        targets: this.hpFill,
        alpha: { from: 0.58, to: 1 },
        duration: 140,
        ease: "Sine.easeOut"
      });

      this.tweens.add({
        targets: this.hpFrame,
        alpha: { from: 0.52, to: 0.82 },
        duration: 140,
        ease: "Sine.easeOut"
      });
    }
  }

  private createHpBarVariants() {
    if (this.textures.exists(HP_FILL_HEALTHY_KEY)) {
      return;
    }

    this.createColorVariants(HP_FILL_BASE_KEY, HP_FILL_VARIANTS, 0.88, 0.24, 1.32);
    this.createColorVariants(HP_FILL_BASE_KEY, HP_EMPTY_VARIANTS, 0.68, 0.16, 0.78);
    this.createColorVariants(HP_FRAME_BASE_KEY, HP_FRAME_VARIANTS, 0.48, 0.42, 0.78);
    this.createHpScanTexture();
  }

  private createHpScanTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 72;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((-18 * Math.PI) / 180);

    const glowGradient = context.createLinearGradient(-64, 0, 64, 0);
    glowGradient.addColorStop(0, "rgba(0, 216, 255, 0)");
    glowGradient.addColorStop(0.3, "rgba(0, 216, 255, 0.16)");
    glowGradient.addColorStop(0.5, "rgba(160, 248, 255, 0.38)");
    glowGradient.addColorStop(0.7, "rgba(0, 216, 255, 0.16)");
    glowGradient.addColorStop(1, "rgba(0, 216, 255, 0)");
    context.fillStyle = glowGradient;
    context.beginPath();
    context.moveTo(-62, -28);
    context.lineTo(52, -28);
    context.lineTo(66, 28);
    context.lineTo(-48, 28);
    context.closePath();
    context.fill();

    const coreGradient = context.createLinearGradient(-54, 0, 54, 0);
    coreGradient.addColorStop(0, "rgba(0, 216, 255, 0)");
    coreGradient.addColorStop(0.34, "rgba(0, 216, 255, 0.28)");
    coreGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.9)");
    coreGradient.addColorStop(0.66, "rgba(120, 246, 255, 0.4)");
    coreGradient.addColorStop(1, "rgba(0, 216, 255, 0)");
    context.fillStyle = coreGradient;
    context.beginPath();
    context.moveTo(-46, -18);
    context.lineTo(40, -18);
    context.lineTo(54, 18);
    context.lineTo(-32, 18);
    context.closePath();
    context.fill();

    context.globalAlpha = 0.48;
    context.fillStyle = "rgba(255, 255, 255, 0.72)";
    context.fillRect(-8, -24, 10, 48);
    context.restore();

    this.textures.addCanvas(HP_SCAN_KEY, canvas);
  }

  private createColorVariants(
    baseKey: string,
    variants: typeof HP_FILL_VARIANTS | typeof HP_FRAME_VARIANTS | typeof HP_EMPTY_VARIANTS,
    brightnessBase: number,
    brightnessRange: number,
    alphaMultiplier: number
  ) {
    const sourceImage = this.textures.get(baseKey).getSourceImage() as
      | HTMLCanvasElement
      | HTMLImageElement;

    for (const variant of variants) {
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

      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];

        if (alpha === 0) {
          continue;
        }

        const sourceBrightness = Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) / 255;
        const brightness = Phaser.Math.Clamp(brightnessBase + sourceBrightness * brightnessRange, 0, 1);

        pixels[index] = Math.round(variant.color.red * brightness);
        pixels[index + 1] = Math.round(variant.color.green * brightness);
        pixels[index + 2] = Math.round(variant.color.blue * brightness);
        const visibleAlpha =
          variant.key === HP_FILL_EMPTY_KEY ? Math.max(120, Math.round(alpha * alphaMultiplier)) : Math.round(alpha * alphaMultiplier);
        pixels[index + 3] = Math.min(255, visibleAlpha);
      }

      context.putImageData(imageData, 0, 0);
      this.textures.addCanvas(variant.key, canvas);
    }
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
    gameEvents.on("game:start", () => this.playHpIntroCharge());
    gameEvents.on("game:over", (payload) => this.showGameOver(payload));
    gameEvents.on("game:restart", () => {
      this.hasPlayedBestUpdateEffect = false;
      this.hideGameOver();
    });
  }
}
