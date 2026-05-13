"use client";

import PhaserCanvas from "@/components/PhaserCanvas";

export default function GameShell() {
  return (
    <main className="page">
      <section className="game-card" aria-label="Cyber Tokyo Runner game">
        <PhaserCanvas />
      </section>
    </main>
  );
}
