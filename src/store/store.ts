import { create } from "zustand";
import type {
  Achievement,
  GameSession,
  LeaderboardType,
  Player,
  PlayerDoc,
  RunStats,
  RunSummary,
  Screen,
  Unlock,
  UnlockType,
} from "../types";
import {
  computeGameResult,
  DEFAULT_PLAYERS,
  makeDefaultPlayer,
} from "../data/gameLogic";
import { BACKGROUNDS, SKINS, TRAILS } from "../data/cosmetics";
import { isSoundEnabled, setSoundEnabled } from "../game/sounds";

const KEYS = {
  players: "dumplingDash.players",
  sessions: "dumplingDash.sessions",
  achievements: "dumplingDash.achievements",
  unlocks: "dumplingDash.unlocks",
  migrated: "dumplingDash.migrated",
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

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function makeDefaultPlayers(): Player[] {
  const now = new Date().toISOString();
  return DEFAULT_PLAYERS.map((p) => makeDefaultPlayer(p.name, p.avatar, now));
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

type Slices = {
  players: Player[];
  sessions: GameSession[];
  achievements: Achievement[];
  unlocks: Unlock[];
};

function docsToSlices(docs: PlayerDoc[]): Slices {
  return {
    players: docs.map((d) => d.player),
    sessions: docs.flatMap((d) =>
      d.sessions.map((s) => ({
        id: s.id || uid(),
        playerId: d.player.id,
        runScore: s.runScore,
        pointsEarned: s.pointsEarned,
        secondsPlayed: s.secondsPlayed,
        collectibles: s.collectibles,
        maxCombo: s.maxCombo,
        createdAt: s.createdAt,
      }))
    ),
    achievements: docs.flatMap((d) =>
      d.achievements.map((a) => ({
        id: `${d.player.id}:${a.key}`,
        playerId: d.player.id,
        achievementKey: a.key,
        unlockedAt: a.unlockedAt,
      }))
    ),
    unlocks: docs.flatMap((d) =>
      d.unlocks.map((u) => ({
        id: `${d.player.id}:${u.type}:${u.key}`,
        playerId: d.player.id,
        unlockType: u.type,
        unlockKey: u.key,
        unlockedAt: u.unlockedAt,
      }))
    ),
  };
}

function slicesToDocs(s: Slices): PlayerDoc[] {
  return s.players.map((player) => ({
    player,
    achievements: s.achievements
      .filter((a) => a.playerId === player.id)
      .map((a) => ({ key: a.achievementKey, unlockedAt: a.unlockedAt })),
    unlocks: s.unlocks
      .filter((u) => u.playerId === player.id)
      .map((u) => ({ type: u.unlockType, key: u.unlockKey, unlockedAt: u.unlockedAt })),
    sessions: s.sessions
      .filter((x) => x.playerId === player.id)
      .map((x) => ({
        id: x.id,
        runScore: x.runScore,
        pointsEarned: x.pointsEarned,
        secondsPlayed: x.secondsPlayed,
        collectibles: x.collectibles,
        maxCombo: x.maxCombo,
        createdAt: x.createdAt,
        localDate: x.createdAt.slice(0, 10),
      })),
  }));
}

function persistSlices(s: Slices) {
  saveJSON(KEYS.players, s.players);
  saveJSON(KEYS.sessions, s.sessions);
  saveJSON(KEYS.achievements, s.achievements);
  saveJSON(KEYS.unlocks, s.unlocks);
}

type AppState = Slices & {
  screen: Screen;
  selectedPlayerId: string | null;
  leaderboardType: LeaderboardType;
  soundEnabled: boolean;
  lastSummary: RunSummary | null;
  online: boolean; // last server call succeeded

  setScreen: (screen: Screen) => void;
  selectPlayer: (id: string) => void;
  switchPlayer: () => void;
  setLeaderboardType: (t: LeaderboardType) => void;
  toggleSound: () => void;
  syncFromServer: () => Promise<void>;
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
  online: false,

  setScreen: (screen) => set({ screen }),

  selectPlayer: (id) => set({ selectedPlayerId: id, screen: "menu" }),

  switchPlayer: () => set({ selectedPlayerId: null, screen: "select" }),

  setLeaderboardType: (t) => set({ leaderboardType: t }),

  toggleSound: () => {
    const on = !get().soundEnabled;
    setSoundEnabled(on);
    set({ soundEnabled: on });
  },

  syncFromServer: async () => {
    try {
      const res = await fetch("/api/players", { cache: "no-store" });
      if (!res.ok) throw new Error(`players ${res.status}`);
      let docs = (await res.json()).docs as PlayerDoc[];

      // one-time upload of pre-server localStorage progress
      const state = get();
      const migrated = loadJSON<boolean>(KEYS.migrated, false);
      const serverEmpty = docs.every((d) => d.player.gamesPlayed === 0);
      const localHasData = state.players.some((p) => p.gamesPlayed > 0);
      if (!migrated && serverEmpty && localHasData) {
        const up = await fetch("/api/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ docs: slicesToDocs(state) }),
        });
        if (up.ok) docs = (await up.json()).docs as PlayerDoc[];
      }
      saveJSON(KEYS.migrated, true);

      const slices = docsToSlices(docs);
      persistSlices(slices);
      set({ ...slices, online: true });
    } catch {
      set({ online: false }); // localStorage cache keeps the game playable
    }
  },

  recordGame: (stats) => {
    const state = get();
    const playerId = state.selectedPlayerId;
    if (!playerId) return;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    // compute locally first so the game-over screen is instant; the
    // server (re)computes authoritatively from its own state in parallel
    const now = new Date().toISOString();
    const result = computeGameResult({
      player,
      stats,
      gamesTodayBefore: state.sessions.filter(
        (s) => s.playerId === playerId && isToday(s.createdAt)
      ).length,
      otherPlayersTotals: state.players
        .filter((p) => p.id !== playerId)
        .map((p) => p.totalPoints),
      ownedAchievementKeys: state.achievements
        .filter((a) => a.playerId === playerId)
        .map((a) => a.achievementKey),
      ownedUnlocks: state.unlocks
        .filter((u) => u.playerId === playerId)
        .map((u) => ({ type: u.unlockType, key: u.unlockKey })),
      now,
    });

    const slices: Slices = {
      players: state.players.map((p) =>
        p.id === playerId ? result.updatedPlayer : p
      ),
      sessions: [
        ...state.sessions,
        {
          id: uid(),
          playerId,
          runScore: stats.runScore,
          pointsEarned: result.pointsEarned,
          secondsPlayed: stats.secondsPlayed,
          collectibles: stats.collectibles,
          maxCombo: stats.maxCombo,
          createdAt: now,
        },
      ],
      achievements: [
        ...state.achievements,
        ...result.newAchievementKeys.map((key) => ({
          id: `${playerId}:${key}`,
          playerId,
          achievementKey: key,
          unlockedAt: now,
        })),
      ],
      unlocks: [
        ...state.unlocks,
        ...result.newUnlocks.map((u) => ({
          id: `${playerId}:${u.type}:${u.key}`,
          playerId,
          unlockType: u.type,
          unlockKey: u.key,
          unlockedAt: now,
        })),
      ],
    };

    const summary: RunSummary = {
      playerId,
      runScore: stats.runScore,
      pointsEarned: result.pointsEarned,
      totalPoints: result.updatedPlayer.totalPoints,
      oldLevel: result.oldLevel,
      newLevel: result.newLevel,
      newAchievements: result.newAchievementKeys,
      newUnlocks: slices.unlocks.slice(state.unlocks.length),
      isNewBestRun: result.isNewBestRun,
    };

    persistSlices(slices);
    set({ ...slices, lastSummary: summary, screen: "gameover" });

    // authoritative server write; on success adopt the server's version
    void fetch("/api/game-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, stats, localDate: todayLocal() }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`session ${res.status}`);
        const { doc } = (await res.json()) as { doc: PlayerDoc };
        const cur = get();
        const merged = docsToSlices(
          slicesToDocs(cur).map((d) => (d.player.id === playerId ? doc : d))
        );
        persistSlices(merged);
        set({ ...merged, online: true });
      })
      .catch(() => set({ online: false }));
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

    void fetch(`/api/players/${playerId}/customization`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, key }),
    }).catch(() => set({ online: false }));
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
