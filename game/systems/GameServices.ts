export interface LeaderboardEntry {
  name: string;
  score: number;
}

export interface GameServices {
  auth: {
    getPlayerId: () => Promise<string | null>;
  };
  leaderboard: {
    submitScore: (score: number) => Promise<void>;
    listTopScores: () => Promise<LeaderboardEntry[]>;
  };
  purchases: {
    isPremiumUnlocked: () => Promise<boolean>;
  };
  stages: {
    getActiveStageId: () => string;
  };
}

export const gameServices: GameServices = {
  auth: {
    async getPlayerId() {
      return null;
    }
  },
  leaderboard: {
    async submitScore() {
      // Replace this boundary with an API route when rankings are added.
    },
    async listTopScores() {
      return [];
    }
  },
  purchases: {
    async isPremiumUnlocked() {
      return false;
    }
  },
  stages: {
    getActiveStageId() {
      return "cyber-tokyo-alley";
    }
  }
};
