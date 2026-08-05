'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MathProblem {
  expression: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  isBoss: boolean;
}

interface PhaseInfo {
  name: string;
  count: number;
  timePerProblem: number;
  color: string;
}

interface PhaseTransitionData {
  title: string;
  subtitle: string;
  isFinal: boolean;
}

interface GameState {
  problemIndex: number;
  timeRemaining: number;
  problemFraction: number;
  combo: number;
  score: number;
  correct: number;
  total: number;
  bestCombo: number;
  selectedOption: number | null;
  isAnswered: boolean;
  phaseTransition: PhaseTransitionData | null;
  explanationText: string;
  showExplanation: boolean;
  gameEnded: boolean;
  problemKey: number;
  comboKey: number;
  problemStartTime: number;
  bossBanner: boolean;
  scorePop: string | null;
  scorePopKey: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_TIME = 180;
const EXPLANATION_DURATION = 1500;
const PHASE_TRANSITION_DURATION = 1500;
const BOSS_BANNER_DURATION = 600;

const PHASES: PhaseInfo[] = [
  { name: 'Quick Pick', count: 5, timePerProblem: 10, color: '#58CC02' },
  { name: 'Trick Questions', count: 5, timePerProblem: 10, color: '#007AFF' },
  { name: 'Number Sense', count: 5, timePerProblem: 8, color: '#AF52DE' },
  { name: 'Boss Rush', count: 3, timePerProblem: 15, color: '#FF9600' },
];

const PHASE_SUBTITLES = [
  "Let's warm up!",
  'Watch out for traps!',
  'Think fast!',
  'Boss time!',
];

const TOTAL_PROBLEMS = PHASES.reduce((sum, p) => sum + p.count, 0); // 18

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getPhaseForProblem(index: number): PhaseInfo | null {
  let offset = 0;
  for (const phase of PHASES) {
    if (index < offset + phase.count) return phase;
    offset += phase.count;
  }
  return null;
}

function getPhaseNumber(index: number): number {
  let offset = 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (index < offset + PHASES[i].count) return i;
    offset += PHASES[i].count;
  }
  return -1;
}

function getPhaseProgress(index: number): { current: number; total: number } {
  let offset = 0;
  for (const phase of PHASES) {
    if (index < offset + phase.count) {
      return { current: index - offset + 1, total: phase.count };
    }
    offset += phase.count;
  }
  return { current: 1, total: 1 };
}

// ─── Problem Generation ──────────────────────────────────────────────────────

function generateQuickPick(): MathProblem[] {
  const problems: MathProblem[] = [];
  const ops = ['+', '-', '\u00d7'];

  for (let i = 0; i < 5; i++) {
    const op = ops[randInt(0, 2)];
    let a: number, b: number, correct: number;

    if (op === '+') {
      a = randInt(2, 12);
      b = randInt(2, 12);
      correct = a + b;
    } else if (op === '-') {
      a = randInt(5, 20);
      b = randInt(2, a - 1);
      correct = a - b;
    } else {
      a = randInt(2, 12);
      b = randInt(2, 12);
      correct = a * b;
    }

    let offset = randInt(1, 5);
    if (Math.random() < 0.5) offset = -offset;
    let wrong = correct + offset;
    if (wrong === correct) wrong = correct + 1;
    if (wrong < 0) wrong = correct + Math.abs(offset);

    const ci = Math.random() < 0.5 ? 0 : 1;
    problems.push({
      expression: `${a} ${op} ${b} = ?`,
      options: ci === 0 ? [String(correct), String(wrong)] : [String(wrong), String(correct)],
      correctIndex: ci,
      explanation: `${a} ${op} ${b} = ${correct}`,
      isBoss: false,
    });
  }

  return problems;
}

function generateTrickQuestions(): MathProblem[] {
  const pool: { expression: string; correct: string; wrong: string; explanation: string }[] = [];

  // Pattern 1: 0 \u00d7 N = 0
  const n1 = randInt(10, 99);
  pool.push({
    expression: `0 \u00d7 ${n1} = ?`,
    correct: '0',
    wrong: String(n1),
    explanation: `Anything multiplied by 0 equals 0`,
  });

  // Pattern 2: N + M \u00d7 0 = N
  const a2 = randInt(10, 50), b2 = randInt(10, 50);
  pool.push({
    expression: `${a2} + ${b2} \u00d7 0 = ?`,
    correct: String(a2),
    wrong: String(a2 + b2),
    explanation: `Multiply first: ${b2} \u00d7 0 = 0, then ${a2} + 0 = ${a2}`,
  });

  // Pattern 3: A + B \u00d7 C (order of operations)
  const a3 = randInt(2, 10), b3 = randInt(2, 8), c3 = randInt(2, 5);
  pool.push({
    expression: `${a3} + ${b3} \u00d7 ${c3} = ?`,
    correct: String(a3 + b3 * c3),
    wrong: String((a3 + b3) * c3),
    explanation: `Multiply first: ${b3} \u00d7 ${c3} = ${b3 * c3}, then ${a3} + ${b3 * c3} = ${a3 + b3 * c3}`,
  });

  // Pattern 4: 99 + 1 - 100 = 0
  pool.push({
    expression: `99 + 1 - 100 = ?`,
    correct: '0',
    wrong: '100',
    explanation: `99 + 1 = 100, then 100 - 100 = 0`,
  });

  // Pattern 5: (A + B) - B = A
  const a5 = randInt(10, 50), b5 = randInt(10, 50);
  pool.push({
    expression: `(${a5} + ${b5}) - ${b5} = ?`,
    correct: String(a5),
    wrong: String(a5 + b5),
    explanation: `(${a5} + ${b5}) = ${a5 + b5}, then ${a5 + b5} - ${b5} = ${a5}`,
  });

  // Pattern 6: A \u00d7 1 + B - B = A
  const a6 = randInt(5, 30), b6 = randInt(5, 30);
  pool.push({
    expression: `${a6} \u00d7 1 + ${b6} - ${b6} = ?`,
    correct: String(a6),
    wrong: String(a6 + b6),
    explanation: `${a6} \u00d7 1 = ${a6}, + ${b6} - ${b6} cancels out = ${a6}`,
  });

  // Pattern 7: 100 - 50 + 50 = 100
  pool.push({
    expression: `100 - 50 + 50 = ?`,
    correct: '100',
    wrong: '0',
    explanation: `100 - 50 = 50, then 50 + 50 = 100`,
  });

  return shuffleArray(pool).slice(0, 5).map(p => {
    const ci = Math.random() < 0.5 ? 0 : 1;
    return {
      expression: p.expression,
      options: ci === 0 ? [p.correct, p.wrong] : [p.wrong, p.correct],
      correctIndex: ci,
      explanation: p.explanation,
      isBoss: false,
    };
  });
}

function generateNumberSense(): MathProblem[] {
  const problems: MathProblem[] = [];

  // Type 1: Which is bigger? (2 problems)
  for (let i = 0; i < 2; i++) {
    const a = randInt(10, 500);
    const b = a + randInt(1, 50);
    const ci = Math.random() < 0.5 ? 0 : 1;
    problems.push({
      expression: `Which is bigger?`,
      options: ci === 0 ? [String(b), String(a)] : [String(a), String(b)],
      correctIndex: ci,
      explanation: `${b} is bigger than ${a}`,
      isBoss: false,
    });
  }

  // Type 2: Round to nearest 10 (2 problems)
  for (let i = 0; i < 2; i++) {
    const num = randInt(11, 99);
    const rounded = Math.round(num / 10) * 10;
    const floor10 = Math.floor(num / 10) * 10;
    const wrong = rounded === floor10 ? rounded + 10 : floor10;
    const ci = Math.random() < 0.5 ? 0 : 1;
    problems.push({
      expression: `Round ${num} to nearest 10`,
      options: ci === 0 ? [String(rounded), String(wrong)] : [String(wrong), String(rounded)],
      correctIndex: ci,
      explanation: `${num} rounds to ${rounded}`,
      isBoss: false,
    });
  }

  // Type 3: Place value (1 problem)
  const num3 = randInt(1000, 9999);
  const digitStr = String(num3);
  const places = ['ones', 'tens', 'hundreds', 'thousands'];
  const placeIdx = randInt(0, 3);
  const placeName = places[placeIdx];
  const digitVal = Number(digitStr[3 - placeIdx]);
  let wrongDigit = (digitVal + randInt(1, 5)) % 10;
  if (wrongDigit === digitVal) wrongDigit = (digitVal + 1) % 10;
  const ci = Math.random() < 0.5 ? 0 : 1;
  problems.push({
    expression: `What is the ${placeName} digit in ${num3.toLocaleString()}?`,
    options: ci === 0 ? [String(digitVal), String(wrongDigit)] : [String(wrongDigit), String(digitVal)],
    correctIndex: ci,
    explanation: `In ${num3.toLocaleString()}, the ${placeName} digit is ${digitVal}`,
    isBoss: false,
  });

  return problems;
}

function generateBossRush(): MathProblem[] {
  const problems: MathProblem[] = [];

  // Boss 1: (A + B) \u00d7 C - D
  const a1 = randInt(8, 15), b1 = randInt(5, 12), c1 = randInt(2, 5), d1 = randInt(5, 15);
  const ans1 = (a1 + b1) * c1 - d1;
  const w1a = a1 + b1 * c1 - d1;
  const w1b = (a1 + b1) * (c1 - d1);
  const bo1 = shuffleArray([String(ans1), String(w1a), String(w1b)]);
  problems.push({
    expression: `(${a1} + ${b1}) \u00d7 ${c1} - ${d1} = ?`,
    options: bo1,
    correctIndex: bo1.indexOf(String(ans1)),
    explanation: `(${a1} + ${b1}) = ${a1 + b1}, \u00d7 ${c1} = ${(a1 + b1) * c1}, - ${d1} = ${ans1}`,
    isBoss: true,
  });

  // Boss 2: A \u00f7 B + C \u00d7 D
  const divisors = [3, 6, 7, 8, 9];
  const b2 = divisors[randInt(0, divisors.length - 1)];
  const q2 = randInt(3, 12);
  const a2 = b2 * q2;
  const c2 = randInt(3, 8), d2 = randInt(2, 6);
  const ans2 = q2 + c2 * d2;
  const w2a = (q2 + c2) * d2;
  const w2b = q2 * c2 + d2;
  const bo2 = shuffleArray([String(ans2), String(w2a), String(w2b)]);
  problems.push({
    expression: `${a2} \u00f7 ${b2} + ${c2} \u00d7 ${d2} = ?`,
    options: bo2,
    correctIndex: bo2.indexOf(String(ans2)),
    explanation: `${a2} \u00f7 ${b2} = ${q2}, ${c2} \u00d7 ${d2} = ${c2 * d2}, ${q2} + ${c2 * d2} = ${ans2}`,
    isBoss: true,
  });

  // Boss 3: A \u00d7 B + C \u00d7 D
  const a3 = randInt(5, 12), b3 = randInt(5, 12), c3 = randInt(3, 8), d3 = randInt(3, 8);
  const ans3 = a3 * b3 + c3 * d3;
  const w3a = (a3 + c3) * (b3 + d3);
  const w3b = a3 * (b3 + c3 + d3);
  const bo3 = shuffleArray([String(ans3), String(w3a), String(w3b)]);
  problems.push({
    expression: `${a3} \u00d7 ${b3} + ${c3} \u00d7 ${d3} = ?`,
    options: bo3,
    correctIndex: bo3.indexOf(String(ans3)),
    explanation: `${a3} \u00d7 ${b3} = ${a3 * b3}, ${c3} \u00d7 ${d3} = ${c3 * d3}, total = ${ans3}`,
    isBoss: true,
  });

  return problems;
}

function generateAllProblems(): MathProblem[] {
  return [
    ...generateQuickPick(),
    ...generateTrickQuestions(),
    ...generateNumberSense(),
    ...generateBossRush(),
  ];
}

// ─── Initial State ────────────────────────────────────────────────────────────

function createInitialState(): GameState {
  return {
    problemIndex: 0,
    timeRemaining: TOTAL_TIME,
    problemFraction: 1,
    combo: 1,
    score: 0,
    correct: 0,
    total: 0,
    bestCombo: 0,
    selectedOption: null,
    isAnswered: false,
    phaseTransition: {
      title: `Phase 1: ${PHASES[0].name}`,
      subtitle: PHASE_SUBTITLES[0],
      isFinal: false,
    },
    explanationText: '',
    showExplanation: false,
    gameEnded: false,
    problemKey: 0,
    comboKey: 0,
    problemStartTime: Date.now(),
    bossBanner: false,
    scorePop: null,
    scorePopKey: 0,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MathSprint() {
  const [state, setState] = useState<GameState>(createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameEndedRef = useRef(false);
  const gameStartTimeRef = useRef(Date.now());
  const problemTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeSessionCalledRef = useRef(false);

  const problems = useMemo(generateAllProblems, []);

  // ── Derived values ──

  const currentPhase = useMemo(
    () => getPhaseForProblem(state.problemIndex),
    [state.problemIndex]
  );

  const currentPhaseNumber = useMemo(
    () => getPhaseNumber(state.problemIndex),
    [state.problemIndex]
  );

  const phaseProgress = useMemo(
    () => getPhaseProgress(state.problemIndex),
    [state.problemIndex]
  );

  const timerColor = useMemo(() => {
    const pct = (state.timeRemaining / TOTAL_TIME) * 100;
    if (pct > 50) return '#58CC02';
    if (pct > 20) return '#FF9600';
    return '#FF3B30';
  }, [state.timeRemaining]);

  const problemTimerColor = useMemo(() => {
    if (state.problemFraction > 0.5 && currentPhase) return currentPhase.color;
    if (state.problemFraction > 0.2) return '#FF9600';
    return '#FF3B30';
  }, [state.problemFraction, currentPhase]);

  // ── Clear all pending timeouts ──

  const clearTimeouts = useCallback(() => {
    if (problemTimeoutRef.current) {
      clearTimeout(problemTimeoutRef.current);
      problemTimeoutRef.current = null;
    }
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = null;
    }
  }, []);

  // ── End game ──

  const endGame = useCallback(() => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    clearTimeouts();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState(prev => ({ ...prev, gameEnded: true }));
  }, [clearTimeouts]);

  // ── Start a specific problem ──

  const startProblem = useCallback((index: number) => {
    if (gameEndedRef.current) return;

    const phase = getPhaseForProblem(index);
    if (!phase) {
      endGame();
      return;
    }

    const isBoss = phase.name === 'Boss Rush';

    setState(prev => ({
      ...prev,
      problemIndex: index,
      isAnswered: false,
      showExplanation: false,
      selectedOption: null,
      explanationText: '',
      scorePop: null,
      problemStartTime: Date.now(),
      problemKey: prev.problemKey + 1,
      problemFraction: 1,
      bossBanner: isBoss,
      phaseTransition: null,
    }));

    // Schedule problem timeout
    problemTimeoutRef.current = setTimeout(() => {
      if (gameEndedRef.current) return;
      setState(prev => {
        if (prev.isAnswered || prev.gameEnded || prev.phaseTransition) return prev;
        return { ...prev, isAnswered: true, selectedOption: null };
      });
    }, phase.timePerProblem * 1000);

    // Clear boss banner after slam duration
    if (isBoss) {
      actionTimeoutRef.current = setTimeout(() => {
        if (gameEndedRef.current) return;
        setState(prev => ({ ...prev, bossBanner: false }));
      }, BOSS_BANNER_DURATION);
    }
  }, [endGame]);

  // ── Advance to next problem or phase transition ──

  const advanceToNext = useCallback(() => {
    if (gameEndedRef.current) return;

    const currentIndex = stateRef.current.problemIndex;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= TOTAL_PROBLEMS) {
      endGame();
      return;
    }

    const nextPhaseNum = getPhaseNumber(nextIndex);
    const prevPhaseNum = getPhaseNumber(currentIndex);

    if (nextPhaseNum !== prevPhaseNum) {
      // Show phase transition overlay
      setState(prev => ({
        ...prev,
        problemIndex: nextIndex,
        isAnswered: false,
        showExplanation: false,
        selectedOption: null,
        explanationText: '',
        scorePop: null,
        phaseTransition: {
          title: `Phase ${nextPhaseNum + 1}: ${PHASES[nextPhaseNum].name}`,
          subtitle: PHASE_SUBTITLES[nextPhaseNum],
          isFinal: nextPhaseNum === PHASES.length - 1,
        },
        problemFraction: 0,
      }));
    } else {
      // Same phase, go straight to next problem
      startProblem(nextIndex);
    }
  }, [endGame, startProblem]);

  // ── Handle option click ──

  const handleOptionClick = useCallback((optionIndex: number) => {
    if (gameEndedRef.current) return;

    setState(prev => {
      if (
        prev.isAnswered ||
        prev.phaseTransition ||
        prev.showExplanation ||
        prev.gameEnded ||
        prev.bossBanner
      ) {
        return prev;
      }
      return { ...prev, isAnswered: true, selectedOption: optionIndex };
    });

    // Clear the problem timeout since player answered
    if (problemTimeoutRef.current) {
      clearTimeout(problemTimeoutRef.current);
      problemTimeoutRef.current = null;
    }
  }, []);

  // ── Display timer: 100ms interval for smooth bars ──

  useEffect(() => {
    gameStartTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (gameEndedRef.current) return;

      const now = Date.now();
      const globalElapsed = (now - gameStartTimeRef.current) / 1000;
      const newTimeRemaining = Math.max(0, TOTAL_TIME - globalElapsed);

      if (newTimeRemaining <= 0) {
        endGame();
        return;
      }

      setState(prev => {
        if (prev.gameEnded) return prev;

        let newProblemFraction = prev.problemFraction;
        if (!prev.phaseTransition && !prev.showExplanation && !prev.isAnswered) {
          const phase = getPhaseForProblem(prev.problemIndex);
          if (phase) {
            const problemElapsed = (now - prev.problemStartTime) / 1000;
            newProblemFraction = Math.max(0, 1 - problemElapsed / phase.timePerProblem);
          }
        }

        return {
          ...prev,
          timeRemaining: Math.round(newTimeRemaining * 10) / 10,
          problemFraction: newProblemFraction,
        };
      });
    }, 100);

    timerRef.current = interval;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [endGame]);

  // ── Process answer when isAnswered flips to true ──

  useEffect(() => {
    if (
      !state.isAnswered ||
      state.showExplanation ||
      state.gameEnded ||
      state.phaseTransition
    ) {
      return;
    }

    const problem = problems[state.problemIndex];
    if (!problem) return;

    const isCorrect = state.selectedOption === problem.correctIndex;

    setState(prev => {
      const newCombo = isCorrect ? prev.combo + 1 : 1;
      const pointsEarned = isCorrect ? 10 * newCombo : 0;

      return {
        ...prev,
        showExplanation: true,
        explanationText: problem.explanation,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        total: prev.total + 1,
        combo: newCombo,
        bestCombo: Math.max(prev.bestCombo, newCombo),
        score: prev.score + pointsEarned,
        scorePop: isCorrect ? `+${pointsEarned}` : null,
        scorePopKey: prev.scorePopKey + 1,
        comboKey: newCombo >= 3 ? prev.comboKey + 1 : prev.comboKey,
      };
    });
  }, [
    state.isAnswered,
    state.showExplanation,
    state.gameEnded,
    state.phaseTransition,
    state.problemIndex,
    state.selectedOption,
    problems,
  ]);

  // ── Auto-advance after explanation (1.5s) ──

  useEffect(() => {
    if (!state.showExplanation || state.gameEnded) return;

    const t = setTimeout(() => {
      advanceToNext();
    }, EXPLANATION_DURATION);

    return () => clearTimeout(t);
  }, [state.showExplanation, state.gameEnded, advanceToNext]);

  // ── Phase transition \u2192 start first problem of new phase (1.5s) ──

  useEffect(() => {
    if (!state.phaseTransition || state.gameEnded) return;

    const t = setTimeout(() => {
      startProblem(state.problemIndex);
    }, PHASE_TRANSITION_DURATION);

    return () => clearTimeout(t);
  }, [state.phaseTransition, state.gameEnded, state.problemIndex, startProblem]);

  // ── Game ended \u2192 call completeSession ──

  useEffect(() => {
    if (!state.gameEnded || completeSessionCalledRef.current) return;
    completeSessionCalledRef.current = true;
    clearTimeouts();

    const accuracy =
      state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;

    let stars = 0;
    if (accuracy >= 90) stars = 3;
    else if (accuracy >= 70) stars = 2;
    else if (accuracy >= 50) stars = 1;

    useGameStore.getState().completeSession({
      game: 'math',
      score: state.score,
      stars,
      accuracy,
      bestCombo: state.bestCombo,
      timeElapsed: TOTAL_TIME - state.timeRemaining,
      isDaily: false,
      extra: `${state.correct}/${state.total} correct`,
    });
  }, [
    state.gameEnded,
    state.score,
    state.correct,
    state.total,
    state.bestCombo,
    clearTimeouts,
  ]);

  // ── Cleanup on unmount ──

  useEffect(() => {
    return () => {
      clearTimeouts();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clearTimeouts]);

  // ── Render helpers ──

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const currentProblem = problems[state.problemIndex];
  const isBossPhase = currentPhase?.name === 'Boss Rush';
  const isTransition = !!state.phaseTransition;

  const getOptionStyle = (optIndex: number): React.CSSProperties => {
    if (!state.isAnswered || !currentProblem) {
      return {
        background: '#FFFFFF',
        border: '2px solid #E8E8E8',
        color: '#333333',
      };
    }
    const isCorrectOpt = optIndex === currentProblem.correctIndex;
    const isSelected = optIndex === state.selectedOption;

    if (isCorrectOpt) {
      return {
        background: '#E8FFE0',
        border: '2px solid #58CC02',
        color: '#333333',
      };
    }
    if (isSelected && !isCorrectOpt) {
      return {
        background: '#FFE8E8',
        border: '2px solid #FF4B4B',
        color: '#333333',
      };
    }
    return {
      background: '#FFFFFF',
      border: '2px solid #E8E8E8',
      color: '#AAAAAA',
    };
  };

  // ── Compute stars for end screen ──
  const endAccuracy =
    state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
  const endStars =
    endAccuracy >= 90 ? 3 : endAccuracy >= 70 ? 2 : endAccuracy >= 50 ? 1 : 0;

  // ── Render ──

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: '#F9F9F9',
        color: '#333333',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Back button */}
        <button
          onClick={() => useGameStore.getState().setScreen('home')}
          style={{
            background: 'none',
            border: 'none',
            color: '#333333',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          {'\u2190'} Back
        </button>

        {/* Global timer bar + time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            margin: '0 12px',
          }}
        >
          <div
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: '#E0E0E0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(state.timeRemaining / TOTAL_TIME) * 100}%`,
                height: '100%',
                background: timerColor,
                borderRadius: 4,
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              color: '#999999',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 36,
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            {formatTime(state.timeRemaining)}
          </span>
        </div>

        {/* Phase name pill */}
        {currentPhase && !isTransition && !state.gameEnded && (
          <div
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              background: currentPhase.color,
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {currentPhase.name}
          </div>
        )}
      </div>

      {/* ── Problem Timer Bar ── */}
      {!isTransition && !state.gameEnded && currentProblem && (
        <div
          style={{
            padding: '0 16px 8px',
            maxWidth: 480,
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              height: 4,
              borderRadius: 2,
              background: '#E8E8E8',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${state.problemFraction * 100}%`,
                height: '100%',
                background: problemTimerColor,
                borderRadius: 2,
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Problem Area ── */}
      {!isTransition && !state.gameEnded && currentProblem && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
            maxWidth: 480,
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* Score Pop (absolute, floats up) */}
          {state.scorePop && (
            <div
              key={state.scorePopKey}
              style={{
                position: 'absolute',
                top: '30%',
                left: '50%',
                fontSize: 28,
                fontWeight: 900,
                color: '#58CC02',
                animation: 'mathsprint-float-up 1s ease-out forwards',
                pointerEvents: 'none',
                zIndex: 20,
                textShadow: '0 2px 8px rgba(88,204,2,0.3)',
              }}
            >
              {state.scorePop}
            </div>
          )}

          {/* Phase progress text */}
          <div
            style={{
              fontSize: 13,
              color: '#999999',
              marginBottom: 16,
            }}
          >
            Problem {phaseProgress.current} of {phaseProgress.total}
          </div>

          {/* Expression (with slide animation on key change) */}
          <div
            key={state.problemKey}
            style={{
              fontSize: isBossPhase ? 26 : 36,
              fontWeight: 800,
              textAlign: 'center',
              marginBottom: 32,
              lineHeight: 1.3,
              animation: 'mathsprint-slide-in 0.3s ease-out',
            }}
          >
            {currentProblem.expression}
          </div>

          {/* Options */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              width: '100%',
            }}
          >
            {currentProblem.options.map((opt, i) => (
              <button
                key={`${state.problemKey}-${i}`}
                onClick={() => handleOptionClick(i)}
                disabled={state.isAnswered || state.bossBanner}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 16,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor:
                    state.isAnswered || state.bossBanner ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  ...getOptionStyle(i),
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Combo Indicator ── */}
      {state.combo >= 3 &&
        !isTransition &&
        !state.gameEnded &&
        currentProblem && (
          <div
            key={state.comboKey}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              background:
                state.combo >= 5 ? '#FF9600' : '#58CC02',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              animation: 'mathsprint-combo-pulse 0.4s ease',
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {state.combo >= 5 && '\uD83D\uDD25 '}
            {'\u00d7'}{state.combo}
          </div>
        )}

      {/* ── Explanation Bar ── */}
      {state.showExplanation && (
        <div
          style={{
            background: '#FF3B30',
            color: '#FFFFFF',
            padding: '12px 16px',
            fontSize: 15,
            fontWeight: 600,
            textAlign: 'center',
            animation: 'mathsprint-slide-in-up 0.3s ease-out',
          }}
        >
          {state.explanationText}
        </div>
      )}

      {/* ── Score Footer ── */}
      {!isTransition && !state.gameEnded && (
        <div
          style={{
            padding: '12px 16px',
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: '#333333',
          }}
        >
          Score: {state.score}
        </div>
      )}

      {/* ── Phase Transition Overlay ── */}
      {state.phaseTransition && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(249,249,249,0.95)',
            zIndex: 50,
            animation: state.phaseTransition.isFinal
              ? 'mathsprint-boss-slam 0.5s ease-out'
              : 'mathsprint-phase-flash 1.5s ease',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: state.phaseTransition.isFinal
                  ? '#FF9600'
                  : '#58CC02',
                marginBottom: 8,
              }}
            >
              {state.phaseTransition.title}
            </div>
            <div style={{ fontSize: 18, color: '#666666' }}>
              {state.phaseTransition.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* ── Boss Banner Overlay ── */}
      {state.bossBanner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,150,0,0.92)',
            zIndex: 60,
            animation: 'mathsprint-boss-slam 0.5s ease-out',
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: '#FFFFFF',
              textShadow: '0 2px 16px rgba(0,0,0,0.3)',
            }}
          >
            {'\uD83D\uDC51 BOSS'}
          </div>
        </div>
      )}

      {/* ── Game Ended Overlay ── */}
      {state.gameEnded && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              maxWidth: 340,
              width: '100%',
              margin: '0 16px',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: '#333333',
                marginBottom: 6,
              }}
            >
              {state.timeRemaining <= 0 ? "Time's Up!" : 'Great Job!'}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#58CC02',
                marginBottom: 16,
              }}
            >
              Score: {state.score}
            </div>

            {/* Stars */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[1, 2, 3].map(s => (
                <span
                  key={s}
                  style={{
                    fontSize: 36,
                    opacity: s <= endStars ? 1 : 0.2,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  {'\u2B50'}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div
              style={{
                fontSize: 14,
                color: '#999999',
                marginBottom: 20,
              }}
            >
              Best Combo: {'\u00d7'}{state.bestCombo} {'\u00b7'}{' '}
              {state.correct}/{state.total} correct
            </div>

            {/* Done button */}
            <button
              onClick={() => useGameStore.getState().setScreen('home')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #58CC02, #58A700)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── CSS Animations ── */}
      <style jsx>{`
        @keyframes mathsprint-phase-flash {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }
        @keyframes mathsprint-boss-slam {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          60% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes mathsprint-combo-pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes mathsprint-slide-in-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes mathsprint-float-up {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-80px);
          }
        }
        @keyframes mathsprint-slide-in {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
