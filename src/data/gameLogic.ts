// Pure game-result logic shared by the browser store (offline fallback)
// and the /api serverless functions (authoritative). No DOM, no storage.

import type { Player, PlayerName, RunStats, UnlockType } from "../types.js";
import { levelForPoints } from "./levels.js";
import { BACKGROUNDS, SKINS, TRAILS } from "./cosmetics.js";

export const DEFAULT_PLAYERS: { name: PlayerName; avatar: string }[] = [
  { name: "Evie", avatar: "🌸" },
  { name: "Ellie", avatar: "🥟" },
  { name: "Hazel", avatar: "⭐" },
];

export function makeDefaultPlayer(name: PlayerName, avatar: string, now: string): Player {
  return {
    id: name.toLowerCase(),
    name,
    avatar,
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
  };
}

export function sanitizeStats(raw: unknown): RunStats | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, max: number) =>
    typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
  return {
    runScore: num(r.runScore, 100000),
    secondsPlayed: num(r.secondsPlayed, 86400),
    collectibles: num(r.collectibles, 10000),
    maxCombo: num(r.maxCombo, 10000),
    goldenCollected: r.goldenCollected === true,
  };
}

export type GameResult = {
  updatedPlayer: Player;
  pointsEarned: number;
  oldLevel: number;
  newLevel: number;
  isNewBestRun: boolean;
  newAchievementKeys: string[];
  newUnlocks: { type: UnlockType; key: string }[];
};

export function computeGameResult(args: {
  player: Player;
  stats: RunStats;
  gamesTodayBefore: number;
  otherPlayersTotals: number[];
  ownedAchievementKeys: string[];
  ownedUnlocks: { type: UnlockType; key: string }[];
  now: string;
}): GameResult {
  const { player, stats, now } = args;

  const pointsEarned =
    stats.runScore +
    stats.collectibles * 2 +
    Math.floor(stats.secondsPlayed / 3) +
    stats.maxCombo * 2;

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

  const owned = new Set(args.ownedAchievementKeys);
  const newAchievementKeys: string[] = [];
  const check = (key: string, condition: boolean) => {
    if (condition && !owned.has(key)) newAchievementKeys.push(key);
  };
  const isChampion =
    totalPoints > 0 && totalPoints >= Math.max(0, ...args.otherPlayersTotals);

  check("first-flight", updatedPlayer.gamesPlayed >= 1);
  check("tiny-bounce", stats.runScore >= 5);
  check("getting-good", stats.runScore >= 20);
  check("dumpling-master", stats.runScore >= 50);
  check("sparkle-hunter", updatedPlayer.totalCollectibles >= 25);
  check("boba-boss", updatedPlayer.totalCollectibles >= 100);
  check("comeback-bao", args.gamesTodayBefore + 1 >= 5);
  check("family-champion", isChampion);
  check("golden-dumpling", stats.goldenCollected);
  check("no-panic-taps", stats.secondsPlayed >= 30);

  const ownedUnlockSet = new Set(
    args.ownedUnlocks.map((u) => `${u.type}:${u.key}`)
  );
  const newUnlocks: { type: UnlockType; key: string }[] = [];
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
        !ownedUnlockSet.has(`${pool.type}:${def.key}`)
      ) {
        newUnlocks.push({ type: pool.type, key: def.key });
      }
    }
  }

  return {
    updatedPlayer,
    pointsEarned,
    oldLevel,
    newLevel,
    isNewBestRun,
    newAchievementKeys,
    newUnlocks,
  };
}
