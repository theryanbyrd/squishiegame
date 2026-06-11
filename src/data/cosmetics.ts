export type CosmeticDef = {
  key: string;
  title: string;
  emoji: string;
  pointsRequired: number;
};

export const SKINS: CosmeticDef[] = [
  { key: "classic", title: "Classic Bao", emoji: "🥟", pointsRequired: 0 },
  { key: "pink", title: "Pink Bao", emoji: "🌸", pointsRequired: 250 },
  { key: "cat", title: "Cat Bao", emoji: "🐱", pointsRequired: 500 },
  { key: "rainbow", title: "Rainbow Bao", emoji: "🌈", pointsRequired: 1000 },
  { key: "golden", title: "Golden Bao", emoji: "✨", pointsRequired: 2000 },
  { key: "unicorn", title: "Unicorn Bao", emoji: "🦄", pointsRequired: 3500 },
];

export const TRAILS: CosmeticDef[] = [
  { key: "sparkle", title: "Sparkle Trail", emoji: "✨", pointsRequired: 0 },
  { key: "heart", title: "Heart Trail", emoji: "💖", pointsRequired: 400 },
  { key: "boba", title: "Boba Trail", emoji: "🧋", pointsRequired: 800 },
  { key: "rainbow", title: "Rainbow Trail", emoji: "🌈", pointsRequired: 1500 },
  { key: "steam", title: "Steam Puff Trail", emoji: "💨", pointsRequired: 2500 },
];

export const BACKGROUNDS: CosmeticDef[] = [
  { key: "cloud", title: "Cloud Kitchen", emoji: "☁️", pointsRequired: 0 },
  { key: "bamboo", title: "Bamboo Forest", emoji: "🎋", pointsRequired: 300 },
  { key: "candy", title: "Candy Dim Sum Shop", emoji: "🍬", pointsRequired: 700 },
  { key: "teahouse", title: "Rainbow Tea House", emoji: "🫖", pointsRequired: 1200 },
  { key: "moonlight", title: "Moonlight Plushie Land", emoji: "🌙", pointsRequired: 2200 },
];
