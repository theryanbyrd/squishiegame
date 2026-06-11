export type PlayerName = "Evie" | "Ellie" | "Hazel";

export type Player = {
  id: string;
  name: PlayerName;
  avatar: string;
  totalPoints: number;
  level: number;
  bestRunScore: number;
  gamesPlayed: number;
  totalCollectibles: number;
  selectedSkin: string;
  selectedTrail: string;
  selectedBackground: string;
  createdAt: string;
  updatedAt: string;
};

export type GameSession = {
  id: string;
  playerId: string;
  runScore: number;
  pointsEarned: number;
  secondsPlayed: number;
  collectibles: number;
  maxCombo: number;
  createdAt: string;
};

export type Achievement = {
  id: string;
  playerId: string;
  achievementKey: string;
  unlockedAt: string;
};

export type UnlockType = "skin" | "trail" | "background";

export type Unlock = {
  id: string;
  playerId: string;
  unlockType: UnlockType;
  unlockKey: string;
  unlockedAt: string;
};

export type LeaderboardType =
  | "totalPoints"
  | "bestRun"
  | "highestLevel"
  | "mostCollectibles"
  | "dailyChampion";

export type RunStats = {
  runScore: number;
  secondsPlayed: number;
  collectibles: number;
  maxCombo: number;
  goldenCollected: boolean;
};

export type RunSummary = {
  playerId: string;
  runScore: number;
  pointsEarned: number;
  totalPoints: number;
  oldLevel: number;
  newLevel: number;
  newAchievements: string[];
  newUnlocks: Unlock[];
  isNewBestRun: boolean;
};

// Server-side document: one per player, stored as a JSON blob
export type SessionLite = {
  id: string;
  runScore: number;
  pointsEarned: number;
  secondsPlayed: number;
  collectibles: number;
  maxCombo: number;
  createdAt: string;
  localDate: string; // player's local YYYY-MM-DD, for daily stats
};

export type PlayerDoc = {
  player: Player;
  achievements: { key: string; unlockedAt: string }[];
  unlocks: { type: UnlockType; key: string; unlockedAt: string }[];
  sessions: SessionLite[];
};

export type Screen =
  | "select"
  | "menu"
  | "game"
  | "gameover"
  | "leaderboard"
  | "achievements"
  | "customize"
  | "howto";
