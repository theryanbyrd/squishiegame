import { head, put } from "@vercel/blob";
import type { PlayerDoc } from "../../src/types";
import { DEFAULT_PLAYERS, makeDefaultPlayer } from "../../src/data/gameLogic";

const MAX_SESSIONS = 300;

function pathFor(id: string): string {
  return `players/${id}.json`;
}

async function readDoc(id: string): Promise<PlayerDoc | null> {
  try {
    const meta = await head(pathFor(id));
    // cache-bust: blob URLs are CDN-cached and we overwrite in place
    const res = await fetch(`${meta.url}?v=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PlayerDoc;
  } catch {
    return null; // BlobNotFoundError -> initialize below
  }
}

export async function writeDoc(doc: PlayerDoc): Promise<void> {
  doc.sessions = doc.sessions.slice(-MAX_SESSIONS);
  await put(pathFor(doc.player.id), JSON.stringify(doc), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60, // minimum allowed; reads cache-bust anyway
  });
}

export async function readAllDocs(): Promise<PlayerDoc[]> {
  const now = new Date().toISOString();
  return Promise.all(
    DEFAULT_PLAYERS.map(async (p) => {
      const id = p.name.toLowerCase();
      const existing = await readDoc(id);
      if (existing) return existing;
      const fresh: PlayerDoc = {
        player: makeDefaultPlayer(p.name, p.avatar, now),
        achievements: [],
        unlocks: [],
        sessions: [],
      };
      await writeDoc(fresh);
      return fresh;
    })
  );
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
