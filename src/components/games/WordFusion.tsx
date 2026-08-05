'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { generateRules } from '@/lib/wordRuleGenerator';
import { generateAnagramPuzzles } from '@/lib/anagramGenerator';
import { createSeededRandom, dateToSeed, getTodaySeedStr } from '@/lib/seededRandom';
import type { GeneratedRule } from '@/lib/wordRuleGenerator';
import type { AnagramPuzzle } from '@/lib/anagramGenerator';

// ─── Types ──────────────────────────────────────────────────────────────────────

type RoundType = 'rule' | 'anagram';

interface FusionRound {
  type: RoundType;
  letters: string[];
  shuffledLetters: string[];
  clue: string | null;
  validWords: string[];
  roundTime: number;
  phase: number;
}

interface PhaseDef {
  name: string;
  subtitle: string;
  color: string;
  roundTime: number;
}

interface PlayState {
  phase: 'phase_intro' | 'playing' | 'round_transition' | 'ended';
  roundIndex: number;
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
  wordsPerRound: number[];
  lastRoundFound: number;
  lastRoundType: RoundType | null;
  lastRoundClue: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const PHASES: PhaseDef[] = [
  { name: 'Rule Finder', subtitle: 'Find words matching a hidden rule', color: '#CE82FF', roundTime: 45 },
  { name: 'Letter Scramble', subtitle: 'Unscramble letters to form words', color: '#FF9600', roundTime: 40 },
  { name: 'Mixed Blitz', subtitle: 'Both modes \u2014 faster pace!', color: '#FF3B30', roundTime: 35 },
];

const GLOBAL_TIME = 180;
const TILE_SIZE_RULE = 46;
const TILE_SIZE_ANAGRAM = 50;
const ANAGRAM_WORD_SCORES: Record<number, number> = { 3: 100, 4: 250, 5: 500, 6: 1000, 7: 2000 };
const FEEDBACK_CLEAR_DELAY = 1200;

// ─── Round Generation ───────────────────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateFusionRounds(seed?: number): FusionRound[] {
  const ruleSeed = seed !== undefined ? seed : undefined;
  const anagramSeed = seed !== undefined ? seed + 1000 : undefined;

  const ruleRounds = generateRules(3, ruleSeed);
  const anagramRounds = generateAnagramPuzzles(3, anagramSeed);

  const rounds: FusionRound[] = [];

  // Phase 0: 2 rule rounds
  for (let i = 0; i < 2 && i < ruleRounds.length; i++) {
    const r = ruleRounds[i];
    rounds.push({
      type: 'rule',
      letters: r.letters,
      shuffledLetters: shuffleArray(r.letters),
      clue: r.description,
      validWords: r.validWords,
      roundTime: PHASES[0].roundTime,
      phase: 0,
    });
  }

  // Phase 1: 2 anagram rounds
  for (let i = 0; i < 2 && i < anagramRounds.length; i++) {
    const a = anagramRounds[i];
    rounds.push({
      type: 'anagram',
      letters: a.letters,
      shuffledLetters: [...a.letters],
      clue: null,
      validWords: a.validWords,
      roundTime: PHASES[1].roundTime,
      phase: 1,
    });
  }

  // Phase 2: 1 rule + 1 anagram (if available)
  if (ruleRounds.length > 2) {
    const ruleR = ruleRounds[2];
    rounds.push({
      type: 'rule',
      letters: ruleR.letters,
      shuffledLetters: shuffleArray(ruleR.letters),
      clue: ruleR.description,
      validWords: ruleR.validWords,
      roundTime: PHASES[2].roundTime,
      phase: 2,
    });
  }
  if (anagramRounds.length > 2) {
    const anagramR = anagramRounds[2];
    rounds.push({
      type: 'anagram',
      letters: anagramR.letters,
      shuffledLetters: [...anagramR.letters],
      clue: null,
      validWords: anagramR.validWords,
      roundTime: PHASES[2].roundTime,
      phase: 2,
    });
  }

  return rounds;
}

// ─── Initial State ──────────────────────────────────────────────────────────────

function createInitialState(): PlayState {
  return {
    phase: 'phase_intro',
    roundIndex: 0,
    globalTime: GLOBAL_TIME,
    roundTime: PHASES[0].roundTime,
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
    lastRoundFound: 0,
    lastRoundType: null,
    lastRoundClue: null,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────────

interface WordFusionProps {
  isDaily?: boolean;
}

export default function WordFusion({ isDaily = false }: WordFusionProps) {
  // ── Generate rounds (stable across renders) ──
  const [rounds] = useState<FusionRound[]>(() => {
    if (isDaily) {
      const seed = dateToSeed(getTodaySeedStr());
      return generateFusionRounds(seed);
    }
    return generateFusionRounds();
  });
  const totalRounds = rounds.length;

  const [state, setStateRaw] = useState<PlayState>(createInitialState);
  const setState = useCallback(
    (partial: Partial<PlayState>) => setStateRaw((prev) => ({ ...prev, ...partial })),
    []
  );

  const stateRef = useRef(state);
  const shuffledRef = useRef<string[][]>(rounds.map((r) => r.shuffledLetters));
  const roundsRef = useRef(rounds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameEndedRef = useRef(false);
  const handlersRef = useRef<{
    tick: () => void;
    onLetterTap: (i: number) => void;
    onWordTap: () => void;
    onSubmit: () => void;
    onClear: () => void;
    onShuffle: () => void;
    onSkip: () => void;
  } | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  const currentRound = rounds[state.roundIndex];
  const currentLetters = shuffledRef.current[state.roundIndex];
  const currentWord = state.selectedIndices.map((i) => currentLetters[i]).join('').toLowerCase();
  const phaseColor = currentRound ? PHASES[currentRound.phase].color : '#CE82FF';

  // ─── Typewriter ──────────────────────────────────────────────────────────────

  const startTypewriter = useCallback(
    (text: string) => {
      setState({ typewriterText: '' });
      let ci = 0;
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      typewriterRef.current = setInterval(() => {
        ci++;
        setState({ typewriterText: text.slice(0, ci) });
        if (ci >= text.length) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          typewriterRef.current = null;
        }
      }, 40);
    },
    [setState]
  );

  // ─── End Game (sets phase to ended; completeSession called via useEffect) ─────

  const endGame = useCallback(() => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
    setState({ phase: 'ended' });
  }, [setState]);

  // ─── Complete session when phase becomes ended ─────────────────────────────

  const completeSession = useCallback(() => {
    const s = stateRef.current;
    const accuracy = s.totalAttempts > 0 ? Math.round((s.totalCorrect / s.totalAttempts) * 100) : 0;
    const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;

    // Build round scores for daily share card
    const roundScores = [...s.wordsPerRound];
    // Pad if game ended mid-round
    while (roundScores.length < totalRounds) {
      roundScores.push(0);
    }

    useGameStore.getState().completeSession({
      game: 'word',
      score: s.score,
      stars,
      accuracy,
      bestCombo: s.bestCombo,
      timeElapsed: GLOBAL_TIME - s.globalTime,
      isDaily,
      extra: s.totalWordsFound + ' words',
      roundScores: isDaily ? roundScores : undefined,
    });
  }, [isDaily, totalRounds]);

  useEffect(() => {
    if (state.phase === 'ended') {
      completeSession();
    }
  }, [state.phase, completeSession]);

  // ─── Save Round Words (helper — does NOT add to totalWordsFound) ────────────

  const saveRoundWords = useCallback((s: PlayState): Partial<PlayState> => {
    return {
      wordsPerRound: [...s.wordsPerRound, s.foundWords.length],
      foundWords: [],
      selectedIndices: [],
    };
  }, []);

  // ─── Advance to Next Round ───────────────────────────────────────────────────

  const advanceRound = useCallback(() => {
    const s = stateRef.current;
    const nextIdx = s.roundIndex + 1;
    const nextRound = roundsRef.current[nextIdx];

    if (!nextRound) { endGame(); return; }

    // Check phase change using refs (avoids stale closure)
    const prevRound = roundsRef.current[s.roundIndex];
    if (nextRound.phase !== prevRound?.phase) {
      setState({
        phase: 'phase_intro',
        roundIndex: nextIdx,
        selectedIndices: [],
        foundWords: [],
        combo: 0,
        typewriterText: '',
        feedback: null,
        feedbackWord: '',
        scorePop: null,
      });
    } else {
      setState({
        phase: 'playing',
        roundIndex: nextIdx,
        roundTime: nextRound.roundTime,
        selectedIndices: [],
        foundWords: [],
        combo: 0,
        typewriterText: '',
        feedback: null,
        feedbackWord: '',
        scorePop: null,
      });
      if (nextRound.clue) startTypewriter(nextRound.clue);
    }
  }, [setState, startTypewriter, endGame]);

  // ─── Timer Tick ──────────────────────────────────────────────────────────────

  const tick = useCallback(() => {
    if (gameEndedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'playing') return;

    const newRoundTime = s.roundTime - 1;
    const newGlobalTime = s.globalTime - 1;

    if (newGlobalTime <= 0) {
      // Save current round words count (no double-counting)
      const roundSave = saveRoundWords(s);
      setState({
        roundTime: 0,
        globalTime: 0,
        ...roundSave,
      });
      endGame();
      return;
    }

    if (newRoundTime <= 0) {
      const roundSave = saveRoundWords(s);
      setState({
        roundTime: 0,
        globalTime: newGlobalTime,
        phase: 'round_transition',
        ...roundSave,
        lastRoundFound: s.foundWords.length,
        lastRoundType: roundsRef.current[s.roundIndex]?.type ?? null,
        lastRoundClue: roundsRef.current[s.roundIndex]?.clue ?? null,
      });
      setTimeout(() => { if (!gameEndedRef.current) advanceRound(); }, 2500);
      return;
    }

    setState({ roundTime: newRoundTime, globalTime: newGlobalTime });
  }, [setState, endGame, advanceRound, saveRoundWords]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const onLetterTap = useCallback((index: number) => {
    const s = stateRef.current;
    if (s.phase !== 'playing' || gameEndedRef.current) return;
    if (s.selectedIndices.includes(index)) return;
    setState({ selectedIndices: [...s.selectedIndices, index], wordKey: s.wordKey + 1, feedback: null });
  }, [setState]);

  const onWordTap = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing' || gameEndedRef.current || s.selectedIndices.length === 0) return;
    setState({ selectedIndices: s.selectedIndices.slice(0, -1), wordKey: s.wordKey + 1, feedback: null });
  }, [setState]);

  const onSubmit = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing' || gameEndedRef.current || s.selectedIndices.length === 0) return;

    const letters = shuffledRef.current[s.roundIndex];
    const word = s.selectedIndices.map((i) => letters[i]).join('').toLowerCase();
    const round = roundsRef.current[s.roundIndex];

    if (s.foundWords.includes(word)) {
      setState({ feedback: 'already', feedbackWord: word, shakeKey: s.shakeKey + 1 });
      setTimeout(() => { if (!gameEndedRef.current) setState({ feedback: null, feedbackWord: '' }); }, FEEDBACK_CLEAR_DELAY);
      return;
    }

    const newTotalAttempts = s.totalAttempts + 1;

    if (round.validWords.includes(word)) {
      const newCombo = s.combo + 1;
      // Scoring depends on round type
      const points = round.type === 'rule'
        ? 15 * newCombo
        : (ANAGRAM_WORD_SCORES[word.length] ?? 100) * newCombo;

      const newFoundWords = [...s.foundWords, word];
      const allFound = newFoundWords.length === round.validWords.length;
      const bonusPts = round.type === 'anagram' && allFound ? 500 : 0;

      setState({
        foundWords: newFoundWords,
        combo: newCombo,
        score: s.score + points + bonusPts,
        bestCombo: Math.max(s.bestCombo, newCombo),
        totalCorrect: s.totalCorrect + 1,
        totalAttempts: newTotalAttempts,
        totalWordsFound: s.totalWordsFound + 1, // increment by 1 per word found
        feedback: 'correct',
        feedbackWord: word,
        scorePop: allFound ? `+${points + bonusPts} All found!` : `+${points}`,
        scorePopKey: s.scorePopKey + 1,
        selectedIndices: [],
        wordKey: s.wordKey + 1,
      });

      // All found -> auto-advance after short delay
      if (allFound) {
        setTimeout(() => {
          if (gameEndedRef.current) return;
          const cur = stateRef.current;
          if (cur.phase !== 'playing') return;
          const roundSave = saveRoundWords(cur);
          const timeBonus = round.type === 'rule' ? cur.roundTime : 0;
          setState({
            phase: 'round_transition',
            roundTime: 0,
            globalTime: Math.min(cur.globalTime + timeBonus, GLOBAL_TIME),
            ...roundSave,
            lastRoundFound: cur.foundWords.length,
            lastRoundType: round.type,
            lastRoundClue: round.clue,
          });
          setTimeout(() => { if (!gameEndedRef.current) advanceRound(); }, 2500);
        }, 800);
      } else {
        setTimeout(() => { if (!gameEndedRef.current) setState({ feedback: null, feedbackWord: '', scorePop: null }); }, FEEDBACK_CLEAR_DELAY);
      }
    } else {
      setState({
        combo: 0,
        totalAttempts: newTotalAttempts,
        feedback: 'wrong',
        feedbackWord: word,
        shakeKey: s.shakeKey + 1,
        selectedIndices: [],
        wordKey: s.wordKey + 1,
      });
      setTimeout(() => { if (!gameEndedRef.current) setState({ feedback: null, feedbackWord: '' }); }, FEEDBACK_CLEAR_DELAY);
    }
  }, [setState, saveRoundWords, advanceRound]);

  const onClear = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing' || gameEndedRef.current) return;
    setState({ selectedIndices: [], wordKey: s.wordKey + 1, feedback: null });
  }, [setState]);

  const onShuffle = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing' || gameEndedRef.current) return;
    const roundIdx = s.roundIndex;
    const oldLetters = shuffledRef.current[roundIdx];
    const selectedLetters = s.selectedIndices.map((i) => oldLetters[i]);
    const newShuffled = shuffleArray(oldLetters);

    const newSelected: number[] = [];
    const used = new Set<number>();
    for (const letter of selectedLetters) {
      for (let i = 0; i < newShuffled.length; i++) {
        if (newShuffled[i] === letter && !used.has(i)) {
          newSelected.push(i);
          used.add(i);
          break;
        }
      }
    }

    shuffledRef.current[roundIdx] = newShuffled;
    setState({ selectedIndices: newSelected, wordKey: s.wordKey + 1 });
  }, [setState]);

  const onSkip = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing' || gameEndedRef.current) return;
    const roundSave = saveRoundWords(s);
    setState({
      phase: 'round_transition',
      roundTime: 0,
      ...roundSave,
      lastRoundFound: s.foundWords.length,
      lastRoundType: roundsRef.current[s.roundIndex]?.type ?? null,
      lastRoundClue: roundsRef.current[s.roundIndex]?.clue ?? null,
    });
    setTimeout(() => { if (!gameEndedRef.current) advanceRound(); }, 2000);
  }, [setState, advanceRound, saveRoundWords]);

  // ─── Assign handlers ref ────────────────────────────────────────────────────

  useEffect(() => {
    handlersRef.current = { tick, onLetterTap, onWordTap, onSubmit, onClear, onShuffle, onSkip };
  }, [tick, onLetterTap, onWordTap, onSubmit, onClear, onShuffle, onSkip]);

  // ─── Start timer on mount ───────────────────────────────────────────────────

  useEffect(() => {
    gameEndedRef.current = false;
    timerRef.current = setInterval(() => { handlersRef.current?.tick(); }, 1000);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
      gameEndedRef.current = true;
    };
  }, []);

  // ─── Phase intro auto-advance ───────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'phase_intro') return;
    const t = setTimeout(() => {
      if (gameEndedRef.current) return;
      const r = roundsRef.current[stateRef.current.roundIndex];
      setState({ phase: 'playing', roundTime: r.roundTime });
      if (r.clue) startTypewriter(r.clue);
    }, 2000);
    return () => clearTimeout(t);
  }, [state.phase, setState, startTypewriter]);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const timerPct = (state.globalTime / GLOBAL_TIME) * 100;
  const timerColor = timerPct > 50 ? '#58CC02' : timerPct > 20 ? '#FF9600' : '#FF3B30';
  const roundTimerPct = currentRound ? (state.roundTime / currentRound.roundTime) * 100 : 0;
  const roundTimerColor = roundTimerPct > 50 ? phaseColor : roundTimerPct > 20 ? '#FF9600' : '#FF3B30';
  const showWordCounter = state.phase === 'playing' && currentRound && (
    currentRound.type === 'rule' ? currentRound.validWords.length <= 10 : currentRound.validWords.length <= 15
  );
  const allFound = currentRound ? state.foundWords.length === currentRound.validWords.length : false;

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  // ─── Circular Ring Positions (for rule rounds) ───────────────────────────────

  const ringRadius = currentRound && currentRound.type === 'rule'
    ? (currentLetters.length >= 11 ? 95 : 85)
    : 85;

  const ringPositions = useMemo(() => {
    if (!currentRound || currentRound.type !== 'rule') return [];
    const total = currentLetters.length;
    const cx = ringRadius + TILE_SIZE_RULE / 2;
    const cy = ringRadius + TILE_SIZE_RULE / 2;
    const positions: { x: number; y: number; index: number; letter: string }[] = [];
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
      positions.push({
        x: cx + ringRadius * Math.cos(angle) - TILE_SIZE_RULE / 2,
        y: cy + ringRadius * Math.sin(angle) - TILE_SIZE_RULE / 2,
        index: i,
        letter: currentLetters[i],
      });
    }
    return positions;
  }, [currentRound, currentLetters, ringRadius]);

  const ringContainerSize = (ringRadius + TILE_SIZE_RULE / 2) * 2;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Phase Intro Overlay ─────────────────────────────────────────────────────

  if (state.phase === 'phase_intro' && currentRound) {
    const pd = PHASES[currentRound.phase];
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5"
        style={{ background: `linear-gradient(180deg, ${pd.color}15 0%, #F9F9F9 100%)` }}>
        <div className="text-center phase-flash">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: pd.color + '20' }}>
            <span className="text-3xl">
              {currentRound.type === 'rule' ? '\u{1F9E0}' : '\u{1F500}'}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#333]">Phase {currentRound.phase + 1}: {pd.name}</h2>
          <p className="text-base text-[#999] mt-2">{pd.subtitle}</p>
          <p className="text-sm mt-3" style={{ color: pd.color }}>
            {pd.roundTime}s per round
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
          <div className="text-5xl mb-3">{state.lastRoundType === 'rule' ? '\u{1F9E0}' : '\u{1F500}'}</div>
          <p className="text-xl font-extrabold text-[#333]">
            {state.lastRoundFound > 0 ? 'Round Complete!' : 'Round Skipped'}
          </p>
          <p className="text-base mt-1" style={{ color: '#999' }}>
            {state.lastRoundFound} word{state.lastRoundFound !== 1 ? 's' : ''} found
          </p>
          {state.lastRoundClue && (
            <p className="text-sm mt-3 px-4 py-2 rounded-xl bg-white" style={{ color: '#666', border: '1.5px solid #E8E8E8' }}>
              Rule: {state.lastRoundClue}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Game Ended Overlay ─────────────────────────────────────────────────────

  if (state.phase === 'ended') {
    const accuracy = state.totalAttempts > 0 ? Math.round((state.totalCorrect / state.totalAttempts) * 100) : 0;
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-5"
        style={{ background: '#F9F9F9' }}>
        <div className="text-center p-6 rounded-2xl mx-4"
          style={{ background: '#fff', maxWidth: 320, width: '100%', animation: 'slide-up 0.4s ease' }}>
          <div className="text-2xl font-black mb-1" style={{ color: '#333' }}>
            {state.globalTime <= 0 ? "Time's Up!" : 'Great Job!'}
          </div>
          <div className="text-lg font-bold mb-4" style={{ color: '#58CC02' }}>
            Score: {state.score}
          </div>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => {
              let stars = 0;
              if (accuracy >= 90) stars = 3;
              else if (accuracy >= 70) stars = 2;
              else if (accuracy >= 50) stars = 1;
              return (
                <span key={s} className="text-4xl" style={{ opacity: s <= stars ? 1 : 0.2 }}>
                  {'\u2b50'}
                </span>
              );
            })}
          </div>
          <div className="text-sm mb-4" style={{ color: '#999' }}>
            {state.totalWordsFound} words found {'\u00b7'} Best Combo: {'\u00d7'}{state.bestCombo} {'\u00b7'} Accuracy: {accuracy}%
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

  if (!currentRound) return null;

  const isRule = currentRound.type === 'rule';

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
          {isDaily && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#FF9600' }}>
              DAILY
            </span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: phaseColor }}>
            {isRule ? 'RULE' : 'ANAGRAM'}
          </span>
          <span className="text-xs font-semibold" style={{ color: '#999' }}>
            {state.roundIndex + 1}/{totalRounds}
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
            style={{ background: state.combo >= 5 ? '#FF9600' : '#58CC02', color: '#fff', animation: 'combo-pulse 0.5s ease' }}>
            {state.combo >= 5 && <span>{'\u{1F525}'}</span>}
            x{state.combo}
          </div>
        )}
      </div>

      {/* ── Clue (rule rounds only) ── */}
      {isRule && (
        <div className="mb-3 px-4 py-2 rounded-xl text-center" style={{ background: '#fff', border: `1.5px solid ${phaseColor}40`, maxWidth: 300, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-sm font-medium" style={{ color: '#666' }}>Find words that match: </span>
          <span className="text-base font-bold" style={{ color: '#333' }}>{state.typewriterText}</span>
          <span className="inline-block w-0.5 h-5 ml-0.5" style={{ background: '#333', animation: 'blink-cursor 0.8s step-end infinite' }} />
        </div>
      )}

      {/* ── Anagram hint ── */}
      {!isRule && (
        <div className="mb-3 px-4 py-2 rounded-xl text-center" style={{ background: '#fff', border: '1.5px solid #E8E8E8', maxWidth: 300 }}>
          <span className="text-sm font-medium" style={{ color: '#999' }}>Tap letters to form any valid word</span>
        </div>
      )}

      {/* ── Word Counter ── */}
      {showWordCounter && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold" style={{ color: '#333' }}>{state.foundWords.length} / {currentRound.validWords.length} words</span>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 80, background: '#E0E0E0' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{
              width: `${Math.min(100, (state.foundWords.length / currentRound.validWords.length) * 100)}%`,
              background: state.foundWords.length / currentRound.validWords.length >= 0.7 ? '#58CC02' : state.foundWords.length / currentRound.validWords.length >= 0.4 ? '#FF9600' : '#999',
            }} />
          </div>
          {allFound && <span className="text-xs font-black" style={{ color: '#58CC02' }}>All found!</span>}
        </div>
      )}

      {/* ── Found Words Pills ── */}
      {state.foundWords.length > 0 && (
        <div className="w-full mb-3 overflow-x-auto" style={{ maxWidth: 400, paddingLeft: 16, paddingRight: 16 }}>
          <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
            {state.foundWords.map((w) => (
              <span key={w} className="px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap" style={{
                background: isRule ? '#F3E5F5' : '#FFF5E6',
                color: isRule ? '#7B1FA2' : '#E08600',
                border: `1px solid ${isRule ? '#CE93D8' : '#FFD699'}`,
              }}>
                {'\u2713'} {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ LETTER INPUT AREA ═══════ */}

      {isRule ? (
        /* ── Circular Ring (Rule) ── */
        <div className="relative mb-3" style={{ width: ringContainerSize, height: ringContainerSize, flexShrink: 0 }}>
          {ringPositions.map((pos) => {
            const isSelected = state.selectedIndices.includes(pos.index);
            let tileX = pos.x, tileY = pos.y;
            if (isSelected) {
              const cx = ringContainerSize / 2, cy = ringContainerSize / 2;
              const dx = cx - (pos.x + TILE_SIZE_RULE / 2), dy = cy - (pos.y + TILE_SIZE_RULE / 2);
              const dist = Math.sqrt(dx * dx + dy * dy);
              tileX = pos.x + (dx / dist) * 14;
              tileY = pos.y + (dy / dist) * 14;
            }
            return (
              <button key={`${state.wordKey}-${pos.index}`}
                onClick={() => handlersRef.current?.onLetterTap(pos.index)}
                className={`absolute rounded-xl font-bold flex items-center justify-center select-none transition-all duration-150 ${isSelected ? 'ring-glow' : ''}`}
                style={{
                  width: TILE_SIZE_RULE, height: TILE_SIZE_RULE,
                  left: tileX, top: tileY, fontSize: 17,
                  background: isSelected ? '#F3E5F5' : '#fff',
                  color: isSelected ? '#7B1FA2' : '#333',
                  border: `2px solid ${isSelected ? phaseColor : '#E8E8E8'}`,
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 12px ${phaseColor}60` : '0 1px 3px rgba(0,0,0,0.08)',
                  zIndex: isSelected ? 10 : 1,
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                }}>
                {pos.letter}
              </button>
            );
          })}
          <div className="absolute flex items-center justify-center" style={{
            width: 40, height: 40, left: ringContainerSize / 2 - 20, top: ringContainerSize / 2 - 20,
            borderRadius: '50%', background: '#F0F0F0',
          }}>
            <span className="text-xs font-bold" style={{ color: '#999' }}>{state.foundWords.length}</span>
          </div>
        </div>
      ) : (
        /* ── Linear Tiles (Anagram) ── */
        <div className="flex flex-wrap justify-center gap-2.5 px-2 mb-3">
          {currentLetters.map((letter, i) => {
            const isSelected = state.selectedIndices.includes(i);
            return (
              <button key={`${state.wordKey}-${i}`}
                onClick={() => handlersRef.current?.onLetterTap(i)}
                className="rounded-xl font-extrabold text-white flex items-center justify-center select-none transition-all duration-100 active:scale-90"
                style={{
                  width: TILE_SIZE_ANAGRAM, height: TILE_SIZE_ANAGRAM, fontSize: 22,
                  background: isSelected ? 'linear-gradient(180deg, #E08600, #CC7700)' : `linear-gradient(180deg, ${phaseColor}CC, ${phaseColor})`,
                  boxShadow: isSelected ? `0 4px 12px ${phaseColor}50` : `0 3px 8px ${phaseColor}30`,
                  transform: isSelected ? 'translateY(-4px) scale(1.05)' : 'none',
                }}>
                {letter.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Current Word Display ── */}
      <div className="mb-3" style={{ minHeight: 48 }}>
        <button
          key={`word-${state.wordKey}`}
          onClick={() => handlersRef.current?.onWordTap()}
          className="px-5 py-2 rounded-xl text-lg font-bold flex items-center gap-1"
          style={{
            background: currentWord ? '#fff' : 'transparent',
            border: `2px solid ${state.feedback === 'wrong' ? '#FF3B30' : currentWord ? '#E8E8E8' : 'transparent'}`,
            color: '#333', cursor: currentWord ? 'pointer' : 'default', minHeight: 44, minWidth: 80, justifyContent: 'center',
            animation: state.feedback === 'wrong' ? `shake 0.5s ease ${state.shakeKey}` : 'none',
          }}>
          {currentWord ? (
            <span style={{ textTransform: isRule ? 'lowercase' : 'uppercase', letterSpacing: isRule ? 0 : 2 }}>{currentWord}</span>
          ) : (
            <span style={{ color: '#CCC', fontSize: 14, fontWeight: 500 }}>Tap letters</span>
          )}
        </button>
      </div>

      {/* ── Feedback ── */}
      <div className="mb-3" style={{ minHeight: 28, width: '100%', maxWidth: 300, textAlign: 'center' }}>
        {state.feedback === 'correct' && (
          <div key={`fb-c-${state.wordKey}`} className="text-base font-bold" style={{ color: '#58CC02', animation: 'slide-in-right 0.3s ease' }}>
            {'\u2713'} Correct!
          </div>
        )}
        {state.feedback === 'wrong' && (
          <div key={`fb-w-${state.shakeKey}`} className="text-base font-bold" style={{ color: '#FF3B30', animation: 'slide-in-right 0.3s ease' }}>
            {'\u2717'} {isRule ? 'Not a match' : 'Not a word'}
          </div>
        )}
        {state.feedback === 'already' && (
          <div key={`fb-a-${state.shakeKey}`} className="text-base font-bold" style={{ color: '#FF9600', animation: 'slide-in-right 0.3s ease' }}>
            Already found!
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handlersRef.current?.onSubmit()}
          disabled={state.selectedIndices.length === 0 || allFound}
          className="px-8 py-3 rounded-xl text-base font-bold"
          style={{
            background: state.selectedIndices.length === 0 || allFound ? '#E0E0E0' : `linear-gradient(135deg, #58CC02, #46A302)`,
            color: state.selectedIndices.length === 0 || allFound ? '#999' : '#fff',
            border: state.selectedIndices.length === 0 || allFound ? '2px solid #D0D0D0' : '2px solid transparent',
            borderBottom: state.selectedIndices.length === 0 || allFound ? undefined : '4px solid #46A302',
            cursor: state.selectedIndices.length === 0 || allFound ? 'not-allowed' : 'pointer',
          }}>
          {allFound ? 'Done!' : 'Submit'}
        </button>
        <button
          onClick={() => handlersRef.current?.onClear()}
          className="px-5 py-3 rounded-xl text-base font-bold"
          style={{ background: '#F0F0F0', color: '#777', border: '2px solid #E0E0E0', borderBottom: '4px solid #D0D0D0', cursor: 'pointer' }}>
          Clear
        </button>
        {isRule ? (
          <button onClick={() => handlersRef.current?.onShuffle()} className="px-5 py-3 rounded-xl text-base font-bold"
            style={{ background: '#F0F0F0', color: '#777', border: '2px solid #E0E0E0', borderBottom: '4px solid #D0D0D0', cursor: 'pointer' }}>
            Shuffle
          </button>
        ) : (
          <button onClick={() => handlersRef.current?.onSkip()} className="px-5 py-3 rounded-xl text-base font-bold"
            style={{ background: '#F0F0F0', color: '#777', border: '2px solid #E0E0E0', borderBottom: '4px solid #D0D0D0', cursor: 'pointer' }}>
            Skip {'\u2192'}
          </button>
        )}
      </div>

      {/* ── Score Pop ── */}
      {state.scorePop && (
        <div key={`sp-${state.scorePopKey}`} className="fixed font-black text-xl" style={{ color: '#58CC02', animation: 'float-up 1s ease-out forwards', zIndex: 100, pointerEvents: 'none', top: '40%', left: '50%', transform: 'translateX(-50%)' }}>
          {state.scorePop}
        </div>
      )}

      {/* ── Inline Styles / Keyframes ── */}
      <style jsx>{`
        @keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes float-up { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-60px); } }
        @keyframes slide-in-right { 0% { opacity: 0; transform: translateX(20px); } 100% { opacity: 1; transform: translateX(0); } }
        @keyframes slide-up { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes combo-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .ring-glow { box-shadow: 0 0 16px ${phaseColor}80; }
      `}</style>
    </div>
  );
}
