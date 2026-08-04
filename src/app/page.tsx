'use client';

import { useGameStore } from '@/store/useGameStore';
import HomeScreen from '@/components/HomeScreen';
import MemoryMatch from '@/components/games/MemoryMatch';
import WordPuzzle from '@/components/games/WordPuzzle';
import MathSprint from '@/components/games/MathSprint';
import CircuitConnect from '@/components/games/CircuitConnect';
import AnagramScramble from '@/components/games/AnagramScramble';
import ScoreScreen from '@/components/ScoreScreen';
import BottomNav from '@/components/BottomNav';

export default function Page() {
  const { currentScreen } = useGameStore();

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden">
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'memory' && <MemoryMatch />}
      {currentScreen === 'word' && <WordPuzzle />}
      {currentScreen === 'daily' && <WordPuzzle isDaily />}
      {currentScreen === 'math' && <MathSprint />}
      {currentScreen === 'circuit' && <CircuitConnect />}
      {currentScreen === 'anagram' && <AnagramScramble />}
      {currentScreen === 'score' && <ScoreScreen />}
      <BottomNav />
    </div>
  );
}