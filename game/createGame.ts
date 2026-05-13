import type * as Phaser from "phaser";
import { GameScene } from "@/game/scenes/GameScene";
import { UIScene } from "@/game/scenes/UIScene";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

export async function createGame(parent: HTMLElement): Promise<Phaser.Game> {
  const PhaserRuntime = await import("phaser");

  const config: Phaser.Types.Core.GameConfig = {
    type: PhaserRuntime.AUTO,
    parent,
    backgroundColor: "#05070f",
    scale: {
      mode: PhaserRuntime.Scale.FIT,
      autoCenter: PhaserRuntime.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
        gravity: { x: 0, y: 0 }
      }
    },
    input: {
      activePointers: 2
    },
    scene: [GameScene, UIScene]
  };

  return new PhaserRuntime.Game(config);
}
