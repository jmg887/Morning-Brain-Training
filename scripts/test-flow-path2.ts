// Verify: source always has 'left' and drain always has 'right' after fix
import { generatePipeSession, traceFlowPath, getConnections } from '../src/lib/pipeGenerator';

let sourceLeftFail = 0;
let drainRightFail = 0;
let sourceDeadEnd = 0;
let nextCellDeadEnd = 0;
let longPaths = 0;

for (let t = 0; t < 50; t++) {
  const rs = generatePipeSession();
  const r = rs[0];
  if (!r) continue;
  const { puzzle } = r;

  // Check source has 'left'
  const srcConns = getConnections(puzzle.grid[puzzle.sourceRow][puzzle.sourceCol].type, puzzle.grid[puzzle.sourceRow][puzzle.sourceCol].rotation);
  if (!srcConns.includes('left')) sourceLeftFail++;

  // Check drain has 'right'
  const drnConns = getConnections(puzzle.grid[puzzle.drainRow][puzzle.drainCol].type, puzzle.grid[puzzle.drainRow][puzzle.drainCol].rotation);
  if (!drnConns.includes('right')) drainRightFail++;

  const steps = traceFlowPath(puzzle);
  const firstDeadEnd = steps.findIndex(s => s.isDeadEnd);

  if (firstDeadEnd === 0) {
    // Check if it's because source has no 'left' or because next cell doesn't connect
    if (steps[0].exitDir === null && steps[0].entryDir === null) {
      sourceDeadEnd++;
    } else {
      nextCellDeadEnd++;
    }
  }
  if (steps.length >= 3) longPaths++;
}

console.log(`=== 50 puzzles ===`);
console.log(`Source missing 'left': ${sourceLeftFail}/50`);
console.log(`Drain missing 'right': ${drainRightFail}/50`);
console.log(`Source dead-end (no 'left'): ${sourceDeadEnd}/50`);
console.log(`Step 0 dead-end (next cell no match): ${nextCellDeadEnd}/50`);
console.log(`Paths >= 3 steps: ${longPaths}/50`);
