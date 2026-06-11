import { useEffect } from "react";
import { useStore, currentPlayer } from "../store/store";
import { levelName, levelProgress } from "../data/levels";
import { achievementDef } from "../data/achievements";
import { BACKGROUNDS, SKINS, TRAILS } from "../data/cosmetics";
import { sfx } from "../game/sounds";

export default function GameOver() {
  const summary = useStore((s) => s.lastSummary);
  const player = useStore((s) => currentPlayer(s));
  const setScreen = useStore((s) => s.setScreen);

  const leveledUp = !!summary && summary.newLevel > summary.oldLevel;
  const gotBadge = !!summary && summary.newAchievements.length > 0;

  useEffect(() => {
    if (leveledUp) sfx.levelup();
    else if (gotBadge) sfx.badge();
  }, [leveledUp, gotBadge]);

  if (!summary || !player) {
    setScreen("select");
    return null;
  }
  const progress = levelProgress(summary.totalPoints);

  const unlockTitle = (type: string, key: string) => {
    const defs =
      type === "skin" ? SKINS : type === "trail" ? TRAILS : BACKGROUNDS;
    const d = defs.find((x) => x.key === key);
    return d ? `${d.emoji} ${d.title}` : key;
  };

  return (
    <div className="page">
      {leveledUp && <Confetti />}
      <h1 className="title small">Great run, {player.name}! {player.avatar}</h1>
      <div className="summary-card">
        <div className="summary-row big-row">
          <span>Score</span>
          <span className="big-num">{summary.runScore}</span>
        </div>
        {summary.isNewBestRun && (
          <div className="tag gold">🌟 New best run!</div>
        )}
        <div className="summary-row">
          <span>Points earned</span>
          <span>+{summary.pointsEarned}</span>
        </div>
        <div className="summary-row">
          <span>Total points</span>
          <span>{summary.totalPoints.toLocaleString()}</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {leveledUp ? (
          <div className="tag gold">
            🎉 Level {summary.oldLevel} → Level {summary.newLevel} unlocked!{" "}
            {levelName(summary.newLevel)}
          </div>
        ) : (
          <div className="player-stats">
            Level {summary.newLevel} · {levelName(summary.newLevel)}
          </div>
        )}
        {summary.newAchievements.map((key) => {
          const def = achievementDef(key);
          return (
            <div key={key} className="tag">
              {def?.emoji} New badge: {def?.title}
            </div>
          );
        })}
        {summary.newUnlocks.map((u) => (
          <div key={u.id} className="tag">
            🎁 Unlocked: {unlockTitle(u.unlockType, u.unlockKey)}
          </div>
        ))}
      </div>
      <div className="menu-list">
        <button className="btn primary big" onClick={() => setScreen("game")}>
          ▶ Play Again
        </button>
        <button className="btn" onClick={() => setScreen("leaderboard")}>
          🏆 Leaderboard
        </button>
        <button className="btn ghost" onClick={() => setScreen("menu")}>
          ↩ Menu
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  const colors = ["#ff9aa2", "#ffd3a0", "#fff3a0", "#a0e7a0", "#a0c8ff", "#d2a0ff"];
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((i) => (
        <span
          key={i}
          style={{
            left: `${(i * 53) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 10) * 0.15}s`,
            animationDuration: `${2 + (i % 5) * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}
