import {
  DICTIONARY,
  getWordsByLength,
  getWordsEndingWith,
  getWordsStartingWith,
  getWordsContaining,
  canFormWord,
  collectLettersWithCount,
} from './dictionary';
import { createSeededRandom, seededShuffle } from './seededRandom';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GeneratedRule {
  description: string;
  category: string;
  letters: string[];
  validWords: string[];
  difficulty: number;
}

// ─── Pattern Templates ───────────────────────────────────────────────────────
interface PatternTemplate {
  category: string;
  description: string;
  filter: () => string[];
  minWords: number;
  targetSmall?: boolean;
  difficultyBoost?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const isVowel = (c: string) => VOWELS.has(c);

function dictFilter(pred: (w: string) => boolean): string[] {
  const result: string[] = [];
  for (const w of DICTIONARY) {
    if (w.length >= 3 && w.length <= 7 && pred(w)) result.push(w);
  }
  return result;
}

/** Words that contain ANY of the given substrings */
function wordsContainingAny(subs: string[]): string[] {
  return dictFilter(w => subs.some(s => w.includes(s)));
}

// ─── Template Definitions ───────────────────────────────────────────────────
// Organized by creativity tier. Structural & semantic rules are far more
// engaging than raw prefix/suffix — the player has to THINK.

const PATTERN_TEMPLATES: PatternTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // TIER 1 — STRUCTURAL PATTERNS (pure word-structure deduction)
  // ═══════════════════════════════════════════════════════════════════════

  {
    category: 'structure',
    description: 'first and last letter are the same',
    filter: () => dictFilter(w => w[0] === w[w.length - 1]),
    minWords: 8,
    difficultyBoost: 1,
  },
  {
    category: 'structure',
    description: 'every letter is different — no repeats',
    filter: () => dictFilter(w => new Set(w).size === w.length),
    minWords: 8,
    difficultyBoost: 1,
  },
  {
    category: 'structure',
    description: 'has more vowels than consonants',
    filter: () => dictFilter(w => {
      const v = [...w].filter(isVowel).length;
      return v > w.length - v;
    }),
    minWords: 8,
    targetSmall: true,
    difficultyBoost: 1,
  },
  {
    category: 'structure',
    description: 'exactly one letter appears twice',
    filter: () => dictFilter(w => {
      const freq = new Map<string, number>();
      for (const ch of w) freq.set(ch, (freq.get(ch) ?? 0) + 1);
      const doubles = [...freq.values()].filter(c => c === 2).length;
      const triples = [...freq.values()].filter(c => c >= 3).length;
      return doubles === 1 && triples === 0;
    }),
    minWords: 8,
  },
  {
    category: 'structure',
    description: 'letters appear in alphabetical order',
    filter: () => dictFilter(w => {
      for (let i = 1; i < w.length; i++) {
        if (w[i] < w[i - 1]) return false;
      }
      return true;
    }),
    minWords: 6,
    targetSmall: true,
    difficultyBoost: 2,
  },
  {
    category: 'structure',
    description: 'alternating consonant-vowel-consonant...',
    filter: () => dictFilter(w => {
      if (w.length < 4) return false;
      for (let i = 0; i < w.length; i++) {
        if (isVowel(w[i]) !== (i % 2 === 1)) return false;
      }
      return true;
    }),
    minWords: 8,
    difficultyBoost: 1,
  },
  {
    category: 'structure',
    description: 'has 3 or more consonants in a row',
    filter: () => dictFilter(w => {
      let run = 0;
      for (const ch of w) {
        if (!isVowel(ch)) { run++; if (run >= 3) return true; } else run = 0;
      }
      return false;
    }),
    minWords: 8,
  },
  {
    category: 'structure',
    description: 'starts and ends with a consonant',
    filter: () => dictFilter(w => !isVowel(w[0]) && !isVowel(w[w.length - 1])),
    minWords: 15,
  },
  {
    category: 'structure',
    description: 'starts and ends with a vowel',
    filter: () => dictFilter(w => isVowel(w[0]) && isVowel(w[w.length - 1])),
    minWords: 6,
    targetSmall: true,
    difficultyBoost: 1,
  },
  {
    category: 'structure',
    description: 'second letter is a vowel',
    filter: () => dictFilter(w => w.length >= 3 && isVowel(w[1])),
    minWords: 15,
  },
  {
    category: 'structure',
    description: 'no letter appears more than once',
    filter: () => dictFilter(w => new Set(w).size === w.length && w.length >= 4),
    minWords: 8,
    difficultyBoost: 1,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TIER 2 — SEMANTIC / THEMATIC (words hiding a theme inside them)
  // ═══════════════════════════════════════════════════════════════════════

  {
    category: 'semantic',
    description: 'hides a BODY PART inside',
    filter: () => wordsContainingAny([
      'arm', 'leg', 'eye', 'ear', 'toe', 'lip', 'hip', 'rib', 'jaw', 'gum',
      'elbow', 'heart', 'chest', 'brain', 'blood', 'bone', 'foot', 'hand',
      'head', 'neck', 'skin', 'back', 'knee', 'palm', 'vein', 'lung',
    ]),
    minWords: 8,
    targetSmall: true,
  },
  {
    category: 'semantic',
    description: 'hides a COLOR inside',
    filter: () => wordsContainingAny([
      'red', 'blue', 'green', 'pink', 'gold', 'gray', 'grey', 'tan',
      'cyan', 'teal', 'rust', 'plum', 'olive', 'amber', 'coral', 'ivory',
      'ruby', 'sage', 'slate', 'jet', 'jade', 'lime', 'navy', 'buff',
    ]),
    minWords: 8,
    targetSmall: true,
  },
  {
    category: 'semantic',
    description: 'hides an ANIMAL inside',
    filter: () => wordsContainingAny([
      'cat', 'dog', 'pig', 'cow', 'fox', 'owl', 'ant', 'bee', 'hen', 'ram',
      'ape', 'bat', 'bug', 'crow', 'deer', 'dove', 'duck', 'fish', 'flea',
      'frog', 'goat', 'hare', 'hawk', 'lamb', 'lion', 'mice', 'mole', 'moth',
      'mule', 'seal', 'slug', 'swan', 'toad', 'wasp', 'wolf', 'worm', 'elk',
      'ape', 'eel', 'cod', 'gar', 'gnu', 'emu', 'iguana', 'macaw', 'otter',
    ]),
    minWords: 8,
  },
  {
    category: 'semantic',
    description: 'hides a NUMBER inside',
    filter: () => wordsContainingAny([
      'one', 'two', 'six', 'ten', 'eight', 'nine', 'four', 'five', 'three',
      'seven', 'zero', 'dozen', 'first', 'third', 'half', 'once', 'twice',
    ]),
    minWords: 8,
    targetSmall: true,
  },
  {
    category: 'semantic',
    description: 'hides a NATURE word inside',
    filter: () => wordsContainingAny([
      'sun', 'rain', 'snow', 'wind', 'tree', 'fern', 'lake', 'hill', 'rock',
      'sand', 'moon', 'star', 'leaf', 'seed', 'weed', 'rose', 'lily', 'vine',
      'moss', 'dew', 'fog', 'sky', 'sea', 'bay', 'ore', 'ash', 'oak', 'elm',
      'fir', 'ice', 'wave', 'storm', 'river', 'field', 'stone', 'earth',
    ]),
    minWords: 8,
  },
  {
    category: 'semantic',
    description: 'hides a FOOD word inside',
    filter: () => wordsContainingAny([
      'pie', 'jam', 'nut', 'egg', 'ham', 'corn', 'rice', 'cake', 'milk',
      'stew', 'bean', 'beer', 'bread', 'grape', 'lemon', 'melon', 'olive',
      'onion', 'peach', 'plum', 'sugar', 'toast', 'juice', 'flour', 'honey',
      'candy', 'cream', 'salt', 'pear', 'lime', 'syrup', 'cocoa', 'herb',
    ]),
    minWords: 8,
  },
  {
    category: 'semantic',
    description: 'hides a FEELING inside',
    filter: () => wordsContainingAny([
      'joy', 'sad', 'mad', 'fear', 'hope', 'love', 'rage', 'glee',
      'gloom', 'bliss', 'pride', 'shame', 'guilt', 'envy', 'calm', 'dread',
      'grief', 'ire', 'woe', 'hate', 'ache', 'lust', 'zeal', 'care',
    ]),
    minWords: 8,
    targetSmall: true,
  },
  {
    category: 'semantic',
    description: 'hides a TIME word inside',
    filter: () => wordsContainingAny([
      'day', 'night', 'week', 'year', 'hour', 'dawn', 'dusk', 'eve',
      'noon', 'era', 'age', 'late', 'soon', 'past', 'time', 'date', 'mid',
    ]),
    minWords: 8,
  },
  {
    category: 'semantic',
    description: 'hides a PLACE word inside',
    filter: () => wordsContainingAny([
      'home', 'room', 'hall', 'yard', 'park', 'gate', 'road', 'path',
      'bridge', 'tower', 'castle', 'cave', 'shore', 'bank', 'dock', 'port',
      'field', 'peak', 'vale', 'glen', 'ford', 'mill', 'farm', 'tent', 'town',
      'land', 'street', 'house', 'floor', 'wall', 'door', 'roof', 'step',
    ]),
    minWords: 8,
  },
  {
    category: 'semantic',
    description: 'hides a MUSIC word inside',
    filter: () => wordsContainingAny([
      'sing', 'tune', 'band', 'drum', 'horn', 'bass', 'note', 'chord',
      'song', 'harp', 'bell', 'ring', 'beat', 'tempo', 'tone', 'chime',
      'flute', 'banjo', 'piano', 'organ', 'radio', 'sound', 'pitch',
    ]),
    minWords: 8,
    targetSmall: true,
  },
  {
    category: 'semantic',
    description: 'hides a MOVEMENT word inside',
    filter: () => wordsContainingAny([
      'run', 'jump', 'fly', 'swim', 'walk', 'climb', 'slide', 'leap',
      'spin', 'bend', 'turn', 'roll', 'fall', 'rise', 'dash', 'rush',
      'glide', 'drift', 'float', 'crawl', 'kick', 'poke', 'chase', 'race',
      'stride', 'bounce', 'shake', 'swing', 'throw', 'catch', 'reach',
    ]),
    minWords: 8,
  },
  {
    category: 'semantic',
    description: 'hides a WEATHER word inside',
    filter: () => wordsContainingAny([
      'sun', 'rain', 'snow', 'wind', 'fog', 'hail', 'storm', 'cloud',
      'frost', 'mist', 'heat', 'cold', 'warm', 'cool', 'dry', 'wet',
      'damp', 'gale', 'dew', 'ice', 'humid', 'clear', 'grey', 'pale',
    ]),
    minWords: 8,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TIER 3 — INTERESTING PREFIX / SUFFIX / CONTAINING
  // (kept in smaller numbers — more creative picks)
  // ═══════════════════════════════════════════════════════════════════════

  ...['tion', 'ness', 'ment', 'ful', 'less', 'ous', 'able', 'ible', 'ical', 'ize', 'ate', 'ing', 'ent', 'ant', 'ism', 'ist'].map(
    (suffix): PatternTemplate => ({
      category: 'ending',
      description: `ending in '${suffix.toUpperCase()}'`,
      filter: () => getWordsEndingWith(suffix).filter(w => w.length >= 3 && w.length <= 7),
      minWords: 8,
      targetSmall: true,
    })
  ),

  ...['un', 're', 'dis', 'pre', 'out', 'over', 'mis', 'sub', 'inter', 'fore'].map(
    (prefix): PatternTemplate => ({
      category: 'starting',
      description: `starting with '${prefix.toUpperCase()}'`,
      filter: () => getWordsStartingWith(prefix).filter(w => w.length >= 3 && w.length <= 7),
      minWords: 8,
    })
  ),

  // Interesting containing patterns
  { category: 'containing', description: "containing 'QU'", filter: () => dictFilter(w => w.includes('qu')), minWords: 8, targetSmall: true, difficultyBoost: 1 },
  { category: 'containing', description: "containing 'TH'", filter: () => getWordsContaining('th').filter(w => w.length >= 3 && w.length <= 7), minWords: 8 },
  { category: 'containing', description: "containing 'PH'", filter: () => dictFilter(w => w.includes('ph')), minWords: 8, targetSmall: true, difficultyBoost: 1 },
  { category: 'containing', description: "containing 'CK'", filter: () => dictFilter(w => w.includes('ck')), minWords: 8 },
  { category: 'containing', description: "containing 'WN'", filter: () => dictFilter(w => w.includes('wn')), minWords: 8, targetSmall: true, difficultyBoost: 1 },
  { category: 'containing', description: "containing 'GH'", filter: () => dictFilter(w => w.includes('gh')), minWords: 8, targetSmall: true, difficultyBoost: 1 },

  // Length-based (kept but fewer)
  { category: 'length', description: '3-letter words only', filter: () => getWordsByLength(3, 3), minWords: 20 },
  { category: 'length', description: '4-letter words only', filter: () => getWordsByLength(4, 4), minWords: 30 },
];

// ─── Letter Selection ─────────────────────────────────────────────────────

function findOptimalLetters(
  candidates: string[],
  targetCount: number,
  maxLetters: number,
  rng: () => number
): { letters: string[]; validWords: string[] } {
  if (candidates.length === 0) return { letters: [], validWords: [] };

  const shuffled = seededShuffle(candidates, rng);

  const letterCounts = new Map<string, number>();
  const selectedWords: string[] = [];

  const totalTiles = () => {
    let s = 0;
    for (const c of letterCounts.values()) s += c;
    return s;
  };

  const extraTilesNeeded = (word: string): number => {
    const freq = new Map<string, number>();
    for (const ch of word) freq.set(ch, (freq.get(ch) ?? 0) + 1);
    let extra = 0;
    for (const [ch, needed] of freq) {
      const have = letterCounts.get(ch) ?? 0;
      if (needed > have) extra += needed - have;
    }
    return extra;
  };

  for (const word of shuffled) {
    if (selectedWords.length >= targetCount * 2) break;
    const extra = extraTilesNeeded(word);
    if (totalTiles() + extra <= maxLetters) {
      selectedWords.push(word);
      const freq = new Map<string, number>();
      for (const ch of word) freq.set(ch, (freq.get(ch) ?? 0) + 1);
      for (const [ch, needed] of freq) {
        letterCounts.set(ch, Math.max(letterCounts.get(ch) ?? 0, needed));
      }
    }
  }

  while (totalTiles() > maxLetters && letterCounts.size > 1) {
    let bestLetter = '';
    let fewestLost = Infinity;

    for (const letter of letterCounts.keys()) {
      const testLetters = buildLetterArray(letterCounts, letter);
      const lost = selectedWords.filter((w) => !canFormWord(w, testLetters)).length;
      if (lost < fewestLost) {
        fewestLost = lost;
        bestLetter = letter;
      }
    }

    letterCounts.delete(bestLetter);
    const currentLetters = buildLetterArray(letterCounts);
    const filtered = selectedWords.filter((w) => canFormWord(w, currentLetters));
    selectedWords.length = 0;
    selectedWords.push(...filtered);
  }

  const finalWords = selectedWords.length > targetCount
    ? selectedWords.slice(0, targetCount)
    : selectedWords;

  const finalLetters = collectLettersWithCount(finalWords);
  return { letters: finalLetters, validWords: finalWords.sort() };
}

function buildLetterArray(counts: Map<string, number>, exclude?: string): string[] {
  const result: string[] = [];
  for (const [ch, c] of counts) {
    if (ch === exclude) continue;
    for (let i = 0; i < c; i++) result.push(ch);
  }
  return result;
}

// ─── Rule Generation ─────────────────────────────────────────────────────────

function generateRuleFromTemplate(
  template: PatternTemplate,
  rng: () => number
): GeneratedRule | null {
  const candidates = template.filter().filter(
    (w) => DICTIONARY.has(w) && w.length >= 3 && w.length <= 7
  );

  if (candidates.length < template.minWords) return null;

  const targetSmall = template.targetSmall;
  const baseTarget = targetSmall
    ? Math.min(candidates.length, 8 + Math.floor(rng() * 3))
    : Math.min(candidates.length, 15 + Math.floor(rng() * 20));

  const { letters, validWords } = findOptimalLetters(candidates, baseTarget, 11, rng);

  if (validWords.length < 5 || letters.length < 6) return null;

  const avgLen = validWords.reduce((s, w) => s + w.length, 0) / validWords.length;
  let difficulty: number;
  if (validWords.length <= 10 && avgLen <= 4) difficulty = 1;
  else if (validWords.length <= 15) difficulty = 2;
  else if (validWords.length <= 25) difficulty = 3;
  else difficulty = 4;

  // Apply category-based difficulty adjustments
  if (template.category === 'structure') difficulty = Math.min(4, difficulty + (template.difficultyBoost ?? 1));
  else if (template.category === 'semantic') difficulty = Math.min(4, difficulty + 1);
  else if (template.category === 'containing') difficulty = Math.min(4, difficulty + (template.difficultyBoost ?? 1));

  return {
    description: template.description,
    category: template.category,
    letters,
    validWords,
    difficulty,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateRules(count: number = 4, seed?: number): GeneratedRule[] {
  const rng = seed !== undefined
    ? createSeededRandom(seed)
    : createSeededRandom(Date.now());

  const shuffledTemplates = seededShuffle(PATTERN_TEMPLATES, rng);
  const rules: GeneratedRule[] = [];
  const usedCategories = new Set<string>();
  const usedDescriptions = new Set<string>();

  // Pass 1: one per category (ensures variety)
  for (const template of shuffledTemplates) {
    if (rules.length >= count) break;
    if (usedCategories.has(template.category) && usedCategories.size >= 3) continue;
    if (usedDescriptions.has(template.description)) continue;

    const rule = generateRuleFromTemplate(template, rng);
    if (rule) {
      rules.push(rule);
      usedCategories.add(rule.category);
      usedDescriptions.add(rule.description);
    }
  }

  // Pass 2: fill remaining (allow same category, different description)
  for (const template of shuffledTemplates) {
    if (rules.length >= count) break;
    if (usedDescriptions.has(template.description)) continue;

    const rule = generateRuleFromTemplate(template, rng);
    if (rule) {
      rules.push(rule);
      usedDescriptions.add(rule.description);
    }
  }

  rules.sort((a, b) => a.difficulty - b.difficulty);
  return rules;
}

export function getPatternTemplateCount(): number {
  return PATTERN_TEMPLATES.length;
}
