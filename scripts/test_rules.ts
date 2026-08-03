import { generateRules, getPatternTemplateCount } from '../src/lib/wordRuleGenerator';
import { createSeededRandom, dateToSeed, getTodaySeedStr } from '../src/lib/seededRandom';

// Test 1: Generate random rules
console.log('=== Test 1: Random rules ===');
for (let i = 0; i < 5; i++) {
  const rules = generateRules(4);
  console.log(`\nSession ${i + 1}:`);
  for (const rule of rules) {
    const lettersStr = rule.letters.map(l => l.toUpperCase()).join(', ');
    console.log(`  [${rule.category}] ${rule.description} | ${rule.validWords.length} words | Letters: ${lettersStr}`);
    console.log(`    Words: ${rule.validWords.slice(0, 5).join(', ')}${rule.validWords.length > 5 ? '...' : ''}`);
  }
}

// Test 2: Seeded (daily) rules
console.log('\n=== Test 2: Daily rules (seeded) ===');
const seed = dateToSeed(getTodaySeedStr());
const dailyRules1 = generateRules(4, seed);
const dailyRules2 = generateRules(4, seed);
console.log('Deterministic:', JSON.stringify(dailyRules1.map(r => r.description)) === JSON.stringify(dailyRules2.map(r => r.description)));

for (const rule of dailyRules1) {
  console.log(`  [${rule.category}] ${rule.description} | ${rule.validWords.length} words | ${rule.letters.length} letters`);
}

// Test 3: Check that all words can be formed from letters
console.log('\n=== Test 3: Letter coverage verification ===');
let allGood = true;
for (let i = 0; i < 20; i++) {
  const rules = generateRules(4);
  for (const rule of rules) {
    for (const word of rule.validWords) {
      const letterSet = new Set(rule.letters.map(l => l.toLowerCase()));
      for (const ch of word) {
        if (!letterSet.has(ch)) {
          console.log(`  FAIL: word '${word}' needs '${ch}' but not in letters [${rule.letters.join(',')}]`);
          allGood = false;
        }
      }
    }
  }
}
console.log(allGood ? '  All words can be formed from their letters!' : '  Some failures found!');

// Test 4: Category variety
console.log('\n=== Test 4: Category variety ===');
let varietyCount = 0;
for (let i = 0; i < 20; i++) {
  const rules = generateRules(4);
  const cats = new Set(rules.map(r => r.category));
  if (cats.size >= 2) varietyCount++;
}
console.log(`  ${varietyCount}/20 sessions had 2+ categories`);

// Test 5: Pattern template count
console.log(`\n=== Pattern templates: ${getPatternTemplateCount()} ===`);
