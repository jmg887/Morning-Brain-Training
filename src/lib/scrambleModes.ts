// ─── Scramble Mode System ──────────────────────────────────────────────────────
// 4 rotating modes for the Letter Scramble phase of WordFusion.
// Each mode reuses the core anagram generator but post-processes
// the valid words list and adds mode-specific metadata.

import {
  DICTIONARY,
  getWordsByLength,
  canFormWord,
  collectLettersWithCount,
} from './dictionary';
import {
  findSubAnagrams,
  generatePuzzleFromBase,
  letterQuality,
  BLOCKED_BASE_WORDS,
} from './anagramGenerator';
import { createSeededRandom, seededShuffle } from './seededRandom';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScrambleMode = 'classic' | 'lengthLock' | 'hiddenTarget' | 'category';

export interface ScramblePuzzle {
  /** Scrambled letter tiles (with multiplicity) */
  letters: string[];
  /** Valid words for THIS mode (may be filtered subset of all sub-anagrams) */
  validWords: string[];
  /** The mode used */
  mode: ScrambleMode;
  /** Base word the letters came from (for reference) */
  baseWord: string;
  /** Round difficulty hint (1-3) */
  difficulty: number;
  // ── Mode-specific fields ──
  /** For category mode: the category label to display */
  categoryLabel?: string;
  /** For hiddenTarget mode: the target word the player is hunting for */
  hiddenTarget?: string;
  /** For lengthLock mode: the locked word length */
  lockedLength?: number;
  /** Total sub-anagram count (before mode filtering) — for UI display */
  totalPossible: number;
}

// ─── Mode Metadata for UI ────────────────────────────────────────────────────

export const MODE_INFO: Record<ScrambleMode, { label: string; icon: string; hint: string; color: string }> = {
  classic: { label: 'Classic', icon: '🔤', hint: 'Tap letters to form any valid word', color: '#FF9600' },
  lengthLock: { label: 'Length Lock', icon: '📏', hint: '', color: '#5856D6' },
  hiddenTarget: { label: 'Hidden Target', icon: '🔍', hint: '', color: '#FF2D55' },
  category: { label: 'Category', icon: '📂', hint: '', color: '#34C759' },
};

// ─── Category Definitions ─────────────────────────────────────────────────────
// Each category has keywords. A word matches if it CONTAINS any keyword as substring.
// This is the same approach used by wordRuleGenerator semantic rules.

interface CategoryDef {
  name: string;
  icon: string;
  keywords: string[];
}

const CATEGORIES: CategoryDef[] = [
  {
    name: 'Animals', icon: '🐾',
    keywords: ['cat','dog','pig','cow','fox','owl','ant','bee','hen','ram','ape','bat','bug','deer','fish','frog','goat','lion','seal','wolf','eel','elk','cod','gar','gnu','emu','mole','swan','hawk','lamb','dove','duck','toad','wasp','worm','crow','hare','moth','mule','slug','flea','kid','yak','ray','fly'],
  },
  {
    name: 'Body Parts', icon: '🫀',
    keywords: ['arm','leg','eye','ear','toe','lip','hip','rib','jaw','gum','heart','chest','brain','blood','bone','foot','hand','head','neck','skin','back','knee','palm','vein','lung','elbow'],
  },
  {
    name: 'Colors', icon: '🎨',
    keywords: ['red','blue','green','pink','gold','gray','grey','tan','cyan','teal','rust','plum','olive','amber','coral','ivory','ruby','jade','lime','navy','jet','sage','slate'],
  },
  {
    name: 'Nature', icon: '🌿',
    keywords: ['sun','rain','snow','wind','tree','fern','lake','hill','rock','sand','moon','star','leaf','seed','weed','rose','lily','vine','moss','dew','fog','sky','sea','bay','oak','elm','fir','ice','wave','storm','river','field','stone','earth','ash','ore'],
  },
  {
    name: 'Food & Drink', icon: '🍽',
    keywords: ['pie','jam','nut','egg','ham','corn','rice','cake','milk','stew','bean','beer','bread','grape','lemon','melon','olive','onion','peach','plum','sugar','toast','juice','flour','honey','candy','cream','salt','pear','lime','syrup','cocoa','herb'],
  },
  {
    name: 'Feelings', icon: '💭',
    keywords: ['joy','sad','mad','fear','hope','love','rage','glee','gloom','bliss','pride','shame','guilt','envy','calm','dread','grief','woe','hate','ache','lust','zeal','care'],
  },
  {
    name: 'Music', icon: '🎵',
    keywords: ['sing','tune','band','drum','horn','bass','note','chord','song','harp','bell','ring','beat','tone','chime','flute','banjo','piano','organ','radio','sound','pitch'],
  },
  {
    name: 'Movement', icon: '🏃',
    keywords: ['run','jump','fly','swim','walk','climb','slide','leap','spin','bend','turn','roll','fall','rise','dash','rush','glide','drift','float','crawl','kick','poke','chase','race','bounce','shake','swing','throw','catch','reach'],
  },
  {
    name: 'Places', icon: '🏠',
    keywords: ['home','room','hall','yard','park','gate','road','path','tower','cave','shore','bank','dock','port','peak','mill','farm','tent','town','land','house','floor','wall','door','roof','step','bridge','castle','field','ford'],
  },
  {
    name: 'Time', icon: '⏰',
    keywords: ['day','night','week','year','hour','dawn','dusk','eve','noon','era','age','late','soon','past','time','date','mid'],
  },
  {
    name: 'Weather', icon: '⛅',
    keywords: ['sun','rain','snow','wind','fog','hail','storm','cloud','frost','mist','heat','cold','warm','cool','dry','wet','damp','gale','dew','ice','clear','grey','pale'],
  },
  {
    name: 'Numbers', icon: '🔢',
    keywords: ['one','two','six','ten','eight','nine','four','five','three','seven','zero','dozen','first','third','half','once','twice'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Check if a word matches any keyword in a category */
function wordMatchesCategory(word: string, category: CategoryDef): boolean {
  return category.keywords.some(kw => word.includes(kw));
}

/** Filter a word list to only those matching a category */
function filterByCategory(words: string[], category: CategoryDef): string[] {
  return words.filter(w => wordMatchesCategory(w, category));
}

/** Pick a mode deterministically from a seed */
export function pickScrambleModes(count: number, seed: number): ScrambleMode[] {
  const allModes: ScrambleMode[] = ['classic', 'lengthLock', 'hiddenTarget', 'category'];
  const rng = createSeededRandom(seed);
  const shuffled = seededShuffle(allModes, rng);
  return shuffled.slice(0, count);
}

// ─── Base Candidate Pool (shared across modes) ───────────────────────────────
// 6-7 letter words with common letters, no profanity, decent quality.
// We build this once and reuse it.

function getBaseCandidatePool(): string[] {
  const candidates = getWordsByLength(6, 7);
  return candidates.filter(w =>
    !/[qxzj]/.test(w) &&
    !BLOCKED_BASE_WORDS.has(w) &&
    letterQuality(w) >= 4
  );
}

// ─── Mode Generators ─────────────────────────────────────────────────────────

/** Classic mode: standard anagram, all sub-anagrams are valid */
function generateClassicPuzzle(rng: () => number): ScramblePuzzle | null {
  const pool = getBaseCandidatePool();
  const shuffled = seededShuffle(pool, rng);
  const maxAttempts = Math.min(shuffled.length, 300);

  for (let i = 0; i < maxAttempts; i++) {
    const baseWord = shuffled[i];
    const puzzle = generatePuzzleFromBase(baseWord, rng);
    if (puzzle) {
      return {
        letters: puzzle.letters,
        validWords: puzzle.validWords,
        mode: 'classic',
        baseWord: puzzle.baseWord,
        difficulty: puzzle.difficulty,
        totalPossible: puzzle.validWords.length,
      };
    }
  }
  return null;
}

/** Length Lock mode: only words of a specific length count */
function generateLengthLockPuzzle(rng: () => number): ScramblePuzzle | null {
  const pool = getBaseCandidatePool();
  const shuffled = seededShuffle(pool, rng);
  const maxAttempts = Math.min(shuffled.length, 300);

  // Pick a target length: 4 or 5 (3 is too easy, 6+ too restrictive)
  const targetLength = rng() < 0.5 ? 4 : 5;

  for (let i = 0; i < maxAttempts; i++) {
    const baseWord = shuffled[i];
    const letters = collectLettersWithCount([baseWord]);
    const allSubs = findSubAnagrams(letters, baseWord.length);

    // Filter to only the target length
    const lengthWords = allSubs.filter(w => w.length === targetLength);

    // Need at least 10 words of the target length
    if (lengthWords.length < 10) continue;
    // Cap at 30 to keep it challenging but not overwhelming
    const validWords = lengthWords.slice(0, 30).sort();

    const scrambled = seededShuffle(letters, rng);

    let difficulty: number;
    if (validWords.length <= 15) difficulty = 1;
    else if (validWords.length <= 22) difficulty = 2;
    else difficulty = 3;

    return {
      letters: scrambled,
      validWords,
      mode: 'lengthLock',
      baseWord,
      difficulty,
      lockedLength: targetLength,
      totalPossible: allSubs.length,
    };
  }
  return null;
}

/** Hidden Target mode: find the base word for big bonus, smaller words still count */
function generateHiddenTargetPuzzle(rng: () => number): ScramblePuzzle | null {
  const pool = getBaseCandidatePool();
  // For hidden target, prefer 7-letter words (more satisfying to find)
  const sevenLetter = pool.filter(w => w.length === 7);
  // Quality filter: require high letter quality AND reasonable sub-anagram count
  // for a recognizable target word
  const qualityPool = sevenLetter.filter(w => letterQuality(w) >= 7);
  const shuffled = seededShuffle(qualityPool.length > 50 ? qualityPool : sevenLetter.length > 50 ? sevenLetter : pool, rng);
  const maxAttempts = Math.min(shuffled.length, 300);

  for (let i = 0; i < maxAttempts; i++) {
    const baseWord = shuffled[i];
    const letters = collectLettersWithCount([baseWord]);
    const allSubs = findSubAnagrams(letters, baseWord.length);

    // Need enough sub-anagrams (18-45 range for good hidden targets)
    if (!DICTIONARY.has(baseWord)) continue;
    if (allSubs.length < 18 || allSubs.length > 45) continue;

    // Remove the base word from the regular valid words
    // (it's the hidden target — finding it is special)
    const validWords = allSubs
      .filter(w => w !== baseWord)
      .sort();

    if (validWords.length < 10) continue;

    const scrambled = seededShuffle(letters, rng);

    let difficulty: number;
    if (validWords.length <= 15) difficulty = 2;
    else if (validWords.length <= 30) difficulty = 3;
    else difficulty = 3;

    return {
      letters: scrambled,
      validWords,
      mode: 'hiddenTarget',
      baseWord,
      difficulty,
      hiddenTarget: baseWord,
      totalPossible: allSubs.length,
    };
  }
  return null;
}

/** Category mode: only words containing a category keyword count */
function generateCategoryPuzzle(rng: () => number): ScramblePuzzle | null {
  const pool = getBaseCandidatePool();
  const shuffled = seededShuffle(pool, rng);
  const maxAttempts = Math.min(shuffled.length, 300);
  const shuffledCategories = seededShuffle(CATEGORIES, rng);

  for (let i = 0; i < maxAttempts; i++) {
    const baseWord = shuffled[i];
    const letters = collectLettersWithCount([baseWord]);
    const allSubs = findSubAnagrams(letters, baseWord.length);

    // Need a decent pool to filter from
    if (allSubs.length < 20) continue;

    // Try each category to find one with enough matching words
    for (const cat of shuffledCategories) {
      const catWords = filterByCategory(allSubs, cat);

      if (catWords.length < 10) continue;
      // Cap at 25 to keep rounds focused
      const validWords = catWords.sort().slice(0, 25);

      const scrambled = seededShuffle(letters, rng);

      let difficulty: number;
      if (validWords.length <= 12) difficulty = 1;
      else if (validWords.length <= 18) difficulty = 2;
      else difficulty = 3;

      return {
        letters: scrambled,
        validWords,
        mode: 'category',
        baseWord,
        difficulty,
        categoryLabel: cat.name,
        totalPossible: allSubs.length,
      };
    }
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a scramble puzzle for a specific mode.
 * Falls back to classic if the requested mode fails.
 */
export function generateScramblePuzzle(
  mode: ScrambleMode,
  seed: number
): ScramblePuzzle {
  const rng = createSeededRandom(seed);

  let puzzle: ScramblePuzzle | null = null;

  switch (mode) {
    case 'classic':
      puzzle = generateClassicPuzzle(rng);
      break;
    case 'lengthLock':
      puzzle = generateLengthLockPuzzle(rng);
      break;
    case 'hiddenTarget':
      puzzle = generateHiddenTargetPuzzle(rng);
      break;
    case 'category':
      puzzle = generateCategoryPuzzle(rng);
      break;
  }

  // Fallback to classic if mode generation failed
  if (!puzzle) {
    puzzle = generateClassicPuzzle(createSeededRandom(seed + 9999));
  }

  if (!puzzle) {
    // Absolute last resort — shouldn't happen with 57k words
    return {
      letters: ['s', 't', 'a', 'r', 'e'],
      validWords: ['star', 'stare', 'rate', 'tear', 'ears', 'rest', 'arts', 'rats', 'tare', 'earn', 'east', 'seat'],
      mode: 'classic',
      baseWord: 'stare',
      difficulty: 1,
      totalPossible: 12,
    };
  }

  return puzzle;
}

/**
 * Generate multiple scramble puzzles with rotating modes.
 * @param count Number of puzzles needed
 * @param seed  Base seed (different offsets used per puzzle)
 * @param modes Optional explicit modes array. If not provided, modes are picked from seed.
 */
export function generateScramblePuzzles(
  count: number,
  seed: number,
  modes?: ScrambleMode[]
): ScramblePuzzle[] {
  const resolvedModes = modes ?? pickScrambleModes(count, seed);
  const puzzles: ScramblePuzzle[] = [];
  const usedBases: string[] = [];

  for (let i = 0; i < count; i++) {
    const mode = resolvedModes[i] ?? 'classic';
    const puzzleSeed = seed + (i * 100) + 7; // offset per puzzle
    const puzzle = generateScramblePuzzle(mode, puzzleSeed);

    // Skip if too similar to a previous puzzle
    const baseLetterSet = new Set(puzzle.baseWord);
    let tooSimilar = false;
    for (const prev of puzzles) {
      const prevSet = new Set(prev.baseWord);
      const overlap = [...baseLetterSet].filter(l => prevSet.has(l)).length;
      if (overlap >= 5) { tooSimilar = true; break; }
    }
    if (!tooSimilar) {
      puzzles.push(puzzle);
      usedBases.push(puzzle.baseWord);
    }
  }

  // Sort by difficulty
  puzzles.sort((a, b) => a.difficulty - b.difficulty);
  return puzzles;
}
