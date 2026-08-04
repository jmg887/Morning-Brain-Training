import { getWordsEndingWith, canFormWord, collectLettersWithCount } from '../src/lib/dictionary';
import { createSeededRandom, seededShuffle } from '../src/lib/seededRandom';

const candidates = getWordsEndingWith('at').filter((w: string) => w.length >= 3 && w.length <= 7);
console.log('Candidates for "at":', candidates.length);

const rng = createSeededRandom(12345);
const shuffled = seededShuffle(candidates, rng);
console.log('First 10 shuffled:', shuffled.slice(0, 10));

const letterCounts = new Map<string, number>();
const selectedWords: string[] = [];
const maxLetters = 11;

const totalLetterCount = () => {
  let sum = 0;
  for (const c of letterCounts.values()) sum += c;
  return sum;
};

const newSlotsNeeded = (word: string) => {
  const tempCounts = new Map(letterCounts);
  for (const ch of word) {
    const cur = tempCounts.get(ch) ?? 0;
    tempCounts.set(ch, cur + 1);
  }
  let afterTotal = 0;
  for (const c of tempCounts.values()) afterTotal += c;
  return afterTotal - totalLetterCount();
};

const targetCount = 25;
let skipCount = 0;

for (const word of shuffled) {
  if (selectedWords.length >= targetCount * 1.5) break;
  const slots = newSlotsNeeded(word);
  const total = totalLetterCount();
  if (total + slots <= maxLetters) {
    selectedWords.push(word);
    for (const ch of word) {
      letterCounts.set(ch, (letterCounts.get(ch) ?? 0) + 1);
    }
  } else {
    if (skipCount < 5) {
      console.log(`SKIP '${word}': needs ${slots} new slots, total would be ${total + slots} > ${maxLetters}`);
      skipCount++;
    }
  }
}

console.log('\nSelected', selectedWords.length, 'words');
console.log('Letter counts:', Object.fromEntries(letterCounts));
console.log('Total letters:', totalLetterCount());

const finalLetters = collectLettersWithCount(selectedWords);
console.log('Final letters:', finalLetters);
console.log('Words:', selectedWords.sort().join(', '));
