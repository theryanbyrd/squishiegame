import { useStore, currentPlayer } from "../store/store";
import { ACHIEVEMENTS } from "../data/achievements";

export default function Achievements() {
  const player = useStore((s) => currentPlayer(s));
  const achievements = useStore((s) => s.achievements);
  const setScreen = useStore((s) => s.setScreen);

  if (!player) {
    setScreen("select");
    return null;
  }
  const unlockedKeys = new Set(
    achievements
      .filter((a) => a.playerId === player.id)
      .map((a) => a.achievementKey)
  );

  return (
    <div className="page">
      <h1 className="title small">🎖 {player.name}'s Badges</h1>
      <p className="subtitle">
        {unlockedKeys.size} of {ACHIEVEMENTS.length} unlocked
      </p>
      <div className="card-list">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = unlockedKeys.has(a.key);
          return (
            <div
              key={a.key}
              className={`achievement-row ${unlocked ? "unlocked" : "locked"}`}
            >
              <div className="achievement-emoji">{unlocked ? a.emoji : "🔒"}</div>
              <div>
                <div className="player-name">{a.title}</div>
                <div className="player-stats">{a.description}</div>
              </div>
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
