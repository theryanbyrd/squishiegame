import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readAllDocs, writeDoc } from "../../_lib/db.js";
import { BACKGROUNDS, SKINS, TRAILS } from "../../../src/data/cosmetics.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const id = String(req.query.id ?? "");
  const body = (req.body ?? {}) as Record<string, unknown>;
  const type = String(body.type ?? "");
  const key = String(body.key ?? "");

  const defs =
    type === "skin" ? SKINS : type === "trail" ? TRAILS : type === "background" ? BACKGROUNDS : null;
  const def = defs?.find((d) => d.key === key);
  if (!defs || !def) {
    return res.status(400).json({ error: "invalid cosmetic" });
  }

  const docs = await readAllDocs();
  const doc = docs.find((d) => d.player.id === id);
  if (!doc) {
    return res.status(404).json({ error: "unknown player" });
  }
  const unlocked =
    def.pointsRequired === 0 ||
    doc.unlocks.some((u) => u.type === type && u.key === key);
  if (!unlocked) {
    return res.status(403).json({ error: "not unlocked yet" });
  }

  if (type === "skin") doc.player.selectedSkin = key;
  else if (type === "trail") doc.player.selectedTrail = key;
  else doc.player.selectedBackground = key;
  doc.player.updatedAt = new Date().toISOString();
  await writeDoc(doc);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ doc });
}
