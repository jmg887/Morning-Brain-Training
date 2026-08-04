'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { generateOddOneRounds } from '@/lib/oddOneGenerator';
import type { OddOneRound } from '@/lib/oddOneGenerator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameState {
  phase: 'playing' | 'feedback' | 'ended';
  currentRound: number;
  globalTime: number;
  score: number;
  combo: number;
  bestCombo: number;
  totalCorrect: number;
  totalAttempts: number;
  lastCorrect: boolean;
  tappedIndex: number | null;
  roundStartTime: number;
  reactionTimes: number[];
  scorePop: string | null;
  scorePopKey: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_ROUNDS = 20;
const GLOBAL_TIME = 120;
const FEEDBACK_DURATION = 1200;

const BASE_SCORE = 200;
const SPEED_BONUS_MAX = 300;
const SPEED_BONUS_TIME = 3000; // ms to earn full speed bonus

// ─── Puzzle generation ───────────────────────────────────────────────────────

function pickRounds(): OddOneRound[] {
  return generateOddOneRounds(TOTAL_ROUNDS);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initialState = (): GameState => ({
  phase: 'playing',
  currentRound: 0,
  globalTime: GLOBAL_TIME,
  score: 0,
  combo: 0,
  bestCombo: 0,
  totalCorrect: 0,
  totalAttempts: 0,
  lastCorrect: false,
  tappedIndex: null,
  roundStartTime: Date.now(),
  reactionTimes: [],
  scorePop: null,
  scorePopKey: 0,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function OddOneOut() {
  const [state, setState] = useState<GameState>(initialState);
  const completeSessionCalledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rounds = useMemo(() => pickRounds(), []);
  const currentRound = rounds[state.currentRound] ?? rounds[0];

  // ── Timer tick ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.phase === 'ended') return;
    timerRef.current = setInterval(() => {
      setState(prev => {
        const newTime = Math.max(0, prev.globalTime - 1);
        if (newTime === 0) return { ...prev, globalTime: 0, phase: 'ended' };
        return { ...prev, globalTime: newTime };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.phase]);

  // ── Feedback → next round ───────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'feedback') return;
    feedbackRef.current = setTimeout(() => {
      setState(prev => {
        const nextRound = prev.currentRound + 1;
        if (nextRound >= rounds.length) return { ...prev, phase: 'ended' };
        return {
          ...prev,
          phase: 'playing',
          currentRound: nextRound,
          tappedIndex: null,
          lastCorrect: false,
          roundStartTime: Date.now(),
        };
      });
    }, FEEDBACK_DURATION);
    return () => { if (feedbackRef.current) clearTimeout(feedbackRef.current); };
  }, [state.phase, rounds.length]);

  // ── Game ended → completeSession ────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'ended' || completeSessionCalledRef.current) return;
    completeSessionCalledRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const accuracy = state.totalAttempts > 0
      ? Math.round((state.totalCorrect / state.totalAttempts) * 100) : 0;
    const avgReaction = state.reactionTimes.length > 0
      ? state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length : 0;

    // Stars: accuracy + speed
    let stars = 0;
    if (accuracy >= 90 && avgReaction < 2500) stars = 3;
    else if (accuracy >= 80) stars = 2;
    else if (accuracy >= 60) stars = 1;

    useGameStore.getState().completeSession({
      game: 'oddone',
      score: state.score,
      stars,
      accuracy,
      bestCombo: state.bestCombo,
      timeElapsed: GLOBAL_TIME - state.globalTime,
      isDaily: false,
      extra: `${state.totalCorrect}/${state.totalAttempts} correct`,
    });
  }, [state.phase, state.score, state.totalCorrect, state.totalAttempts, state.bestCombo, state.globalTime, state.reactionTimes]);

  // ── Handle tap ──────────────────────────────────────────────────────────

  const handleTap = useCallback((index: number) => {
    setState(prev => {
      if (prev.phase !== 'playing' || !currentRound) return prev;

      const reactionMs = Date.now() - prev.roundStartTime;
      const isCorrect = index === currentRound.oddIndex;
      const newCombo = isCorrect ? prev.combo + 1 : 0;
      const newBest = Math.max(prev.bestCombo, newCombo);

      // Scoring
      let points = 0;
      if (isCorrect) {
        const speedBonus = Math.round(
          SPEED_BONUS_MAX * Math.max(0, 1 - reactionMs / SPEED_BONUS_TIME)
        );
        const comboMultiplier = 1 + (newCombo - 1) * 0.25;
        points = Math.round((BASE_SCORE + speedBonus) * comboMultiplier);
      } else {
        points = -50;
      }

      const newReactionTimes = isCorrect
        ? [...prev.reactionTimes, reactionMs]
        : prev.reactionTimes;

      return {
        ...prev,
        phase: 'feedback',
        tappedIndex: index,
        lastCorrect: isCorrect,
        score: Math.max(0, prev.score + points),
        combo: newCombo,
        bestCombo: newBest,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        totalAttempts: prev.totalAttempts + 1,
        reactionTimes: newReactionTimes,
        scorePop: isCorrect ? `+${points}` : `${points}`,
        scorePopKey: prev.scorePopKey + 1,
      };
    });
  }, [currentRound]);

  // ── Derived ─────────────────────────────────────────────────────────────

  const timePercent = (state.globalTime / GLOBAL_TIME) * 100;
  const timeColor = state.globalTime <= 15 ? '#FF3B30' : state.globalTime <= 30 ? '#FF9600' : '#333';
  const mins = Math.floor(state.globalTime / 60);
  const secs = state.globalTime % 60;

  // ── Render ──────────────────────────────────────────────────────────────

  if (!currentRound) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: '#F9F9F9' }}>
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full px-5 pt-safe">

        {/* Header */}
        <div className="pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold" style={{ color: '#00BFA6' }}>
                Round {Math.min(state.currentRound + 1, rounds.length)}/{rounds.length}
              </span>
              {state.combo > 1 && (
                <span
                  key={state.combo}
                  className="text-[12px] font-extrabold px-2 py-0.5 rounded-full"
                  style={{ background: '#E0FFF7', color: '#00BFA6', animation: 'comboIn 0.3s ease-out' }}
                >
                  x{state.combo}
                </span>
              )}
            </div>
            <span className="text-[13px] font-bold" style={{ color: '#00BFA6' }}>{state.score} pts</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-[#F0F0F0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${timePercent}%`,
                  background: timeColor,
                  animation: state.globalTime <= 15 ? 'pulse 1s infinite' : 'none',
                }}
              />
            </div>
            <span className="text-[12px] font-bold tabular-nums" style={{ color: timeColor, minWidth: 48, textAlign: 'right' }}>
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Instruction */}
        <div className="text-center mt-4 mb-2">
          <p className="text-[15px] font-bold" style={{ color: '#333' }}>Tap the odd one out</p>
          <p className="text-[12px] mt-0.5" style={{ color: '#999' }}>
            {currentRound.type === 'category' ? 'Three belong together, one does not' : 'Find the number that breaks the pattern'}
          </p>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {currentRound.items.map((item, i) => {
            const isOdd = i === currentRound.oddIndex;
            const isTapped = state.tappedIndex === i;
            const showResult = state.phase === 'feedback';

            let bgColor = '#fff';
            let borderColor = '#E8E8E8';
            let textColor = '#333';

            if (showResult && isOdd && isTapped) {
              // Correctly tapped the odd one
              bgColor = '#E0FFF7';
              borderColor = '#00BFA6';
              textColor = '#00856F';
            } else if (showResult && isOdd && !isTapped) {
              // Odd one revealed (wasn't tapped)
              bgColor = '#FFF0F0';
              borderColor = '#FF3B30';
              textColor = '#CC0000';
            } else if (showResult && !isOdd && isTapped) {
              // Wrongly tapped a normal one
              bgColor = '#FFF0F0';
              borderColor = '#FF3B30';
              textColor = '#CC0000';
            } else if (showResult && !isOdd && !isTapped) {
              // Normal item not tapped
              bgColor = '#E0FFF7';
              borderColor = '#00BFA6';
              textColor = '#00856F';
            }

            return (
              <button
                key={`${state.currentRound}-${i}`}
                onClick={() => handleTap(i)}
                disabled={state.phase !== 'playing'}
                className="rounded-2xl flex items-center justify-center p-5 transition-all duration-200 active:scale-95"
                style={{
                  background: bgColor,
                  border: `2.5px solid ${borderColor}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  minHeight: 110,
                }}
              >
                <span
                  className="text-[20px] font-bold text-center break-all leading-tight"
                  style={{ color: textColor }}
                >
                  {currentRound.type === 'number' ? item : item.charAt(0).toUpperCase() + item.slice(1)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback explanation */}
        {state.phase === 'feedback' && (
          <div
            className="mt-4 text-center"
            style={{ animation: 'toastIn 0.3s ease-out' }}
          >
            <p className="text-[14px] font-bold" style={{
              color: state.lastCorrect ? '#00BFA6' : '#FF3B30',
            }}>
              {state.lastCorrect ? 'Correct!' : 'Wrong!'}
            </p>
            <p className="text-[12px] mt-1" style={{ color: '#999' }}>
              {currentRound.explanation}
            </p>
          </div>
        )}

        {/* Score pop */}
        {state.scorePop && (
          <div
            key={state.scorePopKey}
            className="pointer-events-none font-extrabold fixed top-1/3 left-1/2"
            style={{
              fontSize: 28,
              color: state.lastCorrect ? '#00BFA6' : '#FF3B30',
              transform: 'translate(-50%, -50%)',
              animation: 'scorePop 0.8s ease-out forwards',
              zIndex: 50,
            }}
          >
            {state.scorePop}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom stats */}
        {state.phase === 'playing' && (
          <div className="pb-8 flex justify-center gap-6">
            <div className="text-center">
              <p className="text-[20px] font-extrabold" style={{ color: '#333' }}>{state.totalCorrect}</p>
              <p className="text-[11px] font-medium" style={{ color: '#999' }}>Correct</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-extrabold" style={{ color: '#333' }}>{state.totalAttempts - state.totalCorrect}</p>
              <p className="text-[11px] font-medium" style={{ color: '#999' }}>Wrong</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-extrabold" style={{ color: '#00BFA6' }}>{state.combo}</p>
              <p className="text-[11px] font-medium" style={{ color: '#999' }}>Streak</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
