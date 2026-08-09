// ─── Pipe Flow Puzzle Generator ──────────────────────────────────────────────
// Generates rotation-based pipe puzzles where all pieces are pre-placed
// but randomly rotated. The player taps pieces to rotate them and restore
// the water flow from source to drain.

import { createSeededRandom, seededShuffle } from './seededRandom';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Base pipe types and their connections at rotation 0 */
export type PipeType = 'straight' | 'bend' | 'tee' | 'cross' | 'dead';

export interface PipeCell {
  type: PipeType;
  /** Current rotation (0-3, each = 90° clockwise) */
  rotation: number;
  /** The solved rotation (for daily mode verification) */
  solvedRotation: number;
  /** Is this cell part of the solution path? */
  isPath: boolean;
  /** Special markers */
  isSource: boolean;
  isDrain: boolean;
}

export interface PipePuzzle {
  gridSize: number;
  grid: PipeCell[][];
  sourceRow: number;
  sourceCol: number;
  drainRow: number;
  drainCol: number;
  difficulty: number;
}

// ─── Direction Math ──────────────────────────────────────────────────────────

// Order must be: 0=top, 1=right, 2=bottom, 3=left (clockwise from top)
// This is critical for pipeTypeForConnections to correctly identify straight vs bend
const DIRS: Direction[] = ['up', 'right', 'down', 'left'];
const DR: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};
const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

/** Get the connections a pipe type has at a given rotation */
export function getConnections(type: PipeType, rotation: number): Direction[] {
  const base: Direction[] = [];
  switch (type) {
    case 'straight': base.push('left', 'right'); break;
    case 'bend':    base.push('up', 'right'); break;
    case 'tee':     base.push('left', 'right', 'down'); break;
    case 'cross':   base.push('up', 'down', 'left', 'right'); break;
    case 'dead':    base.push('right'); break;
  }
  // Rotate: each step rotates 90° clockwise
  const result = base.map(d => {
    let idx = DIRS.indexOf(d);
    idx = (idx + rotation) % 4;
    return DIRS[idx];
  });
  return result;
}

/** Determine which pipe type fits a set of required connections */
function pipeTypeForConnections(connections: Direction[]): PipeType {
  const n = connections.length;
  if (n === 4) return 'cross';
  if (n === 3) return 'tee';
  if (n === 1) return 'dead';
  if (n === 2) {
    const sorted = [...connections].sort((a, b) => DIRS.indexOf(a) - DIRS.indexOf(b));
    const idx0 = DIRS.indexOf(sorted[0]);
    const idx1 = DIRS.indexOf(sorted[1]);
    // Opposite sides (0-2 or 1-3) = straight
    if (Math.abs(idx0 - idx1) === 2) return 'straight';
    return 'bend';
  }
  return 'dead'; // fallback
}

/** Find the rotation needed for a pipe type to produce given connections */
function rotationForConnections(type: PipeType, connections: Direction[]): number {
  for (let rot = 0; rot < 4; rot++) {
    const conns = getConnections(type, rot);
    if (conns.length === connections.length &&
        conns.every(c => connections.includes(c))) {
      return rot;
    }
  }
  return 0; // fallback
}

// ─── Path Generation ───────────────────────────────────────────────────────

interface Pos { row: number; col: number; }

/** Generate a random path from source to drain on the grid */
function generatePath(
  size: number,
  source: Pos,
  drain: Pos,
  rng: () => number,
  maxAttempts: number = 200
): Pos[] | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const path = findPath(size, source, drain, rng);
    if (path && path.length >= Math.floor(size * 1.5)) return path;
  }
  return null;
}

function findPath(
  size: number,
  source: Pos,
  drain: Pos,
  rng: () => number
): Pos[] | null {
  // DFS with random neighbor ordering
  const visited = new Set<string>();
  const path: Pos[] = [];

  function key(p: Pos) { return `${p.row},${p.col}`; }

  function dfs(current: Pos): boolean {
    if (current.row === drain.row && current.col === drain.col) {
      path.push(current);
      return true;
    }

    visited.add(key(current));
    path.push(current);

    // Get valid neighbors, shuffle with bias toward drain
    const neighbors: Pos[] = [];
    for (const dir of DIRS) {
      const [dr, dc] = DR[dir];
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(key({ row: nr, col: nc }))) {
        neighbors.push({ row: nr, col: nc });
      }
    }

    // Sort with bias toward drain (Manhattan distance) for more interesting paths
    neighbors.sort((a, b) => {
      const distA = Math.abs(a.row - drain.row) + Math.abs(a.col - drain.col);
      const distB = Math.abs(b.row - drain.row) + Math.abs(b.col - drain.col);
      // Mix: sometimes prefer closer, sometimes random
      return rng() < 0.6 ? distA - distB : (rng() - 0.5);
    });

    for (const next of neighbors) {
      if (dfs(next)) return true;
    }

    path.pop();
    return false;
  }

  return dfs(source) ? path : null;
}

// ─── Puzzle Builder ─────────────────────────────────────────────────────────

function buildPuzzle(size: number, rng: () => number): PipePuzzle | null {
  // Place source on left edge, drain on right edge
  const sourceRow = 1 + Math.floor(rng() * (size - 2));
  const drainRow = 1 + Math.floor(rng() * (size - 2));
  const source: Pos = { row: sourceRow, col: 0 };
  const drain: Pos = { row: drainRow, col: size - 1 };

  // Generate path
  const path = generatePath(size, source, drain, rng);
  if (!path) return null;

  // Build the grid
  const grid: PipeCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      type: 'dead',
      rotation: 0,
      solvedRotation: 0,
      isPath: false,
      isSource: false,
      isDrain: false,
    }))
  );

  // Set path cells
  const pathSet = new Set(path.map(p => `${p.row},${p.col}`));

  // Determine connections for each path cell
  const pathConnections = new Map<string, Direction[]>();

  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const conns: Direction[] = [];

    if (i === 0) {
      // Source: enters from left (outside grid) + connects to next cell
      conns.push('left'); // entry from outside
      const next = path[i + 1];
      if (next.col > p.col) conns.push('right');
      else if (next.col < p.col) conns.push('left');
      else if (next.row > p.row) conns.push('down');
      else if (next.row < p.row) conns.push('up');
    } else if (i === path.length - 1) {
      // Drain: connects to prev cell + exits right (outside grid)
      const prev = path[i - 1];
      if (prev.col > p.col) conns.push('right');
      else if (prev.col < p.col) conns.push('left');
      else if (prev.row > p.row) conns.push('down');
      else if (prev.row < p.row) conns.push('up');
      conns.push('right'); // exit to outside
    } else {
      // Middle: connects to prev and next
      const prev = path[i - 1];
      if (prev.col > p.col) conns.push('right');
      else if (prev.col < p.col) conns.push('left');
      else if (prev.row > p.row) conns.push('down');
      else if (prev.row < p.row) conns.push('up');

      const next = path[i + 1];
      if (next.col > p.col) conns.push('right');
      else if (next.col < p.col) conns.push('left');
      else if (next.row > p.row) conns.push('down');
      else if (next.row < p.row) conns.push('up');
    }

    // Remove duplicate directions (source going right from col 0)
    const uniqueConns = [...new Set(conns)];
    pathConnections.set(`${p.row},${p.col}`, uniqueConns);
  }

  // Fill path cells with correct pipe types and rotations
  for (const [key, conns] of pathConnections) {
    const [r, c] = key.split(',').map(Number);
    const type = pipeTypeForConnections(conns);
    const solvedRotation = rotationForConnections(type, conns);
    grid[r][c] = {
      type,
      rotation: solvedRotation,
      solvedRotation,
      isPath: true,
      isSource: r === source.row && c === source.col,
      isDrain: r === drain.row && c === drain.col,
    };
  }

  // Fill non-path cells with random pipes
  const nonPathTypes: PipeType[] = ['straight', 'bend', 'tee'];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!pathSet.has(`${r},${c}`)) {
        const type = nonPathTypes[Math.floor(rng() * nonPathTypes.length)];
        const rotation = Math.floor(rng() * 4);
        grid[r][c] = {
          type,
          rotation,
          solvedRotation: rotation,
          isPath: false,
          isSource: false,
          isDrain: false,
        };
      }
    }
  }

  // Randomly rotate ALL cells (both path and non-path)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const rotations = 1 + Math.floor(rng() * 3); // 1-3 random rotations
      const cell = grid[r][c];
      cell.rotation = (cell.rotation + rotations) % 4;
    }
  }

  // Calculate difficulty based on grid size and path length
  const difficulty = size <= 4 ? 1 : size <= 5 ? 2 : 3;

  return {
    gridSize: size,
    grid,
    sourceRow: source.row,
    sourceCol: source.col,
    drainRow: drain.row,
    drainCol: drain.col,
    difficulty,
  };
}

// ─── Water Flow Check ──────────────────────────────────────────────────────

/** Check which cells are connected to the source via properly aligned pipes.
 *  Water enters the source from the left edge, so the source MUST have a 'left' connection.
 *  Water exits the drain to the right edge, so the drain MUST have a 'right' connection.
 */
export function computeWaterFlow(puzzle: PipePuzzle): Set<string> {
  const { grid, sourceRow, sourceCol, drainRow, drainCol } = puzzle;
  const size = puzzle.gridSize;
  const connected = new Set<string>();

  // Source must have a 'left' connection for water to enter from outside
  const sourceCell = grid[sourceRow][sourceCol];
  const sourceConns = getConnections(sourceCell.type, sourceCell.rotation);
  if (!sourceConns.includes('left')) return connected; // no water can enter

  // Drain must have a 'right' connection for water to exit to outside
  const drainCell = grid[drainRow][drainCol];
  const drainConns = getConnections(drainCell.type, drainCell.rotation);
  const drainCanExit = drainConns.includes('right');

  const queue: Pos[] = [{ row: sourceRow, col: sourceCol }];
  connected.add(`${sourceRow},${sourceCol}`);

  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    const cell = grid[row][col];
    const conns = getConnections(cell.type, cell.rotation);

    for (const dir of conns) {
      const [dr, dc] = DR[dir];
      const nr = row + dr;
      const nc = col + dc;
      const nKey = `${nr},${nc}`;

      // Check if neighbor exists and connects back
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !connected.has(nKey)) {
        const neighbor = grid[nr][nc];
        const neighborConns = getConnections(neighbor.type, neighbor.rotation);
        if (neighborConns.includes(OPPOSITE[dir])) {
          connected.add(nKey);
          queue.push({ row: nr, col: nc });
        }
      }
    }
  }

  // If drain can't exit right, remove it from connected set
  // (water reaches the drain cell but can't flow out)
  if (!drainCanExit) {
    connected.delete(`${drainRow},${drainCol}`);
  }

  return connected;
}

/** Check if the puzzle is solved (source connects to drain with valid entry/exit) */
export function isPuzzleSolved(puzzle: PipePuzzle): boolean {
  // Source must have 'left' connection, drain must have 'right' connection
  const sourceCell = puzzle.grid[puzzle.sourceRow][puzzle.sourceCol];
  const sourceConns = getConnections(sourceCell.type, sourceCell.rotation);
  if (!sourceConns.includes('left')) return false;

  const drainCell = puzzle.grid[puzzle.drainRow][puzzle.drainCol];
  const drainConns = getConnections(drainCell.type, drainCell.rotation);
  if (!drainConns.includes('right')) return false;

  const flow = computeWaterFlow(puzzle);
  return flow.has(`${puzzle.drainRow},${puzzle.drainCol}`);
}

// ─── Flow Mode: Ordered Path Tracer ──────────────────────────────────────

export interface FlowStep {
  row: number;
  col: number;
  /** Direction the flow entered this cell from (null for source) */
  entryDir: Direction | null;
  /** Direction the flow exits this cell toward (null if dead end or drain exit) */
  exitDir: Direction | null;
  /** The outgoing direction that would continue the flow */
  nextDir: Direction | null;
  /** Whether the flow reached the drain at this step */
  reachedDrain: boolean;
  /** Whether this is a dead end (flow can't continue) */
  isDeadEnd: boolean;
}

/**
 * Trace the flow path step-by-step from the source.
 * Returns ordered steps the liquid follows through connected pipes.
 * Stops at the drain, at a dead end, or at maxSteps.
 * Re-tracing after each pipe rotation lets Flow mode animate liquid advancing.
 */
export function traceFlowPath(puzzle: PipePuzzle, maxSteps: number = 50): FlowStep[] {
  const { grid, sourceRow, sourceCol, drainRow, drainCol } = puzzle;
  const size = puzzle.gridSize;
  const steps: FlowStep[] = [];
  const visited = new Set<string>();

  let curRow = sourceRow;
  let curCol = sourceCol;
  let entryDir: Direction | null = null; // source is entered from "outside left"

  for (let i = 0; i < maxSteps; i++) {
    const key = `${curRow},${curCol}`;
    if (visited.has(key)) break; // loop detected
    visited.add(key);

    const cell = grid[curRow][curCol];
    const conns = getConnections(cell.type, cell.rotation);

    const isDrain = curRow === drainRow && curCol === drainCol;
    const isSource = curRow === sourceRow && curCol === sourceCol;

    // Source MUST have a 'left' connection for water to enter from outside the grid.
    // If it doesn't, flow can't start — this is a dead end at step 0.
    if (isSource && !conns.includes('left')) {
      steps.push({
        row: curRow, col: curCol, entryDir: null, exitDir: null, nextDir: null,
        reachedDrain: false, isDeadEnd: true,
      });
      break;
    }

    // Determine exit: the flow came from entryDir, so it exits through another connection
    // Special: source enters from 'left' (outside grid)
    const effectiveEntry: Direction = isSource ? 'left' : (entryDir as Direction);
    const exitDirs: Direction[] = conns.filter((d: Direction) => d !== effectiveEntry);

    // For drain: if connected, flow exits to 'right' (outside grid)
    let exitDir: Direction | null = null;
    let nextDir: Direction | null = null;
    let reachedDrain = false;
    let isDeadEnd = false;

    // For drain: flow must enter from a valid direction AND exit to 'right'
    // The drain must have a 'right' connection to let water out of the grid
    if (isDrain) {
      if (conns.includes('right') && conns.includes(effectiveEntry)) {
        // Flow enters from effectiveEntry and exits right — success!
        exitDir = 'right';
        nextDir = null;
        reachedDrain = true;
      } else if (conns.includes('right')) {
        // Has right exit but wrong entry — still count as reached drain
        // (water found the drain even if entry direction is unusual)
        exitDir = 'right';
        nextDir = null;
        reachedDrain = true;
      } else {
        // Drain has no 'right' connection — dead end
        isDeadEnd = true;
      }
    } else if (exitDirs.length > 0) {
      // Pick the first available exit (in a real pipe there's only one meaningful exit
      // that isn't where we came from — but tees/crosses have multiple)
      // For flow mode, we follow the first connection that has a matching neighbor
      let foundNext = false;
      for (const dir of exitDirs) {
        const [dr, dc] = DR[dir];
        const nr = curRow + dr;
        const nc = curCol + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const neighbor = grid[nr][nc];
          const neighborConns = getConnections(neighbor.type, neighbor.rotation);
          if (neighborConns.includes(OPPOSITE[dir])) {
            exitDir = dir;
            nextDir = dir;
            foundNext = true;
            break;
          }
        }
      }
      if (!foundNext) {
        isDeadEnd = true;
      }
    } else {
      isDeadEnd = true;
    }

    steps.push({
      row: curRow, col: curCol, entryDir, exitDir, nextDir,
      reachedDrain, isDeadEnd,
    });

    if (reachedDrain || isDeadEnd) break;

    // Advance to next cell
    if (nextDir) {
      const [dr, dc] = DR[nextDir];
      entryDir = OPPOSITE[nextDir];
      curRow += dr;
      curCol += dc;
    } else {
      break;
    }
  }

  return steps;
}

// ─── Public API ──────────────────────────────────────────────────────────────

const ROUND_CONFIGS = [
  { gridSize: 4, time: 90 },  // Round 1: 4x4, 90s
  { gridSize: 5, time: 105 }, // Round 2: 5x5, 105s
  { gridSize: 5, time: 95 },  // Round 3: 5x5, 95s
  { gridSize: 6, time: 120 }, // Round 4: 6x6, 120s
];

export interface PipeRound {
  puzzle: PipePuzzle;
  roundTime: number;
  roundIndex: number;
}

/** Generate a full session of pipe puzzles */
export function generatePipeSession(seed?: number): PipeRound[] {
  const rng = seed !== undefined ? createSeededRandom(seed) : () => Math.random();
  const rounds: PipeRound[] = [];

  for (let i = 0; i < ROUND_CONFIGS.length; i++) {
    const config = ROUND_CONFIGS[i];
    let puzzle: PipePuzzle | null = null;

    // Try multiple times to generate a valid puzzle
    for (let attempt = 0; attempt < 50; attempt++) {
      puzzle = buildPuzzle(config.gridSize, rng);
      if (puzzle) break;
    }

    if (!puzzle) continue; // Skip if generation fails (very unlikely)

    // Ensure the puzzle isn't already solved after random rotation
    let safety = 0;
    while (isPuzzleSolved(puzzle) && safety < 20) {
      // Rotate a random path cell
      const { grid, sourceRow, sourceCol, drainRow, drainCol, gridSize } = puzzle;
      const pathCells: Pos[] = [];
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (grid[r][c].isPath && !(r === sourceRow && c === sourceCol) && !(r === drainRow && c === drainCol)) {
            pathCells.push({ row: r, col: c });
          }
        }
      }
      if (pathCells.length > 0) {
        const target = pathCells[Math.floor(rng() * pathCells.length)];
        grid[target.row][target.col].rotation = (grid[target.row][target.col].rotation + 1 + Math.floor(rng() * 2)) % 4;
      }
      safety++;
    }

    rounds.push({
      puzzle,
      roundTime: config.time,
      roundIndex: i,
    });
  }

  return rounds;
}
