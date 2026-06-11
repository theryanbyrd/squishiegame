import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { useStore, currentPlayer } from "../store/store";
import { DumplingScene, GAME_WIDTH, GAME_HEIGHT } from "../game/DumplingScene";
import type { RunStats } from "../types";

export default function GameScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const player = useStore((s) => currentPlayer(s));
  const recordGame = useStore((s) => s.recordGame);
  const setScreen = useStore((s) => s.setScreen);

  useEffect(() => {
    if (!player || !containerRef.current) return;
    let done = false;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: "#ffe6f0",
      physics: {
        default: "arcade",
        arcade: { gravity: { x: 0, y: 1200 } },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });

    game.scene.add("dumpling", DumplingScene, true, {
      playerName: player.name,
      skin: player.selectedSkin,
      trail: player.selectedTrail,
      background: player.selectedBackground,
      onGameOver: (stats: RunStats) => {
        if (done) return;
        done = true;
        recordGame(stats);
      },
    });

    return () => {
      done = true;
      game.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!player) {
    setScreen("select");
    return null;
  }

  return (
    <div className="game-page">
      <div ref={containerRef} className="game-container" />
      <button className="quit-btn" onClick={() => setScreen("menu")}>
        ✕
      </button>
    </div>
  );
}
