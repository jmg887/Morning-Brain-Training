'use client';

import { useGameStore, type PipeMode } from '@/store/useGameStore';

const MODE_OPTIONS: { id: PipeMode; label: string; desc: string; color: string; bgColor: string; icon: string }[] = [
  {
    id: 'classic',
    label: 'Classic',
    desc: 'Solve at your pace, no rush',
    color: '#FF9600',
    bgColor: '#FFF5E6',
    icon: '\u2699\ufe0f',
  },
  {
    id: 'flow',
    label: 'Flow',
    desc: 'Liquid flows in real-time — stay ahead!',
    color: '#1CB0F6',
    bgColor: '#E8F6FF',
    icon: '\ud83d\udca7',
  },
];

export default function PipeModePicker() {
  const { pipeMode, setPipeMode, setScreen } = useGameStore();

  const handleSelect = (id: PipeMode) => {
    setPipeMode(id);
    setScreen('pipe');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 pb-24 pt-safe"
      style={{ background: 'linear-gradient(180deg, #FFF5E6 0%, #F9F9F9 60%)' }}>
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: '#FF960020' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF9600" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v20M2 12h20M6 6l12 12M18 6L6 18" />
          </svg>
        </div>
        <h2 className="text-[22px] font-extrabold text-[#333]">Pipe Flow</h2>
        <p className="text-[14px] text-[#999] mt-1">Choose your mode</p>
      </div>

      {/* Mode Cards */}
      <div className="w-full max-w-sm space-y-3">
        {MODE_OPTIONS.map((opt) => {
          const isSelected = pipeMode === opt.id;
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

      {/* Flow mode info */}
      <div className="w-full max-w-sm mt-6 p-4 rounded-xl" style={{ background: '#E8F6FF', border: '1.5px solid #1CB0F630' }}>
        <p className="text-[12px] font-bold mb-1.5" style={{ color: '#1CB0F6' }}>
          {'\ud83d\udca7'} How Flow Mode Works
        </p>
        <ul className="text-[11px] space-y-1" style={{ color: '#666' }}>
          <li>{'\u2022'} Liquid flows from IN to OUT in real-time</li>
          <li>{'\u2022'} Rotate pipes ahead of the flow</li>
          <li>{'\u2022'} 3 lives per round — dead ends cost a life</li>
          <li>{'\u2022'} Reach the drain to score bonus points</li>
        </ul>
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
