import { useEffect } from "react";
import { useStore } from "../store/store";
import type { LeaderboardType, Player } from "../types";
import { levelName } from "../data/levels";
import { achievementDef } from "../data/achievements";

const TABS: { key: LeaderboardType; label: string }[] = [
  { key: "totalPoints", label: "Total Points" },
  { key: "bestRun", label: "Best Run" },
  { key: "highestLevel", label: "Level" },
  { key: "mostCollectibles", label: "Collectibles" },
  { key: "dailyChampion", label: "Today" },
];

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function Leaderboard() {
  const players = useStore((s) => s.players);
  const sessions = useStore((s) => s.sessions);
  const achievements = useStore((s) => s.achievements);
  const type = useStore((s) => s.leaderboardType);
  const setType = useStore((s) => s.setLeaderboardType);
  const setScreen = useStore((s) => s.setScreen);
  const syncFromServer = useStore((s) => s.syncFromServer);

  // refresh from the server so other devices' runs show up
  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  const statFor = (p: Player): { value: number; label: string } => {
    switch (type) {
      case "totalPoints":
        return { value: p.totalPoints, label: `${p.totalPoints.toLocaleString()} pts` };
      case "bestRun":
        return { value: p.bestRunScore, label: `${p.bestRunScore} best run` };
      case "highestLevel":
        return { value: p.level, label: `Level ${p.level} · ${levelName(p.level)}` };
      case "mostCollectibles":
        return { value: p.totalCollectibles, label: `${p.totalCollectibles} ✨` };
      case "dailyChampion": {
        const today = sessions
          .filter((s) => s.playerId === p.id && isToday(s.createdAt))
          .reduce((sum, s) => sum + s.pointsEarned, 0);
        return { value: today, label: `${today.toLocaleString()} pts today` };
      }
    }
  };

  const ranked = [...players]
    .map((p) => ({ player: p, stat: statFor(p) }))
    .sort((a, b) => b.stat.value - a.stat.value);

  return (
    <div className="page">
      <div className="brand">Byrdman's Squishy Dumpling Dash</div>
      <h1 className="title small">🏆 Leaderboard</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${type === t.key ? "active" : ""}`}
            onClick={() => setType(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="card-list">
        {ranked.map(({ player, stat }, i) => {
          const recent = [...achievements]
            .filter((a) => a.playerId === player.id)
            .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))[0];
          const badge = recent ? achievementDef(recent.achievementKey) : null;
          return (
            <div
              key={player.id}
              className={`leader-row ${i === 0 && stat.value > 0 ? "first" : ""}`}
            >
              <div className="rank">{i + 1}</div>
              <div className="leader-avatar">{player.avatar}</div>
              <div className="leader-info">
                <div className="player-name">{player.name}</div>
                <div className="player-stats">{stat.label}</div>
              </div>
              {badge && <div className="leader-badge">{badge.emoji}</div>}
            </div>
          );
        })}
      </div>
      <button className="btn ghost" onClick={() => setScreen("menu")}>
        ↩ Back
      </button>
    </div>
  );
}
