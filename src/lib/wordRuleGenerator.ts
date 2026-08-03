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
}

const PATTERN_TEMPLATES: PatternTemplate[] = [
  ...['at', 'an', 'in', 'un', 'op', 'og', 'it', 'am', 'ig', 'ay', 'ow', 'ub', 'ash', 'ink', 'all', 'ill', 'ock', 'oke', 'ent', 'ing'].map(
    (suffix): PatternTemplate => ({
      category: 'ending',
      description: `ending in '${suffix.toUpperCase()}'`,
      filter: () => getWordsEndingWith(suffix),
      minWords: 8,
      targetSmall: ['ub', 'og', 'op', 'ig', 'oke', 'all', 'ill'].includes(suffix),
    })
  ),

  ...['st', 'br', 'tr', 'bl', 'cr', 'fl', 'gr', 'pr', 'ch', 'sh', 'cl', 'sp', 'sn', 'dr', 'gl', 'pl', 'sc', 'sk', 'sl', 'sm', 'sq', 'sw'].map(
    (prefix): PatternTemplate => ({
      category: 'starting',
      description: `starting with '${prefix.toUpperCase()}'`,
      filter: () => getWordsStartingWith(prefix),
      minWords: 8,
    })
  ),

  ...['oo', 'ee', 'll', 'ss', 'tt', 'rr'].map(
    (sub): PatternTemplate => ({
      category: 'containing',
      description: `containing '${sub.toUpperCase()}'`,
      filter: () => getWordsContaining(sub),
      minWords: 8,
      targetSmall: ['tt', 'rr'].includes(sub),
    })
  ),

  { category: 'length', description: '3-letter words', filter: () => getWordsByLength(3, 3), minWords: 20 },
  { category: 'length', description: '4-letter words', filter: () => getWordsByLength(4, 4), minWords: 30 },
  { category: 'length', description: '5-letter words', filter: () => getWordsByLength(5, 5), minWords: 30 },
];

// ─── Letter Selection ─────────────────────────────────────────────────────
// Build a letter multiset (total tile count ≤ maxLetters) that covers
// as many candidate words as possible.

function findOptimalLetters(
  candidates: string[],
  targetCount: number,
  maxLetters: number,
  rng: () => number
): { letters: string[]; validWords: string[] } {
  if (candidates.length === 0) return { letters: [], validWords: [] };

  const shuffled = seededShuffle(candidates, rng);

  // letterCounts: letter → current count in our tile set
  const letterCounts = new Map<string, number>();
  const selectedWords: string[] = [];

  const totalTiles = () => {
    let s = 0;
    for (const c of letterCounts.values()) s += c;
    return s;
  };

  // How many extra tiles would we need to add this word?
  // For each letter in the word, we need max(currentCount, freqInWord).
  // Extra = sum of max(0, needed - current) across letters.
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
      // Update counts: set each letter to max(current, freqInWord)
      const freq = new Map<string, number>();
      for (const ch of word) freq.set(ch, (freq.get(ch) ?? 0) + 1);
      for (const [ch, needed] of freq) {
        letterCounts.set(ch, Math.max(letterCounts.get(ch) ?? 0, needed));
      }
    }
  }

  // Prune if we exceed maxLetters (shouldn't happen often with the above check,
  // but possible if a single word is longer than remaining space)
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

// Build a flat letter array from counts, optionally excluding one letter
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

  if (template.category === 'containing') difficulty = Math.min(4, difficulty + 1);
  if (template.category === 'length' && template.description.includes('5')) difficulty = Math.min(4, difficulty + 1);

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

  // Pass 1: one per category
  for (const template of shuffledTemplates) {
    if (rules.length >= count) break;
    if (usedCategories.has(template.category) && usedCategories.size >= 2) continue;
    if (usedDescriptions.has(template.description)) continue;

    const rule = generateRuleFromTemplate(template, rng);
    if (rule) {
      rules.push(rule);
      usedCategories.add(rule.category);
      usedDescriptions.add(rule.description);
    }
  }

  // Pass 2: fill remaining
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
