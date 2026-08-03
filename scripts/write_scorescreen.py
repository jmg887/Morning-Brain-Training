import os

content = """'use client';

import { useGameStore } from '@/store/useGameStore';
import { getDayNumber } from '@/lib/seededRandom';

const GAME_INFO: Record<string, { name: string; icon: string; color: string }> = {
  memory: { name: 'Memory Match', icon: '\U0001f9e0', color: '#58CC02' },
  word: { name: 'Word Puzzle', icon: '\U0001f4dd', color: '#CE82FF' },
  math: { name: 'Math Sprint', icon: '\u26a1', color: '#1CB0F6' },
};

// Build a Wordle-style visual grid for daily share
function buildDailyGrid(roundScores: number[]): string {
  const wordsPerBlock = 5;
  const lines: string[] = [];

  for (let r = 0; r < roundScores.length; r++) {
    const found = Math.min(roundScores[r], wordsPerBlock);
    let block = '';
    for (let b = 0; b < wordsPerBlock; b++) {
      block += b < found ? '\u2b1c' : '\u2b1b';
    }
    lines.push(block + '  R' + (r + 1) + ': ' + roundScores[r] + ' words');
  }
  return lines.join('\\n');
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

  const handleShare = async () => {
    const starsStr = r.stars === 3 ? '\u2b50\u2b50\u2b50' : r.stars === 2 ? '\u2b50\u2b50' : r.stars >= 1 ? '\u2b50' : '';
    let text: string;
    if (r.isDaily) {
      const grid = r.roundScores ? buildDailyGrid(r.roundScores) : '';
      text = '\U0001f9e0 BrainTrain #' + getDayNumber() + '\\n' + starsStr + '  ' + r.score + 'pts';
      if (r.extra) text += ' | ' + r.extra;
      if (grid) text += '\\n\\n' + grid;
      text += '\\n\\n\U0001f525 ' + streak + '-day streak';
    } else {
      text = '\U0001f9e0 BrainTrain - ' + info.name + '\\n' + starsStr + '  ' + r.score + 'pts';
      text += '\\nAccuracy: ' + Math.round(r.accuracy) + '% | Best Combo: \\u00d7' + r.bestCombo;
      if (r.extra) text += ' | ' + r.extra;
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
          <p className="text-sm mt-1" style={{ color: r.isDaily ? '#FF9600' : '#999' }}>{r.isDaily ? 'Daily Challenge #' + getDayNumber() : 'Practice'}</p>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-3 mt-6">
          {[1, 2, 3].map((s) => (
            <span key={s} className={'text-4xl transition-all ' + (s <= r.stars ? '' : 'opacity-20')}>
              {'\u2b50'}
            </span>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <StatBox label="Score" value={r.score.toString()} />
          <StatBox label="Accuracy" value={Math.round(r.accuracy) + '%'} />
          <StatBox label="Best Combo" value={'\\u00d7' + r.bestCombo} />
          <StatBox label="Time" value={elapsed + ':' + secs.toString().padStart(2, '0')} />
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
                          width: Math.max(pct, 5) + '%',
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
        <div className="bg-white rounded-2xl p-4 mt-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[#333]">XP Earned</span>
            <span className="text-lg font-extrabold text-[#58CC02]">+{xpGained}</span>
          </div>
          <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#58CC02] rounded-full transition-all" style={{ width: (xpProg / 100) * 100 + '%' }} />
          </div>
          <p className="text-xs text-[#999] mt-1">Level {level} \\u2014 {xpProg}/100 XP</p>
        </div>

        {/* Streak reminder */}
        {streak > 0 && (
          <div className="bg-[#FFF5E6] rounded-2xl p-3 mt-4 flex items-center gap-3">
            <span className="text-2xl">{'\\U0001f525'}</span>
            <div>
              <p className="text-sm font-bold text-[#FF9600]">{streak} Day Streak!</p>
              <p className="text-xs text-[#CC7A00]">Keep it going tomorrow</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 mt-8 mb-4">
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl font-bold text-[15px] bg-white border-2 border-[#58CC02] text-[#58CC02] active:scale-[0.98] transition-transform"
          >
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
"""

# Now fix the double-escaped sequences for the TSX file
# Python unicode escapes need to become JS unicode escapes
content = content.replace('\\\\n', '\\n')  # \n in heredoc -> \n in file
content = content.replace('\\\\u', '\\u')  # \u in heredoc -> \u in file
content = content.replace('\\\\U', '\\U')  # \U in heredoc -> \U in file

with open('/home/z/my-project/src/components/ScoreScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ScoreScreen.tsx written successfully')
