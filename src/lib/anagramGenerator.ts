import {
  DICTIONARY,
  canFormWord,
  collectLettersWithCount,
  getWordsByLength,
} from './dictionary';
import { createSeededRandom, seededShuffle } from './seededRandom';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnagramPuzzle {
  /** Scrambled letter tiles (with multiplicity) */
  letters: string[];
  /** All valid words that can be formed from the letters (3+ letters) */
  validWords: string[];
  /** The base word the letters were derived from (for hint/display) */
  baseWord: string;
  /** Round difficulty hint (1-3) */
  difficulty: number;
}

// ─── Letter frequency score — prefer common English letters ──────────────────

const LETTER_FREQ: Record<string, number> = {
  e: 13, t: 9, a: 8, o: 8, i: 7, n: 7, s: 6, h: 6, r: 6,
  d: 4, l: 4, c: 3, u: 3, m: 3, w: 2, f: 2, g: 2, y: 2,
  p: 2, b: 2, v: 1, k: 1, j: 0.5, x: 0.5, q: 0.3, z: 0.3,
};

function letterQuality(word: string): number {
  let score = 0;
  for (const ch of word) score += LETTER_FREQ[ch] ?? 0;
  return score / word.length;
}

// ─── Pre-built length-indexed arrays for fast sub-anagram search ─────────────
// Access via wordsByLen[length], already built at dictionary module load.

// ─── Find all sub-anagrams using length-indexed arrays + early pruning ────────

function findSubAnagrams(letters: string[], maxLen: number): string[] {
  const results: string[] = [];
  const letterSet = new Set(letters);
  const uniqueLetters = letterSet.size;

  for (let len = 3; len <= maxLen; len++) {
    // Use getWordsByLength to get only words of this length
    const candidates = getWordsByLength(len, len);
    for (let i = 0; i < candidates.length; i++) {
      const word = candidates[i];
      // Quick pre-check: does the word use only letters we have?
      let valid = true;
      for (let j = 0; j < word.length; j++) {
        if (!letterSet.has(word[j])) { valid = false; break; }
      }
      if (!valid) continue;
      // Full check with multiplicity
      if (canFormWord(word, letters)) {
        results.push(word);
      }
    }
  }
  return results;
}

// ─── Generate a single puzzle from a base word ──────────────────────────────

function generatePuzzleFromBase(
  baseWord: string,
  rng: () => number
): AnagramPuzzle | null {
  const letters = collectLettersWithCount([baseWord]);

  // Find all valid sub-anagrams (only check words up to baseWord length)
  const validWords = findSubAnagrams(letters, baseWord.length);

  // Need at least 8 findable words for a good puzzle
  if (validWords.length < 8) return null;
  if (validWords.length > 60) return null;

  // Scramble letters
  const scrambled = seededShuffle(letters, rng);

  // Difficulty based on word count and letter quality
  let difficulty: number;
  if (validWords.length <= 12 && letterQuality(baseWord) >= 6) difficulty = 1;
  else if (validWords.length <= 20) difficulty = 2;
  else difficulty = 3;

  return {
    letters: scrambled,
    validWords: validWords.sort(),
    baseWord,
    difficulty,
  };
}

// ─── Profanity / quality blocklist for base words ─────────────────────────────
const BLOCKED_BASE_WORDS = new Set([
  // profanity & slurs
  'bitch', 'damn', 'shit', 'piss', 'crap', 'slut', 'whore', 'dick',
  'cock', 'fuck', 'cunt', 'ass', 'arse', 'bastard', 'bollock', 'boob',
  'fart', 'hell', 'hump', 'jizz', 'knob', 'muff', 'poop', 'pube',
  'shag', 'spunk', 'turd', 'wank', 'twat', 'snatch', 'boner',
  // obscure Scrabble-only words that look like nonsense
  'dasnt', 'shaul', 'brier', 'berri', 'brei',
]);

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a set of anagram puzzles for a game session.
 * @param count  Number of puzzles (rounds)
 * @param seed   Optional seed for reproducibility
 * @returns Array of puzzles sorted by difficulty
 */
export function generateAnagramPuzzles(
  count: number = 4,
  seed?: number
): AnagramPuzzle[] {
  const rng = seed !== undefined
    ? createSeededRandom(seed)
    : createSeededRandom(Date.now());

  // Build candidate pool: 6-7 letter words with common letters, shuffled
  const candidates = getWordsByLength(6, 7);

  // Filter: no rare letters, no blocked words, decent letter quality
  const filtered = candidates.filter(w =>
    !/[qxzj]/.test(w) &&
    !BLOCKED_BASE_WORDS.has(w) &&
    letterQuality(w) >= 4
  );
  const shuffled = seededShuffle(filtered, rng);

  const puzzles: AnagramPuzzle[] = [];
  const usedBaseLetters: string[] = [];

  // Try candidates, limit attempts to avoid timeout
  const maxAttempts = Math.min(shuffled.length, 300);

  for (let i = 0; i < maxAttempts && puzzles.length < count; i++) {
    const baseWord = shuffled[i];

    // Skip if too similar to a previous puzzle
    const baseLetterSet = new Set(baseWord);
    let tooSimilar = false;
    for (const p of puzzles) {
      const overlap = [...baseLetterSet].filter(l => new Set(p.letters).has(l)).length;
      if (overlap >= 5) { tooSimilar = true; break; }
    }
    if (tooSimilar) continue;

    const puzzle = generatePuzzleFromBase(baseWord, rng);
    if (!puzzle) continue;

    usedBaseLetters.push(baseWord);
    puzzles.push(puzzle);
  }

  // Sort by difficulty
  puzzles.sort((a, b) => a.difficulty - b.difficulty);
  return puzzles;
}

/**
 * Check if a word is valid for a given puzzle's letters.
 */
export function isValidWord(word: string, letters: string[]): boolean {
  return DICTIONARY.has(word.toLowerCase()) && canFormWord(word.toLowerCase(), letters);
}

/**
 * Get all valid words for given letters.
 */
export function getAllValidWords(letters: string[]): string[] {
  const maxLen = letters.length;
  return findSubAnagrams(letters, maxLen);
}
