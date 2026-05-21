"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { createGame } from "@/game/createGame";
import { gameEvents } from "@/game/systems/GameEvents";

export default function PhaserCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const removeReadyListener = gameEvents.on("ui:ready", () => {
      setIsLoading(false);
    });

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
      removeReadyListener();
      gameRef.current?.sound.stopAll();
      gameRef.current?.sound.destroy();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      setIsLoading(true);
    };
  }, []);

  return (
    <>
      <div ref={hostRef} className="canvas-host" />
      {isLoading ? (
        <div className="canvas-loading" aria-live="polite">
          <div className="loading">
            <span className="loading__text">Loading</span>
            <span className="loading__bar" aria-hidden="true" />
          </div>
        </div>
      ) : null}
    </>
  );
}
