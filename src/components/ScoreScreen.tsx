'use client';

import { useGameStore, type GameDifficulty } from '@/store/useGameStore';
import { getDayNumber } from '@/lib/seededRandom';

const GAME_INFO: Record<string, { name: string; icon: string; color: string }> = {
  memory: { name: 'Memory Match', icon: '⭐', color: '#58CC02' },
  word: { name: 'Word Fusion', icon: '⭐', color: '#CE82FF' },
  math: { name: 'Math Sprint', icon: '⚡', color: '#1CB0F6' },
  circuit: { name: 'Circuit Connect', icon: '⭐', color: '#FF9600' },
  oddone: { name: 'Odd One Out', icon: '⭐', color: '#00BFA6' },
  pipe: { name: 'Pipe Flow', icon: '⭐', color: '#FF9600' },
};

const DIFFICULTY_LABELS: Record<GameDifficulty, { label: string; color: string; bg: string }> = {
  beginner: { label: 'Beginner', color: '#58CC02', bg: '#F0FAE0' },
  intermediate: { label: 'Intermediate', color: '#FF9600', bg: '#FFF5E6' },
  pro: { label: 'Pro', color: '#FF3B30', bg: '#FFE8E5' },
};

// Build a Wordle-style visual grid for daily share card
function buildDailyGrid(roundScores: number[]): string {
  const maxPerRow = 5;
  const lines: string[] = [];
  for (let r = 0; r < roundScores.length; r++) {
    const found = Math.min(roundScores[r], maxPerRow);
    let row = '';
    for (let b = 0; b < maxPerRow; b++) {
      row += b < found ? '\u2b1c' : '\u2b1b';
    }
    lines.push(row + '  R' + (r + 1) + ': ' + roundScores[r] + ' words');
  }
  return lines.join('\n');
}

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

  // Pre-resolve difficulty labels for type safety
  const diffLabel = r.difficulty ? DIFFICULTY_LABELS[r.difficulty] : null;
  const suggestedDiff = r.suggestedDifficulty ? DIFFICULTY_LABELS[r.suggestedDifficulty] : null;

  const handleShare = async () => {
    const starsStr = r.stars === 3 ? '\u2b50\u2b50\u2b50' : r.stars === 2 ? '\u2b50\u2b50' : r.stars >= 1 ? '\u2b50' : '';
    let text: string;
    if (r.isDaily) {
      const grid = r.roundScores ? buildDailyGrid(r.roundScores) : '';
      text = `BrainTrain #${getDayNumber()}\n${starsStr}  ${r.score}pts${r.extra ? ' | ' + r.extra : ''}`;
      if (grid) text += '\n\n' + grid;
      text += `\n\n${streak}-day streak`;
    } else {
      text = `BrainTrain - ${info.name}\n${starsStr}  ${r.score}pts\nAccuracy: ${Math.round(r.accuracy)}% | Best Combo: x${r.bestCombo}${r.extra ? ' | ' + r.extra : ''}`;
    }
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
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-sm" style={{ color: r.isDaily ? '#FF9600' : '#999' }}>{r.isDaily ? `Daily Challenge #${getDayNumber()}` : 'Practice'}</p>
            {diffLabel && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: diffLabel.color, backgroundColor: diffLabel.bg }}>
                {diffLabel.label}
              </span>
            )}
          </div>
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
          <StatBox label="Best Combo" value={`x${r.bestCombo}`} />
          <StatBox label="Time" value={`${elapsed}:${secs.toString().padStart(2, '0')}`} />
          {r.extra && <StatBox label="Words" value={r.extra} />}
        </div>

        {/* Daily round breakdown */}
        {r.isDaily && r.roundScores && r.roundScores.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mt-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <h3 className="text-sm font-bold text-[#333] mb-3">Round Breakdown</h3>
            <div className="space-y-2">
              {r.roundScores.map((words, i) => {
                const pct = Math.min((words / 10) * 100, 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#999] w-8">R{i + 1}</span>
                    <div className="flex-1 h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, 5)}%`,
                          background: pct >= 70 ? '#58CC02' : pct >= 40 ? '#FF9600' : '#FF3B30',
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#333] w-6 text-right">{words}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        {/* Difficulty suggestion */}
        {suggestedDiff && r.suggestedDifficulty && (
          <button
            onClick={() => {
              useGameStore.getState().setGameDifficulty('word', r.suggestedDifficulty!);
              resetSession();
              setScreen('word_picker');
            }}
            className="bg-white rounded-2xl p-4 mt-4 flex items-center gap-3 active:scale-[0.98] transition-transform w-full text-left"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `2px solid ${suggestedDiff.color}40` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: suggestedDiff.bg }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={suggestedDiff.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#333]">Try {suggestedDiff.label}?</p>
              <p className="text-xs text-[#999]">Based on your performance</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}

        {/* Streak reminder */}
        {streak > 0 && (
          <div className="bg-[#FFF5E6] rounded-2xl p-3 mt-4 flex items-center gap-3">
            <span className="text-2xl">{'\ud83d\udd25'}</span>
            <div>
              <p className="text-sm font-bold text-[#FF9600]">{streak} Day Streak!</p>
              <p className="text-xs text-[#CC7A00]">Keep it going tomorrow</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 mt-8 mb-4">
          <button onClick={handleShare} className="w-full py-3 rounded-xl font-bold text-[15px] bg-white border-2 border-[#58CC02] text-[#58CC02] active:scale-[0.98] transition-transform">
            {r.isDaily ? 'Share Daily Result' : 'Share Result'}
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
