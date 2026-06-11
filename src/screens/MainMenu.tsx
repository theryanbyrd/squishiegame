import { useStore, currentPlayer } from "../store/store";
import { levelName, levelProgress } from "../data/levels";

export default function MainMenu() {
  const setScreen = useStore((s) => s.setScreen);
  const switchPlayer = useStore((s) => s.switchPlayer);
  const player = useStore((s) => currentPlayer(s));

  if (!player) {
    switchPlayer();
    return null;
  }
  const progress = levelProgress(player.totalPoints);

  return (
    <div className="page">
      <div className="menu-header">
        <div className="menu-avatar">{player.avatar}</div>
        <h1 className="title small">{player.name}</h1>
        <div className="player-level">
          Level {player.level} · {levelName(player.level)}
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="player-stats">
          {player.totalPoints.toLocaleString()} points
          {progress.next !== null &&
            ` · ${(progress.next - player.totalPoints).toLocaleString()} to next level`}
        </div>
      </div>
      <div className="menu-list">
        <button className="btn primary big" onClick={() => setScreen("game")}>
          ▶ Play
        </button>
        <button className="btn" onClick={() => setScreen("leaderboard")}>
          🏆 Leaderboard
        </button>
        <button className="btn" onClick={() => setScreen("achievements")}>
          🎖 Achievements
        </button>
        <button className="btn" onClick={() => setScreen("customize")}>
          🎨 Customize
        </button>
        <button className="btn" onClick={() => setScreen("howto")}>
          ❓ How to Play
        </button>
        <button className="btn ghost" onClick={switchPlayer}>
          ↩ Switch Player
        </button>
      </div>
    </div>
  );
}
