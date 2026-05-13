export type GamePhase = "ready" | "playing" | "gameOver";

export interface RuntimeGameState {
  phase: GamePhase;
  score: number;
  bestScore: number;
  hp: number;
  maxHp: number;
}

export interface SpawnConfig {
  initialDelayMs: number;
  minDelayMs: number;
  speedStart: number;
  speedMax: number;
  difficultyRamp: number;
}

export interface PlayerConfig {
  speed: number;
  yOffset: number;
}
