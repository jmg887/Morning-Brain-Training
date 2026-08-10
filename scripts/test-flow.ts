import { generatePipeSession, traceFlowPath, getConnections } from '../src/lib/pipeGenerator.ts';

// Simulate the new flowTick logic
function simulateFlow(puzzle: ReturnType<typeof generatePipeSession>[0]['puzzle'], maxTicks: number = 20) {
  const steps = traceFlowPath(puzzle);
  let flowStep = 0;
  const filledCells = new Set<string>();
  let lives = 3;
  let paused = false;
  const events: string[] = [];

  for (let tick = 1; tick <= maxTicks; tick++) {
    if (paused) {
      events.push(`Tick ${tick}: PAUSED (waiting for player fix)`);
      // Simulate player fixing the pipe after 2 ticks
      if (tick === 3) {
        events.push(`  Player rotates a pipe to extend path`);
        paused = false;
        continue;
      }
      continue;
    }

    const freshSteps = traceFlowPath(puzzle);
    const nextStep = flowStep + 1;

    if (nextStep > freshSteps.length) {
      const lastStep = freshSteps[freshSteps.length - 1];
      if (lastStep?.isDeadEnd && !lastStep?.reachedDrain) {
        lives--;
        events.push(`Tick ${tick}: DEAD END at step ${flowStep}/${freshSteps.length} (lives: ${lives})`);
        if (lives <= 0) {
          events.push(`  Game over!`);
          break;
        }
        paused = true;
      } else {
        events.push(`Tick ${tick}: No more steps but not a dead end (drain reached?)`);
        break;
      }
      continue;
    }

    for (let i = 0; i < nextStep && i < freshSteps.length; i++) {
      filledCells.add(`${freshSteps[i].row},${freshSteps[i].col}`);
    }
    flowStep = nextStep;

    const reachedStep = freshSteps[Math.min(nextStep - 1, freshSteps.length - 1)];
    if (reachedStep?.reachedDrain) {
      events.push(`Tick ${tick}: DRAIN REACHED at [${reachedStep.row},${reachedStep.col}] (steps: ${flowStep})`);
      break;
    }
    events.push(`Tick ${tick}: Filled [${reachedStep.row},${reachedStep.col}] (step ${flowStep}/${freshSteps.length})`);
  }

  return { events, filledCells: [...filledCells], lives, flowStep };
}

// Test with seed 42
const rounds = generatePipeSession(42);
console.log('=== Flow Mode Simulation ===\n');

for (let i = 0; i < rounds.length; i++) {
  const r = rounds[i];
  const p = r.puzzle;
  console.log(`--- Round ${i+1} (${p.gridSize}x${p.gridSize}) ---`);
  console.log(`Source: [${p.sourceRow},${p.sourceCol}]  Drain: [${p.drainRow},${p.drainCol}]`);
  
  const steps = traceFlowPath(p);
  console.log(`Traceable path: ${steps.length} steps`);
  
  const sim = simulateFlow(p, 15);
  for (const event of sim.events) {
    console.log(`  ${event}`);
  }
  console.log();
}

// Key test: the first tick should FILL the source, not dead-end immediately
console.log('=== Key Behavior Test ===');
const p = rounds[0].puzzle;
const steps = traceFlowPath(p);
console.log(`Path length: ${steps.length}`);
console.log(`Step 0 isDeadEnd: ${steps[0]?.isDeadEnd}`);
console.log(`With NEW logic: Tick 1 fills step 0, dead end detected at tick 2 (nextStep > steps.length)`);
console.log(`With OLD logic: Tick 1 would immediately dead-end (steps[0].isDeadEnd && flowStep===0)`);
