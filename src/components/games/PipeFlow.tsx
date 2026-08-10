'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore, type PipeMode } from '@/store/useGameStore';
import { generatePipeSession, computeWaterFlow, isPuzzleSolved, traceFlowPath, type PipeRound, type PipePuzzle } from '@/lib/pipeGenerator';
import { dateToSeed, getTodaySeedStr } from '@/lib/seededRandom';

// ─── Constants ──────────────────────────────────────────────────────────────────

const ACCENT = '#FF9600';
const ACCENT_LIGHT = '#FFF5E6';
const WATER_COLOR = '#1CB0F6';
const WATER_LIGHT = '#E8F6FF';
const GRID_BG = '#E8E8E8';
const SOURCE_COLOR = '#58CC02';
const DRAIN_COLOR = '#FF3B30';
const GLOBAL_TIME = 420; // 7 minutes total session
const FLOW_TICK_MS = 1900; // ms between flow advances (timer-driven, not callback-driven)
const FLOW_PAUSE_MS = 2500; // pause after losing a life
const FLOW_PREP_SECONDS = 5; // seconds to prepare before flow starts
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
  flowActive: boolean; // whether the frontier CSS-transition fill should be running
  flowCountdown: number; // seconds remaining before flow starts (0 = flowing)
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
    flowActive: false,
    flowCountdown: isFlow ? FLOW_PREP_SECONDS : 0,
  };
}

// ─── Pipe Asset Mapping ────────────────────────────────────────────────

const OPPOSITE_DIR: Record<string, string> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Map (type, rotation) to sprite asset name. */
function getPipeSpriteName(type: string, rotation: number): string {
  switch (type) {
    case 'straight':
      return (rotation % 2 === 0) ? 'straight-h' : 'straight-v';
    case 'bend':
      return ['bend-TR', 'bend-RB', 'bend-BL', 'bend-LT'][rotation % 4];
    case 'tee':
      return ['T-up', 'T-right', 'T-down', 'T-left'][rotation % 4];
    case 'cross':
      return 'cross-empty';
    case 'dead':
      return ['stub-right', 'stub-down', 'stub-left', 'stub-up'][rotation % 4];
    default:
      return 'cross-empty';
  }
}

/** Get the pipe asset URL for a given type, rotation, and fill state. */
function getPipeAssetUrl(type: string, rotation: number, filled: boolean): string {
  const base = getPipeSpriteName(type, rotation);
  return filled ? `/pipes/${base}-filled.png` : `/pipes/${base}.png`;
}

// ─── Pipe Rendering Component (PNG-based) ──────────────────────────────

interface PipeCellProps {
  cellKey: string;
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
  segFlowDirs?: Record<string, string>;
  frontierInfo?: { entryDir: string; exitDir: string; flowDir: string; fillKey: number };
}

function PipeCellRender({ type, rotation, size, isFilled, isSource, isDrain, isDrainConnected, onClick }: PipeCellProps) {
  const bgColor = isSource ? '#E8FFE0' : isDrain ? '#FFE8E5' : '#F5F5F5';
  const showFilled = isFilled;
  const pipeSrc = getPipeAssetUrl(type, rotation, showFilled);

  return (
    <button
      onClick={onClick}
      className="absolute rounded-lg transition-all duration-150 active:scale-95"
      style={{
        width: size, height: size, left: 0, top: 0,
        background: bgColor,
        border: `2px solid ${isSource ? SOURCE_COLOR + '40' : isDrain ? DRAIN_COLOR + '40' : GRID_BG}`,
        cursor: 'pointer',
        overflow: 'hidden',
        padding: 0,
      }}
    >
      <img
        src={pipeSrc}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
      />
      {isSource && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: '50%', background: SOURCE_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          <svg width={10} height={10} viewBox="0 0 10 10"><line x1={5} y1={2} x2={5} y2={8} stroke="#fff" strokeWidth={2} strokeLinecap="round" /><line x1={2} y1={5} x2={8} y2={5} stroke="#fff" strokeWidth={2} strokeLinecap="round" /></svg>
        </div>
      )}
      {isDrain && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: '50%', background: isDrainConnected ? SOURCE_COLOR : DRAIN_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          <svg width={10} height={10} viewBox="0 0 10 10"><line x1={2} y1={2} x2={8} y2={8} stroke="#fff" strokeWidth={2} strokeLinecap="round" /><line x1={8} y1={2} x2={2} y2={8} stroke="#fff" strokeWidth={2} strokeLinecap="round" /></svg>
        </div>
      )}
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
  const gameEndedRef = useRef(false);
  const gridRef = useRef<PipePuzzle | null>(null);
  const flowStepRef = useRef(0); // how many steps the liquid has advanced
  const flowIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null); // drives flow advancement
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

  // ─── End Game ──────────────────────────────────────────────────────────────

  const endGame = useCallback(() => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (flowIntervalRef.current) { clearInterval(flowIntervalRef.current); flowIntervalRef.current = null; }
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

  // ─── Flow Mode: Timer-Driven Liquid Advance ──────────────────────────────
  // CRITICAL: Flow is now driven by a setInterval (FLOW_TICK_MS), not by
  // CSS transition callbacks. This eliminates all issues with:
  //   - onTransitionEnd not firing on mobile SVG
  //   - React StrictMode double-mounting canceling timers
  //   - Complex callback chains that silently fail

  const flowTick = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'playing' || !isFlow) return;
    if (s.flowPaused) return;
    if (!gridRef.current) return;

    const steps = traceFlowPath(gridRef.current);
    console.log('[flow] flowTick:', flowStepRef.current, '/', steps.length, 'steps');

    // Source can't receive water
    if (steps.length === 0 || (steps[0].isDeadEnd && flowStepRef.current === 0)) {
      const newLives = s.lives - 1;
      if (newLives <= 0) {
        setState({
          lives: 0, phase: 'round_transition', feedback: 'dead_end',
          lastRoundMoves: s.moves, lastRoundTime: 0, lastRoundSolved: false, combo: 0,
        });
        if (flowIntervalRef.current) { clearInterval(flowIntervalRef.current); flowIntervalRef.current = null; }
        setTimeout(() => { if (!gameEndedRef.current) handlersRef.current.advanceRound(); }, 2500);
        return;
      }
      setState({
        lives: newLives, flowPaused: true,
        flowDeadEndKey: s.flowDeadEndKey + 1, feedback: 'dead_end',
      });
      setTimeout(() => {
        if (gameEndedRef.current) return;
        const cur = stateRef.current;
        if (cur.phase === 'playing') setState({ flowPaused: false, feedback: null });
      }, FLOW_PAUSE_MS);
      return;
    }

    const nextStep = flowStepRef.current + 1;
    if (nextStep > steps.length) return;

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
      const newCombo = s.combo + 1;
      const stepsUsed = nextStep;
      const timeBonus = Math.max(0, Math.floor(s.globalTime * 3));
      const livesBonus = s.lives * 150;
      const stepsPenalty = Math.max(0, (stepsUsed - 8) * 10);
      const roundScore = 600 + timeBonus + livesBonus - stepsPenalty;

      setState({
        ...flowStepUpdate,
        score: s.score + roundScore,
        combo: newCombo,
        bestCombo: Math.max(s.bestCombo, newCombo),
        totalCorrect: s.totalCorrect + 1,
        roundsCompleted: s.roundsCompleted + 1,
        roundTimes: [...s.roundTimes, 0],
        phase: 'round_transition',
        feedback: 'solved',
        lastRoundMoves: s.moves, lastRoundTime: 0, lastRoundSolved: true,
      });
      // Stop flow interval — round over
      if (flowIntervalRef.current) { clearInterval(flowIntervalRef.current); flowIntervalRef.current = null; }
      setTimeout(() => {
        if (gameEndedRef.current) return;
        if (stateRef.current.phase === 'round_transition') handlersRef.current.advanceRound();
      }, 2000);
      return;
    }

    if (reachedStep?.isDeadEnd) {
      const newLives = s.lives - 1;
      if (newLives <= 0) {
        setState({
          flowFilledCells: newFilled, lives: 0,
          phase: 'round_transition', feedback: 'dead_end',
          lastRoundMoves: s.moves, lastRoundTime: 0, lastRoundSolved: false, combo: 0,
        });
        if (flowIntervalRef.current) { clearInterval(flowIntervalRef.current); flowIntervalRef.current = null; }
        setTimeout(() => { if (!gameEndedRef.current) handlersRef.current.advanceRound(); }, 2500);
        return;
      }
      setState({
        ...flowStepUpdate,
        lives: newLives, flowPaused: true,
        flowDeadEndKey: s.flowDeadEndKey + 1, feedback: 'dead_end',
      });
      setTimeout(() => {
        if (gameEndedRef.current) return;
        const cur = stateRef.current;
        if (cur.phase === 'playing') {
          const freshSteps = traceFlowPath(gridRef.current!);
          const stepIdx = Math.min(flowStepRef.current, freshSteps.length - 1);
          if (stepIdx >= 0 && stepIdx < freshSteps.length && freshSteps[stepIdx].isDeadEnd) {
            setState({ flowPaused: true, flowDeadEndKey: cur.flowDeadEndKey + 1, feedback: 'dead_end' });
            return;
          }
          const newFilledAfterFix = new Set<string>();
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
  }, [setState, endGame, isFlow]);

  // ─── Advance Round ──────────────────────────────────────────────────────────

  const advanceRound = useCallback(() => {
    const s = stateRef.current;
    const nextIdx = s.roundIndex + 1;

    if (nextIdx >= roundsRef.current.length) { endGame(); return; }

    const nextRound = roundsRef.current[nextIdx];
    gridRef.current = JSON.parse(JSON.stringify(nextRound.puzzle));
    flowStepRef.current = 0;
    if (flowIntervalRef.current) { clearInterval(flowIntervalRef.current); flowIntervalRef.current = null; }

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
      flowActive: false,
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
    // The filled cells update to however far the liquid has gotten on the NEW path
    // This runs both during normal flow AND during pause (so player sees visual feedback)
    if (isFlow) {
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

    // Flow mode: if paused (dead end) and player fixes the path, unpause immediately
    if (isFlow && s.flowPaused) {
      const steps = traceFlowPath(p);
      // Check if the dead-end step is no longer a dead end on the new path
      const stepIdx = Math.min(flowStepRef.current, steps.length - 1);
      if (stepIdx >= 0 && stepIdx < steps.length && !steps[stepIdx].isDeadEnd) {
        // The blocking step is now clear — unpause so flow can continue
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
    if (isFlow) {
      return () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (flowIntervalRef.current) { clearInterval(flowIntervalRef.current); flowIntervalRef.current = null; }
        gameEndedRef.current = true;
      };
    }
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      gameEndedRef.current = true;
    };
  }, []);

  // ─── Flow countdown: reactive to state, works for EVERY round ─────────────
  // Uses setTimeout chain so each tick re-triggers via state change.
  // This replaces the old one-shot countdownInterval that died after round 1.

  useEffect(() => {
    if (!isFlow) return;
    if (state.phase !== 'playing') return;
    if (state.flowActive || state.flowPaused || state.flowCountdown <= 0) return;

    const id = setTimeout(() => {
      if (gameEndedRef.current) return;
      const cur = stateRef.current;
      if (cur.phase !== 'playing' || cur.flowActive || cur.flowPaused) return;
      const next = cur.flowCountdown - 1;
      console.log('[flow] countdown:', cur.flowCountdown, '->', next);
      if (next <= 0) {
        setState({ flowActive: true, flowCountdown: 0 });
      } else {
        setState({ flowCountdown: next });
      }
    }, 1000);

    return () => clearTimeout(id);
  }, [isFlow, state.phase, state.flowActive, state.flowPaused, state.flowCountdown]);

  // ─── Flow interval: start/stop based on flowActive and flowPaused ───────
  // This is the KEY CHANGE: a simple setInterval drives flow advancement.

  useEffect(() => {
    if (!isFlow) return;
    if (state.flowActive && !state.flowPaused && state.phase === 'playing') {
      if (flowIntervalRef.current) clearInterval(flowIntervalRef.current);
      console.log('[flow] STARTING flow interval');
      flowIntervalRef.current = setInterval(() => {
        handlersRef.current.flowTick();
      }, FLOW_TICK_MS);
    } else {
      if (flowIntervalRef.current) { clearInterval(flowIntervalRef.current); flowIntervalRef.current = null; }
    }
    return () => {
      if (flowIntervalRef.current) { clearInterval(flowIntervalRef.current); flowIntervalRef.current = null; }
    };
  }, [isFlow, state.flowActive, state.flowPaused, state.phase]);

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
        flowActive: false,
        flowCountdown: isFlow ? FLOW_PREP_SECONDS : 0,
      });
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
            if (flowIntervalRef.current) clearInterval(flowIntervalRef.current);
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
          {isFlow && state.flowCountdown > 0 && !state.flowPaused && (
            <span className="text-xs font-bold ml-2 px-2 py-0.5 rounded-full animate-pulse" style={{ background: WATER_LIGHT, color: WATER_COLOR }}>
              Flow in {state.flowCountdown}...
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
                  cellKey={`${r},${c}`}
                  type={cell.type}
                  rotation={cell.rotation}
                  size={cellSize - 2}
                  isFilled={isFilled}
                  isSource={cell.isSource}
                  isDrain={cell.isDrain}
                  isDrainConnected={isDrainConnected}
                  isFrontier={false}
                  onClick={() => handlersRef.current.onCellTap(r, c)}
                  flowSpeed={'classic'}
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
          {isFlow ? 'Drain Reached!' : `+${500 + Math.floor(state.roundTime * 5)} Connected!`}
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
        @keyframes combo-pulse { 0% { transform: scale(0.8); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes phase-flash { 0% { opacity: 0; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.95); } }
      `}</style>
    </div>
  );
}