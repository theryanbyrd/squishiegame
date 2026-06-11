import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { useStore, currentPlayer } from "../store/store";
import { DumplingScene, GAME_WIDTH, GAME_HEIGHT } from "../game/DumplingScene";
import { stopMusic } from "../game/sounds";
import type { RunStats } from "../types";

export default function GameScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const player = useStore((s) => currentPlayer(s));
  const gameMode = useStore((s) => s.gameMode);
  const recordGame = useStore((s) => s.recordGame);
  const setScreen = useStore((s) => s.setScreen);

  useEffect(() => {
    if (!player || !containerRef.current) return;
    let done = false;

    const game = new Phaser.Game({
      // CANVAS, not AUTO: AUTO throws "WebGL unsupported" instead of falling
      // back when context creation fails (hw acceleration off, context limit)
      type: Phaser.CANVAS,
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
        // the flex .game-container centers the canvas; Phaser's
        // autoCenter would add its own margin on top and shift it right
        autoCenter: Phaser.Scale.NO_CENTER,
      },
    });

    game.scene.add("dumpling", DumplingScene, true, {
      playerName: player.name,
      skin: player.selectedSkin,
      trail: player.selectedTrail,
      background: player.selectedBackground,
      gameMode,
      onGameOver: (stats: RunStats) => {
        if (done) return;
        done = true;
        recordGame(stats);
      },
    });

    return () => {
      done = true;
      stopMusic();
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
