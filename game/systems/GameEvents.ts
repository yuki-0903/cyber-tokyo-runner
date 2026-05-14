export interface ScorePayload {
  score: number;
  bestScore: number;
}

export interface HealthPayload {
  hp: number;
  maxHp: number;
}

export interface GameOverPayload {
  score: number;
  bestScore: number;
}

export interface AudioSettingsPayload {
  bgmEnabled: boolean;
  seEnabled: boolean;
}

type GameEventMap = {
  "game:ready": undefined;
  "game:start": undefined;
  "score:changed": ScorePayload;
  "health:changed": HealthPayload;
  "game:over": GameOverPayload;
  "game:restart": undefined;
  "audio:settings-changed": AudioSettingsPayload;
  "ui:start-sound": undefined;
  "ui:start": undefined;
  "ui:restart": undefined;
};

type EventName = keyof GameEventMap;
type Handler<TName extends EventName> = (payload: GameEventMap[TName]) => void;

class TypedGameEvents {
  private readonly target = new EventTarget();

  emit<TName extends EventName>(name: TName, payload?: GameEventMap[TName]) {
    this.target.dispatchEvent(new CustomEvent(name, { detail: payload }));
  }

  on<TName extends EventName>(name: TName, handler: Handler<TName>) {
    const listener = (event: Event) => {
      handler((event as CustomEvent<GameEventMap[TName]>).detail);
    };
    this.target.addEventListener(name, listener);
    return () => this.target.removeEventListener(name, listener);
  }
}

export const gameEvents = new TypedGameEvents();
