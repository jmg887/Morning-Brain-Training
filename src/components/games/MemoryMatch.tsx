'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore, type SessionResults } from '@/store/useGameStore';

// ─── Round Configs ───────────────────────────────────────────────────────────
const ROUND_CONFIGS = [
  { cols: 4, rows: 2, pairs: 4, flashDuration: 4000 },
  { cols: 4, rows: 3, pairs: 6, flashDuration: 3500 },
  { cols: 4, rows: 3, pairs: 6, flashDuration: 3000 },
];

// ─── Shape & Emoji Data ──────────────────────────────────────────────────────
const SHAPES = [
  { id: 'circle', type: 'shape', shape: 'circle', color: '#FF6B6B' },
  { id: 'square', type: 'shape', shape: 'square', color: '#4ECDC4' },
  { id: 'triangle', type: 'shape', shape: 'triangle', color: '#45B7D1' },
  { id: 'star', type: 'shape', shape: 'star', color: '#F7DC6F' },
  { id: 'diamond', type: 'shape', shape: 'diamond', color: '#BB8FCE' },
  { id: 'heart', type: 'shape', shape: 'heart', color: '#FF8C94' },
];

const EMOJIS = [
  { id: 'brain', type: 'emoji', emoji: '🧠' },
  { id: 'lightning', type: 'emoji', emoji: '⚡' },
  { id: 'target', type: 'emoji', emoji: '🎯' },
  { id: 'fire', type: 'emoji', emoji: '🔥' },
  { id: 'star', type: 'emoji', emoji: '⭐' },
  { id: 'diamond', type: 'emoji', emoji: '💎' },
  { id: 'music', type: 'emoji', emoji: '🎵' },
  { id: 'flower', type: 'emoji', emoji: '🌸' },
  { id: 'fox', type: 'emoji', emoji: '🦊' },
  { id: 'rainbow', type: 'emoji', emoji: '🌈' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type GamePhase = 'flashing' | 'playing' | 'checking' | 'roundTransition' | 'perfectClear' | 'ended';

interface CardData {
  id: number;
  pairId: string;
  content: typeof SHAPES[number] | typeof EMOJIS[number];
}

// ─── SVG Shape Icon ───────────────────────────────────────────────────────────
function ShapeIcon({ shape, color, size = 32 }: { shape: string; color: string; size?: number }) {
  const s = size;
  const half = s / 2;

  switch (shape) {
    case 'circle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <circle cx={half} cy={half} r={half - 2} fill={color} />
        </svg>
      );
    case 'square':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <rect x={2} y={2} width={s - 4} height={s - 4} rx={3} fill={color} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={`${half},2 ${s - 2},${s - 2} 2,${s - 2}`} fill={color} />
        </svg>
      );
    case 'star': {
      const outerR = half - 2;
      const innerR = outerR * 0.4;
      const points: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const x = half + r * Math.cos(angle);
        const y = half + r * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={points.join(' ')} fill={color} />
        </svg>
      );
    }
    case 'diamond':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={`${half},2 ${s - 2},${half} ${half},${s - 2} 2,${half}`} fill={color} />
        </svg>
      );
    case 'heart': {
      const topCurveHeight = s * 0.3;
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <path
            d={`M${half},${s - 4}
              C${2},${s * 0.6} ${2},${topCurveHeight} ${half},${topCurveHeight}
              C${s - 2},${topCurveHeight} ${s - 2},${s * 0.6} ${half},${s - 4}Z`}
            fill={color}
          />
        </svg>
      );
    }
    default:
      return null;
  }
}

// ─── Card Component ───────────────────────────────────────────────────────────
interface CardComponentProps {
  card: CardData;
  isFlipped: boolean;
  isMatched: boolean;
  isShaking: boolean;
  isGlowing: boolean;
  isFlashing: boolean;
  disabled: boolean;
  onClick: () => void;
}

const CardComponent = React.memo(function CardComponent({
  card,
  isFlipped,
  isMatched,
  isShaking,
  isGlowing,
  isFlashing,
  disabled,
  onClick,
}: CardComponentProps) {
  const content = card.content;
  const isShape = content.type === 'shape';

  return (
    <button
      onClick={onClick}
      disabled={disabled || isMatched}
      className={
        `perspective-1000 w-full aspect-square ${isShaking ? 'card-shake' : ''}`
      }
      style={{
        opacity: isMatched ? 0 : 1,
        transition: 'opacity 0.5s ease',
        cursor: disabled || isMatched ? 'default' : 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
      }}
    >
      <div
        className={
          `card-inner relative w-full h-full ${isFlipped ? 'flipped' : ''}`
        }
        style={{
          transition: 'transform 0.4s ease',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Front face (question mark) */}
        <div
          className="card-front absolute inset-0 flex items-center justify-center rounded-xl font-bold text-white text-2xl"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #58CC02, #58A700)',
            boxShadow: isGlowing
              ? '0 0 16px 4px rgba(88, 204, 2, 0.6)'
              : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          ?
        </div>
        {/* Back face (content) */}
        <div
          className="card-back absolute inset-0 flex items-center justify-center rounded-xl bg-white"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {isShape ? (
            <ShapeIcon
              shape={(content as typeof SHAPES[number]).shape}
              color={(content as typeof SHAPES[number]).color}
              size={content.id === 'heart' || content.id === 'star' ? 36 : 32}
            />
          ) : (
            <span style={{ fontSize: 32 }}>
              {(content as typeof EMOJIS[number]).emoji}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});

// ─── Fisher-Yates Shuffle ─────────────────────────────────────────────────────
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Generate Cards for a Round ───────────────────────────────────────────────
function generateCards(roundIndex: number): CardData[] {
  let items: (typeof SHAPES[number] | typeof EMOJIS[number])[];

  if (roundIndex === 0) {
    // Round 1: 4 pairs of colored shapes
    items = shuffleArray(SHAPES).slice(0, 4);
  } else if (roundIndex === 1) {
    // Round 2: 6 pairs of colored shapes
    items = shuffleArray(SHAPES).slice(0, 6);
  } else {
    // Round 3: 6 pairs of emojis
    items = shuffleArray(EMOJIS).slice(0, 6);
  }

  const cards: CardData[] = [];
  let cardId = 0;

  items.forEach((item) => {
    cards.push({ id: cardId++, pairId: item.id, content: item });
    cards.push({ id: cardId++, pairId: item.id, content: item });
  });

  return shuffleArray(cards);
}

// ─── Main MemoryMatch Component ───────────────────────────────────────────────
export default function MemoryMatch() {
  // ── State ──
  const [phase, setPhase] = useState<GamePhase>('flashing');
  const [currentRound, setCurrentRound] = useState(0);
  const [cards, setCards] = useState<CardData[]>(() => generateCards(0));
  const [flippedIds, setFlippedIds] = useState<Set<number>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [shakingIds, setShakingIds] = useState<Set<number>>(new Set());
  const [glowingIds, setGlowingIds] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [bestCombo, setBestCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(180);
  const [perfectClearRound, setPerfectClearRound] = useState<number | null>(null);

  // ── Refs ──
  const comboRef = useRef(1);
  const scoreRef = useRef(0);
  const bestComboRef = useRef(1);
  const totalMatchesRef = useRef(0);
  const totalAttemptsRef = useRef(0);
  const timeLeftRef = useRef(180);
  const gameEndedRef = useRef(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<GamePhase>('flashing');
  const currentRoundRef = useRef(0);
  const matchedIdsRef = useRef<Set<number>>(new Set());
  const roundMismatchCountRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { bestComboRef.current = bestCombo; }, [bestCombo]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);
  useEffect(() => { matchedIdsRef.current = matchedIds; }, [matchedIds]);

  // ── Timer ──
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return;
    timerIntervalRef.current = setInterval(() => {
      if (gameEndedRef.current) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        return;
      }
      timeLeftRef.current -= 1;
      if (timeLeftRef.current <= 0) {
        timeLeftRef.current = 0;
        gameEndedRef.current = true;
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setPhase('ended');
      }
      setTimeLeft(timeLeftRef.current);
    }, 1000);
  }, []);

  // ── End game logic ──
  const endGame = useCallback(() => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setPhase('ended');
  }, []);

  // ── Complete session ──
  const completeSession = useCallback(() => {
    const totalMatches = totalMatchesRef.current;
    const totalAttempts = totalAttemptsRef.current;
    const finalScore = scoreRef.current;
    const bestComboVal = bestComboRef.current;
    const accuracy = totalAttempts > 0 ? Math.round((totalMatches / totalAttempts) * 100) : 0;

    let stars = 0;
    if (accuracy >= 90) stars = 3;
    else if (accuracy >= 70) stars = 2;
    else if (accuracy >= 50) stars = 1;

    useGameStore.getState().completeSession({
      game: 'memory',
      score: finalScore,
      stars,
      accuracy,
      bestCombo: bestComboVal,
      timeElapsed: 180 - timeLeftRef.current,
      isDaily: false,
      extra: `${totalMatches} pairs found`,
    });
  }, []);

  // ── Trigger end game completion when phase becomes 'ended' ──
  useEffect(() => {
    if (phase === 'ended') {
      completeSession();
    }
  }, [phase, completeSession]);

  // ── Start flash phase for a round ──
  const startRound = useCallback((roundIndex: number) => {
    const newCards = generateCards(roundIndex);
    setCards(newCards);
    setFlippedIds(new Set(newCards.map((c) => c.id)));
    setMatchedIds(new Set());
    setShakingIds(new Set());
    setGlowingIds(new Set());
    setCombo(1);
    comboRef.current = 1;
    roundMismatchCountRef.current = 0;
    setPhase('flashing');

    const flashDuration = ROUND_CONFIGS[roundIndex].flashDuration;
    setTimeout(() => {
      if (gameEndedRef.current) return;
      setFlippedIds(new Set());
      setPhase('playing');
    }, flashDuration);
  }, []);

  // ── Initialize game ──
  useEffect(() => {
    startTimer();
    startRound(0);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [startTimer, startRound]);

  // ── Handle card click ──
  const handleCardClick = useCallback(
    (cardId: number) => {
      if (phaseRef.current !== 'playing' || gameEndedRef.current) return;

      const currentFlipped = flippedIds;
      if (currentFlipped.has(cardId)) return;
      if (matchedIdsRef.current.has(cardId)) return;

      // Only allow flipping if < 2 cards currently flipped
      if (currentFlipped.size >= 2) return;

      const newFlipped = new Set(currentFlipped);
      newFlipped.add(cardId);
      setFlippedIds(newFlipped);

      if (newFlipped.size === 2) {
        totalAttemptsRef.current += 1;
        const flippedArray = Array.from(newFlipped);
        const card1 = cards.find((c) => c.id === flippedArray[0]);
        const card2 = cards.find((c) => c.id === flippedArray[1]);

        if (!card1 || !card2) return;

        if (card1.pairId === card2.pairId) {
          // Match!
          const currentCombo = comboRef.current;
          const newCombo = currentCombo + 1;
          comboRef.current = newCombo;
          setCombo(newCombo);

          const points = 10 * newCombo;
          const newScore = scoreRef.current + points;
          scoreRef.current = newScore;
          setScore(newScore);

          if (newCombo > bestComboRef.current) {
            bestComboRef.current = newCombo;
            setBestCombo(newCombo);
          }

          totalMatchesRef.current += 1;

          // Glow effect
          const newGlowing = new Set(glowingIds);
          newGlowing.add(card1.id);
          newGlowing.add(card2.id);
          setGlowingIds(newGlowing);

          setPhase('checking');

          setTimeout(() => {
            if (gameEndedRef.current) return;

            const newMatched = new Set(matchedIdsRef.current);
            newMatched.add(card1.id);
            newMatched.add(card2.id);
            setMatchedIds(newMatched);
            matchedIdsRef.current = newMatched;
            setFlippedIds(new Set());
            setGlowingIds(new Set());

            // Check if round is complete
            const roundConfig = ROUND_CONFIGS[currentRoundRef.current];
            const totalPairs = roundConfig.pairs;
            const matchedPairs = newMatched.size / 2;

            if (matchedPairs >= totalPairs) {
              // Round complete!
              const hadMismatch = roundMismatchCountRef.current > 0;

              if (!hadMismatch) {
                // Perfect clear!
                const bonusScore = scoreRef.current + 50;
                scoreRef.current = bonusScore;
                setScore(bonusScore);
                setPerfectClearRound(currentRoundRef.current);
                setPhase('perfectClear');

                setTimeout(() => {
                  if (gameEndedRef.current) return;
                  setPerfectClearRound(null);
                  transitionToNextRound();
                }, 1500);
              } else {
                transitionToNextRound();
              }
            } else {
              setPhase('playing');
            }
          }, 500);
        } else {
          // Mismatch
          roundMismatchCountRef.current += 1;
          comboRef.current = 1;
          setCombo(1);

          const newShaking = new Set<number>();
          newShaking.add(card1.id);
          newShaking.add(card2.id);
          setShakingIds(newShaking);

          setPhase('checking');

          setTimeout(() => {
            if (gameEndedRef.current) return;
            setShakingIds(new Set());
            setFlippedIds(new Set());
            setPhase('playing');
          }, 800);
        }
      }
    },
    [cards, flippedIds, glowingIds]
  );

  // ── Transition to next round ──
  const transitionToNextRound = useCallback(() => {
    const nextRound = currentRoundRef.current + 1;
    if (nextRound >= ROUND_CONFIGS.length) {
      endGame();
    } else {
      setCurrentRound(nextRound);
      currentRoundRef.current = nextRound;
      setPhase('roundTransition');
      setTimeout(() => {
        if (gameEndedRef.current) return;
        startRound(nextRound);
      }, 1500);
    }
  }, [endGame, startRound]);

  // ── Timer color ──
  const timerColor = useMemo(() => {
    const pct = (timeLeft / 180) * 100;
    if (pct > 50) return '#58CC02';
    if (pct > 20) return '#FF9600';
    return '#FF3B30';
  }, [timeLeft]);

  // ── Grid max width ──
  const gridMaxWidth = useMemo(() => {
    const config = ROUND_CONFIGS[currentRound];
    if (config.rows === 2) return 320;
    return 280;
  }, [currentRound]);

  // ── Format time ──
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Render ──
  const currentConfig = ROUND_CONFIGS[currentRound];

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
          style={{ color: '#333333', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: '#999' }}>
            Round {currentRound + 1}/{ROUND_CONFIGS.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-lg" style={{ color: '#333' }}>
            {score}
          </span>
        </div>
      </div>

      {/* ── Combo Counter ── */}
      <div className="flex items-center gap-1 mb-2" style={{ height: 28 }}>
        {combo >= 2 && (
          <div
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
            style={{
              background: combo >= 5 ? '#FF9600' : '#58CC02',
              color: '#fff',
              animation: combo >= 5 ? 'combo-pulse 0.5s ease' : 'none',
            }}
          >
            {combo >= 5 && <span>🔥</span>}
            x{combo}
          </div>
        )}
      </div>

      {/* ── Timer Bar ── */}
      <div className="w-full px-4 mb-4" style={{ maxWidth: 400 }}>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: '#E0E0E0' }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${(timeLeft / 180) * 100}%`,
              background: timerColor,
            }}
          />
        </div>
        <div className="text-center mt-1">
          <span className="text-xs font-medium" style={{ color: '#999' }}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* ── Memorize! Pill ── */}
      {phase === 'flashing' && (
        <div
          className="mb-4 px-5 py-2 rounded-full text-base font-bold"
          style={{
            background: '#FFB800',
            color: '#fff',
            animation: 'phase-flash 1s ease infinite',
          }}
        >
          👀 Memorize!
        </div>
      )}

      {/* ── Card Grid ── */}
      <div
        className="grid gap-2 px-4"
        style={{
          gridTemplateColumns: `repeat(${currentConfig.cols}, 1fr)`,
          maxWidth: gridMaxWidth,
          width: '100%',
        }}
      >
        {cards.map((card) => {
          const isFlipped =
            flippedIds.has(card.id) || phase === 'flashing';
          const isMatched = matchedIds.has(card.id);
          const isShaking = shakingIds.has(card.id);
          const isGlowing = glowingIds.has(card.id);
          const isFlashing = phase === 'flashing';

          return (
            <CardComponent
              key={card.id}
              card={card}
              isFlipped={isFlipped}
              isMatched={isMatched}
              isShaking={isShaking}
              isGlowing={isGlowing}
              isFlashing={isFlashing}
              disabled={
                phase !== 'playing' ||
                flippedIds.size >= 2 ||
                matchedIds.has(card.id)
              }
              onClick={() => handleCardClick(card.id)}
            />
          );
        })}
      </div>

      {/* ── Perfect Clear Overlay ── */}
      {phase === 'perfectClear' && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="text-center"
            style={{
              animation: 'phase-flash 0.5s ease',
            }}
          >
            <div
              className="text-5xl font-black mb-2"
              style={{ color: '#FFB800', textShadow: '0 2px 8px rgba(255,184,0,0.5)' }}
            >
              PERFECT!
            </div>
            <div className="text-xl font-bold" style={{ color: '#fff' }}>
              +50 Bonus!
            </div>
          </div>
        </div>
      )}

      {/* ── Round Transition Overlay ── */}
      {phase === 'roundTransition' && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <div className="text-center">
            <div className="text-3xl font-black mb-2" style={{ color: '#fff' }}>
              Round {currentRound + 2}
            </div>
            <div className="text-base" style={{ color: '#ccc' }}>
              {currentRound + 2 === 3 ? 'Emoji Challenge!' : 'More pairs!'}
            </div>
          </div>
        </div>
      )}

      {/* ── Game Ended Overlay ── */}
      {phase === 'ended' && (
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
            }}
          >
            <div className="text-2xl font-black mb-1" style={{ color: '#333' }}>
              {timeLeft <= 0 ? "Time's Up!" : 'Great Job!'}
            </div>
            <div className="text-lg font-bold mb-4" style={{ color: '#58CC02' }}>
              Score: {score}
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map((s) => {
                const totalAttempts = totalAttemptsRef.current;
                const totalMatches = totalMatchesRef.current;
                const accuracy = totalAttempts > 0 ? Math.round((totalMatches / totalAttempts) * 100) : 0;
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
              Best Combo: x{bestCombo} · Accuracy:{' '}
              {totalAttemptsRef.current > 0
                ? Math.round(
                    (totalMatchesRef.current / totalAttemptsRef.current) * 100
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

      {/* ── Inline Styles ── */}
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .card-inner {
          transform-style: preserve-3d;
        }
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        .card-shake {
          animation: shake 0.5s ease;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes phase-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes combo-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}