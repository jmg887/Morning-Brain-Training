// Test script to audit Pipe Flow puzzle generation
import { generatePipeSession, computeWaterFlow, isPuzzleSolved, getConnections, type PipeType, type Direction, type PipePuzzle } from '../src/lib/pipeGenerator';

const DIRS2: Direction[] = ['up', 'right', 'down', 'left'];

function testPipeTypeForConnections(connections: Direction[]): PipeType {
  const n = connections.length;
  if (n === 4) return 'cross';
  if (n === 3) return 'tee';
  if (n === 1) return 'dead';
  if (n === 2) {
    const sorted = [...connections].sort((a, b) => DIRS2.indexOf(a) - DIRS2.indexOf(b));
    const idx0 = DIRS2.indexOf(sorted[0]);
    const idx1 = DIRS2.indexOf(sorted[1]);
    if (Math.abs(idx0 - idx1) === 2) return 'straight';
    return 'bend';
  }
  return 'dead';
}

function testRotationForConnections(type: PipeType, connections: Direction[]): number {
  for (let rot = 0; rot < 4; rot++) {
    const conns = getConnections(type, rot);
    if (conns.length === connections.length &&
        conns.every(c => connections.includes(c))) {
      return rot;
    }
  }
  return 0;
}

// Test getConnections
console.log('=== CONNECTION MATRICES ===');
const types: PipeType[] = ['straight', 'bend', 'tee', 'cross', 'dead'];
for (const type of types) {
  console.log(`\n${type}:`);
  for (let rot = 0; rot < 4; rot++) {
    console.log(`  rot ${rot}: [${getConnections(type, rot).join(', ')}]`);
  }
}

// Test pipeTypeForConnections
console.log('\n=== pipeTypeForConnections ===');
const testCases: { conns: Direction[], expected: string }[] = [
  { conns: ['up', 'down'], expected: 'straight' },
  { conns: ['left', 'right'], expected: 'straight' },
  { conns: ['up', 'right'], expected: 'bend' },
  { conns: ['down', 'left'], expected: 'bend' },
  { conns: ['up', 'left'], expected: 'bend' },
  { conns: ['down', 'right'], expected: 'bend' },
  { conns: ['left', 'right', 'down'], expected: 'tee' },
  { conns: ['up', 'right', 'down'], expected: 'tee' },
  { conns: ['up', 'down', 'left', 'right'], expected: 'cross' },
  { conns: ['right'], expected: 'dead' },
  { conns: ['up'], expected: 'dead' },
];

for (const tc of testCases) {
  const result = testPipeTypeForConnections(tc.conns);
  const pass = result === tc.expected ? '✅' : '❌';
  console.log(`  ${pass} ${JSON.stringify(tc.conns)} → ${result} (expected ${tc.expected})`);
}

// Test rotationForConnections
console.log('\n=== rotationForConnections ===');
for (const tc of testCases) {
  const type = tc.conns.length === 4 ? 'cross' : tc.conns.length === 3 ? 'tee' : tc.conns.length === 2 ? testPipeTypeForConnections(tc.conns) : 'dead';
  const rot = testRotationForConnections(type, tc.conns);
  const actualConns = getConnections(type, rot);
  const match = actualConns.length === tc.conns.length && actualConns.every(c => tc.conns.includes(c));
  const pass = match ? '✅' : '❌';
  console.log(`  ${pass} type=${type} conns=${JSON.stringify(tc.conns)} → rot=${rot} → [${actualConns.join(', ')}]`);
}

// Full puzzle generation test
console.log('\n=== PUZZLE GENERATION TEST (seed=42) ===');
const rounds = generatePipeSession(42);
console.log(`Generated ${rounds.length} rounds`);

for (let ri = 0; ri < rounds.length; ri++) {
  const { puzzle } = rounds[ri];
  console.log(`\n--- Round ${ri + 1}: ${puzzle.gridSize}x${puzzle.gridSize} ---`);
  console.log(`Source: (${puzzle.sourceRow}, ${puzzle.sourceCol})`);
  console.log(`Drain: (${puzzle.drainRow}, ${puzzle.drainCol})`);

  for (let r = 0; r < puzzle.gridSize; r++) {
    const row: string[] = [];
    for (let c = 0; c < puzzle.gridSize; c++) {
      const cell = puzzle.grid[r][c];
      const conns = getConnections(cell.type, cell.rotation);
      const path = cell.isPath ? 'P' : '.';
      const src = cell.isSource ? 'S' : cell.isDrain ? 'D' : ' ';
      row.push(`${src}${path} ${cell.type.substring(0,3)} r${cell.rotation}/s${cell.solvedRotation} [${conns.join(',')}]`);
    }
    console.log(`  R${r}: ${row.join(' | ')}`);
  }

  const solved = isPuzzleSolved(puzzle);
  console.log(`  Already solved: ${solved}`);

  const flow = computeWaterFlow(puzzle);
  console.log(`  Water flow reaches ${flow.size} cells`);
  console.log(`  Drain connected: ${flow.has(`${puzzle.drainRow},${puzzle.drainCol}`)}`);

  // Verify solved rotations actually solve the puzzle
  const solvedPuzzle = JSON.parse(JSON.stringify(puzzle));
  for (let r = 0; r < solvedPuzzle.gridSize; r++) {
    for (let c = 0; c < solvedPuzzle.gridSize; c++) {
      solvedPuzzle.grid[r][c].rotation = solvedPuzzle.grid[r][c].solvedRotation;
    }
  }
  const solvedFlow = computeWaterFlow(solvedPuzzle);
  const solvedIsSolved = isPuzzleSolved(solvedPuzzle);
  console.log(`  Solved puzzle drain connected: ${solvedIsSolved}`);
  console.log(`  Solved water flow: ${solvedFlow.size} cells`);
  if (!solvedIsSolved) {
    console.log('  ❌❌❌ CRITICAL: Puzzle is NOT solvable!');
  }
}

// Multi-seed solvability test
console.log('\n=== MULTI-SEED SOLVABILITY TEST (200 seeds) ===');
let failures = 0;
let total = 0;
let alreadySolved = 0;
let missingRounds = 0;

for (let s = 0; s < 200; s++) {
  const testRounds = generatePipeSession(s);
  if (testRounds.length < 4) {
    missingRounds++;
    console.log(`  ⚠️  Seed ${s}: Only generated ${testRounds.length} rounds`);
  }
  for (let ri = 0; ri < testRounds.length; ri++) {
    total++;
    const { puzzle } = testRounds[ri];

    // Check solvability
    const sp = JSON.parse(JSON.stringify(puzzle));
    for (let r = 0; r < sp.gridSize; r++)
      for (let c = 0; c < sp.gridSize; c++)
        sp.grid[r][c].rotation = sp.grid[r][c].solvedRotation;

    if (!isPuzzleSolved(sp)) {
      failures++;
      console.log(`  ❌ Seed ${s} Round ${ri + 1}: NOT solvable!`);
    }

    if (isPuzzleSolved(puzzle)) {
      alreadySolved++;
      console.log(`  ⚠️  Seed ${s} Round ${ri + 1}: Already solved`);
    }
  }
}
console.log(`\nResults: ${total - failures}/${total} solvable (${failures} failures), ${alreadySolved} already solved, ${missingRounds} incomplete sessions`);
