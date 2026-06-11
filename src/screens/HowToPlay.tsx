import { useStore } from "../store/store";

export default function HowToPlay() {
  const setScreen = useStore((s) => s.setScreen);

  return (
    <div className="page">
      <h1 className="title small">❓ How to Play</h1>
      <div className="summary-card howto">
        <p>🥟 Tap, click, or press <b>spacebar</b> to bounce your bao!</p>
        <p>🎋 Dodge the bamboo steamers — touching one ends your run.</p>
        <p>⭐ Collect stars, hearts, and boba pearls — treats floating in your path are worth +1, but daring ones way up high or down low are worth +4 or even +8!</p>
        <p>🏆 A rare <b>golden dumpling</b> is worth +10!</p>
        <p>🔥 Collect every treat to grow your combo for bonus points.</p>
        <p>🚀 Reach <b>100 score</b> and blast off into <b>SPACE MODE</b> — your bao floats to the middle and spins to aim! Point with your finger or mouse (arrow keys spin too) and blast hearts at steamers swooping in from every direction. Tap to fire extra shots!</p>
        <p>⏱ <b>Timed Mode</b>: race a 60-second clock to pass as many openings as you can! Treats add time instead of points (+1s in your path, +2s or +3s up high or down low, +5s golden). Bumping a steamer costs 3 seconds — only the clock can end your run.</p>
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
