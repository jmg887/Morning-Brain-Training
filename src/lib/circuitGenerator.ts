// ─── Circuit Connect Puzzle Generator ─────────────────────────────────
//
// Strategy: Generate a Hamiltonian path (visits every cell exactly once)
// via randomized DFS with Warnsdorff's heuristic, then cut it into N
// segments. Each segment becomes a color pair.
//
// Level system: 20 fine-grained levels that smoothly scale grid size,
// pair count, time pressure, and segment complexity.
//
// ─────────────────────────────────────────────────────────────────────────────

import { createSeededRandom } from './seededRandom';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedPair {
  color: string;
  colorHex: string;
  start: [number, number];
  end: [number, number];
}

export interface GeneratedPuzzle {
  gridSize: number;
  level: number;
  pairs: GeneratedPair[];
  solutionPaths: Record<string, [number, number][]>;
  timeLimit: number;
}

// ─── Color palette (up to 8 distinct colors) ──────────────────────────────────

const COLORS: { color: string; colorHex: string }[] = [
  { color: 'red', colorHex: '#FF3B30' },
  { color: 'blue', colorHex: '#1CB0F6' },
  { color: 'green', colorHex: '#58CC02' },
  { color: 'purple', colorHex: '#AF52DE' },
  { color: 'orange', colorHex: '#FF9600' },
  { color: 'pink', colorHex: '#FF2D55' },
  { color: 'teal', colorHex: '#5AC8FA' },
  { color: 'gold', colorHex: '#FFD60A' },
];

// ─── Level Config ─────────────────────────────────────────────────────────────
//
// 20 levels that smoothly ramp:
//   - Grid:     5 → 5 → 5 → 6 → 6 → 6 → 6 → 7 → 7 → 7 → 7 → 7 → 8 → 8 → 8 → 8
//   - Pairs:    3 → 3 → 4 → 4 → 4 → 5 → 5 → 5 → 6 → 6 → 7 → 7 → 7 → 8 → 8 → 8
//   - Time:     generous → tight
//   - MinSeg:   longer (easier) → shorter (harder, more uniform segments)
//

export interface LevelConfig {
  gridSize: number;
  numPairs: number;
  timeLimit: number;
  minSegmentLen: number;
  tier: string;       // display tier name
  tierColor: string;  // color for the tier badge
}

const LEVEL_CONFIGS: LevelConfig[] = [
  // ── Tier 1: Beginner (5x5, gentle) ──
  { gridSize: 5, numPairs: 3, timeLimit: 120, minSegmentLen: 4, tier: 'Beginner',     tierColor: '#58CC02' },  // 1
  { gridSize: 5, numPairs: 3, timeLimit: 100, minSegmentLen: 3, tier: 'Beginner',     tierColor: '#58CC02' },  // 2
  { gridSize: 5, numPairs: 4, timeLimit: 100, minSegmentLen: 3, tier: 'Beginner',     tierColor: '#58CC02' },  // 3
  // ── Tier 2: Intermediate (5-6x5-6, growing complexity) ──
  { gridSize: 5, numPairs: 4, timeLimit: 90,  minSegmentLen: 2, tier: 'Intermediate', tierColor: '#1CB0F6' },  // 4
  { gridSize: 6, numPairs: 4, timeLimit: 120, minSegmentLen: 3, tier: 'Intermediate', tierColor: '#1CB0F6' },  // 5
  { gridSize: 6, numPairs: 5, timeLimit: 120, minSegmentLen: 3, tier: 'Intermediate', tierColor: '#1CB0F6' },  // 6
  { gridSize: 6, numPairs: 5, timeLimit: 100, minSegmentLen: 2, tier: 'Intermediate', tierColor: '#1CB0F6' },  // 7
  // ── Tier 3: Advanced (6-7x6-7, more pairs, tighter time) ──
  { gridSize: 6, numPairs: 5, timeLimit: 90,  minSegmentLen: 2, tier: 'Advanced',     tierColor: '#AF52DE' },  // 8
  { gridSize: 7, numPairs: 5, timeLimit: 140, minSegmentLen: 3, tier: 'Advanced',     tierColor: '#AF52DE' },  // 9
  { gridSize: 7, numPairs: 6, timeLimit: 130, minSegmentLen: 2, tier: 'Advanced',     tierColor: '#AF52DE' },  // 10
  { gridSize: 7, numPairs: 6, timeLimit: 120, minSegmentLen: 2, tier: 'Advanced',     tierColor: '#AF52DE' },  // 11
  { gridSize: 7, numPairs: 7, timeLimit: 120, minSegmentLen: 2, tier: 'Advanced',     tierColor: '#AF52DE' },  // 12
  // ── Tier 4: Expert (7-8x7-8, maximum complexity) ──
  { gridSize: 7, numPairs: 7, timeLimit: 100, minSegmentLen: 2, tier: 'Expert',       tierColor: '#FF3B30' },  // 13
  { gridSize: 8, numPairs: 7, timeLimit: 150, minSegmentLen: 2, tier: 'Expert',       tierColor: '#FF3B30' },  // 14
  { gridSize: 8, numPairs: 8, timeLimit: 140, minSegmentLen: 2, tier: 'Expert',       tierColor: '#FF3B30' },  // 15
  { gridSize: 8, numPairs: 8, timeLimit: 120, minSegmentLen: 2, tier: 'Expert',       tierColor: '#FF3B30' },  // 16
  // ── Tier 5: Master (8x8, brutal time) ──
  { gridSize: 8, numPairs: 8, timeLimit: 100, minSegmentLen: 2, tier: 'Master',       tierColor: '#FF2D55' },  // 17
  { gridSize: 8, numPairs: 8, timeLimit: 90,  minSegmentLen: 2, tier: 'Master',       tierColor: '#FF2D55' },  // 18
  { gridSize: 8, numPairs: 8, timeLimit: 80,  minSegmentLen: 2, tier: 'Master',       tierColor: '#FF2D55' },  // 19
  { gridSize: 8, numPairs: 8, timeLimit: 70,  minSegmentLen: 2, tier: 'Master',       tierColor: '#FF2D55' },  // 20
];

export const MAX_LEVEL = LEVEL_CONFIGS.length;

/** Get the config for a given level (1-indexed, clamped) */
export function getLevelConfig(level: number): LevelConfig {
  return LEVEL_CONFIGS[Math.max(0, Math.min(level - 1, LEVEL_CONFIGS.length - 1))];
}

/** Map old difficulty numbers to starting levels for migration */
export function difficultyToLevel(d: number): number {
  if (d <= 1) return 1;
  if (d === 2) return 5;
  return 10;
}

// ─── Hamiltonian Path Generator (randomized DFS + Warnsdorff) ────────────────

const DIRS: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

function generateHamiltonianPath(
  gridSize: number,
  rng: () => number
): [number, number][] | null {
  const total = gridSize * gridSize;
  const visited: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );
  const path: [number, number][] = [];

  const startR = Math.floor(rng() * gridSize);
  const startC = Math.floor(rng() * gridSize);

  const countUnvisited = (r: number, c: number): number => {
    let count = 0;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !visited[nr][nc]) {
        count++;
      }
    }
    return count;
  };

  function dfs(r: number, c: number): boolean {
    visited[r][c] = true;
    path.push([r, c]);

    if (path.length === total) return true;

    const neighbors: [number, number][] = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !visited[nr][nc]) {
        neighbors.push([nr, nc]);
      }
    }

    // Warnsdorff: prefer cells with fewer exits (reduces dead ends)
    neighbors.sort((a, b) => {
      const ca = countUnvisited(a[0], a[1]);
      const cb = countUnvisited(b[0], b[1]);
      if (ca !== cb) return ca - cb;
      return rng() - 0.5;
    });

    for (const [nr, nc] of neighbors) {
      if (dfs(nr, nc)) return true;
    }

    visited[r][c] = false;
    path.pop();
    return false;
  }

  return dfs(startR, startC) ? path : null;
}

// ─── Path Segment Cutter ─────────────────────────────────────────────────────

function cutIntoSegments(
  path: [number, number][],
  numSegments: number,
  rng: () => number,
  minLen = 2
): [number, number][][] | null {
  const n = path.length;
  if (n < numSegments * minLen) return null;

  const dividers: number[] = [];
  let low = minLen - 1;

  for (let i = 0; i < numSegments - 1; i++) {
    const remaining = numSegments - 1 - i;
    const high = n - minLen * remaining - 1;
    if (low > high) return null;

    const d = low + Math.floor(rng() * (high - low + 1));
    dividers.push(d);
    low = d + minLen;
  }

  const segments: [number, number][][] = [];
  let prev = 0;
  for (const d of dividers) {
    segments.push(path.slice(prev, d + 1));
    prev = d + 1;
  }
  segments.push(path.slice(prev));

  return segments;
}

// ─── Shuffle helper ───────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Main Generator ───────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 30;

/**
 * Generate a Circuit Connect puzzle for a given level.
 *
 * @param level  1-20 level number
 * @param seed   Optional seed for deterministic generation (daily mode)
 */
export function generatePuzzle(
  level: number = 1,
  seed?: number
): GeneratedPuzzle | null {
  const config = getLevelConfig(level);

  const baseRng = seed != null ? createSeededRandom(seed) : Math.random;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = seed != null
      ? createSeededRandom(seed + attempt * 7919)
      : baseRng;

    const path = generateHamiltonianPath(config.gridSize, rng);
    if (!path) continue;

    const segments = cutIntoSegments(path, config.numPairs, rng, config.minSegmentLen);
    if (!segments) continue;

    const colorOrder = shuffleArray(COLORS.slice(0, config.numPairs), rng);

    const pairs: GeneratedPair[] = segments.map((seg, i) => ({
      color: colorOrder[i].color,
      colorHex: colorOrder[i].colorHex,
      start: seg[0],
      end: seg[seg.length - 1],
    }));

    const solutionPaths: Record<string, [number, number][]> = {};
    segments.forEach((seg, i) => {
      solutionPaths[colorOrder[i].color] = seg;
    });

    return {
      gridSize: config.gridSize,
      level,
      pairs,
      solutionPaths,
      timeLimit: config.timeLimit,
    };
  }

  return null;
}

/**
 * Generate a daily puzzle using today's seed.
 * Scales difficulty based on how far into the month we are.
 */
export function generateDailyPuzzle(dayNumber: number): GeneratedPuzzle | null {
  // Daily difficulty cycles: levels 4, 6, 8, 10, 12, 7, 9, 11, 13, 5
  // then repeats with +3 offset — keeps dailies varied but fair
  const dailyLevels = [4, 6, 8, 10, 12, 7, 9, 11, 13, 5,
                       7, 9, 11, 13, 15, 8, 10, 12, 14, 6,
                       10, 12, 14, 16, 11, 13, 15, 17, 12, 14];
  const level = dailyLevels[(dayNumber - 1) % dailyLevels.length];
  return generatePuzzle(level, dayNumber * 31 + level * 7);
}
