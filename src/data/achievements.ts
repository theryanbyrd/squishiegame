export type AchievementDef = {
  key: string;
  title: string;
  description: string;
  emoji: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first-flight", title: "First Flight", description: "Play your first game", emoji: "🛫" },
  { key: "tiny-bounce", title: "Tiny Bounce", description: "Score 5 or more in one run", emoji: "🫧" },
  { key: "getting-good", title: "Getting Good", description: "Score 20 or more in one run", emoji: "✨" },
  { key: "dumpling-master", title: "Dumpling Master", description: "Score 50 or more in one run", emoji: "🥟" },
  { key: "sparkle-hunter", title: "Sparkle Hunter", description: "Collect 25 collectibles in total", emoji: "🌟" },
  { key: "boba-boss", title: "Boba Boss", description: "Collect 100 collectibles in total", emoji: "🧋" },
  { key: "comeback-bao", title: "Comeback Bao", description: "Play 5 games in one day", emoji: "🔁" },
  { key: "family-champion", title: "Family Champion", description: "Reach #1 on the leaderboard", emoji: "👑" },
  { key: "golden-dumpling", title: "Golden Dumpling", description: "Collect a rare golden dumpling", emoji: "🏆" },
  { key: "no-panic-taps", title: "No Panic Taps", description: "Survive 30 seconds in one run", emoji: "🧘" },
];

export function achievementDef(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}
