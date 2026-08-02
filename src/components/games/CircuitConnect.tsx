'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore, type SessionResults } from '@/store/useGameStore';
import { CIRCUIT_PUZZLES, type CircuitPuzzle } from '@/lib/circuitPuzzles';
import {
  generatePuzzle,
  generateDailyPuzzle,
  DIFFICULTY_CONFIGS,
  type GeneratedPuzzle,
} from '@/lib/circuitGenerator';
import { getDayNumber } from '@/lib/seededRandom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CircuitConnectProps {
  isDaily?: boolean;
}

interface CircuitState {
  phase: 'playing' | 'solved' | 'timeUp';
  paths: Record<string, [number, number][]>;
  currentPath: [number, number][];
  activeColor: string | null;
  timeElapsed: number;
  moveCount: number;
}

// ─── Unified puzzle type ────────────────────────────────────────────────────
interface ActivePuzzle {
  gridSize: number;
  difficulty: number;
  pairs: { color: string; colorHex: string; start: [number, number]; end: [number, number] }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GAP = 3;
const SOLVED_DELAY = 1500;

// Time limits by difficulty
const TIME_LIMITS: Record<number, number> = {
  1: 120, // easy
  2: 180, // medium
  3: 300, // hard
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isAdjacent = (a: [number, number], b: [number, number]): boolean => {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
};

const posKey = (r: number, c: number) => `${r},${c}`;

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CircuitConnect({ isDaily = false }: CircuitConnectProps) {
  // ─── Difficulty state (practice mode only) ───────────────────────────────
  const [difficulty, setDifficulty] = useState(2);
  const [puzzleKey, setPuzzleKey] = useState(0); // forces re-gen

  // ─── Generate or select puzzle ──────────────────────────────────────────
  const puzzle: ActivePuzzle = useMemo(() => {
    if (isDaily) {
      const dayNum = getDayNumber();
      const generated = generateDailyPuzzle(dayNum);
      if (generated) return generated;
      // Fallback to hand-crafted
      const fallback = CIRCUIT_PUZZLES[dayNum % CIRCUIT_PUZZLES.length];
      return { gridSize: fallback.gridSize, difficulty: fallback.difficulty, pairs: fallback.pairs };
    }
    // Practice mode: try generator, fallback to hand-crafted
    const generated = generatePuzzle(difficulty);
    if (generated) return generated;
    const fallback = CIRCUIT_PUZZLES[Math.floor(Math.random() * CIRCUIT_PUZZLES.length)];
    return { gridSize: fallback.gridSize, difficulty: fallback.difficulty, pairs: fallback.pairs };
  }, [isDaily, difficulty, puzzleKey]);

  const { gridSize, pairs } = puzzle;
  const MAX_TIME = TIME_LIMITS[puzzle.difficulty] || 180;

  // ─── Lookup maps (stable, built once per puzzle) ─────────────────────────
  const dotMap = useMemo(() => {
    const m = new Map<
      string,
      { color: string; colorHex: string; type: 'start' | 'end' }
    >();
    for (const p of pairs) {
      m.set(posKey(p.start[0], p.start[1]), {
        color: p.color,
        colorHex: p.colorHex,
        type: 'start',
      });
      m.set(posKey(p.end[0], p.end[1]), {
        color: p.color,
        colorHex: p.colorHex,
        type: 'end',
      });
    }
    return m;
  }, [pairs]);

  const pairMap = useMemo(() => {
    const m = new Map<
      string,
      { start: [number, number]; end: [number, number]; colorHex: string }
    >();
    for (const p of pairs) {
      m.set(p.color, { start: p.start, end: p.end, colorHex: p.colorHex });
    }
    return m;
  }, [pairs]);

  // ─── State ───────────────────────────────────────────────────────────────────
  const [state, setState] = useState<CircuitState>({
    phase: 'playing',
    paths: {},
    currentPath: [],
    activeColor: null,
    timeElapsed: 0,
    moveCount: 0,
  });

  const gridRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const solvedRef = useRef(false);

  // Reset game state when puzzle changes
  useEffect(() => {
    setState({
      phase: 'playing',
      paths: {},
      currentPath: [],
      activeColor: null,
      timeElapsed: 0,
      moveCount: 0,
    });
    solvedRef.current = false;
  }, [puzzleKey, isDaily, difficulty]);

  // ─── Grid dimensions for SVG ────────────────────────────────────────────────
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setGridWidth(rect.width);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gridSize]);

  const cellStep = gridWidth / gridSize;

  // ─── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const id = setInterval(() => {
      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        const next = prev.timeElapsed + 1;
        if (next >= MAX_TIME) {
          return { ...prev, timeElapsed: MAX_TIME, phase: 'timeUp' as const };
        }
        return { ...prev, timeElapsed: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase, MAX_TIME]);

  // ─── Completion check via useEffect ────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== 'playing' || solvedRef.current) return;

    const allConnected = pairs.every((p) => {
      const path = state.paths[p.color];
      if (!path || path.length === 0) return false;
      const hasStart = path.some(
        (c) => c[0] === p.start[0] && c[1] === p.start[1]
      );
      const hasEnd = path.some(
        (c) => c[0] === p.end[0] && c[1] === p.end[1]
      );
      return hasStart && hasEnd;
    });

    if (!allConnected) return;

    solvedRef.current = true;
    setState((prev) =>
      prev.phase === 'playing' ? { ...prev, phase: 'solved' as const } : prev
    );

    const timeBonus = Math.max(0, (MAX_TIME - state.timeElapsed) * 2);
    const baseScore = 200 + puzzle.difficulty * 100;
    const totalScore = baseScore + timeBonus;
    let stars = 0;
    if (state.timeElapsed < MAX_TIME * 0.33) stars = 3;
    else if (state.timeElapsed < MAX_TIME * 0.66) stars = 2;
    else stars = 1;

    const timerRef2 = setTimeout(() => {
      useGameStore.getState().completeSession({
        game: 'circuit' as SessionResults['game'],
        score: totalScore,
        stars,
        accuracy: 100,
        bestCombo: 0,
        timeElapsed: state.timeElapsed,
        isDaily,
        extra: `${gridSize}\u00d7${gridSize} ${DIFFICULTY_CONFIGS[puzzle.difficulty]?.label || ''}`,
      });
    }, SOLVED_DELAY);

    return () => clearTimeout(timerRef2);
  }, [state.paths, state.phase, state.timeElapsed, pairs, gridSize, MAX_TIME, puzzle.difficulty, isDaily]);

  // ─── Cell hit testing ───────────────────────────────────────────────────────
  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const step = rect.width / gridSize;
      const col = Math.floor(x / step);
      const row = Math.floor(y / step);
      if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
      return [row, col];
    },
    [gridSize]
  );

  // ─── Complete path helper (shared by move & up) ─────────────────────────────
  const tryCompletePath = useCallback(
    (activeColor: string, currentPath: [number, number][]) => {
      const pair = pairMap.get(activeColor);
      if (!pair || currentPath.length < 2) return false;

      const hasStart = currentPath.some(
        (c) => c[0] === pair.start[0] && c[1] === pair.start[1]
      );
      const hasEnd = currentPath.some(
        (c) => c[0] === pair.end[0] && c[1] === pair.end[1]
      );

      if (hasStart && hasEnd) {
        setState((prev) => {
          if (prev.activeColor !== activeColor) return prev;
          return {
            ...prev,
            paths: { ...prev.paths, [activeColor]: [...currentPath] },
            activeColor: null,
            currentPath: [],
            moveCount: prev.moveCount + 1,
          };
        });
        return true;
      }
      return false;
    },
    [pairMap]
  );

  // ─── Pointer Handlers ───────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (stateRef.current.phase !== 'playing') return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;

      const key = posKey(cell[0], cell[1]);
      const dotInfo = dotMap.get(key);
      if (!dotInfo) return;

      setState((prev) => {
        const newPaths = { ...prev.paths };
        delete newPaths[dotInfo.color];
        return {
          ...prev,
          paths: newPaths,
          activeColor: dotInfo.color,
          currentPath: [cell],
        };
      });
    },
    [getCellFromPoint, dotMap]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      if (s.phase !== 'playing' || !s.activeColor) return;

      e.preventDefault();
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;

      const { currentPath, activeColor } = s;
      const lastCell = currentPath[currentPath.length - 1];
      if (lastCell && cell[0] === lastCell[0] && cell[1] === lastCell[1]) return;

      const cellKey = posKey(cell[0], cell[1]);

      // Backtracking: truncate to that cell
      const existIdx = currentPath.findIndex(
        (c) => c[0] === cell[0] && c[1] === cell[1]
      );
      if (existIdx >= 0) {
        setState((prev) => ({
          ...prev,
          currentPath: prev.currentPath.slice(0, existIdx + 1),
        }));
        return;
      }

      // Must be adjacent
      if (!isAdjacent(lastCell, cell)) return;

      // Cannot go through another color's completed path
      for (const [color, path] of Object.entries(s.paths)) {
        if (color === activeColor) continue;
        if (path.some((c) => c[0] === cell[0] && c[1] === cell[1])) return;
      }

      // Cannot step on another color's dot
      const otherDot = dotMap.get(cellKey);
      if (otherDot && otherDot.color !== activeColor) return;

      // Build the new path
      const newPath = [...currentPath, cell];

      // Check if this is the matching end dot
      const pairInfo = pairMap.get(activeColor);
      const reachedEnd =
        pairInfo &&
        cell[0] === pairInfo.end[0] &&
        cell[1] === pairInfo.end[1];

      setState((prev) => {
        if (prev.activeColor !== activeColor) return prev;
        return { ...prev, currentPath: newPath };
      });

      if (reachedEnd) {
        tryCompletePath(activeColor, newPath);
      }
    },
    [getCellFromPoint, dotMap, pairMap, tryCompletePath]
  );

  const handlePointerUp = useCallback(() => {
    const s = stateRef.current;
    if (!s.activeColor) return;

    tryCompletePath(s.activeColor, s.currentPath);

    setState((prev) =>
      prev.activeColor
        ? { ...prev, activeColor: null, currentPath: [] }
        : prev
    );
  }, [tryCompletePath]);

  // ─── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setState({
      phase: 'playing',
      paths: {},
      currentPath: [],
      activeColor: null,
      timeElapsed: 0,
      moveCount: 0,
    });
    solvedRef.current = false;
  }, []);

  // ─── New Puzzle (practice mode) ────────────────────────────────────────────
  const handleNewPuzzle = useCallback(() => {
    setPuzzleKey((k) => k + 1);
  }, []);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const connectedCount = pairs.filter(
    (p) => state.paths[p.color] && state.paths[p.color].length > 0
  ).length;

  const timerPct = (state.timeElapsed / MAX_TIME) * 100;
  const timerColor =
    state.timeElapsed < MAX_TIME * 0.5
      ? '#58CC02'
      : state.timeElapsed < MAX_TIME * 0.8
        ? '#FF9600'
        : '#FF3B30';

  const solvedStars =
    state.phase === 'solved'
      ? state.timeElapsed < MAX_TIME * 0.33
        ? 3
        : state.timeElapsed < MAX_TIME * 0.66
          ? 2
          : 1
      : 0;

  const totalScore =
    state.phase === 'solved'
      ? 200 + puzzle.difficulty * 100 + Math.max(0, (MAX_TIME - state.timeElapsed) * 2)
      : 0;

  // ─── Grid sizing ───────────────────────────────────────────────────────────
  const gridPx = Math.min(360, gridSize * 60);
  const dotSize = gridSize <= 5 ? 22 : gridSize <= 6 ? 18 : 15;

  // ─── SVG helpers ────────────────────────────────────────────────────────────
  const buildPolylinePoints = (path: [number, number][]): string => {
    return path
      .map(([r, c]) => `${c * cellStep + cellStep / 2},${r * cellStep + cellStep / 2}`)
      .join(' ');
  };

  // ─── Pre-compute cell colors for render ─────────────────────────────────────
  const cellColors = useMemo(() => {
    const map = new Map<
      string,
      { colorHex: string; isCurrent: boolean }
    >();
    for (const [color, path] of Object.entries(state.paths)) {
      const pi = pairMap.get(color);
      if (!pi) continue;
      for (const [r, c] of path) {
        map.set(posKey(r, c), { colorHex: pi.colorHex, isCurrent: false });
      }
    }
    if (state.currentPath.length > 0 && state.activeColor) {
      const pi = pairMap.get(state.activeColor);
      if (pi) {
        for (const [r, c] of state.currentPath) {
          map.set(posKey(r, c), { colorHex: pi.colorHex, isCurrent: true });
        }
      }
    }
    return map;
  }, [state.paths, state.currentPath, state.activeColor, pairMap]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col items-center min-h-screen pt-safe pb-24"
      style={{
        background: '#F9F9F9',
        color: '#333333',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* ── Top Bar ── */}
      <div
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ maxWidth: 400 }}
      >
        <button
          onClick={() => useGameStore.getState().setScreen('home')}
          className="text-sm font-semibold flex items-center gap-1"
          style={{ color: '#333333', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          \u2190 Back
        </button>

        <div className="flex flex-col items-center flex-1 mx-4">
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: '#E0E0E0', maxWidth: 180 }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${timerPct}%`, background: timerColor }}
            />
          </div>
          <span className="text-xs font-medium mt-1" style={{ color: '#999' }}>
            {formatTime(state.timeElapsed)}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold" style={{ color: '#999', whiteSpace: 'nowrap' }}>
            {gridSize}\u00d7{gridSize}
          </span>
          {isDaily && (
            <span className="text-[10px] font-bold mt-0.5" style={{ color: '#FF9600', background: '#FFF5E6', padding: '1px 6px', borderRadius: 6 }}>
              DAILY
            </span>
          )}
        </div>
      </div>

      {/* ── Difficulty selector (practice only) ── */}
      {!isDaily && (
        <div className="flex items-center gap-2 mb-3">
          {([1, 2, 3] as const).map((d) => {
            const cfg = DIFFICULTY_CONFIGS[d];
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => { setDifficulty(d); setPuzzleKey((k) => k + 1); }}
                className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: active ? cfg?.label === 'Easy' ? '#58CC02' : cfg?.label === 'Medium' ? '#1CB0F6' : '#AF52DE' : '#F0F0F0',
                  color: active ? '#fff' : '#999',
                  border: active ? 'none' : '1.5px solid #E0E0E0',
                  cursor: 'pointer',
                }}
              >
                {cfg?.label || `D${d}`}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Daily subtitle / practice subtitle ── */}
      <p className="text-sm font-medium mb-4" style={{ color: '#777' }}>
        {isDaily ? `Daily Challenge #${getDayNumber()} \u2014 ${DIFFICULTY_CONFIGS[puzzle.difficulty]?.label || ''}` : 'Connect matching colors'}
      </p>

      {/* ── Grid ── */}
      <div
        className="relative mb-4"
        style={{ width: gridPx, height: gridPx }}
      >
        <div
          ref={gridRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gap: `${GAP}px`,
            width: '100%',
            height: '100%',
            touchAction: 'none',
            userSelect: 'none',
            cursor: 'crosshair',
          }}
        >
          {Array.from({ length: gridSize * gridSize }, (_, idx) => {
            const row = Math.floor(idx / gridSize);
            const col = idx % gridSize;
            const key = posKey(row, col);
            const dotInfo = dotMap.get(key);
            const pathInfo = cellColors.get(key);

            let cellBg = '#FFFFFF';
            if (pathInfo) {
              cellBg = pathInfo.isCurrent
                ? pathInfo.colorHex + '80'
                : pathInfo.colorHex + '4D';
            }

            return (
              <div
                key={key}
                data-row={row}
                data-col={col}
                style={{
                  background: cellBg,
                  borderRadius: gridSize <= 5 ? 8 : 6,
                  border: '1px solid #E8E8E8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                  position: 'relative',
                }}
              >
                {dotInfo && (
                  <div
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: '50%',
                      background: dotInfo.colorHex,
                      boxShadow: `0 2px 6px ${dotInfo.colorHex}40`,
                      zIndex: 10,
                      position: 'relative',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── SVG Path Overlay ── */}
        <svg
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 5,
          }}
        >
          <defs>
            <filter id="cc-glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {gridWidth > 0 &&
            Object.entries(state.paths).map(([color, path]) => {
              const pi = pairMap.get(color);
              if (!pi || path.length < 2) return null;
              return (
                <polyline
                  key={`path-${color}`}
                  points={buildPolylinePoints(path)}
                  fill="none"
                  stroke={pi.colorHex}
                  strokeWidth={cellStep * 0.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.7}
                />
              );
            })}
          {gridWidth > 0 &&
            state.currentPath.length >= 2 &&
            state.activeColor &&
            (() => {
              const pi = pairMap.get(state.activeColor);
              if (!pi) return null;
              return (
                <polyline
                  key="current-path"
                  points={buildPolylinePoints(state.currentPath)}
                  fill="none"
                  stroke={pi.colorHex}
                  strokeWidth={cellStep * 0.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                  filter="url(#cc-glow)"
                />
              );
            })()}
        </svg>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-4 px-4">
        {pairs.map((p) => {
          const connected =
            state.paths[p.color] && state.paths[p.color].length > 0;
          return (
            <div key={p.color} className="flex items-center gap-1.5">
              <div
                style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: p.colorHex,
                  opacity: connected ? 1 : 0.35,
                }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: connected ? '#333' : '#BBB' }}
              >
                {connected ? '\u2713' : '\u2014'}
              </span>
            </div>
          );
        })}
        <span className="text-xs font-semibold" style={{ color: '#999' }}>
          {connectedCount} of {pairs.length} pairs
        </span>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleReset}
          className="px-5 py-3 rounded-xl text-sm font-bold"
          style={{
            background: '#F0F0F0', color: '#777',
            border: '2px solid #E0E0E0', borderBottom: '4px solid #D0D0D0',
            cursor: 'pointer',
          }}
        >
          Clear All
        </button>
        {!isDaily && (
          <button
            onClick={handleNewPuzzle}
            className="px-5 py-3 rounded-xl text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #FF9600, #FF7A00)', color: '#fff',
              border: 'none', borderBottom: '4px solid #CC7A00',
              cursor: 'pointer',
            }}
          >
            New Puzzle
          </button>
        )}
      </div>

      {/* ── Solved Overlay ── */}
      {state.phase === 'solved' && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="text-center p-6 rounded-2xl mx-4"
            style={{
              background: '#fff', maxWidth: 320, width: '100%',
              animation: 'cc-slide-up 0.4s ease',
            }}
          >
            <div className="text-2xl font-black mb-1" style={{ color: '#333' }}>
              Puzzle Solved!
            </div>
            <div className="text-lg font-bold mb-3" style={{ color: '#58CC02' }}>
              Score: {totalScore}
            </div>
            <div className="text-sm mb-3" style={{ color: '#999' }}>
              Time: {formatTime(state.timeElapsed)}
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  style={{ fontSize: 32, opacity: s <= solvedStars ? 1 : 0.2 }}
                >
                  {'\u2b50'}
                </span>
              ))}
            </div>
            <button
              onClick={() => useGameStore.getState().setScreen('home')}
              className="w-full py-3 rounded-xl text-base font-bold"
              style={{
                background: 'linear-gradient(135deg, #58CC02, #58A700)',
                color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Time's Up Overlay ── */}
      {state.phase === 'timeUp' && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="text-center p-6 rounded-2xl mx-4"
            style={{
              background: '#fff', maxWidth: 320, width: '100%',
              animation: 'cc-slide-up 0.4s ease',
            }}
          >
            <div className="text-2xl font-black mb-3" style={{ color: '#333' }}>
              Time&apos;s Up!
            </div>
            <div className="text-base font-bold mb-4" style={{ color: '#FF3B30' }}>
              {connectedCount} of {pairs.length} pairs connected
            </div>
            <button
              onClick={() => useGameStore.getState().setScreen('home')}
              className="w-full py-3 rounded-xl text-base font-bold"
              style={{
                background: 'linear-gradient(135deg, #58CC02, #58A700)',
                color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes cc-slide-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
