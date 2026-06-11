import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readAllDocs, writeDoc, uid } from "./_lib/db";
import { computeGameResult, sanitizeStats } from "../src/data/gameLogic";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const playerId = String(body.playerId ?? "");
  const stats = sanitizeStats(body.stats);
  const localDate =
    typeof body.localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.localDate)
      ? body.localDate
      : new Date().toISOString().slice(0, 10);
  if (!stats) {
    return res.status(400).json({ error: "invalid stats" });
  }

  const docs = await readAllDocs();
  const doc = docs.find((d) => d.player.id === playerId);
  if (!doc) {
    return res.status(404).json({ error: "unknown player" });
  }

  const now = new Date().toISOString();
  const result = computeGameResult({
    player: doc.player,
    stats,
    gamesTodayBefore: doc.sessions.filter((s) => s.localDate === localDate).length,
    otherPlayersTotals: docs
      .filter((d) => d.player.id !== playerId)
      .map((d) => d.player.totalPoints),
    ownedAchievementKeys: doc.achievements.map((a) => a.key),
    ownedUnlocks: doc.unlocks.map((u) => ({ type: u.type, key: u.key })),
    now,
  });

  doc.player = result.updatedPlayer;
  doc.achievements.push(
    ...result.newAchievementKeys.map((key) => ({ key, unlockedAt: now }))
  );
  doc.unlocks.push(
    ...result.newUnlocks.map((u) => ({ type: u.type, key: u.key, unlockedAt: now }))
  );
  doc.sessions.push({
    id: uid(),
    runScore: stats.runScore,
    pointsEarned: result.pointsEarned,
    secondsPlayed: stats.secondsPlayed,
    collectibles: stats.collectibles,
    maxCombo: stats.maxCombo,
    createdAt: now,
    localDate,
  });
  await writeDoc(doc);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    doc,
    summary: {
      playerId,
      runScore: stats.runScore,
      pointsEarned: result.pointsEarned,
      totalPoints: result.updatedPlayer.totalPoints,
      oldLevel: result.oldLevel,
      newLevel: result.newLevel,
      newAchievements: result.newAchievementKeys,
      isNewBestRun: result.isNewBestRun,
      newUnlockRefs: result.newUnlocks,
    },
  });
}
