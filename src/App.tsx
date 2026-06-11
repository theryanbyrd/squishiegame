import { useEffect } from "react";
import { useStore } from "./store/store";
import { sfx } from "./game/sounds";
import PlayerSelect from "./screens/PlayerSelect";
import MainMenu from "./screens/MainMenu";
import GameScreen from "./screens/GameScreen";
import GameOver from "./screens/GameOver";
import Leaderboard from "./screens/Leaderboard";
import Achievements from "./screens/Achievements";
import Customize from "./screens/Customize";
import HowToPlay from "./screens/HowToPlay";

export default function App() {
  const screen = useStore((s) => s.screen);

  // soft pop on every UI button tap (canvas taps have their own flap sound)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) sfx.click();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  switch (screen) {
    case "select":
      return <PlayerSelect />;
    case "menu":
      return <MainMenu />;
    case "game":
      return <GameScreen />;
    case "gameover":
      return <GameOver />;
    case "leaderboard":
      return <Leaderboard />;
    case "achievements":
      return <Achievements />;
    case "customize":
      return <Customize />;
    case "howto":
      return <HowToPlay />;
  }
}
