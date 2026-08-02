'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore, type SessionResults } from '@/store/useGameStore';
import { createSeededRandom, dateToSeed, seededShuffle, getTodaySeedStr } from '@/lib/seededRandom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Rule {
  description: string;
  category: string;
  letters: string[];
  validWords: string[];
  difficulty?: number;
}

interface PuzzleState {
  phase: 'playing' | 'transition' | 'ended';
  currentRound: number;
  globalTime: number;
  roundTime: number;
  selectedIndices: number[];
  foundWords: string[];
  combo: number;
  score: number;
  bestCombo: number;
  totalCorrect: number;
  totalAttempts: number;
  totalWordsFound: number;
  feedback: 'correct' | 'wrong' | 'already' | null;
  feedbackWord: string;
  scorePop: string | null;
  scorePopKey: number;
  shakeKey: number;
  wordKey: number;
  typewriterText: string;
  wordsPerRound: number[]; // track words found in each round
}

// ─── Rules (ordered easy → hard, pick 4 for 4 rounds) ─────────────────────
const ALL_RULES: Rule[] = [
  {
    description: '3-letter words',
    category: 'pattern',
    letters: ['C', 'A', 'T', 'D', 'O', 'G', 'R', 'U', 'N', 'S'],
    validWords: [
      'act', 'ado', 'ago', 'ant', 'arc', 'art', 'can', 'car', 'cat', 'cog',
      'con', 'cot', 'cud', 'cur', 'cut', 'dag', 'dot', 'dug', 'duo', 'dun',
      'god', 'gnu', 'got', 'gun', 'gut', 'nag', 'nor', 'nut', 'oar', 'oat',
      'our', 'out', 'rag', 'ran', 'rat', 'rod', 'rot', 'rug', 'run', 'rut',
      'sag', 'sat', 'son', 'sot', 'sun', 'tag', 'tar', 'tat', 'ton', 'too',
      'tog', 'tug',
    ],
    difficulty: 1,
  },
  {
    description: "Words starting with 'S'",
    category: 'pattern',
    letters: ['S', 'T', 'A', 'R', 'I', 'N', 'G', 'O', 'D', 'E'],
    validWords: [
      'sad', 'sag', 'sand', 'sane', 'sang', 'sari', 'sat', 'sea', 'set', 'side',
      'sing', 'sire', 'sit', 'soda', 'son', 'song', 'sore', 'sort', 'sot', 'stage',
      'stair', 'stain', 'star', 'stare', 'sting', 'stir', 'stone', 'stond', 'stong',
      'store', 'stride',
    ],
    difficulty: 2,
  },
  {
    description: "Words ending in 'AT'",
    category: 'pattern',
    letters: ['C', 'A', 'T', 'B', 'H', 'M', 'R', 'S', 'F', 'L'],
    validWords: ['cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'fat', 'flat', 'brat', 'that'],
    difficulty: 3,
  },
  {
    description: "Words containing 'OO'",
    category: 'pattern',
    letters: ['G', 'O', 'O', 'D', 'L', 'K', 'B', 'T', 'F', 'W'],
    validWords: [
      'good', 'look', 'book', 'took', 'wood', 'foot', 'boot', 'tool',
      'loot', 'food', 'wolf',
    ],
    difficulty: 4,
  },
  {
    description: "Words ending in 'OG'",
    category: 'pattern',
    letters: ['D', 'O', 'G', 'F', 'R', 'C', 'B', 'L', 'T', 'J'],
    validWords: ['dog', 'fog', 'log', 'bog', 'cog', 'jog', 'frog', 'clog', 'flog'],
    difficulty: 3,
  },
  {
    description: 'Words with double letters',
    category: 'pattern',
    letters: ['S', 'E', 'E', 'T', 'L', 'B', 'O', 'K', 'F', 'L'],
    validWords: [
      'see', 'bee', 'feel', 'feet', 'left', 'belt', 'fell', 'felt', 'best',
      'flee', 'flock', 'steep', 'fleet', 'beef', 'beet', 'keep', 'keel',
    ],
    difficulty: 3,
  },
];

const TOTAL_ROUNDS = 4;
const ROUND_TIME = 45;
const GLOBAL_TIME = 180;
const TILE_SIZE = 48;

// ─── Shuffle helper ───────────────────────────────────────────────────────────
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Pick 4 random rules (shuffled, sorted by difficulty) ──────────────────
function pickRules(): Rule[] {
  const shuffled = shuffleArray([...ALL_RULES]);
  shuffled.sort((a, b) => (a.difficulty ?? 5) - (b.difficulty ?? 5));
  return shuffled.slice(0, TOTAL_ROUNDS);
}

// ─── Initial State Factory ───────────────────────────────────────────────────
function createInitialState(): PuzzleState {
  return {
    phase: 'playing',
    currentRound: 0,
    globalTime: GLOBAL_TIME,
    roundTime: ROUND_TIME,
    selectedIndices: [],
    foundWords: [],
    combo: 0,
    score: 0,
    bestCombo: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    totalWordsFound: 0,
    feedback: null,
    feedbackWord: '',
    scorePop: null,
    scorePopKey: 0,
    shakeKey: 0,
    wordKey: 0,
    typewriterText: '',
    wordsPerRound: [],
  };
}

// ─── Main WordPuzzle Component ───────────────────────────────────────────────
interface WordPuzzleProps {
  isDaily?: boolean;
}
export default function WordPuzzle({ isDaily = false }: WordPuzzleProps) {
  // ── Rules for this session (stable across renders) ──
  const [rules] = useState<Rule[]>(() => {
    if (isDaily) {
      const seed = dateToSeed(getTodaySeedStr());
      const rng = createSeededRandom(seed);
      const picked = seededShuffle(ALL_RULES, rng).slice(0, TOTAL_ROUNDS);
      picked.sort((a, b) => (a.difficulty ?? 5) - (b.difficulty ?? 5));
      return picked;
    }
    return pickRules();
  });

  // ── Shuffled letters per round (updatable on shuffle) ──
  const initialShuffled = useRef(
    rules.map((r) => shuffleArray(r.letters))
  );
  const [shuffledLettersPerRound, setShuffledLettersPerRound] = useState<string[][]>(
    () => initialShuffled.current
  );

  // ── Single state object + setter helper ──
  const [state, setStateRaw] = useState<PuzzleState>(createInitialState);

  const setState = useCallback(
    (partial: Partial<PuzzleState>) => {
      setStateRaw((prev) => ({ ...prev, ...partial }));
    },
    [setStateRaw]
  );

  // ── Handlers ref to avoid stale closures ──
  const handlersRef = useRef<{
    tick: () => void;
    onLetterTap: (index: number) => void;
    onWordTap: () => void;
    onSubmit: () => void;
    onClear: () => void;
    onShuffle: () => void;
  } | null>(null);

  // ── Refs for values needed in handlers/timer ──
  const stateRef = useRef<PuzzleState>(state);
  const rulesRef = useRef<Rule[]>(rules);
  const shuffledLettersRef = useRef<string[][]>(shuffledLettersPerRound);
  const gameEndedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Current rule and letters ──
  const currentRule = rules[state.currentRound];
  const currentLetters = shuffledLettersPerRound[state.currentRound];

  // ── Current word from selected letters ──
  const currentWord = state.selectedIndices
    .map((i) => currentLetters[i])
    .join('')
    .toLowerCase();

  // ── Timer color based on global time ──
  const timerColor = useMemo(() => {
    const pct = (state.globalTime / GLOBAL_TIME) * 100;
    if (pct > 50) return '#58CC02';
    if (pct > 20) return '#FF9600';
    return '#FF3B30';
  }, [state.globalTime]);

  // ── Round timer color ──
  const roundTimerColor = useMemo(() => {
    const pct = (state.roundTime / ROUND_TIME) * 100;
    if (pct > 50) return '#58CC02';
    if (pct > 20) return '#FF9600';
    return '#FF3B30';
  }, [state.roundTime]);

  // ── Format time ──
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Typewriter effect for clue ──
  const startTypewriter = useCallback(
    (description: string) => {
      setState({ typewriterText: '' });
      let charIndex = 0;
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      typewriterRef.current = setInterval(() => {
        charIndex++;
        setState({ typewriterText: description.slice(0, charIndex) });
        if (charIndex >= description.length) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          typewriterRef.current = null;
        }
      }, 50);
    },
    [setState]
  );

  // ── Circular ring radius ──
  const ringRadius = useMemo(() => {
    const total = currentLetters.length;
    if (total === 11) return 100;
    return 90;
  }, [currentLetters.length]);

  // ── Circular ring positions ──
  const ringPositions = useMemo(() => {
    const total = currentLetters.length;
    const cx = ringRadius + TILE_SIZE / 2;
    const cy = ringRadius + TILE_SIZE / 2;
    const positions: { x: number; y: number; index: number; letter: string }[] = [];
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
      const x = cx + ringRadius * Math.cos(angle) - TILE_SIZE / 2;
      const y = cy + ringRadius * Math.sin(angle) - TILE_SIZE / 2;
      positions.push({ x, y, index: i, letter: currentLetters[i] });
    }
    return positions;
  }, [currentLetters, ringRadius]);

  // ── End game ──
  const endGame = useCallback(() => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }

    setState({ phase: 'ended' });
  }, [setState]);

  // ── Complete session on ended phase ──
  const completeSession = useCallback(() => {
    const s = stateRef.current;
    const accuracy = s.totalAttempts > 0 ? Math.round((s.totalCorrect / s.totalAttempts) * 100) : 0;

    // Build wordsPerRound if game ended mid-round (push current round's count)
    const roundScores = [...s.wordsPerRound];
    if (roundScores.length < TOTAL_ROUNDS && s.foundWords.length > 0) {
      roundScores.push(s.foundWords.length);
    }
    // Pad with 0 if ended before some rounds
    while (roundScores.length < TOTAL_ROUNDS) {
      roundScores.push(0);
    }

    let stars = 0;
    if (accuracy >= 90) stars = 3;
    else if (accuracy >= 70) stars = 2;
    else if (accuracy >= 50) stars = 1;

    useGameStore.getState().completeSession({
      game: 'word',
      score: s.score,
      stars,
      accuracy,
      bestCombo: s.bestCombo,
      timeElapsed: 180 - s.globalTime,
      isDaily,
      extra: s.totalWordsFound + ' words found',
      roundScores: isDaily ? roundScores : undefined,
    });
  }, [isDaily]);

  useEffect(() => {
    if (state.phase === 'ended') {
      completeSession();
    }
  }, [state.phase, completeSession]);

  // ── Tick handler (called every second) ──
  const tick = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase === 'ended' || s.phase === 'transition') return;

    const newRoundTime = s.roundTime - 1;
    const newGlobalTime = s.globalTime - 1;

    if (newGlobalTime <= 0) {
      setState({ roundTime: 0, globalTime: 0 });
      endGame();
      return;
    }

    if (newRoundTime <= 0) {
      // Round time expired -> save words count and transition
      const currentRoundWordCount = s.foundWords.length;
      const updatedWordsPerRound = [...s.wordsPerRound, currentRoundWordCount];
      setState({
        roundTime: 0,
        globalTime: newGlobalTime,
        selectedIndices: [],
        feedback: null,
        feedbackWord: '',
        phase: 'transition',
        wordsPerRound: updatedWordsPerRound,
      });
      // Auto-advance after 3 seconds
      setTimeout(() => {
        if (gameEndedRef.current) return;
        const current = stateRef.current;
        if (current.phase !== 'transition') return;
        const nextRound = current.currentRound + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          endGame();
        } else {
          setState({
            phase: 'playing',
            currentRound: nextRound,
            roundTime: ROUND_TIME,
            selectedIndices: [],
            foundWords: [],
            combo: 0,
            typewriterText: '',
            feedback: null,
            feedbackWord: '',
          });
          const nextRule = rulesRef.current[nextRound];
          startTypewriter(nextRule.description);
        }
      }, 3000);
      return;
    }

    setState({ roundTime: newRoundTime, globalTime: newGlobalTime });
  }, [setState, endGame, startTypewriter]);

  // ── On letter tap ──
  const onLetterTap = useCallback(
    (index: number) => {
      if (gameEndedRef.current) return;
      const s = stateRef.current;
      if (s.phase !== 'playing') return;
      if (s.selectedIndices.includes(index)) return;

      setState({
        selectedIndices: [...s.selectedIndices, index],
        wordKey: s.wordKey + 1,
        feedback: null,
      });
    },
    [setState]
  );

  // ── On word tap (deselect last) ──
  const onWordTap = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'playing') return;
    if (s.selectedIndices.length === 0) return;

    setState({
      selectedIndices: s.selectedIndices.slice(0, -1),
      wordKey: s.wordKey + 1,
      feedback: null,
    });
  }, [setState]);

  // ── On submit ──
  const onSubmit = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'playing') return;
    if (s.selectedIndices.length === 0) return;

    const letters = shuffledLettersRef.current[s.currentRound];
    const word = s.selectedIndices.map((i) => letters[i]).join('').toLowerCase();
    const rule = rulesRef.current[s.currentRound];

    if (s.foundWords.includes(word)) {
      // Already found
      setState({
        feedback: 'already',
        feedbackWord: word,
        shakeKey: s.shakeKey + 1,
      });
      setTimeout(() => {
        if (gameEndedRef.current) return;
        setState({ feedback: null, feedbackWord: '' });
      }, 1200);
      return;
    }

    // Increment total attempts
    const newTotalAttempts = s.totalAttempts + 1;

    if (rule.validWords.includes(word)) {
      // Correct!
      const newCombo = s.combo + 1;
      const points = 15 * newCombo;
      const newBestCombo = Math.max(s.bestCombo, newCombo);
      const newTotalCorrect = s.totalCorrect + 1;
      const newTotalWordsFound = s.totalWordsFound + 1;

      setState({
        foundWords: [...s.foundWords, word],
        combo: newCombo,
        score: s.score + points,
        bestCombo: newBestCombo,
        totalCorrect: newTotalCorrect,
        totalAttempts: newTotalAttempts,
        totalWordsFound: newTotalWordsFound,
        feedback: 'correct',
        feedbackWord: word,
        scorePop: `+${points}`,
        scorePopKey: s.scorePopKey + 1,
        selectedIndices: [],
        wordKey: s.wordKey + 1,
      });

      setTimeout(() => {
        if (gameEndedRef.current) return;
        setState({ feedback: null, feedbackWord: '', scorePop: null });
      }, 1200);
    } else {
      // Wrong
      setState({
        combo: 0,
        totalAttempts: newTotalAttempts,
        feedback: 'wrong',
        feedbackWord: word,
        shakeKey: s.shakeKey + 1,
      });

      setTimeout(() => {
        if (gameEndedRef.current) return;
        setState({ feedback: null, feedbackWord: '' });
      }, 1200);
    }
  }, [setState]);

  // ── On clear ──
  const onClear = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'playing') return;

    setState({
      selectedIndices: [],
      wordKey: s.wordKey + 1,
      feedback: null,
    });
  }, [setState]);

  // ── On shuffle ──
  const onShuffle = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'playing') return;

    const round = s.currentRound;
    const currentLetters = shuffledLettersRef.current[round];

    // Remap selected indices based on old positions
    const oldSelected = s.selectedIndices;
    const selectedLetters = oldSelected.map((i) => currentLetters[i]);

    const newShuffled = shuffleArray(currentLetters);

    // Find new indices for the previously selected letters
    const newSelected: number[] = [];
    const usedIndices = new Set<number>();
    for (const letter of selectedLetters) {
      for (let i = 0; i < newShuffled.length; i++) {
        if (newShuffled[i] === letter && !usedIndices.has(i)) {
          newSelected.push(i);
          usedIndices.add(i);
          break;
        }
      }
    }

    const updated = [...shuffledLettersRef.current];
    updated[round] = newShuffled;
    shuffledLettersRef.current = updated;
    setShuffledLettersPerRound(updated);

    setState({
      selectedIndices: newSelected,
      wordKey: s.wordKey + 1,
    });
  }, [setState]);

  // ── Assign handlers to ref ──
  useEffect(() => {
    handlersRef.current = {
      tick,
      onLetterTap,
      onWordTap,
      onSubmit,
      onClear,
      onShuffle,
    };
  }, [tick, onLetterTap, onWordTap, onSubmit, onClear, onShuffle]);

  // ── Start timer + typewriter on mount ──
  useEffect(() => {
    gameEndedRef.current = false;
    startTypewriter(rules[0].description);

    timerRef.current = setInterval(() => {
      if (handlersRef.current) {
        handlersRef.current.tick();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      gameEndedRef.current = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed values for transition screen ──
  const transitionRule =
    state.phase === 'transition' ? rules[state.currentRound] : null;

  // ── Ring container size ──
  const ringContainerSize = (ringRadius + TILE_SIZE / 2) * 2;

  // ── Render ──
  return (
    <div
      className="flex flex-col items-center min-h-screen"
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
          style={{
            color: '#333333',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>

        <div className="flex flex-col items-center flex-1 mx-4">
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: '#E0E0E0', maxWidth: 180 }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${(state.globalTime / GLOBAL_TIME) * 100}%`,
                background: timerColor,
              }}
            />
          </div>
          <span className="text-xs font-medium mt-1" style={{ color: '#999' }}>
            {formatTime(state.globalTime)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isDaily && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FF9600', color: '#fff' }}>
              DAILY
            </span>
          )}
          <span className="text-xs font-semibold" style={{ color: '#999', whiteSpace: 'nowrap' }}>
            Round {state.currentRound + 1} of {TOTAL_ROUNDS}
          </span>
        </div>
      </div>

      {/* ── Round Timer Bar ── */}
      <div className="w-full px-4 mb-2" style={{ maxWidth: 400 }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: '#999' }}>
            Round time
          </span>
          <span className="text-xs font-bold" style={{ color: roundTimerColor }}>
            {state.roundTime}s
          </span>
        </div>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: '#E0E0E0' }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${(state.roundTime / ROUND_TIME) * 100}%`,
              background: roundTimerColor,
            }}
          />
        </div>
      </div>

      {/* ── Combo Counter ── */}
      <div className="flex items-center gap-1 mb-2" style={{ height: 28 }}>
        {state.combo >= 2 && (
          <div
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
            style={{
              background: state.combo >= 5 ? '#FF9600' : '#58CC02',
              color: '#fff',
              animation: 'combo-pulse 0.5s ease',
            }}
          >
            {state.combo >= 5 && <span>🔥</span>}
            x{state.combo}
          </div>
        )}
      </div>

      {/* ── Typewriter Clue ── */}
      <div
        className="mb-3 px-4 py-2 rounded-xl text-center"
        style={{
          background: '#fff',
          border: '1.5px solid #E8E8E8',
          maxWidth: 300,
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="text-sm font-medium" style={{ color: '#666' }}>
          Find words that match:
        </span>{' '}
        <span className="text-base font-bold" style={{ color: '#333' }}>
          {state.typewriterText}
        </span>
        <span
          className="inline-block w-0.5 h-5 ml-0.5"
          style={{
            background: '#333',
            animation: 'blink-cursor 0.8s step-end infinite',
          }}
        />
      </div>

      {/* ── Found Words Pills ── */}
      {state.foundWords.length > 0 && (
        <div
          className="w-full mb-3 overflow-x-auto"
          style={{ maxWidth: 400, paddingLeft: 16, paddingRight: 16 }}
        >
          <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
            {state.foundWords.map((word) => (
              <span
                key={word}
                className="px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap"
                style={{
                  background: '#E8F5E9',
                  color: '#2E7D32',
                  border: '1px solid #A5D6A7',
                }}
              >
                ✓ {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Circular Letter Ring ── */}
      <div
        className="relative mb-3"
        style={{
          width: ringContainerSize,
          height: ringContainerSize,
          flexShrink: 0,
        }}
      >
        {ringPositions.map((pos) => {
          const isSelected = state.selectedIndices.includes(pos.index);
          const isUsed = state.foundWords.some((w) => {
            const wordLetters = w.split('');
            const selectedLetter = pos.letter.toLowerCase();
            return wordLetters.includes(selectedLetter);
          });

          // Selected tiles move slightly toward center
          let tileX = pos.x;
          let tileY = pos.y;
          if (isSelected) {
            const cx = ringContainerSize / 2;
            const cy = ringContainerSize / 2;
            const tileCx = pos.x + TILE_SIZE / 2;
            const tileCy = pos.y + TILE_SIZE / 2;
            const dx = cx - tileCx;
            const dy = cy - tileCy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const shift = 14;
            tileX = pos.x + (dx / dist) * shift;
            tileY = pos.y + (dy / dist) * shift;
          }

          return (
            <button
              key={`${state.wordKey}-${pos.index}`}
              onClick={() => handlersRef.current?.onLetterTap(pos.index)}
              className={`absolute rounded-xl font-bold flex items-center justify-center select-none transition-all duration-150 ${
                isSelected ? 'ring-glow' : ''
              }`}
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                left: tileX,
                top: tileY,
                fontSize: 18,
                background: isSelected ? '#E8F5E9' : '#fff',
                color: isSelected ? '#2E7D32' : '#333',
                border: `2px solid ${isSelected ? '#58CC02' : '#E8E8E8'}`,
                cursor: 'pointer',
                boxShadow: isSelected
                  ? '0 0 12px rgba(88, 204, 2, 0.4)'
                  : '0 1px 3px rgba(0,0,0,0.08)',
                zIndex: isSelected ? 10 : 1,
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {pos.letter}
            </button>
          );
        })}

        {/* Center indicator showing word count */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            left: ringContainerSize / 2 - 22,
            top: ringContainerSize / 2 - 22,
            borderRadius: '50%',
            background: '#F0F0F0',
          }}
        >
          <span className="text-xs font-bold" style={{ color: '#999' }}>
            {state.foundWords.length}
          </span>
        </div>
      </div>

      {/* ── Current Word Display ── */}
      <div className="mb-3" style={{ minHeight: 48 }}>
        <button
          key={`word-${state.wordKey}`}
          onClick={() => handlersRef.current?.onWordTap()}
          className="px-5 py-2 rounded-xl text-lg font-bold flex items-center gap-1"
          style={{
            background: currentWord ? '#fff' : 'transparent',
            border: currentWord ? '2px solid #E8E8E8' : '2px solid transparent',
            color: '#333',
            cursor: currentWord ? 'pointer' : 'default',
            minHeight: 44,
            minWidth: 80,
            justifyContent: 'center',
            animation: state.feedback === 'wrong'
              ? `shake 0.5s ease ${state.shakeKey}`
              : 'none',
          }}
        >
          {currentWord ? (
            <span style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
              {currentWord}
            </span>
          ) : (
            <span style={{ color: '#CCC', fontSize: 14, fontWeight: 500 }}>
              Tap letters
            </span>
          )}
        </button>
      </div>

      {/* ── Score Popup ── */}
      {state.scorePop && (
        <div
          key={`scorepop-${state.scorePopKey}`}
          className="absolute font-black text-xl"
          style={{
            color: '#58CC02',
            animation: 'float-up 1s ease-out forwards',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {state.scorePop}
        </div>
      )}

      {/* ── Feedback ── */}
      <div
        className="mb-3"
        style={{
          minHeight: 28,
          width: '100%',
          maxWidth: 300,
          textAlign: 'center',
        }}
      >
        {state.feedback === 'correct' && (
          <div
            key={`fb-correct-${state.wordKey}`}
            className="text-base font-bold"
            style={{
              color: '#58CC02',
              animation: 'slide-in-right 0.3s ease',
            }}
          >
            ✓ Correct!
          </div>
        )}
        {state.feedback === 'wrong' && (
          <div
            key={`fb-wrong-${state.shakeKey}`}
            className="text-base font-bold"
            style={{
              color: '#FF3B30',
              animation: 'slide-in-right 0.3s ease',
            }}
          >
            ✗ Not a match
          </div>
        )}
        {state.feedback === 'already' && (
          <div
            key={`fb-already-${state.shakeKey}`}
            className="text-base font-bold"
            style={{
              color: '#FF9600',
              animation: 'slide-in-right 0.3s ease',
            }}
          >
            Already found!
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handlersRef.current?.onSubmit()}
          disabled={state.selectedIndices.length === 0}
          className="px-8 py-3 rounded-xl text-base font-bold"
          style={{
            background:
              state.selectedIndices.length === 0
                ? '#E0E0E0'
                : 'linear-gradient(135deg, #58CC02, #58A700)',
            color: state.selectedIndices.length === 0 ? '#999' : '#fff',
            border: state.selectedIndices.length === 0
              ? '2px solid #D0D0D0'
              : '2px solid transparent',
            borderBottom:
              state.selectedIndices.length === 0
                ? undefined
                : '4px solid #46A302',
            cursor:
              state.selectedIndices.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Submit
        </button>
        <button
          onClick={() => handlersRef.current?.onClear()}
          className="px-5 py-3 rounded-xl text-base font-bold"
          style={{
            background: '#F0F0F0',
            color: '#777',
            border: '2px solid #E0E0E0',
            borderBottom: '4px solid #D0D0D0',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
        <button
          onClick={() => handlersRef.current?.onShuffle()}
          className="px-5 py-3 rounded-xl text-base font-bold"
          style={{
            background: '#F0F0F0',
            color: '#777',
            border: '2px solid #E0E0E0',
            borderBottom: '4px solid #D0D0D0',
            cursor: 'pointer',
          }}
        >
          Shuffle
        </button>
      </div>

      {/* ── Round Transition Overlay ── */}
      {state.phase === 'transition' && transitionRule && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="text-center p-6 rounded-2xl mx-4"
            style={{
              background: '#fff',
              maxWidth: 320,
              width: '100%',
              animation: 'slide-up 0.4s ease',
            }}
          >
            <div
              className="text-2xl font-black mb-1"
              style={{ color: '#333' }}
            >
              Round {state.currentRound + 1} Complete!
            </div>

            <div
              className="text-base font-bold mb-4"
              style={{ color: '#58CC02' }}
            >
              The rule was: "{transitionRule.description}"
            </div>

            <div className="flex justify-center gap-6 mb-4">
              <div className="text-center">
                <div
                  className="text-2xl font-black"
                  style={{ color: '#333' }}
                >
                  {state.foundWords.length}
                </div>
                <div className="text-xs" style={{ color: '#999' }}>
                  Found
                </div>
              </div>
              <div className="text-center">
                <div
                  className="text-2xl font-black"
                  style={{ color: '#999' }}
                >
                  {transitionRule.validWords.length}
                </div>
                <div className="text-xs" style={{ color: '#999' }}>
                  Possible
                </div>
              </div>
              <div className="text-center">
                <div
                  className="text-2xl font-black"
                  style={{ color: '#FF9600' }}
                >
                  x{state.bestCombo}
                </div>
                <div className="text-xs" style={{ color: '#999' }}>
                  Best Combo
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Game Ended Overlay ── */}
      {state.phase === 'ended' && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="text-center p-6 rounded-2xl mx-4"
            style={{
              background: '#fff',
              maxWidth: 320,
              width: '100%',
              animation: 'slide-up 0.4s ease',
            }}
          >
            <div className="text-2xl font-black mb-1" style={{ color: '#333' }}>
              {state.globalTime <= 0 ? "Time's Up!" : 'Great Job!'}
            </div>
            <div
              className="text-lg font-bold mb-4"
              style={{ color: '#58CC02' }}
            >
              Score: {state.score}
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map((s) => {
                const accuracy =
                  state.totalAttempts > 0
                    ? Math.round(
                        (state.totalCorrect / state.totalAttempts) * 100
                      )
                    : 0;
                let stars = 0;
                if (accuracy >= 90) stars = 3;
                else if (accuracy >= 70) stars = 2;
                else if (accuracy >= 50) stars = 1;
                return (
                  <span
                    key={s}
                    style={{
                      fontSize: 32,
                      opacity: s <= stars ? 1 : 0.2,
                    }}
                  >
                    ⭐
                  </span>
                );
              })}
            </div>

            <div className="text-sm mb-4" style={{ color: '#999' }}>
              {state.totalWordsFound} words found · Best Combo: x{state.bestCombo}{' '}
              · Accuracy:{' '}
              {state.totalAttempts > 0
                ? Math.round(
                    (state.totalCorrect / state.totalAttempts) * 100
                  )
                : 0}
              %
            </div>

            <button
              onClick={() => useGameStore.getState().setScreen('home')}
              className="w-full py-3 rounded-xl text-base font-bold"
              style={{
                background: 'linear-gradient(135deg, #58CC02, #58A700)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Inline Styles / Keyframes ── */}
      <style jsx>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-60px);
          }
        }
        @keyframes slide-in-right {
          0% {
            opacity: 0;
            transform: translateX(20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes combo-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .ring-glow {
          box-shadow: 0 0 16px rgba(88, 204, 2, 0.5);
        }
      `}</style>
    </div>
  );
}
