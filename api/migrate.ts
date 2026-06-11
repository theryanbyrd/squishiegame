import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readAllDocs, writeDoc } from "./_lib/db.js";
import type { PlayerDoc } from "../src/types.js";
import { sanitizeStats } from "../src/data/gameLogic.js";

// One-time import of pre-existing localStorage progress. Only allowed
// while the server has no recorded games, so it can't clobber real data.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const docs = await readAllDocs();
  if (docs.some((d) => d.player.gamesPlayed > 0)) {
    return res.status(409).json({ error: "server already has data", docs });
  }

  const incoming = (req.body?.docs ?? []) as PlayerDoc[];
  for (const doc of docs) {
    const local = incoming.find((d) => d?.player?.id === doc.player.id);
    if (!local || typeof local.player?.totalPoints !== "number") continue;
    // take local stats but keep server identity fields
    doc.player = {
      ...doc.player,
      totalPoints: Math.max(0, Math.floor(local.player.totalPoints)),
      level: Math.max(1, Math.min(10, Math.floor(local.player.level ?? 1))),
      bestRunScore: Math.max(0, Math.floor(local.player.bestRunScore ?? 0)),
      gamesPlayed: Math.max(0, Math.floor(local.player.gamesPlayed ?? 0)),
      totalCollectibles: Math.max(0, Math.floor(local.player.totalCollectibles ?? 0)),
      selectedSkin: String(local.player.selectedSkin ?? "classic"),
      selectedTrail: String(local.player.selectedTrail ?? "sparkle"),
      selectedBackground: String(local.player.selectedBackground ?? "cloud"),
      updatedAt: new Date().toISOString(),
    };
    doc.achievements = (local.achievements ?? [])
      .filter((a) => typeof a?.key === "string")
      .map((a) => ({ key: a.key, unlockedAt: String(a.unlockedAt ?? "") }));
    doc.unlocks = (local.unlocks ?? [])
      .filter((u) => typeof u?.key === "string")
      .map((u) => ({ type: u.type, key: u.key, unlockedAt: String(u.unlockedAt ?? "") }));
    doc.sessions = (local.sessions ?? [])
      .filter((s) => sanitizeStats(s) !== null)
      .map((s) => ({
        id: String(s.id ?? ""),
        runScore: Math.floor(s.runScore ?? 0),
        pointsEarned: Math.floor(s.pointsEarned ?? 0),
        secondsPlayed: Math.floor(s.secondsPlayed ?? 0),
        collectibles: Math.floor(s.collectibles ?? 0),
        maxCombo: Math.floor(s.maxCombo ?? 0),
        createdAt: String(s.createdAt ?? ""),
        localDate: String(s.localDate ?? String(s.createdAt ?? "").slice(0, 10)),
      }));
    await writeDoc(doc);
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ docs: await readAllDocs() });
}
