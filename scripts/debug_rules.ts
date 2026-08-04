import { generateRules, getPatternTemplateCount } from '../src/lib/wordRuleGenerator';
import { createSeededRandom, dateToSeed, getTodaySeedStr } from '../src/lib/seededRandom';
import { getWordsEndingWith, getWordsStartingWith, getWordsContaining, getWordsByLength } from '../src/lib/dictionary';

// Test basic pattern matching
console.log('=== Pattern matching ===');
console.log('ending AT:', getWordsEndingWith('at').length, 'words');
console.log('starting ST:', getWordsStartingWith('st').length, 'words');
console.log('containing OO:', getWordsContaining('oo').length, 'words');
console.log('3-letter:', getWordsByLength(3, 3).length, 'words');
console.log('ending UB:', getWordsEndingWith('ub').length, 'words');

// Test with a fixed seed
console.log('\n=== Fixed seed test ===');
const rules = generateRules(4, 12345);
console.log('Generated', rules.length, 'rules');
for (const r of rules) {
  console.log(`  [${r.category}] ${r.description} | ${r.validWords.length} words | ${r.letters.length} letter tiles`);
  if (r.validWords.length > 0) {
    console.log(`    Sample: ${r.validWords.slice(0, 3).join(', ')}`);
  }
}

console.log('\n=== Another seed ===');
const rules2 = generateRules(4, 99999);
console.log('Generated', rules2.length, 'rules');
for (const r of rules2) {
  console.log(`  [${r.category}] ${r.description} | ${r.validWords.length} words | ${r.letters.length} letter tiles`);
}