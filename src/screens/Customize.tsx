import { useStore, currentPlayer } from "../store/store";
import { BACKGROUNDS, SKINS, TRAILS, type CosmeticDef } from "../data/cosmetics";
import type { UnlockType } from "../types";

export default function Customize() {
  const player = useStore((s) => currentPlayer(s));
  const setScreen = useStore((s) => s.setScreen);
  const setCustomization = useStore((s) => s.setCustomization);
  const isUnlocked = useStore((s) => s.isUnlocked);

  if (!player) {
    setScreen("select");
    return null;
  }

  const section = (
    title: string,
    type: UnlockType,
    defs: CosmeticDef[],
    selected: string
  ) => (
    <div className="customize-section">
      <h2 className="section-title">{title}</h2>
      <div className="cosmetic-grid">
        {defs.map((d) => {
          const unlocked = isUnlocked(player.id, type, d.key);
          const isSelected = selected === d.key;
          return (
            <button
              key={d.key}
              className={`cosmetic ${isSelected ? "selected" : ""} ${
                unlocked ? "" : "locked"
              }`}
              disabled={!unlocked}
              onClick={() => setCustomization(type, d.key)}
            >
              <div className="cosmetic-emoji">{unlocked ? d.emoji : "🔒"}</div>
              <div className="cosmetic-title">{d.title}</div>
              {!unlocked && (
                <div className="cosmetic-req">
                  {d.pointsRequired.toLocaleString()} pts
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="page">
      <h1 className="title small">🎨 Customize {player.name}</h1>
      <p className="subtitle">
        {player.totalPoints.toLocaleString()} points · unlock more by playing!
      </p>
      {section("Skins", "skin", SKINS, player.selectedSkin)}
      {section("Trails", "trail", TRAILS, player.selectedTrail)}
      {section("Backgrounds", "background", BACKGROUNDS, player.selectedBackground)}
      <button className="btn ghost" onClick={() => setScreen("menu")}>
        ↩ Back
      </button>
    </div>
  );
}
