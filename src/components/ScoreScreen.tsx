'use client';

import { useGameStore } from '@/store/useGameStore';

const GAME_INFO: Record<string, { name: string; icon: string; color: string }> = {
  memory: { name: 'Memory Match', icon: '🧠', color: '#58CC02' },
  word: { name: 'Word Puzzle', icon: '📝', color: '#CE82FF' },
  math: { name: 'Math Sprint', icon: '⚡', color: '#1CB0F6' },
};

export default function ScoreScreen() {
  const { sessionResults, streak, xp, level, setScreen, resetSession, getXPProgress } = useGameStore();

  if (!sessionResults) {
    setScreen('home');
    return null;
  }

  const r = sessionResults;
  const info = GAME_INFO[r.game];
  const elapsed = Math.floor(r.timeElapsed / 60);
  const secs = r.timeElapsed % 60;
  const xpProg = getXPProgress();
  const xpGained = Math.round(r.score * 0.5) + r.stars * 20;

  const handleShare = async () => {
    const text = `🌟 BrainTrain - ${info.name} \n${'⭐'.repeat(r.stars)} ${r.stars}/3 stars\nScore: ${r.score} | Accuracy: ${Math.round(r.accuracy)}%\nBest Combo: \u00d7${r.bestCombo}${r.extra ? ' | ' + r.extra : ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'BrainTrain', text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleDone = () => {
    resetSession();
    setScreen('home');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center pt-safe pb-24 px-5" style={{ background: '#F9F9F9' }}>
      <div className="w-full max-w-sm">
        {/* Game icon + name */}
        <div className="text-center mt-8">
          <div className="text-5xl mb-2">{info.icon}</div>
          <h1 className="text-2xl font-bold text-[#333]">{info.name}</h1>
          <p className="text-sm text-[#999] mt-1">{r.isDaily ? 'Daily Challenge' : 'Practice'}</p>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-3 mt-6">
          {[1, 2, 3].map((s) => (
            <span key={s} className={`text-4xl transition-all ${s <= r.stars ? '' : 'opacity-20'}`}>
              {'\u2b50'}
            </span>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <StatBox label="Score" value={r.score.toString()} />
          <StatBox label="Accuracy" value={`${Math.round(r.accuracy)}%`} />
          <StatBox label="Best Combo" value={`\u00d7${r.bestCombo}`} />
          <StatBox label="Time" value={`${elapsed}:${secs.toString().padStart(2, '0')}`} />
          {r.extra && <StatBox label="Extra" value={r.extra} />}
        </div>

        {/* XP earned */}
        <div className="bg-white rounded-2xl p-4 mt-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[#333]">XP Earned</span>
            <span className="text-lg font-extrabold text-[#58CC02]">+{xpGained}</span>
          </div>
          <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#58CC02] rounded-full transition-all" style={{ width: `${(xpProg / 100) * 100}%` }} />
          </div>
          <p className="text-xs text-[#999] mt-1">Level {level} — {xpProg}/100 XP</p>
        </div>

        {/* Streak reminder */}
        {streak > 0 && (
          <div className="bg-[#FFF5E6] rounded-2xl p-3 mt-4 flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-sm font-bold text-[#FF9600]">{streak} Day Streak!</p>
              <p className="text-xs text-[#CC7A00]">Keep it going tomorrow</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 mt-8 mb-4">
          <button onClick={handleShare} className="w-full py-3 rounded-xl font-bold text-[15px] bg-white border-2 border-[#58CC02] text-[#58CC02] active:scale-[0.98] transition-transform">
            Share Result
          </button>
          <button onClick={handleDone} className="btn-duolingo w-full">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-3 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <p className="text-xs text-[#999] font-medium">{label}</p>
      <p className="text-xl font-extrabold text-[#333] mt-0.5">{value}</p>
    </div>
  );
}