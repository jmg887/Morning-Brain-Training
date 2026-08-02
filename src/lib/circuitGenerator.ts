// ─── Circuit Connect Puzzle Generator ─────────────────────────────────
//
// Strategy: Generate a Hamiltonian path (visits every cell exactly once)
// via randomized DFS, then cut it into N segments.
// Each segment becomes a color pair. This guarantees:
//   - Every cell is fillable (perfect puzzle)
//   - No crossings (segments of a single path)
//   - Always solvable (the path IS the solution)
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
  difficulty: number;
  pairs: GeneratedPair[];
  solutionPaths: Record<string, [number, number][]>;
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

// ─── Difficulty configs ──────────────────────────────────────────────────────

export interface DifficultyConfig {
  gridSize: number;
  numPairs: number;
  label: string;
}

export const DIFFICULTY_CONFIGS: Record<number, DifficultyConfig> = {
  1: { gridSize: 5, numPairs: 3, label: 'Easy' },
  2: { gridSize: 6, numPairs: 5, label: 'Medium' },
  3: { gridSize: 7, numPairs: 7, label: 'Hard' },
};

// ─── Hamiltonian Path Generator (randomized DFS) ─────────────────────────────
//
// Uses Warnsdorff's heuristic with random tie-breaking:
// prefer cells with fewer unvisited neighbors to reduce backtracking.
//

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

  // Start from a random cell
  const startR = Math.floor(rng() * gridSize);
  const startC = Math.floor(rng() * gridSize);

  // Warnsdorff: count unvisited neighbors for a cell
  const countUnvisited = (r: number, c: number): number => {
    let count = 0;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr,
        nc = c + dc;
      if (
        nr >= 0 &&
        nr < gridSize &&
        nc >= 0 &&
        nc < gridSize &&
        !visited[nr][nc]
      ) {
        count++;
      }
    }
    return count;
  };

  function dfs(r: number, c: number): boolean {
    visited[r][c] = true;
    path.push([r, c]);

    if (path.length === total) return true;

    // Collect unvisited neighbors
    const neighbors: [number, number][] = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr,
        nc = c + dc;
      if (
        nr >= 0 &&
        nr < gridSize &&
        nc >= 0 &&
        nc < gridSize &&
        !visited[nr][nc]
      ) {
        neighbors.push([nr, nc]);
      }
    }

    // Warnsdorff: sort by fewest unvisited neighbors (ascending)
    // with random tie-breaking
    neighbors.sort((a, b) => {
      const ca = countUnvisited(a[0], a[1]);
      const cb = countUnvisited(b[0], b[1]);
      if (ca !== cb) return ca - cb;
      return rng() - 0.5; // random tie-break
    });

    for (const [nr, nc] of neighbors) {
      if (dfs(nr, nc)) return true;
    }

    // Backtrack
    visited[r][c] = false;
    path.pop();
    return false;
  }

  return dfs(startR, startC) ? path : null;
}

// ─── Path Segment Cutter ─────────────────────────────────────────────────────
//
// Cuts a Hamiltonian path into N segments, each of length >= minLen.
// Each segment becomes one color pair.
//

function cutIntoSegments(
  path: [number, number][],
  numSegments: number,
  rng: () => number,
  minLen = 2
): [number, number][][] | null {
  const n = path.length;
  if (n < numSegments * minLen) return null;

  // Place numSegments-1 dividers. A divider at position d means:
  //   segment ends at path[d], next segment starts at path[d+1]
  // Constraints:
  //   - d[0] >= minLen - 1  (first segment has minLen cells: 0..d[0])
  //   - d[i] >= d[i-1] + minLen  (each segment has >= minLen cells)
  //   - d[last] <= n - minLen  (last segment has >= minLen cells)

  const dividers: number[] = [];
  let low = minLen - 1; // minimum position for first divider

  for (let i = 0; i < numSegments - 1; i++) {
    const remaining = numSegments - 1 - i;
    const high = n - minLen * remaining - 1; // leave room for remaining segments
    if (low > high) return null;

    const d = low + Math.floor(rng() * (high - low + 1));
    dividers.push(d);
    low = d + minLen;
  }

  // Build segments from dividers
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
 * Generate a Circuit Connect puzzle.
 *
 * @param difficulty  1 (easy 5x5, 3 pairs), 2 (medium 6x6, 5 pairs), 3 (hard 7x7, 7 pairs)
 * @param seed        Optional seed for deterministic generation (daily mode)
 * @returns Generated puzzle, or null if generation failed after MAX_ATTEMPTS
 */
export function generatePuzzle(
  difficulty: number = 2,
  seed?: number
): GeneratedPuzzle | null {
  const config = DIFFICULTY_CONFIGS[difficulty];
  if (!config) return null;

  const baseRng = seed != null ? createSeededRandom(seed) : Math.random;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Each attempt gets a slightly different RNG state
    // (for seeded mode, advance the seed; for random mode, just retry)
    const rng = seed != null
      ? createSeededRandom(seed + attempt * 7919) // prime offset for variety
      : baseRng;

    // Step 1: Generate Hamiltonian path
    const path = generateHamiltonianPath(config.gridSize, rng);
    if (!path) continue;

    // Step 2: Cut into segments
    const segments = cutIntoSegments(path, config.numPairs, rng);
    if (!segments) continue;

    // Step 3: Shuffle color assignment so it's not always the same
    // color on the same segment position
    const colorOrder = shuffleArray(
      COLORS.slice(0, config.numPairs),
      rng
    );

    // Step 4: Build pairs and solution paths
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
      difficulty,
      pairs,
      solutionPaths,
    };
  }

  return null; // All attempts failed
}

/**
 * Generate a daily puzzle using today's seed.
 * Tries multiple difficulty levels until one succeeds.
 */
export function generateDailyPuzzle(dayNumber: number): GeneratedPuzzle | null {
  // Try difficulty 2 first, fall back to 1, then 3
  const order = [2, 1, 3];
  for (const diff of order) {
    const puzzle = generatePuzzle(diff, dayNumber * 31 + diff * 7);
    if (puzzle) return puzzle;
  }
  return null;
}
