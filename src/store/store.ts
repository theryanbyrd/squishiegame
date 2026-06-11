import { create } from "zustand";
import type {
  Achievement,
  GameSession,
  LeaderboardType,
  Player,
  PlayerName,
  RunStats,
  RunSummary,
  Screen,
  Unlock,
  UnlockType,
} from "../types";
import { levelForPoints } from "../data/levels";
import { BACKGROUNDS, SKINS, TRAILS } from "../data/cosmetics";
import { isSoundEnabled, setSoundEnabled } from "../game/sounds";

const KEYS = {
  players: "dumplingDash.players",
  sessions: "dumplingDash.sessions",
  achievements: "dumplingDash.achievements",
  unlocks: "dumplingDash.unlocks",
} as const;

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — game still works for this session
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const DEFAULT_PLAYERS: { name: PlayerName; avatar: string }[] = [
  { name: "Evie", avatar: "🌸" },
  { name: "Ellie", avatar: "🥟" },
  { name: "Hazel", avatar: "⭐" },
];

function makeDefaultPlayers(): Player[] {
  const now = new Date().toISOString();
  return DEFAULT_PLAYERS.map((p) => ({
    id: p.name.toLowerCase(),
    name: p.name,
    avatar: p.avatar,
    totalPoints: 0,
    level: 1,
    bestRunScore: 0,
    gamesPlayed: 0,
    totalCollectibles: 0,
    selectedSkin: "classic",
    selectedTrail: "sparkle",
    selectedBackground: "cloud",
    createdAt: now,
    updatedAt: now,
  }));
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

type AppState = {
  screen: Screen;
  selectedPlayerId: string | null;
  players: Player[];
  sessions: GameSession[];
  achievements: Achievement[];
  unlocks: Unlock[];
  leaderboardType: LeaderboardType;
  soundEnabled: boolean;
  lastSummary: RunSummary | null;

  setScreen: (screen: Screen) => void;
  selectPlayer: (id: string) => void;
  switchPlayer: () => void;
  setLeaderboardType: (t: LeaderboardType) => void;
  toggleSound: () => void;
  recordGame: (stats: RunStats) => void;
  setCustomization: (type: UnlockType, key: string) => void;
  isUnlocked: (playerId: string, type: UnlockType, key: string) => boolean;
};

export const useStore = create<AppState>((set, get) => ({
  screen: "select",
  selectedPlayerId: null,
  players: loadJSON<Player[]>(KEYS.players, makeDefaultPlayers()),
  sessions: loadJSON<GameSession[]>(KEYS.sessions, []),
  achievements: loadJSON<Achievement[]>(KEYS.achievements, []),
  unlocks: loadJSON<Unlock[]>(KEYS.unlocks, []),
  leaderboardType: "totalPoints",
  soundEnabled: isSoundEnabled(),
  lastSummary: null,

  setScreen: (screen) => set({ screen }),

  selectPlayer: (id) => set({ selectedPlayerId: id, screen: "menu" }),

  switchPlayer: () => set({ selectedPlayerId: null, screen: "select" }),

  setLeaderboardType: (t) => set({ leaderboardType: t }),

  toggleSound: () => {
    const on = !get().soundEnabled;
    setSoundEnabled(on);
    set({ soundEnabled: on });
  },

  recordGame: (stats) => {
    const state = get();
    const playerId = state.selectedPlayerId;
    if (!playerId) return;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    const now = new Date().toISOString();
    const pointsEarned =
      stats.runScore +
      stats.collectibles * 2 +
      Math.floor(stats.secondsPlayed / 3) +
      stats.maxCombo * 2;

    const session: GameSession = {
      id: uid(),
      playerId,
      runScore: stats.runScore,
      pointsEarned,
      secondsPlayed: stats.secondsPlayed,
      collectibles: stats.collectibles,
      maxCombo: stats.maxCombo,
      createdAt: now,
    };
    const sessions = [...state.sessions, session];

    const oldLevel = player.level;
    const totalPoints = player.totalPoints + pointsEarned;
    const newLevel = levelForPoints(totalPoints);
    const isNewBestRun = stats.runScore > player.bestRunScore;

    const updatedPlayer: Player = {
      ...player,
      totalPoints,
      level: newLevel,
      bestRunScore: Math.max(player.bestRunScore, stats.runScore),
      gamesPlayed: player.gamesPlayed + 1,
      totalCollectibles: player.totalCollectibles + stats.collectibles,
      updatedAt: now,
    };
    const players = state.players.map((p) =>
      p.id === playerId ? updatedPlayer : p
    );

    // achievements
    const has = (key: string) =>
      state.achievements.some(
        (a) => a.playerId === playerId && a.achievementKey === key
      );
    const newAchievements: string[] = [];
    const check = (key: string, condition: boolean) => {
      if (condition && !has(key)) newAchievements.push(key);
    };
    const gamesToday = sessions.filter(
      (s) => s.playerId === playerId && isToday(s.createdAt)
    ).length;
    const topPlayer = [...players].sort(
      (a, b) => b.totalPoints - a.totalPoints
    )[0];

    check("first-flight", updatedPlayer.gamesPlayed >= 1);
    check("tiny-bounce", stats.runScore >= 5);
    check("getting-good", stats.runScore >= 20);
    check("dumpling-master", stats.runScore >= 50);
    check("sparkle-hunter", updatedPlayer.totalCollectibles >= 25);
    check("boba-boss", updatedPlayer.totalCollectibles >= 100);
    check("comeback-bao", gamesToday >= 5);
    check("family-champion", topPlayer.id === playerId && totalPoints > 0);
    check("golden-dumpling", stats.goldenCollected);
    check("no-panic-taps", stats.secondsPlayed >= 30);

    const achievements = [
      ...state.achievements,
      ...newAchievements.map((key) => ({
        id: uid(),
        playerId,
        achievementKey: key,
        unlockedAt: now,
      })),
    ];

    // cosmetic unlocks by total points
    const hasUnlock = (type: UnlockType, key: string) =>
      state.unlocks.some(
        (u) =>
          u.playerId === playerId && u.unlockType === type && u.unlockKey === key
      );
    const newUnlocks: Unlock[] = [];
    const pools: { type: UnlockType; defs: typeof SKINS }[] = [
      { type: "skin", defs: SKINS },
      { type: "trail", defs: TRAILS },
      { type: "background", defs: BACKGROUNDS },
    ];
    for (const pool of pools) {
      for (const def of pool.defs) {
        if (
          def.pointsRequired > 0 &&
          totalPoints >= def.pointsRequired &&
          !hasUnlock(pool.type, def.key)
        ) {
          newUnlocks.push({
            id: uid(),
            playerId,
            unlockType: pool.type,
            unlockKey: def.key,
            unlockedAt: now,
          });
        }
      }
    }
    const unlocks = [...state.unlocks, ...newUnlocks];

    const summary: RunSummary = {
      playerId,
      runScore: stats.runScore,
      pointsEarned,
      totalPoints,
      oldLevel,
      newLevel,
      newAchievements,
      newUnlocks,
      isNewBestRun,
    };

    saveJSON(KEYS.players, players);
    saveJSON(KEYS.sessions, sessions);
    saveJSON(KEYS.achievements, achievements);
    saveJSON(KEYS.unlocks, unlocks);

    set({
      players,
      sessions,
      achievements,
      unlocks,
      lastSummary: summary,
      screen: "gameover",
    });
  },

  setCustomization: (type, key) => {
    const state = get();
    const playerId = state.selectedPlayerId;
    if (!playerId) return;
    const players = state.players.map((p) => {
      if (p.id !== playerId) return p;
      if (type === "skin") return { ...p, selectedSkin: key };
      if (type === "trail") return { ...p, selectedTrail: key };
      return { ...p, selectedBackground: key };
    });
    saveJSON(KEYS.players, players);
    set({ players });
  },

  isUnlocked: (playerId, type, key) => {
    const state = get();
    const defs =
      type === "skin" ? SKINS : type === "trail" ? TRAILS : BACKGROUNDS;
    const def = defs.find((d) => d.key === key);
    if (def && def.pointsRequired === 0) return true;
    return state.unlocks.some(
      (u) =>
        u.playerId === playerId && u.unlockType === type && u.unlockKey === key
    );
  },
}));

export function currentPlayer(state: {
  players: Player[];
  selectedPlayerId: string | null;
}): Player | null {
  return state.players.find((p) => p.id === state.selectedPlayerId) ?? null;
}
