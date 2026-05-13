"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { createGame } from "@/game/createGame";

export default function PhaserCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function mountGame() {
      if (!hostRef.current || gameRef.current) {
        return;
      }

      const game = await createGame(hostRef.current);
      if (cancelled) {
        game.destroy(true);
        return;
      }
      gameRef.current = game;
    }

    void mountGame();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className="canvas-host" />;
}
