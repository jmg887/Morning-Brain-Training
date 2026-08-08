'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { generatePipeSession, computeWaterFlow, isPuzzleSolved, getConnections, type PipeRound, type PipePuzzle, type Direction } from '@/lib/pipeGenerator';
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
const GLOBAL_TIME = 240;
const FEEDBACK_CLEAR_DELAY = 1500;

// ─── Types ──────────────────────────────────────────────────────────────────────

interface PlayState {
  phase: 'round_intro' | 'playing' | 'round_transition' | 'ended';
  roundIndex: number;
  globalTime: number;
  roundTime: number;
  score: number;
  moves: number;
  totalMoves: number;
  totalCorrect: number; // rounds completed
  totalRounds: number;
  bestTime: number; // fastest round completion
  roundsCompleted: number;
  roundTimes: number[];
  combo: number;
  bestCombo: number;
  feedback: 'solved' | 'timeout' | null;
  lastRoundMoves: number;
  lastRoundTime: number;
  lastRoundSolved: boolean;
}

// ─── Round Generation ───────────────────────────────────────────────────────────

function createRounds(seed?: number): PipeRound[] {
  if (seed !== undefined) {
    return generatePipeSession(seed);
  }
  return generatePipeSession();
}

// ─── Initial State ──────────────────────────────────────────────────────────────

function createInitialState(): PlayState {
  return {
    phase: 'round_intro',
    roundIndex: 0,
    globalTime: GLOBAL_TIME,
    roundTime: 60,
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
  onClick: () => void;
}

function PipeCellRender({ type, rotation, size, isFilled, isSource, isDrain, isDrainConnected, onClick }: PipeCellProps) {
  const half = size / 2;
  const thickness = Math.max(size * 0.22, 6);
  const color = isSource ? SOURCE_COLOR : isDrain ? (isDrainConnected ? DRAIN_COLOR : '#CC3333') : isFilled ? PIPE_FILLED : PIPE_COLOR;
  const bgColor = isSource ? '#E8FFE0' : isDrain ? '#FFE8E5' : isFilled ? WATER_LIGHT : '#F5F5F5';

  // Build path segments from connections
  const conns = getConnections(type as 'straight' | 'bend' | 'tee' | 'cross' | 'dead', rotation);
  const segments: string[] = [];
  for (const dir of conns) {
    switch (dir) {
      case 'up':    segments.push(`M ${half} ${half} L ${half} 0`); break;
      case 'down':  segments.push(`M ${half} ${half} L ${half} ${size}`); break;
      case 'left':  segments.push(`M ${half} ${half} L 0 ${half}`); break;
      case 'right': segments.push(`M ${half} ${half} L ${size} ${half}`); break;
    }
  }

  // Build dot at center
  const dotR = thickness * 0.45;

  return (
    <button
      onClick={onClick}
      className="absolute rounded-lg transition-all duration-150 active:scale-95"
      style={{
        width: size, height: size, left: 0, top: 0,
        background: bgColor,
        border: `2px solid ${isFilled ? (isSource ? SOURCE_COLOR : isDrain ? DRAIN_COLOR : WATER_COLOR) + '40' : GRID_BG}`,
        cursor: 'pointer',
        boxShadow: isFilled ? `0 0 8px ${color}30` : 'none',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Pipe segments */}
        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            fill="none"
          />
        ))}
        {/* Center dot */}
        <circle cx={half} cy={half} r={dotR} fill={color} />
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
  const [rounds] = useState<PipeRound[]>(() => {
    if (isDaily) {
      const seed = dateToSeed(getTodaySeedStr()) + 7777;
      return createRounds(seed);
    }
    return createRounds();
  });

  const [state, setStateRaw] = useState<PlayState>(createInitialState);
  const setState = useCallback(
    (partial: Partial<PlayState>) => setStateRaw(prev => ({ ...prev, ...partial })),
    []
  );

  const stateRef = useRef(state);
  const roundsRef = useRef(rounds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameEndedRef = useRef(false);
  const gridRef = useRef<PipePuzzle | null>(null);
  const handlersRef = useRef({
    tick: () => {},
    onCellTap: (_row: number, _col: number) => {},
    advanceRound: () => {},
  });

  useEffect(() => { stateRef.current = state; }, [state]);

  const currentRound = rounds[state.roundIndex];
  const puzzle = gridRef.current;

  // Compute water flow for current puzzle
  const waterFlow = useMemo(() => {
    if (!puzzle) return new Set<string>();
    return computeWaterFlow(puzzle);
  }, [puzzle, state.moves]); // recompute on every move

  const isDrainConnected = waterFlow.has(`${puzzle?.drainRow},${puzzle?.drainCol}`);

  // ─── End Game ──────────────────────────────────────────────────────────────

  const endGame = useCallback(() => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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

    useGameStore.getState().completeSession({
      game: 'pipe',
      score: s.score,
      stars,
      accuracy,
      bestCombo: s.bestCombo,
      timeElapsed: GLOBAL_TIME - s.globalTime,
      isDaily,
      extra: `${s.totalCorrect}/${s.totalRounds} rounds${avgTime > 0 ? ` · ${avgTime}s avg` : ''}`,
    });
  }, [isDaily]);

  useEffect(() => {
    if (state.phase === 'ended') completeSession();
  }, [state.phase, completeSession]);

  // ─── Timer Tick ─────────────────────────────────────────────────────────────

  const tick = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'playing') return;

    const newRoundTime = s.roundTime - 1;
    const newGlobalTime = s.globalTime - 1;

    if (newGlobalTime <= 0) {
      setState({ roundTime: 0, globalTime: 0 });
      endGame();
      return;
    }

    if (newRoundTime <= 0) {
      // Round timeout
      const curRound = roundsRef.current[s.roundIndex];
      setState({
        roundTime: 0,
        globalTime: newGlobalTime,
        phase: 'round_transition',
        feedback: 'timeout',
        lastRoundMoves: s.moves,
        lastRoundTime: curRound?.roundTime ?? 60,
        lastRoundSolved: false,
        moves: 0,
        combo: 0,
      });
      setTimeout(() => { if (!gameEndedRef.current) handlersRef.current.advanceRound(); }, 2500);
      return;
    }

    setState({ roundTime: newRoundTime, globalTime: newGlobalTime });
  }, [setState, endGame]);

  // ─── Advance Round ──────────────────────────────────────────────────────────

  const advanceRound = useCallback(() => {
    const s = stateRef.current;
    const nextIdx = s.roundIndex + 1;

    if (nextIdx >= roundsRef.current.length) { endGame(); return; }

    const nextRound = roundsRef.current[nextIdx];
    gridRef.current = JSON.parse(JSON.stringify(nextRound.puzzle));

    setState({
      phase: 'round_intro',
      roundIndex: nextIdx,
      roundTime: nextRound.roundTime,
      moves: 0,
      feedback: null,
    });
  }, [setState, endGame]);

  // ─── Rotate Cell ─────────────────────────────────────────────────────────────

  const onCellTap = useCallback((row: number, col: number) => {
    const s = stateRef.current;
    if (s.phase !== 'playing' || gameEndedRef.current) return;
    if (!puzzle) return;

    const cell = puzzle.grid[row][col];
    if (!cell) return;

    // Rotate 90° clockwise
    cell.rotation = (cell.rotation + 1) % 4;

    const newMoves = s.moves + 1;
    setState({ moves: newMoves, totalMoves: s.totalMoves + 1 });

    // Check if solved
    if (isPuzzleSolved(puzzle)) {
      const timeTaken = (currentRound?.roundTime ?? 60) - s.roundTime;
      const newCombo = s.combo + 1;

      // Score: base + time bonus (faster = more) + efficiency bonus (fewer moves)
      const timeBonus = Math.max(0, Math.floor(s.roundTime * 5));
      const minMoves = puzzle.gridSize * 2; // rough minimum
      const efficiency = Math.max(0, Math.floor((1 - newMoves / (minMoves * 4)) * 200));
      const roundScore = 500 + timeBonus + efficiency;

      const newRoundTimes = [...s.roundTimes, timeTaken];
      const newBestTime = Math.min(s.bestTime, timeTaken);

      setState({
        score: s.score + roundScore,
        combo: newCombo,
        bestCombo: Math.max(s.bestCombo, newCombo),
        totalCorrect: s.totalCorrect + 1,
        roundsCompleted: s.roundsCompleted + 1,
        bestTime: newBestTime,
        roundTimes: newRoundTimes,
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
  }, [setState, advanceRound, puzzle, currentRound]);

  // ─── Update handlers ref ──────────────────────────────────────────────────

  useEffect(() => { handlersRef.current = { tick, onCellTap, advanceRound }; }, [tick, onCellTap, advanceRound]);

  // ─── Init first puzzle ──────────────────────────────────────────────────────

  useEffect(() => {
    gameEndedRef.current = false;
    if (rounds.length > 0) {
      gridRef.current = JSON.parse(JSON.stringify(rounds[0].puzzle));
    }
    timerRef.current = setInterval(() => handlersRef.current.tick(), 1000);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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
      setState({ phase: 'playing', roundTime: r.roundTime, moves: 0 });
    }, 1800);
    return () => clearTimeout(t);
  }, [state.phase, state.roundIndex, setState]);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const timerPct = (state.globalTime / GLOBAL_TIME) * 100;
  const timerColor = timerPct > 50 ? '#58CC02' : timerPct > 20 ? ACCENT : '#FF3B30';
  const roundTimerPct = currentRound ? (state.roundTime / currentRound.roundTime) * 100 : 0;
  const roundTimerColor = roundTimerPct > 50 ? ACCENT : roundTimerPct > 20 ? '#FF9600' : '#FF3B30';
  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  // ─── Grid sizing ────────────────────────────────────────────────────────────

  const gridContainerSize = Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 48 : 360);
  const cellSize = puzzle ? Math.floor(gridContainerSize / puzzle.gridSize) : 60;
  const actualGridSize = puzzle ? cellSize * puzzle.gridSize : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Round Intro Overlay ─────────────────────────────────────────────────────

  if (state.phase === 'round_intro' && currentRound) {
    const sz = currentRound.puzzle.gridSize;
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5"
        style={{ background: `linear-gradient(180deg, ${ACCENT_LIGHT} 0%, #F9F9F9 100%)` }}>
        <div className="text-center phase-flash">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: ACCENT + '20' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round">
              <path d="M12 2v20M2 12h20M6 6l12 12M18 6L6 18" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-[#333]">Round {state.roundIndex + 1}</h2>
          <p className="text-base text-[#999] mt-2">{sz}×{sz} Grid · {currentRound.roundTime}s</p>
          <p className="text-sm mt-3" style={{ color: ACCENT }}>
            Tap pipes to rotate · Connect source to drain
          </p>
        </div>
      </div>
    );
  }

  // ─── Round Transition Overlay ───────────────────────────────────────────────

  if (state.phase === 'round_transition') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5"
        style={{ background: '#F9F9F9' }}>
        <div className="text-center phase-flash">
          <div className="text-5xl mb-3">
            {state.lastRoundSolved ? '\u2705' : '\u23f0'}
          </div>
          <p className="text-xl font-extrabold text-[#333]">
            {state.lastRoundSolved ? 'Connected!' : 'Time\'s Up!'}
          </p>
          {state.lastRoundSolved && (
            <p className="text-base mt-1" style={{ color: '#58CC02' }}>
              {state.lastRoundMoves} moves · {state.lastRoundTime}s
            </p>
          )}
          {!state.lastRoundSolved && (
            <p className="text-base mt-1" style={{ color: '#999' }}>
              {state.lastRoundMoves} moves used
            </p>
          )}
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
                <span key={s} className="text-4xl" style={{ opacity: s <= stars ? 1 : 0.2 }}>
                  {'\u2b50'}
                </span>
              );
            })}
          </div>
          <div className="text-sm mb-4" style={{ color: '#999' }}>
            {state.totalCorrect}/{state.totalRounds} rounds · {state.totalMoves} moves · Accuracy: {accuracy}%
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

  if (!puzzle || !currentRound) return null;

  return (
    <div className="flex flex-col items-center min-h-[100dvh] pb-24 pt-safe relative" style={{ background: '#F9F9F9' }}>

      {/* ── Header ── */}
      <div className="w-full flex items-center justify-between px-4 py-3" style={{ maxWidth: 400 }}>
        <button
          onClick={() => { if (timerRef.current) clearInterval(timerRef.current); gameEndedRef.current = true; useGameStore.getState().setScreen('home'); }}
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
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: ACCENT }}>
            PIPE
          </span>
          <span className="text-xs font-semibold" style={{ color: '#999' }}>
            {state.roundIndex + 1}/{rounds.length}
          </span>
        </div>
      </div>

      {/* ── Round Timer ── */}
      <div className="w-full px-4 mb-2" style={{ maxWidth: 400 }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: '#999' }}>Round time</span>
          <span className="text-xs font-bold" style={{ color: roundTimerColor }}>{state.roundTime}s</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#E0E0E0' }}>
          <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${roundTimerPct}%`, background: roundTimerColor }} />
        </div>
      </div>

      {/* ── Combo ── */}
      <div className="flex items-center gap-1 mb-2" style={{ height: 28 }}>
        {state.combo >= 2 && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
            style={{ background: state.combo >= 3 ? ACCENT : '#58CC02', color: '#fff', animation: 'combo-pulse 0.5s ease' }}>
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
        style={{
          width: actualGridSize + 16,
          height: actualGridSize + 16,
          background: GRID_BG,
        }}
      >
        {/* Grid lines (subtle) */}
        <div className="absolute inset-2 rounded-xl overflow-hidden" style={{ opacity: 0.3 }}>
          {Array.from({ length: puzzle.gridSize + 1 }).map((_, i) => (
            <div key={`h-${i}`}
              className="absolute bg-[#CCC]"
              style={{ left: 0, right: 0, top: i * cellSize, height: 1 }}
            />
          ))}
          {Array.from({ length: puzzle.gridSize + 1 }).map((_, i) => (
            <div key={`v-${i}`}
              className="absolute bg-[#CCC]"
              style={{ top: 0, bottom: 0, left: i * cellSize, width: 1 }}
            />
          ))}
        </div>

        {/* Pipe cells */}
        {puzzle.grid.map((row, r) =>
          row.map((cell, c) => {
            const isFilled = waterFlow.has(`${r},${c}`);
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
                  onClick={() => handlersRef.current.onCellTap(r, c)}
                />
              </div>
            );
          })
        )}

        {/* Source label */}
        <div className="absolute flex items-center justify-center"
          style={{ left: -6, top: 8 + puzzle.sourceRow * cellSize + cellSize / 2, transform: 'translate(-100%, -50%)' }}>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: SOURCE_COLOR }}>
            IN
          </span>
        </div>

        {/* Drain label */}
        <div className="absolute flex items-center justify-center"
          style={{ left: actualGridSize + 14, top: 8 + puzzle.drainRow * cellSize + cellSize / 2, transform: 'translateY(-50%)' }}>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: isDrainConnected ? SOURCE_COLOR : DRAIN_COLOR }}>
            OUT
          </span>
        </div>
      </div>

      {/* ── Score Pop ── */}
      {state.feedback === 'solved' && (
        <div className="fixed font-black text-xl" style={{ color: '#58CC02', animation: 'float-up 1s ease-out forwards', zIndex: 100, pointerEvents: 'none', top: '40%', left: '50%', transform: 'translateX(-50%)' }}>
          +{500 + Math.floor(state.roundTime * 5)} Connected!
        </div>
      )}

      {/* ── Inline Styles / Keyframes ── */}
      <style jsx>{`
        @keyframes float-up { 0% { opacity: 1; transform: translateY(0) translateX(-50%); } 100% { opacity: 0; transform: translateY(-60px) translateX(-50%); } }
        @keyframes slide-up { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
