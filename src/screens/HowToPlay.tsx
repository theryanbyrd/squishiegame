import { useStore } from "../store/store";

export default function HowToPlay() {
  const setScreen = useStore((s) => s.setScreen);

  return (
    <div className="page">
      <h1 className="title small">❓ How to Play</h1>
      <div className="summary-card howto">
        <p>🥟 Tap, click, or press <b>spacebar</b> to bounce your bao!</p>
        <p>🎋 Dodge the bamboo steamers — touching one ends your run.</p>
        <p>⭐ Collect stars, hearts, and boba pearls for +3 score each.</p>
        <p>🏆 A rare <b>golden dumpling</b> is worth +10!</p>
        <p>🔥 Collect every treat to grow your combo for bonus points.</p>
        <p>🚀 Reach <b>100 score</b> and blast off into <b>SPACE MODE</b> — your bao floats to the middle and spins to aim! Point with your finger or mouse (arrow keys spin too) and blast hearts at steamers swooping in from every direction. Tap to fire extra shots!</p>
        <p>📈 Points add up after every run — level up, unlock badges, cute skins, trails, and backgrounds!</p>
      </div>
      <button className="btn primary big" onClick={() => setScreen("game")}>
        ▶ Let's Play!
      </button>
      <button className="btn ghost" onClick={() => setScreen("menu")}>
        ↩ Back
      </button>
    </div>
  );
}
