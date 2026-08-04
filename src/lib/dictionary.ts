// Comprehensive English word list for word games
// 3-7 letter common, recognizable words
// Shared across all word-based games

import dictionaryData from './dictionary.json';

export const DICTIONARY: ReadonlySet<string> = new Set(
  (dictionaryData as string[]).map((w) => w.toLowerCase())
);

// Pre-computed indexes for fast pattern lookups
const wordsByLength = new Map<number, string[]>();
const wordsBySuffix = new Map<string, string[]>();
const wordsByPrefix = new Map<string, string[]>();
const wordsBySubstring = new Map<string, string[]>();

for (const word of DICTIONARY) {
  // By length
  const len = word.length;
  if (!wordsByLength.has(len)) wordsByLength.set(len, []);
  wordsByLength.get(len)!.push(word);

  // By suffix (last 2-3 chars)
  if (len >= 3) {
    const s2 = word.slice(-2);
    if (!wordsBySuffix.has(s2)) wordsBySuffix.set(s2, []);
    wordsBySuffix.get(s2)!.push(word);
  }
  if (len >= 4) {
    const s3 = word.slice(-3);
    if (!wordsBySuffix.has(s3)) wordsBySuffix.set(s3, []);
    wordsBySuffix.get(s3)!.push(word);
  }

  // By prefix (first 2 chars)
  if (len >= 3) {
    const p2 = word.slice(0, 2);
    if (!wordsByPrefix.has(p2)) wordsByPrefix.set(p2, []);
    wordsByPrefix.get(p2)!.push(word);
  }

  // By common double-letter substrings
  const doubles = ['oo', 'ee', 'll', 'ss', 'tt', 'rr', 'pp', 'nn', 'mm', 'dd', 'ff', 'cc', 'gg', 'bb'];
  for (const d of doubles) {
    if (word.includes(d)) {
      if (!wordsBySubstring.has(d)) wordsBySubstring.set(d, []);
      wordsBySubstring.get(d)!.push(word);
    }
  }
}

export function getWordsByLength(min: number, max: number): string[] {
  const result: string[] = [];
  for (let l = min; l <= max; l++) {
    const arr = wordsByLength.get(l);
    if (arr) result.push(...arr);
  }
  return result;
}

export function getWordsEndingWith(suffix: string): string[] {
  return wordsBySuffix.get(suffix) ?? [];
}

export function getWordsStartingWith(prefix: string): string[] {
  return wordsByPrefix.get(prefix) ?? [];
}

export function getWordsContaining(substring: string): string[] {
  return wordsBySubstring.get(substring) ?? [];
}

// Check if a word can be formed from given letters (with multiplicity)
export function canFormWord(word: string, letters: string[]): boolean {
  const available = new Map<string, number>();
  for (const l of letters) {
    available.set(l, (available.get(l) ?? 0) + 1);
  }
  for (const ch of word) {
    const count = available.get(ch) ?? 0;
    if (count === 0) return false;
    available.set(ch, count - 1);
  }
  return true;
}

// Collect all unique letters needed by a set of words
export function collectLetters(words: string[]): string[] {
  const letterSet = new Set<string>();
  for (const w of words) {
    for (const ch of w) {
      letterSet.add(ch);
    }
  }
  return Array.from(letterSet).sort();
}

// Collect letters WITH multiplicity — includes enough copies of each letter
// so that every word in the set can be formed from the returned letters.
export function collectLettersWithCount(words: string[]): string[] {
  // For each letter, find the max count needed across all words
  const maxCount = new Map<string, number>();
  for (const w of words) {
    const freq = new Map<string, number>();
    for (const ch of w) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    for (const [ch, count] of freq) {
      if ((maxCount.get(ch) ?? 0) < count) {
        maxCount.set(ch, count);
      }
    }
  }
  // Build array with multiplicity, sorted
  const result: string[] = [];
  for (const [ch, count] of Array.from(maxCount.entries()).sort()) {
    for (let i = 0; i < count; i++) {
      result.push(ch);
    }
  }
  return result;
}
