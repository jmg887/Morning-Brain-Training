export interface CircuitPuzzle {
  id: number;
  gridSize: 4 | 5;
  difficulty: 1 | 2 | 3;
  pairs: {
    color: string;
    colorHex: string;
    start: [number, number];
    end: [number, number];
  }[];
  blockers: [number, number][];
  // Optimal solution path for each color (for scoring reference)
  optimalPaths: Record<string, [number, number][]>;
}

/*
  All puzzles hand-crafted and verified:
  - Paths use only adjacent cells (up/down/left/right)
  - No two paths share a cell
  - No path goes through a blocker
  - Each path connects its start dot to its end dot
*/

export const CIRCUIT_PUZZLES: CircuitPuzzle[] = [
  // ─── Puzzle 1: 4x4 tutorial (straight lines) ───
  {
    id: 1,
    gridSize: 4,
    difficulty: 1,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [0, 0], end: [3, 0] },
      { color: 'blue', colorHex: '#1CB0F6', start: [0, 3], end: [3, 3] },
    ],
    blockers: [],
    optimalPaths: {
      red: [[0, 0], [1, 0], [2, 0], [3, 0]],
      blue: [[0, 3], [1, 3], [2, 3], [3, 3]],
    },
  },

  // ─── Puzzle 2: 4x4 easy (detour around blockers) ───
  {
    id: 2,
    gridSize: 4,
    difficulty: 1,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [0, 1], end: [3, 1] },
      { color: 'blue', colorHex: '#1CB0F6', start: [0, 2], end: [3, 2] },
    ],
    blockers: [[1, 1], [2, 2]],
    optimalPaths: {
      red: [[0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
      blue: [[0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2]],
    },
  },

  // ─── Puzzle 3: 5x5 easy (S-curve + straight) ───
  {
    id: 3,
    gridSize: 5,
    difficulty: 1,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [0, 0], end: [4, 0] },
      { color: 'blue', colorHex: '#1CB0F6', start: [0, 3], end: [4, 3] },
    ],
    blockers: [[1, 1], [3, 3]],
    optimalPaths: {
      red: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 1], [4, 0]],
      blue: [[0, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3]],
    },
  },

  // ─── Puzzle 4: 5x5 medium (snake vs straight) ───
  {
    id: 4,
    gridSize: 5,
    difficulty: 2,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [0, 0], end: [4, 2] },
      { color: 'blue', colorHex: '#1CB0F6', start: [0, 4], end: [4, 3] },
    ],
    blockers: [[4, 1]],
    optimalPaths: {
      red: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2]],
      blue: [[0, 4], [0, 3], [0, 2], [0, 1], [1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 4], [4, 4], [4, 3]],
    },
  },

  // ─── Puzzle 5: 5x5 medium (parallel detours) ───
  {
    id: 5,
    gridSize: 5,
    difficulty: 2,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [0, 0], end: [4, 0] },
      { color: 'blue', colorHex: '#1CB0F6', start: [0, 4], end: [0, 3] },
    ],
    blockers: [[3, 0]],
    optimalPaths: {
      red: [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [4, 0]],
      blue: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [3, 2], [2, 2], [2, 3], [1, 3], [0, 3]],
    },
  },

  // ─── Puzzle 6: 5x5 medium (wraparound) ───
  {
    id: 6,
    gridSize: 5,
    difficulty: 2,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [0, 2], end: [4, 2] },
      { color: 'blue', colorHex: '#1CB0F6', start: [0, 3], end: [4, 3] },
    ],
    blockers: [[1, 2], [0, 4]],
    optimalPaths: {
      red: [[0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [4, 2]],
      blue: [[0, 3], [1, 3], [2, 3], [2, 4], [3, 4], [4, 4], [4, 3]],
    },
  },

  // ─── Puzzle 7: 5x5 medium (U-shape vs zigzag) ───
  {
    id: 7,
    gridSize: 5,
    difficulty: 2,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [2, 0], end: [2, 4] },
      { color: 'blue', colorHex: '#1CB0F6', start: [4, 0], end: [1, 3] },
    ],
    blockers: [[1, 1], [3, 0]],
    optimalPaths: {
      red: [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4]],
      blue: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [3, 4], [3, 3], [3, 2], [3, 1], [2, 1], [2, 2], [2, 3], [1, 3]],
    },
  },

  // ─── Puzzle 8: 5x5 medium (C-shapes) ───
  {
    id: 8,
    gridSize: 5,
    difficulty: 2,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [0, 0], end: [4, 0] },
      { color: 'blue', colorHex: '#1CB0F6', start: [0, 4], end: [4, 1] },
    ],
    blockers: [[1, 0], [2, 0], [1, 2], [2, 2]],
    optimalPaths: {
      red: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [4, 0]],
      blue: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1]],
    },
  },

  // ─── Puzzle 9: 5x5 hard (3 color pairs!) ───
  {
    id: 9,
    gridSize: 5,
    difficulty: 3,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [0, 0], end: [4, 0] },
      { color: 'green', colorHex: '#58CC02', start: [0, 4], end: [4, 4] },
      { color: 'blue', colorHex: '#1CB0F6', start: [2, 1], end: [4, 3] },
    ],
    blockers: [[1, 1], [3, 2]],
    optimalPaths: {
      red: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
      green: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]],
      blue: [[2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3]],
    },
  },

  // ─── Puzzle 10: 5x5 hard (long winding paths) ───
  {
    id: 10,
    gridSize: 5,
    difficulty: 3,
    pairs: [
      { color: 'red', colorHex: '#FF3B30', start: [0, 0], end: [1, 0] },
      { color: 'blue', colorHex: '#1CB0F6', start: [4, 0], end: [3, 0] },
    ],
    blockers: [[1, 1], [1, 2], [1, 3]],
    optimalPaths: {
      red: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [2, 1], [2, 0], [1, 0]],
      blue: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0]],
    },
  },
];
