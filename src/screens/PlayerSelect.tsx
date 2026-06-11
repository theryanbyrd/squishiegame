import { useStore } from "../store/store";
import { levelName } from "../data/levels";
import { achievementDef } from "../data/achievements";

export default function PlayerSelect() {
  const players = useStore((s) => s.players);
  const achievements = useStore((s) => s.achievements);
  const selectPlayer = useStore((s) => s.selectPlayer);

  return (
    <div className="page">
      <h1 className="title">
        Squishy Dumpling Dash <span className="bounce">🥟</span>
      </h1>
      <p className="subtitle">who's playing today?</p>
      <div className="card-list">
        {players.map((p) => {
          const recent = [...achievements]
            .filter((a) => a.playerId === p.id)
            .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))[0];
          const badge = recent ? achievementDef(recent.achievementKey) : null;
          return (
            <button
              key={p.id}
              className="player-card"
              onClick={() => selectPlayer(p.id)}
            >
              <div className="player-avatar">{p.avatar}</div>
              <div className="player-info">
                <div className="player-name">{p.name}</div>
                <div className="player-level">
                  Level {p.level} · {levelName(p.level)}
                </div>
                <div className="player-stats">
                  {p.totalPoints.toLocaleString()} total points · Best run:{" "}
                  {p.bestRunScore}
                </div>
                {badge && (
                  <div className="player-badge">
                    {badge.emoji} {badge.title}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
