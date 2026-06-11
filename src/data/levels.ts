export const LEVELS: { level: number; points: number; name: string }[] = [
  { level: 1, points: 0, name: "Baby Bao" },
  { level: 2, points: 100, name: "Squishy Starter" },
  { level: 3, points: 250, name: "Bamboo Bouncer" },
  { level: 4, points: 500, name: "Dim Sum Dasher" },
  { level: 5, points: 850, name: "Boba Collector" },
  { level: 6, points: 1250, name: "Steam Basket Pro" },
  { level: 7, points: 1750, name: "Dumpling Pilot" },
  { level: 8, points: 2400, name: "Plushie Champion" },
  { level: 9, points: 3200, name: "Golden Bao" },
  { level: 10, points: 4200, name: "Kawaii Legend" },
];

export function levelForPoints(points: number): number {
  let lvl = 1;
  for (const l of LEVELS) {
    if (points >= l.points) lvl = l.level;
  }
  return lvl;
}

export function levelName(level: number): string {
  return LEVELS.find((l) => l.level === level)?.name ?? "Kawaii Legend";
}

export function levelProgress(points: number): {
  current: number;
  next: number | null;
  percent: number;
} {
  const level = levelForPoints(points);
  const cur = LEVELS.find((l) => l.level === level)!;
  const next = LEVELS.find((l) => l.level === level + 1) ?? null;
  if (!next) return { current: cur.points, next: null, percent: 100 };
  const percent = Math.min(
    100,
    Math.round(((points - cur.points) / (next.points - cur.points)) * 100)
  );
  return { current: cur.points, next: next.points, percent };
}
