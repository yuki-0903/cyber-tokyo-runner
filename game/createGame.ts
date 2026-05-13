import type * as Phaser from "phaser";
import { GameScene } from "@/game/scenes/GameScene";
import { UIScene } from "@/game/scenes/UIScene";

export async function createGame(parent: HTMLElement): Promise<Phaser.Game> {
  const PhaserRuntime = await import("phaser");

  const config: Phaser.Types.Core.GameConfig = {
    type: PhaserRuntime.AUTO,
    parent,
    backgroundColor: "#05070f",
    scale: {
      mode: PhaserRuntime.Scale.RESIZE,
      autoCenter: PhaserRuntime.Scale.CENTER_BOTH,
      width: Math.max(1, parent.clientWidth),
      height: Math.max(1, parent.clientHeight),
      fullscreenTarget: parent
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
