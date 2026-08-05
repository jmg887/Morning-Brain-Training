'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { generateOddOneOutRounds, getOddOneOutTotalRounds, PHASES, type OddOneRound, type OddOneItem } from '@/lib/oddOneOutGenerator';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface PhaseTransition {
  title: string;
  subtitle: string;
  isFinal: boolean;
}

interface LocalState {
  roundIndex: number;
  timeRemaining: number;
  combo: number;
  score: number;
  correct: number;
  total: number;
  bestCombo: number;
  selectedItem: number | null;
  isAnswered: boolean;
  correctIndex: number;
  phaseTransition: PhaseTransition | null;
  gameEnded: boolean;
  scorePop: string | null;
  scorePopKey: number;
  comboKey: number;
  roundKey: number;
  roundStartTime: number;
  typeLabel: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const FEEDBACK_DURATION = 1200;
const PHASE_TRANSITION_DURATION = 1800;
const TYPE_LABELS: Record<string, string> = {
  category: 'Category',
  number_pattern: 'Number Pattern',
  shape: 'Shape Spot',
  color_shade: 'Color Shade',
  word_property: 'Word Rule',
  size_sequence: 'Size Order',
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function OddOneOut() {
  const completeSession = useGameStore((s) => s.completeSession);
  const setScreen = useGameStore((s) => s.setScreen);

  // Generate rounds once, non-reactive
  const rounds = useMemo(() => generateOddOneOutRounds(), []);
  const totalRounds = getOddOneOutTotalRounds();

  const [state, setState] = useState<LocalState>({
    roundIndex: 0,
    timeRemaining: PHASES[0].timePerRound,
    combo: 0,
    score: 0,
    correct: 0,
    total: 0,
    bestCombo: 0,
    selectedItem: null,
    isAnswered: false,
    correctIndex: -1,
    phaseTransition: null,
    gameEnded: false,
    scorePop: null,
    scorePopKey: 0,
    comboKey: 0,
    roundKey: 0,
    roundStartTime: Date.now(),
    typeLabel: '',
  });

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive current round from stable state
  const roundIndex = state.roundIndex;
  const currentRound: OddOneRound | null =
    !state.gameEnded && !state.phaseTransition && roundIndex < rounds.length
      ? rounds[roundIndex]
      : null;
  const currentPhase = currentRound ? PHASES[currentRound.phase] : null;

  // ─── Timer ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.phaseTransition || state.gameEnded || state.isAnswered) return;
    const phase = PHASES[rounds[roundIndex]?.phase ?? 0];
    if (!phase) return;

    timerRef.current = setInterval(() => {
      setState((prev) => {
        const round = rounds[prev.roundIndex];
        if (!round) return prev;
        const elapsed = Date.now() - prev.roundStartTime;
        const remaining = Math.max(0, PHASES[round.phase].timePerRound - elapsed);

        if (remaining <= 0) {
          return {
            ...prev,
            timeRemaining: 0,
            isAnswered: true,
            correctIndex: round.correctIndex,
            selectedItem: -1,
            combo: 0,
            total: prev.total + 1,
            typeLabel: TYPE_LABELS[round.type] || '',
          };
        }
        return { ...prev, timeRemaining: remaining };
      });
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.phaseTransition, state.gameEnded, state.isAnswered, roundIndex, rounds]);

  // ─── Handle Answer ────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (index: number) => {
      if (state.isAnswered || state.phaseTransition || state.gameEnded) return;
      const round = rounds[roundIndex];
      if (!round) return;

      const isCorrect = index === round.correctIndex;
      const reactionTime = Date.now() - state.roundStartTime;
      const maxTime = PHASES[round.phase].timePerRound;

      const basePoints = 100;
      const speedBonus = Math.max(0, 1 - reactionTime / maxTime);
      const newCombo = isCorrect ? state.combo + 1 : 0;
      const comboMultiplier = 1 + Math.max(0, newCombo - 1) * 0.15;
      const pointsEarned = isCorrect ? Math.round(basePoints * (0.5 + speedBonus * 0.5) * comboMultiplier) : 0;

      setState((prev) => ({
        ...prev,
        isAnswered: true,
        selectedItem: index,
        correctIndex: round.correctIndex,
        combo: newCombo,
        bestCombo: Math.max(prev.bestCombo, newCombo),
        score: prev.score + pointsEarned,
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        scorePop: isCorrect ? `+${pointsEarned}` : null,
        scorePopKey: prev.scorePopKey + 1,
        comboKey: prev.comboKey + (newCombo >= 3 ? 1 : 0),
        typeLabel: TYPE_LABELS[round.type] || '',
      }));
    },
    [state.isAnswered, state.phaseTransition, state.gameEnded, state.combo, state.roundStartTime, roundIndex, rounds]
  );

  // ─── Advance Round ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!state.isAnswered) return;

    const timer = setTimeout(() => {
      setState((prev) => {
        const nextIndex = prev.roundIndex + 1;
        const nextRound = rounds[nextIndex];
        const prevRound = rounds[prev.roundIndex];

        // Check if entering a new phase
        if (nextRound && prevRound && nextRound.phase !== prevRound.phase) {
          const np = PHASES[nextRound.phase];
          return {
            ...prev,
            phaseTransition: {
              title: `Phase ${nextRound.phase + 1}: ${np.name}`,
              subtitle: `${np.count} rounds \u2022 ${np.timePerRound / 1000}s each`,
              isFinal: nextRound.phase === PHASES.length - 1,
            },
            isAnswered: false,
            selectedItem: null,
            roundIndex: nextIndex,
          };
        }

        // Check if game is over
        if (!nextRound) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const accuracy = prev.total > 0 ? (prev.correct / prev.total) * 100 : 0;
          const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;

          // Use non-reactive store call inside setState to avoid stale closure
          useGameStore.getState().completeSession({
            game: 'oddone',
            score: prev.score,
            stars,
            accuracy,
            bestCombo: prev.bestCombo,
            timeElapsed: elapsed,
            isDaily: false,
            extra: `${prev.correct}/${prev.total} correct`,
          });
          return { ...prev, gameEnded: true };
        }

        // Next round
        return {
          ...prev,
          roundIndex: nextIndex,
          timeRemaining: PHASES[nextRound.phase].timePerRound,
          isAnswered: false,
          selectedItem: null,
          roundKey: prev.roundKey + 1,
          roundStartTime: Date.now(),
          scorePop: null,
          typeLabel: '',
        };
      });
    }, FEEDBACK_DURATION);

    return () => clearTimeout(timer);
  }, [state.isAnswered, rounds]);

  // ─── Phase Transition ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!state.phaseTransition) return;

    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        phaseTransition: null,
        timeRemaining: PHASES[rounds[prev.roundIndex]?.phase ?? 0].timePerRound,
        roundKey: prev.roundKey + 1,
        roundStartTime: Date.now(),
      }));
    }, PHASE_TRANSITION_DURATION);

    return () => clearTimeout(timer);
  }, [state.phaseTransition, rounds]);

  // ─── Derived values ───────────────────────────────────────────────────────────

  const progress = roundIndex / totalRounds;
  const timerFraction = currentPhase ? state.timeRemaining / currentPhase.timePerRound : 0;
  const displayMode = currentRound?.displayMode ?? 'emoji';

  // ─── Phase Transition Overlay ─────────────────────────────────────────────────

  if (state.phaseTransition) {
    const pt = state.phaseTransition;
    const phaseColor = PHASES[rounds[roundIndex]?.phase ?? 0].color;
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center px-5"
        style={{ background: 'linear-gradient(180deg, #E0FFF7 0%, #F9F9F9 100%)' }}
      >
        <div className="text-center phase-flash">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: phaseColor + '20' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={phaseColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-[#333]">{pt.title}</h2>
          <p className="text-base text-[#999] mt-2">{pt.subtitle}</p>
          {pt.isFinal && (
            <p className="text-sm font-bold mt-3" style={{ color: phaseColor }}>
              Final stretch \u2014 stay focused!
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Main Game ────────────────────────────────────────────────────────────────

  if (!currentRound) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5">
        <div className="animate-pulse text-[#999]">Loading...</div>
      </div>
    );
  }

  const gridCols =
    currentRound.items.length <= 4
      ? 'grid-cols-2'
      : 'grid-cols-3';

  return (
    <div className="min-h-[100dvh] flex flex-col pb-24 pt-safe" style={{ background: '#F9F9F9' }}>
      <div className="h-4" />

      {/* Header Bar */}
      <div className="px-5 flex items-center gap-3">
        <button
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            setScreen('home');
          }}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold" style={{ color: currentPhase?.color || '#999' }}>
              {PHASES[currentRound.phase].name}
            </span>
            <span className="text-xs font-bold text-[#999]">
              {roundIndex + 1}/{totalRounds}
            </span>
          </div>
          <div className="w-full h-2 bg-[#E8E8E8] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%`, backgroundColor: currentPhase?.color || '#00BFA6' }}
            />
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-[#333] leading-none">{state.score}</div>
          <div className="text-[10px] text-[#999] font-medium">SCORE</div>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="px-5 mt-3">
        <div className="w-full h-3 bg-[#E8E8E8] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${timerFraction * 100}%`,
              backgroundColor: timerFraction > 0.3 ? (currentPhase?.color || '#00BFA6') : '#FF3B30',
            }}
          />
        </div>
      </div>

      {/* Type Label + Hint */}
      <div className="px-5 mt-4 text-center">
        <div
          className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1 mb-2"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentPhase?.color || '#00BFA6' }} />
          <span className="text-xs font-bold text-[#999]">
            {state.typeLabel || TYPE_LABELS[currentRound.type] || 'Find the odd one'}
          </span>
        </div>
        <p className="text-sm text-[#999]">{currentRound.hint}</p>
      </div>

      {/* Combo */}
      {state.combo >= 3 && (
        <div key={state.comboKey} className="text-center mt-2 comboIn">
          <span className="inline-block bg-[#FF9600] text-white text-xs font-extrabold px-3 py-1 rounded-full">
            {'\u00d7'}{state.combo} COMBO!
          </span>
        </div>
      )}

      {/* Options Grid */}
      <div className="flex-1 flex items-center justify-center px-5 mt-4">
        <div key={state.roundKey} className={`grid ${gridCols} gap-3 w-full max-w-sm slide-in-right`}>
          {currentRound.items.map((item, idx) => (
            <OptionCard
              key={state.roundKey * 100 + idx}
              item={item}
              index={idx}
              displayMode={displayMode}
              phaseColor={currentPhase?.color || '#00BFA6'}
              selectedItem={state.selectedItem}
              correctIndex={state.correctIndex}
              isAnswered={state.isAnswered}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>

      {/* Score Pop */}
      {state.scorePop && (
        <div
          key={state.scorePopKey}
          className="fixed left-1/2 top-1/3 text-2xl font-extrabold text-[#58CC02] scorePop pointer-events-none z-50"
        >
          {state.scorePop}
        </div>
      )}

      {/* Timeout feedback */}
      {state.isAnswered && state.selectedItem === -1 && (
        <div className="text-center mt-2 toastIn">
          <span className="inline-block bg-[#FF3B30] text-white text-xs font-bold px-3 py-1 rounded-full">
            Time's up!
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Option Card (memoized) ─────────────────────────────────────────────────────

function OptionCard({
  item,
  index,
  displayMode,
  phaseColor,
  selectedItem,
  correctIndex,
  isAnswered,
  onSelect,
}: {
  item: OddOneItem;
  index: number;
  displayMode: string;
  phaseColor: string;
  selectedItem: number | null;
  correctIndex: number;
  isAnswered: boolean;
  onSelect: (i: number) => void;
}) {
  const isSelected = selectedItem === index;
  const isCorrectReveal = isAnswered && index === correctIndex;
  const isWrongReveal = isAnswered && isSelected && index !== correctIndex;

  const borderColor = isCorrectReveal
    ? '#58CC02'
    : isWrongReveal
    ? '#FF3B30'
    : '#E8E8E8';

  const bgColor = isCorrectReveal ? '#E8F8E0' : isWrongReveal ? '#FFECEB' : '#FFFFFF';

  const boxShadow = isCorrectReveal
    ? '0 0 0 3px rgba(88,204,2,0.3)'
    : isWrongReveal
    ? '0 0 0 3px rgba(255,59,48,0.3)'
    : '0 2px 8px rgba(0,0,0,0.05)';

  const isShape = displayMode === 'shape' || displayMode === 'size_shape' || displayMode === 'color';

  const shapeSize = item.size ? `${24 + item.size * 20}px` : '56px';

  return (
    <button
      onClick={() => onSelect(index)}
      disabled={isAnswered}
      className={`
        relative flex flex-col items-center justify-center rounded-2xl p-4 min-h-[100px]
        transition-all active:scale-95 cursor-pointer select-none
        ${isAnswered ? 'pointer-events-none' : ''}
        ${isWrongReveal ? 'card-shake' : ''}
      `}
      style={{
        border: `3px solid ${borderColor}`,
        backgroundColor: bgColor,
        boxShadow,
      }}
    >
      {isShape ? (
        <div
          style={{
            backgroundColor: item.color || '#E0E0E0',
            borderRadius: item.shapeType === 'circle' ? '50%' : item.shapeType === 'diamond' ? '4px' : '6px',
            transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
            width: shapeSize,
            height: shapeSize,
            clipPath:
              item.shapeType === 'triangle'
                ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                : item.shapeType === 'diamond'
                ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                : item.shapeType === 'star'
                ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                : item.shapeType === 'hexagon'
                ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
                : undefined,
          }}
        />
      ) : displayMode === 'emoji' ? (
        <span className="text-5xl leading-none select-none">{item.display}</span>
      ) : displayMode === 'number' ? (
        <span className="text-3xl font-extrabold text-[#333]">{item.display}</span>
      ) : (
        <span className="text-sm font-bold text-[#333] text-center leading-tight px-1">{item.display}</span>
      )}

      {/* Correct checkmark */}
      {isCorrectReveal && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#58CC02] rounded-full flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
      {/* Wrong X mark */}
      {isWrongReveal && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF3B30] rounded-full flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      )}
    </button>
  );
}
