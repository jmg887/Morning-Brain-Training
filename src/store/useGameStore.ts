import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Screen = 'home' | 'memory' | 'word' | 'math' | 'daily' | 'score';
export type GameType = 'memory' | 'word' | 'math';

export interface SessionResults {
  game: GameType;
  score: number;
  stars: number;
  accuracy: number;
  bestCombo: number;
  timeElapsed: number;
  isDaily: boolean;
  extra?: string;
  roundScores?: number[]; // words found per round (for daily share card)
}

interface GameState {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  streak: number;
  lastPlayDate: string | null;
  xp: number;
  level: number;
  dailyProgress: number;
  totalGamesPlayed: number;
  gamesCompleted: GameType[];
  currentGame: GameType | null;
  sessionResults: SessionResults | null;
  dailyWordCompleted: string | null; // date string e.g. '2026-08-03'
  completeSession: (results: SessionResults) => void;
  resetSession: () => void;
  checkAndUpdateStreak: () => void;
  getGreeting: () => string;
  getXPForNextLevel: () => number;
  getXPProgress: () => number;
  hasCompletedDailyToday: () => boolean;
}

const getTodayStr = () => new Date().toISOString().split('T')[0];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning!';
  if (hour < 17) return 'Good Afternoon!';
  return 'Good Evening!';
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentScreen: 'home',
      setScreen: (screen) => set({ currentScreen: screen }),

      streak: 0,
      lastPlayDate: null,
      xp: 0,
      level: 1,
      dailyProgress: 0,
      totalGamesPlayed: 0,
      gamesCompleted: [],

      currentGame: null,
      sessionResults: null,
      dailyWordCompleted: null,

      completeSession: (results) => {
        const state = get();
        const today = getTodayStr();
        const newGamesCompleted = [...state.gamesCompleted];
        if (!newGamesCompleted.includes(results.game)) {
          newGamesCompleted.push(results.game);
        }

        // Update streak
        let newStreak = state.streak;
        if (!state.lastPlayDate) {
          newStreak = 1;
        } else {
          const last = new Date(state.lastPlayDate);
          const now = new Date(today);
          const diffDays = Math.floor(
            (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === 1) {
            newStreak = state.streak + 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        }

        const xpGained = Math.round(results.score * 0.5) + results.stars * 20;
        const newXP = state.xp + xpGained;
        const newLevel = Math.floor(newXP / 100) + 1;
        set({
          sessionResults: results,
          currentScreen: 'score',
          dailyWordCompleted: results.isDaily && results.game === 'word' ? getTodayStr() : state.dailyWordCompleted,
          xp: newXP,
          level: newLevel,
          streak: newStreak,
          totalGamesPlayed: state.totalGamesPlayed + 1,
          dailyProgress: newGamesCompleted.length,
          gamesCompleted: newGamesCompleted,
          lastPlayDate: today,
        });
      },

      resetSession: () =>
        set({ currentGame: null, sessionResults: null }),

      checkAndUpdateStreak: () => {
        const state = get();
        const today = getTodayStr();
        if (!state.lastPlayDate) {
          set({ streak: 1, lastPlayDate: today });
          return;
        }
        const last = new Date(state.lastPlayDate);
        const now = new Date(today);
        const diffDays = Math.floor(
          (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          set({ streak: state.streak + 1, lastPlayDate: today });
        } else if (diffDays > 1) {
          set({ streak: 1, lastPlayDate: today });
        }
      },

      getGreeting,
      getXPForNextLevel: () => {
        const xp = get().xp;
        return (Math.floor(xp / 100) + 1) * 100;
      },
      getXPProgress: () => {
        const xp = get().xp;
        return xp % 100;
      },
      hasCompletedDailyToday: () => {
        return get().dailyWordCompleted === getTodayStr();
      },
    }),
    {
      name: 'braintrain-storage',
      partialize: (state) => ({
        streak: state.streak,
        lastPlayDate: state.lastPlayDate,
        xp: state.xp,
        level: state.level,
        dailyProgress: state.dailyProgress,
        totalGamesPlayed: state.totalGamesPlayed,
        gamesCompleted: state.gamesCompleted,
        dailyWordCompleted: state.dailyWordCompleted,
      }),
    }
  )
);
