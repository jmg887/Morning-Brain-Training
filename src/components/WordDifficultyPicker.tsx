'use client';

import { useGameStore, type GameDifficulty } from '@/store/useGameStore';

const DIFFICULTY_OPTIONS: { id: GameDifficulty; label: string; desc: string; color: string; bgColor: string; icon: string }[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    desc: 'More time, smaller puzzles, more hints',
    color: '#58CC02',
    bgColor: '#F0FAE0',
    icon: '🌱',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    desc: 'All modes, balanced challenge',
    color: '#FF9600',
    bgColor: '#FFF5E6',
    icon: '⚡',
  },
  {
    id: 'pro',
    label: 'Pro',
    desc: 'Less time, no hints, harder puzzles',
    color: '#FF3B30',
    bgColor: '#FFE8E5',
    icon: '🔥',
  },
];

export default function WordDifficultyPicker() {
  const { wordDifficulty, setGameDifficulty, setScreen } = useGameStore();

  const handleSelect = (id: GameDifficulty) => {
    setGameDifficulty('word', id);
    setScreen('word');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 pb-24 pt-safe"
      style={{ background: 'linear-gradient(180deg, #F8F0FF 0%, #F9F9F9 60%)' }}>
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: '#CE82FF20' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CE82FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16"/><path d="M4 12h10"/><path d="M4 17h14"/>
          </svg>
        </div>
        <h2 className="text-[22px] font-extrabold text-[#333]">Word Fusion</h2>
        <p className="text-[14px] text-[#999] mt-1">Choose your difficulty</p>
      </div>

      {/* Difficulty Cards */}
      <div className="w-full max-w-sm space-y-3">
        {DIFFICULTY_OPTIONS.map((opt) => {
          const isSelected = wordDifficulty === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className="w-full rounded-2xl p-4 flex items-center gap-3.5 text-left transition-all active:scale-[0.98]"
              style={{
                background: isSelected ? opt.color : '#fff',
                boxShadow: isSelected
                  ? `0 4px 16px ${opt.color}30`
                  : '0 2px 12px rgba(0,0,0,0.05)',
                border: isSelected ? `2px solid ${opt.color}` : '2px solid transparent',
              }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl"
                style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : opt.bgColor }}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[15px] font-bold block"
                  style={{ color: isSelected ? '#fff' : '#333' }}>
                  {opt.label}
                </span>
                <span className="text-[12px] block mt-0.5"
                  style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : '#999' }}>
                  {opt.desc}
                </span>
              </div>
              {isSelected && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Back button */}
      <button
        onClick={() => setScreen('home')}
        className="mt-6 text-[14px] font-semibold"
        style={{ color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}>
        {'\u2190'} Back
      </button>
    </div>
  );
}
