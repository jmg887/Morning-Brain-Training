'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore, type PipeMode } from '@/store/useGameStore';
import { generatePipeSession, computeWaterFlow, isPuzzleSolved, getConnections, traceFlowPath, type PipeRound, type PipePuzzle, type Direction } from '@/lib/pipeGenerator';
import { dateToSeed, getTodaySeedStr } from '@/lib/seededRandom';

// ─── Constants ──────────────────────────────────────────────────────────────────

const ACCENT = '#FF9600';
const ACCENT_LIGHT = '#FFF5E6';
const WATER_COLOR = '#1CB0F6';
const WATER_LIGHT = '#E8F6FF';
const GRID_BG = '#E8E8E8';
const PIPE_COLOR = '#555';
const PIPE_FILLED = '#1CB0F6';
const SOURCE_COLOR = '#58CC02';
const DRAIN_COLOR = '#FF3B30';
const GLOBAL_TIME = 420; // 7 minutes total session
const FLOW_TICK_MS = 1500; // liquid advances one pipe every 1.5s
const FLOW_PAUSE_MS = 2500; // pause after losing a life
const MAX_LIVES = 3;

// ─── Types ──────────────────────────────────────────────────────────────────────

interface PlayState {
  phase: 'round_intro' | 'playing' | 'round_transition' | 'ended';
  roundIndex: number;
  globalTime: number;
  roundTime: number;
  score: number;
  moves: number;
  totalMoves: number;
  totalCorrect: number;
  totalRounds: number;
  bestTime: number;
  roundsCompleted: number;
  roundTimes: number[];
  combo: number;
  bestCombo: number;
  feedback: 'solved' | 'timeout' | 'dead_end' | null;
  lastRoundMoves: number;
  lastRoundTime: number;
  lastRoundSolved: boolean;
  // Flow mode state
  flowFilledCells: Set<string>; // cells the liquid has passed through
  lives: number;
  flowPaused: boolean; // paused after dead end hit
  flowDeadEndKey: number; // for triggering shake animation
  flowStep: number; // tracked in state for reactivity
}

// ─── Round Generation ───────────────────────────────────────────────────────────

function createRounds(seed?: number): PipeRound[] {
  if (seed !== undefined) {
    return generatePipeSession(seed);
  }
  return generatePipeSession();
}

// ─── Initial State ──────────────────────────────────────────────────────────────

function createInitialState(isFlow: boolean): PlayState {
  return {
    phase: 'round_intro',
    roundIndex: 0,
    globalTime: GLOBAL_TIME,
    roundTime: isFlow ? 999 : 60, // flow mode: no per-round timer
    score: 0,
    moves: 0,
    totalMoves: 0,
    totalCorrect: 0,
    totalRounds: 4,
    bestTime: Infinity,
    roundsCompleted: 0,
    roundTimes: [],
    combo: 0,
    bestCombo: 0,
    feedback: null,
    lastRoundMoves: 0,
    lastRoundTime: 0,
    lastRoundSolved: false,
    flowFilledCells: new Set(),
    lives: MAX_LIVES,
    flowPaused: false,
    flowDeadEndKey: 0,
    flowStep: 0,
  };
}

// ─── Pipe Rendering Component ──────────────────────────────────────────────────

interface PipeCellProps {
  type: string;
  rotation: number;
  size: number;
  isFilled: boolean;
  isSource: boolean;
  isDrain: boolean;
  isDrainConnected: boolean;
  isFrontier: boolean;
  onClick: () => void;
  flowSpeed: 'classic' | 'flow' | 'frontier';
}

function PipeCellRender({ type, rotation, size, isFilled, isSource, isDrain, isDrainConnected, isFrontier, onClick, flowSpeed }: PipeCellProps) {
  const half = size / 2;
  const thickness = Math.max(size * 0.22, 6);
  const color = isSource ? SOURCE_COLOR : isDrain ? (isDrainConnected ? DRAIN_COLOR : '#CC3333') : isFilled ? PIPE_FILLED : PIPE_COLOR;
  const bgColor = isSource ? '#E8FFE0' : isDrain ? '#FFE8E5' : isFilled ? WATER_LIGHT : '#F5F5F5';

  // Build path segments from connections, each with flow direction for pattern animation
  const conns = getConnections(type as 'straight' | 'bend' | 'tee' | 'cross' | 'dead', rotation);
  const segments: { d: string; dir: string }[] = [];
  for (const dir of conns) {
    switch (dir) {
      case 'up':    segments.push({ d: `M ${half} ${half} L ${half} 0`, dir: 'up' }); break;
      case 'down':  segments.push({ d: `M ${half} ${half} L ${half} ${size}`, dir: 'down' }); break;
      case 'left':  segments.push({ d: `M ${half} ${half} L 0 ${half}`, dir: 'left' }); break;
      case 'right': segments.push({ d: `M ${half} ${half} L ${size} ${half}`, dir: 'right' }); break;
    }
  }

  // Build dot at center
  const dotR = thickness * 0.45;

  // Glow animation class
  const glowAnim = isFrontier
    ? 'water-glow-frontier'
    : flowSpeed === 'flow'
      ? 'water-glow-flow'
      : 'water-glow-classic';

  // Bubble only on cells with 2+ connections (not dead ends)
  const hasBubble = isFilled && conns.length >= 2;

  return (
    <button
      onClick={onClick}
      className={`absolute rounded-lg transition-all duration-150 active:scale-95 ${isFilled ? glowAnim : ''}`}
      style={{
        width: size, height: size, left: 0, top: 0,
        background: bgColor,
        border: `2px solid ${isFilled ? (isSource ? SOURCE_COLOR : isDrain ? DRAIN_COLOR : WATER_COLOR) + '40' : GRID_BG}`,
        cursor: 'pointer',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Pipe segments (base layer) */}
        {segments.map((seg, i) => (
          <path key={i} d={seg.d} stroke={color} strokeWidth={thickness} strokeLinecap="round" fill="none" />
        ))}
        {/* Liquid-filled segments: water texture pattern fill that flows */}
        {isFilled && segments.map((seg, i) => {
          // Pattern ID per direction so each can animate independently
          const pid = `water-${seg.dir}`;
          // Animate pattern offset based on direction and speed
          const dur = flowSpeed === 'frontier' || flowSpeed === 'flow' ? 0.5 : 0.8;
          // Offset direction: pattern scrolls along the pipe's flow axis
          const animAttr = seg.dir === 'up' ? 'y'
            : seg.dir === 'down' ? 'y'
            : seg.dir === 'left' ? 'x'
            : 'x';
          const animFrom = seg.dir === 'up' ? '0' : seg.dir === 'down' ? '0' : seg.dir === 'left' ? '0' : '0';
          const animTo = seg.dir === 'up' ? '-64' : seg.dir === 'down' ? '64' : seg.dir === 'left' ? '-64' : '64';
          return (
            <g key={`liq-${i}`}>
              <defs>
                <pattern
                  id={`${pid}-${i}`}
                  patternUnits="userSpaceOnUse"
                  width="64" height="64"
                >
                  <animate
                    attributeName={animAttr}
                    from={animFrom}
                    to={animTo}
                    dur={`${dur}s`}
                    repeatCount="indefinite"
                  />
                  <image href="/water-tile.png" x="0" y="0" width="64" height="64" />
                </pattern>
              </defs>
              <path
                d={seg.d}
                stroke={`url(#${pid}-${i})`}
                strokeWidth={thickness - 2}
                strokeLinecap="round"
                fill="none"
              />
            </g>
          );
        })}
        {/* Center dot */}
        <circle cx={half} cy={half} r={dotR} fill={color} />
        {/* Center bubble glow when filled (only on junctions) */}
        {hasBubble && (
          <circle
            cx={half}
            cy={half}
            r={dotR + 1}
            fill="#7DD3FC"
            className="water-bubble"
          />
        )}
        {/* Source icon */}
        {isSource && (
          <>
            <circle cx={half} cy={half} r={thickness * 0.9} fill={SOURCE_COLOR} />
            <path d={`M ${half - 4} ${half} L ${half + 4} ${half} M ${half} ${half - 4} L ${half} ${half + 4}`} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
          </>
        )}
        {/* Drain icon */}
        {isDrain && (
          <>
            <circle cx={half} cy={half} r={thickness * 0.9} fill={isDrainConnected ? SOURCE_COLOR : '#CC3333'} />
            <path d={`M ${half - 4} ${half - 4} L ${half + 4} ${half + 4} M ${half + 4} ${half - 4} L ${half - 4} ${half + 4}`} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface PipeFlowProps {
  isDaily?: boolean;
}

export default function PipeFlow({ isDaily = false }: PipeFlowProps) {
  // Daily always uses classic mode
  const activeMode: PipeMode = isDaily ? 'classic' : useGameStore.getState().pipeMode;
  const isFlow = activeMode === 'flow';

  const [rounds] = useState<PipeRound[]>(() => {
    if (isDaily) {
      const seed = dateToSeed(getTodaySeedStr()) + 7777;
      return createRounds(seed);
    }
    return createRounds();
  });

  const [state, setStateRaw] = useState<PlayState>(() => createInitialState(isFlow));
  const setState = useCallback(
    (partial: Partial<PlayState>) => setStateRaw(prev => ({ ...prev, ...partial })),
    []
  );

  const stateRef = useRef(state);
  const roundsRef = useRef(rounds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameEndedRef = useRef(false);
  const gridRef = useRef<PipePuzzle | null>(null);
  const flowStepRef = useRef(0); // how many steps the liquid has advanced
  const handlersRef = useRef({
    tick: () => {},
    flowTick: () => {},
    onCellTap: (_row: number, _col: number) => {},
    advanceRound: () => {},
  });

  useEffect(() => { stateRef.current = state; }, [state]);

  const currentRound = rounds[state.roundIndex];
  const puzzle = gridRef.current;

  // ─── FIX #5: Initialize puzzle in state so it's available on first render ───
  const [initialPuzzle] = useState<PipePuzzle | null>(() => {
    if (rounds.length > 0) {
      return JSON.parse(JSON.stringify(rounds[0].puzzle));
    }
    return null;
  });
  const activePuzzle = puzzle ?? initialPuzzle;

  // Compute water flow for current puzzle (classic mode uses this)
  const waterFlow = useMemo(() => {
    if (!activePuzzle || isFlow) return new Set<string>();
    return computeWaterFlow(activePuzzle);
  }, [activePuzzle, state.moves, state.flowFilledCells]);

  // In flow mode, use flowFilledCells as the "filled" set
  const filledCells = isFlow ? state.flowFilledCells : waterFlow;
  const isDrainConnected = filledCells.has(`${activePuzzle?.drainRow},${activePuzzle?.drainCol}`);

  // Determine flow speed for cells
  const getFlowSpeed = useCallback((r: number, c: number): 'classic' | 'flow' | 'frontier' => {
    if (!isFlow) return 'classic';
    if (state.flowPaused) return 'classic';
    const p = gridRef.current;
    if (!p) return 'classic';
    // Check if this cell is the frontier
    const steps = traceFlowPath(p);
    const frontierIdx = Math.min(flowStepRef.current, steps.length - 1);
    if (frontierIdx >= 0 && frontierIdx < steps.length) {
      const f = steps[frontierIdx];
      if (f.row === r && f.col === c && !f.reachedDrain && !f.isDeadEnd) return 'frontier';
    }
    return 'flow';
  }, [isFlow, state.flowPaused]);

  // ─── End Game ──────────────────────────────────────────────────────────────

  const endGame = useCallback(() => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (flowTimerRef.current) { clearInterval(flowTimerRef.current); flowTimerRef.current = null; }
    setState({ phase: 'ended' });
  }, [setState]);

  // ─── Complete Session ─────────────────────────────────────────────────────

  const completeSession = useCallback(() => {
    const s = stateRef.current;
    const accuracy = s.totalRounds > 0 ? Math.round((s.totalCorrect / s.totalRounds) * 100) : 0;
    const stars = s.totalCorrect >= 4 ? 3 : s.totalCorrect >= 3 ? 2 : s.totalCorrect >= 2 ? 1 : 0;
    const avgTime = s.roundTimes.length > 0
      ? Math.round(s.roundTimes.reduce((a, b) => a + b, 0) / s.roundTimes.length)
      : 0;

    const modeLabel = isFlow ? 'Flow' : '';

    useGameStore.getState().completeSession({
      game: 'pipe',
      score: s.score,
      stars,
      accuracy,
      bestCombo: s.bestCombo,
      timeElapsed: GLOBAL_TIME - s.globalTime,
      isDaily,
      extra: `${modeLabel} ${s.totalCorrect}/${s.totalRounds} rounds${avgTime > 0 ? ` · ${avgTime}s avg` : ''}`.trim(),
    });
  }, [isDaily, isFlow]);

  useEffect(() => {
    if (state.phase === 'ended') completeSession();
  }, [state.phase, completeSession]);

  // ─── Timer Tick (classic mode: per-round timer; flow mode: global only) ─────

  const tick = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'playing') return;

    const newGlobalTime = s.globalTime - 1;

    if (newGlobalTime <= 0) {
      setState({ roundTime: 0, globalTime: 0 });
      endGame();
      return;
    }

    // Classic: decrement round timer
    if (!isFlow) {
      const newRoundTime = s.roundTime - 1;
      if (newRoundTime <= 0) {
        const curRound = roundsRef.current[s.roundIndex];
        setState({
          roundTime: 0, globalTime: newGlobalTime,
          phase: 'round_transition', feedback: 'timeout',
          lastRoundMoves: s.moves, lastRoundTime: curRound?.roundTime ?? 60,
          lastRoundSolved: false, moves: 0, combo: 0,
        });
        setTimeout(() => { if (!gameEndedRef.current) handlersRef.current.advanceRound(); }, 2500);
        return;
      }
      setState({ roundTime: newRoundTime, globalTime: newGlobalTime });
    } else {
      // Flow mode: only global timer
      setState({ globalTime: newGlobalTime });
    }
  }, [setState, endGame, isFlow]);

  // ─── Flow Mode: Liquid Advance Tick ──────────────────────────────────────

  const flowTick = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'playing' || !isFlow) return;
    if (s.flowPaused) return; // paused after dead end
    if (!gridRef.current) return;

    // Re-trace the flow path from source based on current pipe rotations
    const steps = traceFlowPath(gridRef.current);
    const nextStep = flowStepRef.current + 1;

    if (nextStep > steps.length) {
      // Already at or past the end — re-check
      return;
    }

    // Add the next cell to filled set
    const newFilled = new Set(s.flowFilledCells);
    for (let i = 0; i < nextStep && i < steps.length; i++) {
      newFilled.add(`${steps[i].row},${steps[i].col}`);
    }
    flowStepRef.current = nextStep;
    const flowStepUpdate = { flowFilledCells: newFilled, flowStep: nextStep };

    // Check the step we just reached
    const reachedStep = steps[Math.min(nextStep - 1, steps.length - 1)];

    if (reachedStep?.reachedDrain) {
      // SUCCESS — liquid reached the drain!
      const newCombo = s.combo + 1;
      const stepsUsed = nextStep;
      const timeBonus = Math.max(0, Math.floor(s.globalTime * 3));
      const livesBonus = s.lives * 150;
      const stepsPenalty = Math.max(0, (stepsUsed - 8) * 10); // longer paths = slightly less
      const roundScore = 600 + timeBonus + livesBonus - stepsPenalty;
      const timeTaken = 0; // not tracked per-round in flow mode

      setState({
        ...flowStepUpdate,
        score: s.score + roundScore,
        combo: newCombo,
        bestCombo: Math.max(s.bestCombo, newCombo),
        totalCorrect: s.totalCorrect + 1,
        roundsCompleted: s.roundsCompleted + 1,
        roundTimes: [...s.roundTimes, timeTaken],
        phase: 'round_transition',
        feedback: 'solved',
        lastRoundMoves: s.moves,
        lastRoundTime: 0,
        lastRoundSolved: true,
      });

      // Clear flow timer during transition
      if (flowTimerRef.current) { clearInterval(flowTimerRef.current); flowTimerRef.current = null; }

      setTimeout(() => {
        if (gameEndedRef.current) return;
        const cur = stateRef.current;
        if (cur.phase !== 'round_transition') return;
        handlersRef.current.advanceRound();
      }, 2000);
      return;
    }

    if (reachedStep?.isDeadEnd) {
      // Dead end — lose a life, pause the flow
      const newLives = s.lives - 1;

      if (newLives <= 0) {
        // No lives left — round failed
        setState({
          flowFilledCells: newFilled,
          lives: 0,
          phase: 'round_transition',
          feedback: 'dead_end',
          lastRoundMoves: s.moves,
          lastRoundTime: 0,
          lastRoundSolved: false,
          combo: 0,
        });
        if (flowTimerRef.current) { clearInterval(flowTimerRef.current); flowTimerRef.current = null; }
        setTimeout(() => { if (!gameEndedRef.current) handlersRef.current.advanceRound(); }, 2500);
        return;
      }

      // Pause flow so player can fix pipes
      setState({
        ...flowStepUpdate,
        lives: newLives,
        flowPaused: true,
        flowDeadEndKey: s.flowDeadEndKey + 1,
        feedback: 'dead_end',
      });

      // Resume flow after pause — FIX #4: DON'T reset to step 0.
      // The player fixed their pipes; re-trace from source with current pipe positions
      // but keep the liquid at its current progress level.
      setTimeout(() => {
        if (gameEndedRef.current) return;
        const cur = stateRef.current;
        if (cur.phase === 'playing') {
          // Re-trace path with updated pipe positions, keep current step count
          const freshSteps = traceFlowPath(gridRef.current!);
          const newFilledAfterFix = new Set<string>();
          // Fill cells up to current step on the NEW path
          for (let i = 0; i < flowStepRef.current && i < freshSteps.length; i++) {
            newFilledAfterFix.add(`${freshSteps[i].row},${freshSteps[i].col}`);
          }
          setState({ flowPaused: false, feedback: null, flowFilledCells: newFilledAfterFix });
        }
      }, FLOW_PAUSE_MS);
      return;
    }

    // Normal advance — just update filled cells and step
    setState(flowStepUpdate);
  }, [setState, endGame, isFlow]); // FIX #3: removed `puzzle` from deps — use gridRef.current inside

  // ─── Advance Round ──────────────────────────────────────────────────────────

  const advanceRound = useCallback(() => {
    const s = stateRef.current;
    const nextIdx = s.roundIndex + 1;

    if (nextIdx >= roundsRef.current.length) { endGame(); return; }

    const nextRound = roundsRef.current[nextIdx];
    gridRef.current = JSON.parse(JSON.stringify(nextRound.puzzle));
    flowStepRef.current = 0;

    if (flowTimerRef.current) { clearInterval(flowTimerRef.current); flowTimerRef.current = null; }

    setState({
      phase: 'round_intro',
      roundIndex: nextIdx,
      roundTime: isFlow ? 999 : nextRound.roundTime,
      moves: 0,
      feedback: null,
      flowFilledCells: new Set(),
      flowStep: 0,
      lives: MAX_LIVES,
      flowPaused: false,
    });
  }, [setState, endGame, isFlow]);

  // ─── Rotate Cell ─────────────────────────────────────────────────────────────

  const onCellTap = useCallback((row: number, col: number) => {
    const s = stateRef.current;
    if (s.phase !== 'playing' || gameEndedRef.current) return;
    const p = gridRef.current;
    if (!p) return;

    const cell = p.grid[row][col];
    if (!cell) return;

    cell.rotation = (cell.rotation + 1) % 4;
    const newMoves = s.moves + 1;
    setState({ moves: newMoves, totalMoves: s.totalMoves + 1 });

    // In flow mode: rotating a pipe re-traces the flow path
    // The filled cells reset to however far the liquid has gotten on the new path
    // FIX #3: Use flowStepRef.current (source of truth) instead of s.flowStep (stale state)
    if (isFlow && !s.flowPaused) {
      const steps = traceFlowPath(p);
      const newFilled = new Set<string>();
      const currentStep = flowStepRef.current; // read from ref, not state
      for (let i = 0; i < currentStep && i < steps.length; i++) {
        newFilled.add(`${steps[i].row},${steps[i].col}`);
      }
      setState({ flowFilledCells: newFilled });
    }

    // Classic mode: check if solved
    if (!isFlow && isPuzzleSolved(p)) {
      const curRound = roundsRef.current[s.roundIndex];
      const timeTaken = (curRound?.roundTime ?? 60) - s.roundTime;
      const newCombo = s.combo + 1;
      const timeBonus = Math.max(0, Math.floor(s.roundTime * 5));
      const minMoves = p.gridSize * 2;
      const efficiency = Math.max(0, Math.floor((1 - newMoves / (minMoves * 4)) * 200));
      const roundScore = 500 + timeBonus + efficiency;

      setState({
        score: s.score + roundScore,
        combo: newCombo,
        bestCombo: Math.max(s.bestCombo, newCombo),
        totalCorrect: s.totalCorrect + 1,
        roundsCompleted: s.roundsCompleted + 1,
        bestTime: Math.min(s.bestTime, timeTaken),
        roundTimes: [...s.roundTimes, timeTaken],
        phase: 'round_transition',
        feedback: 'solved',
        lastRoundMoves: newMoves,
        lastRoundTime: timeTaken,
        lastRoundSolved: true,
      });

      setTimeout(() => {
        if (gameEndedRef.current) return;
        const cur = stateRef.current;
        if (cur.phase !== 'round_transition') return;
        advanceRound();
      }, 2000);
    }

    // Flow mode: check if solved (player might have just completed the path)
    if (isFlow && isPuzzleSolved(p)) {
      // Don't auto-solve in flow mode — let the liquid reach the drain naturally
      // But if the flow was paused (dead end), and the player fixes it, unpause
      // FIX #4: Also don't reset flowStepRef to 0 here!
      if (s.flowPaused) {
        // Re-trace path with fixed pipes, keep current progress
        const steps = traceFlowPath(p);
        const newFilledAfterFix = new Set<string>();
        for (let i = 0; i < flowStepRef.current && i < steps.length; i++) {
          newFilledAfterFix.add(`${steps[i].row},${steps[i].col}`);
        }
        setState({ flowPaused: false, feedback: null, flowFilledCells: newFilledAfterFix });
      }
    }
  }, [setState, advanceRound, isFlow]); // FIX #3: removed `puzzle` and `currentRound` from deps

  // ─── Update handlers ref ──────────────────────────────────────────────────

  useEffect(() => {
    handlersRef.current = { tick, flowTick, onCellTap, advanceRound };
  }, [tick, flowTick, onCellTap, advanceRound]);

  // ─── Init first puzzle ──────────────────────────────────────────────────────

  useEffect(() => {
    gameEndedRef.current = false;
    flowStepRef.current = 0;
    if (rounds.length > 0 && !gridRef.current) {
      gridRef.current = JSON.parse(JSON.stringify(rounds[0].puzzle));
    }
    timerRef.current = setInterval(() => handlersRef.current.tick(), 1000);
    // Flow mode: start the liquid flow timer
    if (isFlow) {
      // Small delay before liquid starts flowing (let player see the grid)
      setTimeout(() => {
        if (!gameEndedRef.current) {
          flowTimerRef.current = setInterval(() => handlersRef.current.flowTick(), FLOW_TICK_MS);
        }
      }, 2200); // after round intro
    }
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (flowTimerRef.current) { clearInterval(flowTimerRef.current); flowTimerRef.current = null; }
      gameEndedRef.current = true;
    };
  }, []);

  // ─── Round intro auto-advance ───────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'round_intro') return;
    const r = roundsRef.current[state.roundIndex];
    if (!r) return;
    const t = setTimeout(() => {
      if (gameEndedRef.current) return;
      gridRef.current = JSON.parse(JSON.stringify(r.puzzle));
      flowStepRef.current = 0;
      setState({
        phase: 'playing',
        roundTime: isFlow ? 999 : r.roundTime,
        moves: 0,
        flowFilledCells: new Set(),
        lives: MAX_LIVES,
        flowPaused: false,
        flowStep: 0,
      });
      // Start/restart flow timer for this round
      if (isFlow) {
        if (flowTimerRef.current) { clearInterval(flowTimerRef.current); flowTimerRef.current = null; }
        // Small delay so player sees the grid before liquid starts
        setTimeout(() => {
          if (!gameEndedRef.current) {
            flowTimerRef.current = setInterval(() => handlersRef.current.flowTick(), FLOW_TICK_MS);
          }
        }, 800);
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [state.phase, state.roundIndex, setState, isFlow]);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const timerPct = (state.globalTime / GLOBAL_TIME) * 100;
  const timerColor = timerPct > 50 ? '#58CC02' : timerPct > 20 ? ACCENT : '#FF3B30';
  const roundTimerPct = !isFlow && currentRound ? (state.roundTime / currentRound.roundTime) * 100 : 0;
  const roundTimerColor = roundTimerPct > 50 ? ACCENT : roundTimerPct > 20 ? '#FF9600' : '#FF3B30';
  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  // ─── Grid sizing ────────────────────────────────────────────────────────────

  const gridContainerSize = Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 48 : 360);
  const cellSize = activePuzzle ? Math.floor(gridContainerSize / activePuzzle.gridSize) : 60;
  const actualGridSize = activePuzzle ? cellSize * activePuzzle.gridSize : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Round Intro Overlay ─────────────────────────────────────────────────────

  if (state.phase === 'round_intro' && currentRound) {
    const sz = currentRound.puzzle.gridSize;
    const introColor = isFlow ? WATER_COLOR : ACCENT;
    const introBg = isFlow ? WATER_LIGHT : ACCENT_LIGHT;
    const introIcon = isFlow ? '\ud83d\udca7' : '\u2699\ufe0f';
    const introLabel = isFlow ? 'Flow Mode' : 'Classic';
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5"
        style={{ background: `linear-gradient(180deg, ${introBg} 0%, #F9F9F9 100%)` }}>
        <div className="text-center phase-flash">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: introColor + '20' }}>
            <span className="text-3xl">{introIcon}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#333]">Round {state.roundIndex + 1}</h2>
          <p className="text-base text-[#999] mt-2">{`${sz}×${sz}`} Grid{!isFlow ? ` · ${currentRound.roundTime}s` : ''}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: introColor }}>
              {introLabel}
            </span>
            {isFlow && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFE8E5', color: DRAIN_COLOR }}>
                {state.lives} {'\u2764\ufe0f'}
              </span>
            )}
          </div>
          <p className="text-sm mt-3" style={{ color: introColor }}>
            {isFlow ? 'Liquid flows in real-time!' : 'Tap pipes to rotate \u00b7 Connect source to drain'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Round Transition Overlay ───────────────────────────────────────────────

  if (state.phase === 'round_transition') {
    let icon: string;
    let title: string;
    let subtitle: string;
    let subtitleColor: string;

    if (state.lastRoundSolved) {
      icon = '\u2705';
      title = isFlow ? 'Drain Reached!' : 'Connected!';
      subtitle = `${state.lastRoundMoves} moves${!isFlow ? ` · ${state.lastRoundTime}s` : ''}`;
      subtitleColor = '#58CC02';
    } else if (state.feedback === 'dead_end') {
      icon = '\ud83d\udca7';
      title = 'Dead End!';
      subtitle = isFlow ? `${state.lives} lives remaining` : `${state.lastRoundMoves} moves used`;
      subtitleColor = '#FF3B30';
    } else {
      icon = '\u23f0';
      title = "Time's Up!";
      subtitle = `${state.lastRoundMoves} moves used`;
      subtitleColor = '#999';
    }

    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5"
        style={{ background: '#F9F9F9' }}>
        <div className="text-center phase-flash">
          <div className="text-5xl mb-3">{icon}</div>
          <p className="text-xl font-extrabold text-[#333]">{title}</p>
          <p className="text-base mt-1" style={{ color: subtitleColor }}>{subtitle}</p>
        </div>
      </div>
    );
  }

  // ─── Game Ended Overlay ─────────────────────────────────────────────────────

  if (state.phase === 'ended') {
    const accuracy = state.totalRounds > 0 ? Math.round((state.totalCorrect / state.totalRounds) * 100) : 0;
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-5"
        style={{ background: '#F9F9F9' }}>
        <div className="text-center p-6 rounded-2xl mx-4"
          style={{ background: '#fff', maxWidth: 320, width: '100%', animation: 'slide-up 0.4s ease' }}>
          <div className="text-2xl font-black mb-1" style={{ color: '#333' }}>
            {state.totalCorrect >= 3 ? 'Great Job!' : state.globalTime <= 0 ? "Time's Up!" : 'Nice Try!'}
          </div>
          <div className="text-lg font-bold mb-4" style={{ color: '#58CC02' }}>
            Score: {state.score}
          </div>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map(s => {
              const stars = state.totalCorrect >= 4 ? 3 : state.totalCorrect >= 3 ? 2 : state.totalCorrect >= 2 ? 1 : 0;
              return (
                <span key={s} className="text-4xl" style={{ opacity: s <= stars ? 1 : 0.2 }}>{'\u2b50'}</span>
              );
            })}
          </div>
          <div className="text-sm mb-4" style={{ color: '#999' }}>
            {state.totalCorrect}/{state.totalRounds} rounds · {state.totalMoves} moves · {isFlow ? 'Flow' : 'Classic'} · {accuracy}%
          </div>
          <button
            onClick={() => useGameStore.getState().setScreen('home')}
            className="w-full py-3 rounded-xl text-base font-bold"
            style={{ background: 'linear-gradient(135deg, #58CC02, #58A700)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Playing UI ────────────────────────────────────────────────────────

  if (!activePuzzle || !currentRound) return null;

  const modeColor = isFlow ? WATER_COLOR : ACCENT;
  const modeLabel = isFlow ? 'FLOW' : 'PIPE';

  return (
    <div className="flex flex-col items-center min-h-[100dvh] pb-24 pt-safe relative" style={{ background: '#F9F9F9' }}>

      {/* ── Header ── */}
      <div className="w-full flex items-center justify-between px-4 py-3" style={{ maxWidth: 400 }}>
        <button
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (flowTimerRef.current) clearInterval(flowTimerRef.current);
            gameEndedRef.current = true;
            useGameStore.getState().setScreen('home');
          }}
          className="text-sm font-semibold flex items-center gap-1" style={{ color: '#333', background: 'none', border: 'none', cursor: 'pointer' }}>
          {'\u2190'} Back
        </button>

        <div className="flex flex-col items-center flex-1 mx-4">
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#E0E0E0', maxWidth: 180 }}>
            <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${timerPct}%`, background: timerColor }} />
          </div>
          <span className="text-xs font-medium mt-1" style={{ color: '#999' }}>{formatTime(state.globalTime)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: modeColor }}>
            {modeLabel}
          </span>
          <span className="text-xs font-semibold" style={{ color: '#999' }}>
            {state.roundIndex + 1}/{rounds.length}
          </span>
        </div>
      </div>

      {/* ── Round Timer (classic only) / Lives (flow) ── */}
      {!isFlow ? (
        <div className="w-full px-4 mb-2" style={{ maxWidth: 400 }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: '#999' }}>Round time</span>
            <span className="text-xs font-bold" style={{ color: roundTimerColor }}>{state.roundTime}s</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#E0E0E0' }}>
            <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${roundTimerPct}%`, background: roundTimerColor }} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5 mb-2">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} className="text-base" style={{ opacity: i < state.lives ? 1 : 0.2, transition: 'opacity 0.3s' }}>
              {'\u2764\ufe0f'}
            </span>
          ))}
          {state.flowPaused && (
            <span className="text-xs font-bold ml-2 px-2 py-0.5 rounded-full animate-pulse" style={{ background: '#FFE8E5', color: '#FF3B30' }}>
              Fix the pipes!
            </span>
          )}
        </div>
      )}

      {/* ── Combo ── */}
      <div className="flex items-center gap-1 mb-2" style={{ height: 28 }}>
        {state.combo >= 2 && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
            style={{ background: state.combo >= 3 ? modeColor : '#58CC02', color: '#fff', animation: 'combo-pulse 0.5s ease' }}>
            {state.combo >= 3 && <span>{'\ud83d\udd25'}</span>}
            x{state.combo}
          </div>
        )}
      </div>

      {/* ── Status hint ── */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium" style={{ color: '#999' }}>
          Moves: {state.moves}
        </span>
        {isDrainConnected && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#E8FFE0', color: '#58CC02' }}>
            {'\u2705'} Drain reached!
          </span>
        )}
      </div>

      {/* ═══════ PIPE GRID ═══════ */}
      <div
        className="relative rounded-2xl p-2"
        style={{ width: actualGridSize + 16, height: actualGridSize + 16, background: GRID_BG }}
      >
        {/* Grid lines (subtle) */}
        <div className="absolute inset-2 rounded-xl overflow-hidden" style={{ opacity: 0.3 }}>
          {Array.from({ length: activePuzzle.gridSize + 1 }).map((_, i) => (
            <div key={`h-${i}`} className="absolute bg-[#CCC]" style={{ left: 0, right: 0, top: i * cellSize, height: 1 }} />
          ))}
          {Array.from({ length: activePuzzle.gridSize + 1 }).map((_, i) => (
            <div key={`v-${i}`} className="absolute bg-[#CCC]" style={{ top: 0, bottom: 0, left: i * cellSize, width: 1 }} />
          ))}
        </div>

        {/* Pipe cells */}
        {activePuzzle.grid.map((row, r) =>
          row.map((cell, c) => {
            const isFilled = filledCells.has(`${r},${c}`);
            return (
              <div key={`${r}-${c}`} className="absolute"
                style={{ left: 8 + c * cellSize, top: 8 + r * cellSize }}>
                <PipeCellRender
                  type={cell.type}
                  rotation={cell.rotation}
                  size={cellSize - 2}
                  isFilled={isFilled}
                  isSource={cell.isSource}
                  isDrain={cell.isDrain}
                  isDrainConnected={isDrainConnected}
                  isFrontier={false}
                  onClick={() => handlersRef.current.onCellTap(r, c)}
                  flowSpeed={isFilled ? getFlowSpeed(r, c) : 'classic'}
                />
              </div>
            );
          })
        )}

        {/* Source label */}
        <div className="absolute flex items-center justify-center"
          style={{ left: -6, top: 8 + activePuzzle.sourceRow * cellSize + cellSize / 2, transform: 'translate(-100%, -50%)' }}>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: SOURCE_COLOR }}>IN</span>
        </div>

        {/* Drain label */}
        <div className="absolute flex items-center justify-center"
          style={{ left: actualGridSize + 14, top: 8 + activePuzzle.drainRow * cellSize + cellSize / 2, transform: 'translateY(-50%)' }}>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: isDrainConnected ? SOURCE_COLOR : DRAIN_COLOR }}>OUT</span>
        </div>
      </div>

      {/* ── Score Pop ── */}
      {state.feedback === 'solved' && (
        <div className="fixed font-black text-xl" style={{ color: '#58CC02', animation: 'float-up 1s ease-out forwards', zIndex: 100, pointerEvents: 'none', top: '40%', left: '50%', transform: 'translateX(-50%)' }}>
          +{500 + Math.floor(state.roundTime * 5)} Connected!
        </div>
      )}

      {/* ── Dead End Pop ── */}
      {state.feedback === 'dead_end' && state.flowPaused && (
        <div className="fixed font-black text-base" key={state.flowDeadEndKey}
          style={{ color: '#FF3B30', animation: 'float-up 1.5s ease-out forwards', zIndex: 100, pointerEvents: 'none', top: '40%', left: '50%', transform: 'translateX(-50%)' }}>
          {'\ud83d\udca7'} Dead end! -1 {'\u2764\ufe0f'}
        </div>
      )}

      {/* ── Inline Styles / Keyframes ── */}
      <style jsx>{`
        @keyframes float-up { 0% { opacity: 1; transform: translateY(0) translateX(-50%); } 100% { opacity: 0; transform: translateY(-60px) translateX(-50%); } }
        @keyframes slide-up { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes flow-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }

        /* ── Water: pulsing cell glow ── */
        @keyframes glow-classic {
          0%, 100% { box-shadow: 0 0 8px rgba(28,176,246,0.3), inset 0 0 6px rgba(28,176,246,0.15); }
          50% { box-shadow: 0 0 14px rgba(28,176,246,0.5), inset 0 0 10px rgba(28,176,246,0.25); }
        }
        @keyframes glow-flow {
          0%, 100% { box-shadow: 0 0 10px rgba(28,176,246,0.35), inset 0 0 8px rgba(28,176,246,0.2); }
          50% { box-shadow: 0 0 18px rgba(28,176,246,0.6), inset 0 0 12px rgba(28,176,246,0.3); }
        }
        @keyframes glow-frontier {
          0%, 100% { box-shadow: 0 0 12px rgba(28,176,246,0.4), inset 0 0 8px rgba(28,176,246,0.25); border-color: rgba(28,176,246,0.4); }
          50% { box-shadow: 0 0 22px rgba(28,176,246,0.7), inset 0 0 14px rgba(28,176,246,0.35); border-color: rgba(28,176,246,0.6); }
        }
        .water-glow-classic {
          animation: glow-classic 1.5s ease-in-out infinite;
        }
        .water-glow-flow {
          animation: glow-flow 1s ease-in-out infinite;
        }
        .water-glow-frontier {
          animation: glow-frontier 1s ease-in-out infinite;
        }

        /* ── Water: center bubble ── */
        @keyframes bubble-breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .water-bubble {
          animation: bubble-breathe 2s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
      `}</style>
    </div>
  );
}