'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { generateAnagramPuzzles, isValidWord } from '@/lib/anagramGenerator';
import type { AnagramPuzzle } from '@/lib/anagramGenerator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameState {
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
  roundScores: number[];
  allFoundBonus: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_ROUNDS = 4;
const ROUND_TIME = 45;
const GLOBAL_TIME = 180;
const TILE_SIZE = 52;

const WORD_SCORES: Record<number, number> = { 3: 100, 4: 250, 5: 500, 6: 1000, 7: 2000 };

// ─── Puzzle generation (non-reactive) ────────────────────────────────────────

function pickPuzzles(): AnagramPuzzle[] {
  return generateAnagramPuzzles(TOTAL_ROUNDS);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initialState = (): GameState => ({
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
  roundScores: [],
  allFoundBonus: 0,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnagramScramble() {
  const [state, setState] = useState<GameState>(initialState);
  const completeSessionCalledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate puzzles once (non-reactive to seed changes)
  const puzzles = useMemo(() => pickPuzzles(), []);
  const currentPuzzle = puzzles[state.currentRound] ?? puzzles[0];
  const currentWord = state.selectedIndices.map(i => currentPuzzle.letters[i]).join('');

  // ── Timer tick ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setState(prev => {
        const newGlobal = Math.max(0, prev.globalTime - 1);
        const newRound = Math.max(0, prev.roundTime - 1);
        const roundEnded = newRound === 0;
        const gameEnded = newGlobal === 0;
        if (roundEnded || gameEnded) {
          const roundScore = prev.foundWords.length;
          const newRoundScores = [...prev.roundScores, roundScore];
          if (prev.currentRound >= TOTAL_ROUNDS - 1 || gameEnded) {
            return { ...prev, globalTime: newGlobal, roundTime: newRound, phase: 'ended', roundScores: newRoundScores, totalWordsFound: prev.totalWordsFound + roundScore };
          }
          return { ...prev, globalTime: newGlobal, roundTime: newRound, phase: 'transition', roundScores: newRoundScores, totalWordsFound: prev.totalWordsFound + roundScore };
        }
        return { ...prev, globalTime: newGlobal, roundTime: newRound };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.phase]);

  // ── Transition → next round ────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'transition') return;
    const t = setTimeout(() => {
      setState(prev => ({
        ...prev,
        phase: 'playing',
        currentRound: prev.currentRound + 1,
        roundTime: ROUND_TIME,
        selectedIndices: [],
        foundWords: [],
        combo: 0,
        feedback: null,
      }));
    }, 2000);
    return () => clearTimeout(t);
  }, [state.phase]);

  // ── Game ended → call completeSession ───────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'ended' || completeSessionCalledRef.current) return;
    completeSessionCalledRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const accuracy = state.totalAttempts > 0 ? Math.round((state.totalCorrect / state.totalAttempts) * 100) : 0;
    const totalPossible = puzzles.reduce((s, p) => s + p.validWords.length, 0);
    const foundPct = totalPossible > 0 ? state.totalWordsFound / totalPossible : 0;

    let stars = 0;
    if (foundPct >= 0.55) stars = 3;
    else if (foundPct >= 0.35) stars = 2;
    else if (foundPct >= 0.18) stars = 1;

    useGameStore.getState().completeSession({
      game: 'anagram',
      score: state.score,
      stars,
      accuracy,
      bestCombo: state.bestCombo,
      timeElapsed: GLOBAL_TIME - state.globalTime,
      isDaily: false,
      extra: `${state.totalWordsFound} words`,
      roundScores: state.roundScores,
    });
  }, [state.phase, state.score, state.totalWordsFound, state.totalAttempts, state.totalCorrect, state.bestCombo, state.globalTime, puzzles]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleTileTap = useCallback((index: number) => {
    setState(prev => {
      if (prev.phase !== 'playing') return prev;
      // If already selected, deselect it
      if (prev.selectedIndices.includes(index)) {
        return { ...prev, selectedIndices: prev.selectedIndices.filter(i => i !== index) };
      }
      return { ...prev, selectedIndices: [...prev.selectedIndices, index] };
    });
  }, []);

  const handleClear = useCallback(() => {
    setState(prev => ({ ...prev, selectedIndices: [], feedback: null }));
  }, []);

  const handleBackspace = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndices: prev.selectedIndices.slice(0, -1),
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    setState(prev => {
      if (prev.phase !== 'playing') return prev;
      const puzzle = puzzles[prev.currentRound];
      if (!puzzle) return prev;

      const word = prev.selectedIndices.map(i => puzzle.letters[i]).join('');
      if (word.length < 3) return { ...prev, shakeKey: prev.shakeKey + 1, feedback: 'wrong', feedbackWord: '' };

      // Check already found
      if (prev.foundWords.includes(word)) {
        return { ...prev, shakeKey: prev.shakeKey + 1, feedback: 'already', feedbackWord: word };
      }

      // Check valid
      if (isValidWord(word, puzzle.letters)) {
        const wordScore = (WORD_SCORES[word.length] ?? 100) * Math.max(1, prev.combo + 1);
        const newCombo = prev.combo + 1;
        const newBest = Math.max(prev.bestCombo, newCombo);
        const isAllFound = prev.foundWords.length + 1 === puzzle.validWords.length;
        const bonusPts = isAllFound ? 500 : 0;

        return {
          ...prev,
          selectedIndices: [],
          foundWords: [...prev.foundWords, word],
          combo: newCombo,
          score: prev.score + wordScore + bonusPts,
          bestCombo: newBest,
          totalCorrect: prev.totalCorrect + 1,
          totalAttempts: prev.totalAttempts + 1,
          feedback: 'correct',
          feedbackWord: word,
          scorePop: `+${wordScore}`,
          scorePopKey: prev.scorePopKey + 1,
          wordKey: prev.wordKey + 1,
          allFoundBonus: isAllFound ? bonusPts : prev.allFoundBonus,
        };
      }

      // Wrong word
      return {
        ...prev,
        selectedIndices: [],
        combo: 0,
        totalAttempts: prev.totalAttempts + 1,
        shakeKey: prev.shakeKey + 1,
        feedback: 'wrong',
        feedbackWord: word,
      };
    });
  }, [puzzles]);

  const handleEndEarly = useCallback(() => {
    setState(prev => {
      if (prev.phase !== 'playing') return prev;
      const roundScore = prev.foundWords.length;
      const newRoundScores = [...prev.roundScores, roundScore];
      if (prev.currentRound >= TOTAL_ROUNDS - 1) {
        return { ...prev, phase: 'ended', roundScores: newRoundScores, totalWordsFound: prev.totalWordsFound + roundScore };
      }
      return { ...prev, phase: 'transition', roundScores: newRoundScores, totalWordsFound: prev.totalWordsFound + roundScore };
    });
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────

  const isLastRound = state.currentRound >= TOTAL_ROUNDS - 1;
  const showWordCounter = state.phase === 'playing' && currentPuzzle.validWords.length <= 15;
  const allFound = state.foundWords.length === currentPuzzle.validWords.length;
  const timerUrgent = state.roundTime <= 10;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: '#F9F9F9' }}>
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full px-4 pt-safe">

        {/* Header Bar */}
        <HeaderBar
          round={state.currentRound + 1}
          totalRounds={TOTAL_ROUNDS}
          globalTime={state.globalTime}
          roundTime={state.roundTime}
          score={state.score}
          urgent={timerUrgent}
          combo={state.combo}
          onEndEarly={handleEndEarly}
          isLastRound={isLastRound}
        />

        {/* Main game area */}
        {state.phase === 'transition' ? (
          <TransitionOverlay round={state.currentRound + 1} found={state.roundScores[state.roundScores.length - 1] ?? 0} />
        ) : (
          <>
            {/* Letter tiles */}
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <div className="flex flex-wrap justify-center gap-2.5 px-2">
                {currentPuzzle.letters.map((letter, i) => {
                  const isSelected = state.selectedIndices.includes(i);
                  return (
                    <button
                      key={`${state.currentRound}-${i}`}
                      onClick={() => handleTileTap(i)}
                      className="rounded-xl font-extrabold text-white flex items-center justify-center select-none transition-all duration-100 active:scale-90"
                      style={{
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        fontSize: 22,
                        background: isSelected
                          ? 'linear-gradient(180deg, #FF9600, #E08600)'
                          : 'linear-gradient(180deg, #FFB84D, #FF9600)',
                        boxShadow: isSelected
                          ? '0 4px 12px rgba(255,150,0,0.4)'
                          : '0 3px 8px rgba(255,150,0,0.2)',
                        transform: isSelected ? 'translateY(-4px) scale(1.05)' : 'none',
                      }}
                    >
                      {letter.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {/* Current word display */}
              <div
                className="w-full rounded-2xl flex items-center justify-center px-4"
                style={{
                  minHeight: 56,
                  background: '#fff',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  border: '2px solid ' + (state.feedback === 'wrong' ? '#FF3B30' : '#E8E8E8'),
                }}
              >
                {currentWord ? (
                  <span
                    key={state.wordKey}
                    className="text-[22px] font-extrabold tracking-wider"
                    style={{ color: '#333' }}
                  >
                    {currentWord.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-[15px]" style={{ color: '#CCC' }}>Tap letters to form a word</span>
                )}
              </div>

              {/* Feedback toast */}
              {state.feedback && (
                <FeedbackToast
                  key={state.feedbackWord + state.feedback + state.shakeKey}
                  type={state.feedback}
                  word={state.feedbackWord}
                />
              )}

              {/* Action buttons */}
              <div className="flex gap-3 w-full px-2">
                <button
                  onClick={handleBackspace}
                  className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-white active:scale-95 transition-transform"
                  style={{ border: '2px solid #E0E0E0', color: '#666' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
                  </svg>
                  Clear
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={currentWord.length < 3 || allFound}
                  className="flex-[2] py-3 rounded-xl font-bold text-[15px] text-white active:scale-95 transition-all"
                  style={{
                    background: allFound
                      ? '#58CC02'
                      : currentWord.length >= 3
                        ? 'linear-gradient(180deg, #58CC02, #46A302)'
                        : '#CCC',
                    boxShadow: currentWord.length >= 3 ? '0 4px 12px rgba(88,204,2,0.3)' : 'none',
                  }}
                >
                  {allFound ? 'All Found!' : 'Submit'}
                </button>
                <button
                  onClick={handleEndEarly}
                  className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-white active:scale-95 transition-transform"
                  style={{ border: '2px solid #E0E0E0', color: '#666' }}
                >
                  Skip <span style={{ fontSize: 11, opacity: 0.6 }}>→</span>
                </button>
              </div>

              {/* Score pop */}
              {state.scorePop && (
                <div
                  key={state.scorePopKey}
                  className="absolute pointer-events-none font-extrabold"
                  style={{
                    fontSize: 24,
                    color: '#58CC02',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    animation: 'scorePop 0.8s ease-out forwards',
                  }}
                >
                  {state.scorePop}
                </div>
              )}
            </div>

            {/* Found words panel */}
            <div className="pb-6">
              {/* Word counter */}
              {showWordCounter && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold" style={{ color: '#333' }}>
                    {state.foundWords.length} / {currentPuzzle.validWords.length} words
                  </span>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 80, background: '#E0E0E0' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (state.foundWords.length / currentPuzzle.validWords.length) * 100)}%`,
                        background: state.foundWords.length / currentPuzzle.validWords.length >= 0.7 ? '#58CC02' : state.foundWords.length / currentPuzzle.validWords.length >= 0.4 ? '#FF9600' : '#999',
                      }}
                    />
                  </div>
                  {allFound && (
                    <span className="text-xs font-black" style={{ color: '#58CC02' }}>All found!</span>
                  )}
                </div>
              )}

              {/* Found words list */}
              <div className="bg-white rounded-2xl p-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', minHeight: 80 }}>
                {state.foundWords.length === 0 ? (
                  <p className="text-center text-[13px]" style={{ color: '#CCC' }}>No words found yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {state.foundWords.map((word) => (
                      <span
                        key={word}
                        className="px-3 py-1 rounded-lg text-[13px] font-bold"
                        style={{
                          background: '#FFF5E6',
                          color: '#E08600',
                          border: '1px solid #FFD699',
                        }}
                      >
                        {word.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HeaderBar({ round, totalRounds, globalTime, roundTime, score, urgent, combo, onEndEarly, isLastRound }: {
  round: number; totalRounds: number; globalTime: number; roundTime: number;
  score: number; urgent: boolean; combo: number;
  onEndEarly: () => void; isLastRound: boolean;
}) {
  const timerColor = roundTime <= 10 ? '#FF3B30' : roundTime <= 20 ? '#FF9600' : '#333';
  const mins = Math.floor(globalTime / 60);
  const secs = globalTime % 60;

  return (
    <div className="pt-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold" style={{ color: '#FF9600' }}>Round {round}/{totalRounds}</span>
          {combo > 1 && (
            <span key={combo} className="text-[12px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: '#FFF5E6', color: '#FF9600', animation: 'comboIn 0.3s ease-out' }}>
              x{combo}
            </span>
          )}
        </div>
        <span className="text-[13px] font-bold" style={{ color: '#FF9600' }}>{score} pts</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${(roundTime / 45) * 100}%`,
              background: timerColor,
              animation: urgent ? 'pulse 1s infinite' : 'none',
            }}
          />
        </div>
        <span className="text-[12px] font-bold tabular-nums" style={{ color: timerColor, minWidth: 48, textAlign: 'right' }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

function TransitionOverlay({ round, found }: { round: number; found: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="text-6xl" style={{ animation: 'bounceIn 0.5s ease-out' }}>{'\u2b50'}</div>
      <div className="text-center">
        <p className="text-[20px] font-bold text-[#333]">Round {round} Complete!</p>
        <p className="text-[15px] mt-1" style={{ color: '#999' }}>{found} word{found !== 1 ? 's' : ''} found</p>
      </div>
      <div className="text-[13px] font-medium" style={{ color: '#CCC' }}>Next round starting...</div>
    </div>
  );
}

function FeedbackToast({ type, word }: { type: string; word: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    correct: { bg: '#58CC02', text: '#fff', label: 'Correct!' },
    wrong: { bg: '#FF3B30', text: '#fff', label: 'Not a word' },
    already: { bg: '#FF9600', text: '#fff', label: 'Already found!' },
  };
  const c = colors[type] ?? colors.wrong;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[14px]"
      style={{
        background: c.bg,
        color: c.text,
        animation: 'toastIn 0.3s ease-out',
        boxShadow: `0 4px 12px ${c.bg}40`,
      }}
    >
      {type === 'correct' && <span>{'\u2713'}</span>}
      <span>{c.label}</span>
      {word && <span style={{ opacity: 0.8, fontSize: 13 }}>{word.toUpperCase()}</span>}
    </div>
  );
}
