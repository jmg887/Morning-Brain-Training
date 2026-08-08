'use client';

import { useGameStore } from '@/store/useGameStore';
import HomeScreen from '@/components/HomeScreen';
import MemoryMatch from '@/components/games/MemoryMatch';
import MathSprint from '@/components/games/MathSprint';
import CircuitConnect from '@/components/games/CircuitConnect';
import WordFusion from '@/components/games/WordFusion';
import OddOneOut from '@/components/games/OddOneOut';
import PipeFlow from '@/components/games/PipeFlow';
import ScoreScreen from '@/components/ScoreScreen';
import WordDifficultyPicker from '@/components/WordDifficultyPicker';
import BottomNav from '@/components/BottomNav';

export default function Page() {
  const { currentScreen } = useGameStore();

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden">
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'memory' && <MemoryMatch />}
      {currentScreen === 'daily' && <WordFusion isDaily />}
      {currentScreen === 'math' && <MathSprint />}
      {currentScreen === 'circuit' && <CircuitConnect />}
      {currentScreen === 'word' && <WordFusion />}
      {currentScreen === 'oddone' && <OddOneOut />}
      {currentScreen === 'pipe' && <PipeFlow />}
      {currentScreen === 'score' && <ScoreScreen />}
      {currentScreen === 'word_picker' && <WordDifficultyPicker />}
      <BottomNav />
    </div>
  );
}