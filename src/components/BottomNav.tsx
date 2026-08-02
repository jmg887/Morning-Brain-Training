'use client';

import { useGameStore } from '@/store/useGameStore';

export default function BottomNav() {
  const { currentScreen, setScreen } = useGameStore();
  const visible = currentScreen === 'home' || currentScreen === 'score';

  if (!visible) return null;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-white border-t"
      style={{
        maxWidth: 430,
        borderColor: '#E8E8E8',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex justify-around py-2">
        <button
          onClick={() => setScreen('home')}
          className="flex flex-col items-center gap-0.5 px-6"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={currentScreen === 'home' ? '#58CC02' : 'none'}
            stroke={currentScreen === 'home' ? '#58CC02' : '#999999'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span
            className="text-[10px] font-semibold"
            style={{ color: currentScreen === 'home' ? '#58CC02' : '#999999' }}
          >
            Home
          </span>
        </button>
        <button className="flex flex-col items-center gap-0.5 px-6 opacity-40">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#999999"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span className="text-[10px] font-semibold" style={{ color: '#999999' }}>
            Stats
          </span>
        </button>
      </div>
    </nav>
  );
}