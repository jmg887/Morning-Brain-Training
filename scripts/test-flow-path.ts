// Quick test: generate a puzzle, trace the flow, print the steps
import { generatePipeSession, traceFlowPath, getConnections } from '../src/lib/pipeGenerator';

const rounds = generatePipeSession();
const round = rounds[0];
if (!round) { console.log('No rounds generated'); process.exit(1); }

const { puzzle } = round;
console.log(`Grid: ${puzzle.gridSize}x${puzzle.gridSize}`);
console.log(`Source: (${puzzle.sourceRow}, ${puzzle.sourceCol})`);
console.log(`Drain: (${puzzle.drainRow}, ${puzzle.drainCol})`);
console.log('');

// Show source cell info
const srcCell = puzzle.grid[puzzle.sourceRow][puzzle.sourceCol];
const srcConns = getConnections(srcCell.type, srcCell.rotation);
console.log(`Source type: ${srcCell.type}, rotation: ${srcCell.rotation}, connections: [${srcConns.join(', ')}]`);
console.log(`Source has 'left': ${srcConns.includes('left')}`);
console.log('');

// Trace the flow path
const steps = traceFlowPath(puzzle);
console.log(`Flow path has ${steps.length} steps:`);
for (let i = 0; i < steps.length; i++) {
  const s = steps[i];
  const cell = puzzle.grid[s.row][s.col];
  const conns = getConnections(cell.type, cell.rotation);
  console.log(
    `  Step ${i}: (${s.row},${s.col}) type=${cell.type} rot=${cell.rotation} conns=[${conns.join(',')}] ` +
    `entry=${s.entryDir ?? 'null'} exit=${s.exitDir ?? 'null'} ` +
    `deadEnd=${s.isDeadEnd} reachedDrain=${s.reachedDrain}`
  );
}

// Check if the cell after step 0 connects back
if (steps.length >= 1 && steps[0].exitDir) {
  const s0 = steps[0];
  const exitDir: string = s0.exitDir as string;
  const DR: Record<string, [number, number]> = {
    up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
  };
  const OPPOSITE: Record<string, string> = {
    up: 'down', down: 'up', left: 'right', right: 'left',
  };
  const [dr, dc] = DR[exitDir];
  const nr = s0.row + dr;
  const nc = s0.col + dc;
  if (nr >= 0 && nr < puzzle.gridSize && nc >= 0 && nc < puzzle.gridSize) {
    const neighbor = puzzle.grid[nr][nc];
    const nConns = getConnections(neighbor.type, neighbor.rotation);
    const needsDir = OPPOSITE[exitDir];
    console.log(`\n  Step 0 exits '${s0.exitDir}' → neighbor (${nr},${nc}) type=${neighbor.type} rot=${neighbor.rotation} conns=[${nConns.join(',')}]`);
    console.log(`  Neighbor needs '${needsDir}' connection: ${nConns.includes(needsDir) ? 'YES ✓' : 'NO ✗ ← DEAD END'}`);
  }
}

// Run 10 times to see if flow always hits dead ends immediately
console.log('\n--- 10 random puzzles ---');
for (let t = 0; t < 10; t++) {
  const rs = generatePipeSession();
  const r = rs[0];
  if (!r) continue;
  const st = traceFlowPath(r.puzzle);
  const firstDeadEnd = st.findIndex(s => s.isDeadEnd);
  console.log(`  Puzzle ${t+1}: ${st.length} steps, first dead-end at step ${firstDeadEnd === -1 ? 'none (solved!)' : firstDeadEnd}`);
}
