// Mulberry32 seeded PRNG — same seed always produces same sequence
export function createSeededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convert a date string like '2026-08-03' into a numeric seed
export function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return hash;
}

// Seeded shuffle — same seed + same array = same order every time
export function seededShuffle<T>(array: T[], rng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Get today's date string (UTC to keep everyone in sync)
export function getTodaySeedStr(): string {
  return new Date().toISOString().split('T')[0];
}

// Calculate day number (days since app launch date)
export function getDayNumber(): number {
  const epoch = new Date('2026-08-01');
  const today = new Date(getTodaySeedStr());
  return Math.floor((today.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
