'use client';

import { useEffect } from 'react';
import { useGameStore, type GameType, type Screen, type GameDifficulty } from '@/store/useGameStore';
import { getDayNumber } from '@/lib/seededRandom';

const exercises = [
  {
    id: 'memory' as GameType,
    name: 'Memory Match',
    desc: 'Memorize card positions under time pressure',
    color: '#58CC02',
    bgColor: '#F0FAE0',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#58CC02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20h6v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z"/>
        <line x1="10" y1="22" x2="14" y2="22"/>
      </svg>
    ),
  },
  {
    id: 'word' as GameType,
    name: 'Word Fusion',
    desc: 'Rule-finding + anagram unscramble in one session',
    color: '#CE82FF',
    bgColor: '#F8F0FF',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CE82FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16"/><path d="M4 12h10"/><path d="M4 17h14"/>
        <circle cx="18" cy="18" r="4" fill="none" stroke="#FF9600" strokeWidth="2"/>
        <path d="M16.5 18L17.5 19L19.5 17" stroke="#FF9600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'math' as GameType,
    name: 'Math Sprint',
    desc: 'Spot the trap — pick the right answer fast',
    color: '#1CB0F6',
    bgColor: '#E8F6FF',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1CB0F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    id: 'circuit' as GameType,
    name: 'Circuit Connect',
    desc: 'Connect matching colors without crossing paths',
    color: '#FF9600',
    bgColor: '#FFF5E6',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF9600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="5" r="2.5"/>
        <circle cx="19" cy="19" r="2.5"/>
        <path d="M7.5 5.5 Q12 12 16.5 18.5"/>
      </svg>
    ),
  },
  {
    id: 'oddone' as GameType,
    name: 'Odd One Out',
    desc: 'Find the item that doesn\'t belong',
    color: '#00BFA6',
    bgColor: '#E0FFF7',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00BFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
  },
  {
    id: 'pipe' as GameType,
    name: 'Pipe Flow',
    desc: 'Rotate pipes to connect source to drain',
    color: '#FF9600',
    bgColor: '#FFF5E6',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF9600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20"/><path d="M2 12h20"/>
        <circle cx="12" cy="12" r="3" fill="none" stroke="#FF9600" strokeWidth="2"/>
      </svg>
    ),
  },
];

export default function HomeScreen() {
  const { streak, dailyProgress, xp, level, getGreeting, getXPForNextLevel, getXPProgress, checkAndUpdateStreak, hasCompletedDailyToday, setScreen } = useGameStore();

  useEffect(() => {
    let deferredPrompt: unknown = null;
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const greeting = getGreeting();
  const xpProg = getXPProgress();
  const xpPercent = (xpProg / 100) * 100;

  return (
    <div className="min-h-[100dvh] pb-24 pt-safe">
      <div className="h-6" />

      {/* Greeting */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-[26px] font-bold text-[#333] leading-tight">{greeting}</h1>
        <p className="text-[15px] text-[#999] mt-0.5">Ready to train your brain?</p>
      </div>

      {/* Streak + XP Row */}
      <div className="flex gap-3 px-5 mt-3">
        <div className="flex items-center gap-2.5 bg-[#FFF5E6] rounded-2xl px-4 py-3 flex-1" style={{ boxShadow: '0 2px 8px rgba(255,150,0,0.08)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF9600, #FFB84D)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C10.5 5.5 8 7 8 10c0 2.2 1.8 4 4 4s4-1.8 4-4c0-3-2.5-4.5-4-8z"/>
              <path d="M12 14c-1.5 3-4 4.5-4 7.5 0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2 0-3-2.5-4.5-4-7.5z" opacity="0.7"/>
            </svg>
          </div>
          <div>
            <div className="text-[22px] font-bold text-[#FF9600] leading-none">{streak}</div>
            <div className="text-[11px] text-[#CC7A00] font-medium">day streak</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl px-4 py-3 flex-1 flex flex-col justify-between" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#999]">Level {level}</span>
            <span className="text-[12px] font-bold text-[#58CC02]">{xpProg}/100 XP</span>
          </div>
          <div className="w-full h-2 bg-[#F0F0F0] rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-[#58CC02] rounded-full transition-all duration-500" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Daily Challenge */}
      <div className="px-5 mt-5">
        <button
          onClick={() => { checkAndUpdateStreak(); setScreen('daily'); }}
          disabled={hasCompletedDailyToday()}
          className="w-full rounded-2xl p-4 flex items-center gap-3.5 text-left transition-all active:scale-[0.98]"
          style={{
            background: hasCompletedDailyToday() ? '#F0F0F0' : 'linear-gradient(135deg, #FF9600, #FF7A00)',
            boxShadow: hasCompletedDailyToday() ? 'none' : '0 4px 16px rgba(255,150,0,0.25)',
            opacity: hasCompletedDailyToday() ? 0.6 : 1,
          }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: hasCompletedDailyToday() ? '#E0E0E0' : 'rgba(255,255,255,0.25)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={hasCompletedDailyToday() ? '#999' : '#fff'}>
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
              <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="bold" fill={hasCompletedDailyToday() ? '#999' : '#fff'}>{getDayNumber()}</text>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold" style={{ color: hasCompletedDailyToday() ? '#999' : '#fff' }}>Daily Challenge</span>
              {hasCompletedDailyToday() && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: hasCompletedDailyToday() ? '#BBB' : 'rgba(255,255,255,0.8)' }}>
              {hasCompletedDailyToday() ? 'Completed! Come back tomorrow' : 'Same puzzle as everyone — compete with friends'}
            </p>
          </div>
          {!hasCompletedDailyToday() && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          )}
        </button>
      </div>

      {/* Daily Progress */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[15px] font-bold text-[#333]">Today&apos;s Progress</h2>
          <span className="text-[13px] text-[#999] font-medium">{dailyProgress} of 6 completed</span>
        </div>
        <div className="flex gap-2">
          {exercises.map((ex, i) => (
            <div key={ex.id} className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F0F0F0' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: dailyProgress >= (i + 1) ? '100%' : '0%', backgroundColor: ex.color }} />
            </div>
          ))}
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="px-5 mt-5 space-y-3">
        <h2 className="text-[15px] font-bold text-[#333]">Exercises</h2>
        {exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} />
        ))}
      </div>

      {/* Start CTA */}
      <div className="px-5 mt-6">
        <StartSessionButton checkAndUpdateStreak={checkAndUpdateStreak} />
      </div>
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: typeof exercises[0] }) {
  const { setScreen, gamesCompleted, wordDifficulty } = useGameStore();
  const isDone = gamesCompleted.includes(exercise.id);

  // Word Fusion has a difficulty picker pre-screen
  const handleClick = () => {
    if (exercise.id === 'word') {
      setScreen('word_picker' as Screen);
    } else {
      setScreen(exercise.id);
    }
  };

  // Difficulty badge config
  const DIFFICULTY_BADGE: Record<GameDifficulty, { label: string; color: string; bg: string }> = {
    beginner: { label: 'Beginner', color: '#58CC02', bg: '#F0FAE0' },
    intermediate: { label: 'Mid', color: '#FF9600', bg: '#FFF5E6' },
    pro: { label: 'Pro', color: '#FF3B30', bg: '#FFE8E5' },
  };
  const badge = exercise.id === 'word' ? DIFFICULTY_BADGE[wordDifficulty] : null;

  return (
    <button
      onClick={handleClick}
      className="w-full bg-white rounded-2xl p-4 flex items-center gap-3.5 text-left transition-all active:scale-[0.98]"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', borderLeft: `4px solid ${exercise.color}`, opacity: isDone ? 0.6 : 1 }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: exercise.bgColor }}>
        {exercise.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-[#333]">{exercise.name}</span>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ color: badge.color, backgroundColor: badge.bg }}>
              {badge.label}
            </span>
          )}
          {isDone && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58CC02" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
        <p className="text-[12px] text-[#999] mt-0.5 truncate">{exercise.desc}</p>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

function StartSessionButton({ checkAndUpdateStreak }: { checkAndUpdateStreak: () => void }) {
  const { dailyProgress, setScreen, gamesCompleted } = useGameStore();
  const nextGame = ['memory', 'word', 'math', 'circuit', 'oddone', 'pipe'].find((g) => !gamesCompleted.includes(g as GameType));

  const handleStart = () => {
    checkAndUpdateStreak();
    if (nextGame) {
      // Word Fusion goes through difficulty picker
      if (nextGame === 'word') {
        setScreen('word_picker' as Screen);
      } else {
        setScreen(nextGame as Screen);
      }
    }
  };

  return (
    <>
    <button onClick={handleStart} className="btn-duolingo w-full text-[16px] mt-1" disabled={dailyProgress >= 6}>
      {dailyProgress >= 6 ? 'All Done for Today!' : dailyProgress === 0 ? "Start Today's Session" : 'Continue Training'}
    </button>
    {dailyProgress >= 6 && (
      <p className="text-center text-[12px] text-[#999] mt-1">All 6 exercises completed</p>
    )}
    </>
  );
}