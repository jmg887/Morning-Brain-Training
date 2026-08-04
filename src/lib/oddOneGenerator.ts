import { createSeededRandom, seededShuffle } from './seededRandom';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OddOneRound {
  type: 'category' | 'number';
  items: string[];
  oddIndex: number;
  explanation: string;
  difficulty: number;
}

// ─── Word Categories ─────────────────────────────────────────────────────────

const CATEGORIES: { name: string; items: string[] }[] = [
  { name: 'Dog Breeds', items: ['poodle', 'beagle', 'terrier', 'boxer', 'husky', 'collie', 'spaniel', 'pug', 'labrador', 'retriever'] },
  { name: 'Big Cats', items: ['lion', 'tiger', 'leopard', 'cheetah', 'panther', 'jaguar', 'cougar', 'lynx'] },
  { name: 'Citrus Fruits', items: ['orange', 'lemon', 'lime', 'grapefruit', 'tangerine', 'clementine', 'kumquat'] },
  { name: 'Root Vegetables', items: ['carrot', 'potato', 'turnip', 'radish', 'beet', 'parsnip', 'ginger'] },
  { name: 'Ocean Animals', items: ['dolphin', 'whale', 'shark', 'octopus', 'seahorse', 'jellyfish', 'starfish'] },
  { name: 'Instruments', items: ['guitar', 'violin', 'trumpet', 'drums', 'piano', 'flute', 'cello', 'harp'] },
  { name: 'Ball Sports', items: ['soccer', 'tennis', 'hockey', 'volleyball', 'rugby', 'cricket', 'baseball'] },
  { name: 'Weather', items: ['thunder', 'blizzard', 'tornado', 'drizzle', 'monsoon', 'drought', 'hailstorm'] },
  { name: 'Gemstones', items: ['diamond', 'emerald', 'ruby', 'sapphire', 'topaz', 'opal', 'pearl'] },
  { name: 'Trees', items: ['oak', 'maple', 'pine', 'birch', 'cedar', 'willow', 'elm', 'ash'] },
  { name: 'Birds of Prey', items: ['eagle', 'hawk', 'falcon', 'owl', 'vulture', 'osprey', 'kite'] },
  { name: 'Spices', items: ['cinnamon', 'paprika', 'turmeric', 'cumin', 'saffron', 'oregano', 'basil'] },
  { name: 'Dances', items: ['waltz', 'tango', 'salsa', 'foxtrot', 'rumba', 'polka', 'mambo'] },
  { name: 'Fabrics', items: ['silk', 'cotton', 'denim', 'velvet', 'linen', 'satin', 'wool'] },
  { name: 'Fish', items: ['salmon', 'trout', 'tuna', 'cod', 'bass', 'pike', 'perch'] },
  { name: 'Flowers', items: ['rose', 'lily', 'tulip', 'daisy', 'orchid', 'poppy', 'iris'] },
  { name: 'Metals', items: ['gold', 'silver', 'copper', 'bronze', 'iron', 'platinum', 'zinc'] },
  { name: 'Planets', items: ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'neptune', 'uranus'] },
  { name: 'Clothing', items: ['jacket', 'scarf', 'trousers', 'blazer', 'cardigan', 'mitten', 'pullover'] },
  { name: 'Body Parts', items: ['elbow', 'ankle', 'wrist', 'shoulder', 'knee', 'thumb', 'spine'] },
];

// ─── Category round generator ───────────────────────────────────────────────

function generateCategoryRound(rng: () => number): OddOneRound | null {
  // Pick a main category and a different one for the odd item
  const shuffledCats = seededShuffle(CATEGORIES, rng);
  const main = shuffledCats[0];
  const odd = shuffledCats[1];
  if (!main || !odd) return null;

  // Pick 3 from main, 1 from odd
  const mainItems = seededShuffle(main.items, rng).slice(0, 3);
  const oddItem = odd.items[Math.floor(rng() * odd.items.length)];

  if (mainItems.length < 3 || !oddItem) return null;

  // Place the odd item at a random position
  const oddIndex = Math.floor(rng() * 4);
  const items = [...mainItems];
  items.splice(oddIndex, 0, oddItem);

  return {
    type: 'category',
    items,
    oddIndex,
    explanation: `${oddItem} is not a ${main.name.toLowerCase()}`,
    difficulty: 1,
  };
}

// ─── Number pattern generators ─────────────────────────────────────────────

type NumPattern = (rng: () => number) => OddOneRound | null;

const NUM_PATTERNS: NumPattern[] = [
  // All even, one odd
  function evenOdd(rng) {
    const evens = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80];
    const odds = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41];
    const three = seededShuffle(evens, rng).slice(0, 3).map(String);
    const odd = odds[Math.floor(rng() * odds.length)];
    const oddIdx = Math.floor(rng() * 4);
    const items: string[] = [...three];
    items.splice(oddIdx, 0, String(odd));
    return { type: 'number', items, oddIndex: oddIdx, explanation: `${odd} is odd, the rest are even`, difficulty: 1 };
  },

  // All multiples of N, one not
  function multiples(rng) {
    const base = [3, 4, 5, 6, 7][Math.floor(rng() * 5)];
    const multiples: string[] = [];
    for (let i = 1; multiples.length < 3; i++) {
      const m = base * i;
      if (m > 5 && m <= 100) multiples.push(String(m));
    }
    let oddVal: number;
    do { oddVal = Math.floor(rng() * 90) + 5; } while (oddVal % base === 0);
    const oddIdx = Math.floor(rng() * 4);
    const items = [...multiples];
    items.splice(oddIdx, 0, String(oddVal));
    return { type: 'number', items, oddIndex: oddIdx, explanation: `${oddVal} is not a multiple of ${base}`, difficulty: 2 };
  },

  // Ascending sequence, one breaks it
  function ascending(rng) {
    const start = Math.floor(rng() * 15) + 1;
    const step = [1, 2, 3, 5, 10][Math.floor(rng() * 5)];
    const seq = [start, start + step, start + step * 2];
    // Break the 4th by offsetting it
    const breakOffset = rng() < 0.5 ? -1 : 1;
    const broken = start + step * 3 + breakOffset;
    const items = seq.map(String);
    const oddIdx = Math.floor(rng() * 4);
    items.splice(oddIdx, 0, String(broken));
    return { type: 'number', items, oddIndex: oddIdx, explanation: `Sequence goes up by ${step}, but ${broken} breaks it`, difficulty: 2 };
  },

  // Same digit sum, one different
  function digitSum(rng) {
    const targetSum = Math.floor(rng() * 18) + 3; // 3-20
    const sameSum: string[] = [];
    let attempts = 0;
    while (sameSum.length < 3 && attempts < 200) {
      const n = Math.floor(rng() * 90) + 10;
      if (String(n).split('').reduce((s, d) => s + parseInt(d), 0) === targetSum && !sameSum.includes(String(n))) {
        sameSum.push(String(n));
      }
      attempts++;
    }
    if (sameSum.length < 3) return null;
    let diffNum: number;
    attempts = 0;
    do {
      diffNum = Math.floor(rng() * 90) + 10;
      attempts++;
    } while (String(diffNum).split('').reduce((s, d) => s + parseInt(d), 0) === targetSum && attempts < 200);
    const oddIdx = Math.floor(rng() * 4);
    const items = [...sameSum];
    items.splice(oddIdx, 0, String(diffNum));
    return { type: 'number', items, oddIndex: oddIdx, explanation: `Digit sums should all be ${targetSum}, but ${diffNum} sums to ${String(diffNum).split('').reduce((s, d) => s + parseInt(d), 0)}`, difficulty: 3 };
  },

  // All squares (or cubes), one not
  function squares(rng) {
    const isCube = rng() < 0.5;
    const perfect: string[] = [];
    for (let i = 2; perfect.length < 3; i++) {
      const val = isCube ? i * i * i : i * i;
      if (val <= 200) perfect.push(String(val));
    }
    if (perfect.length < 3) return null;
    let oddVal: number;
    do { oddVal = Math.floor(rng() * 150) + 5; } while (
      (isCube && Math.cbrt(oddVal) % 1 === 0) || (!isCube && Math.sqrt(oddVal) % 1 === 0)
    );
    const oddIdx = Math.floor(rng() * 4);
    const items = [...perfect];
    items.splice(oddIdx, 0, String(oddVal));
    return { type: 'number', items, oddIndex: oddIdx, explanation: `${oddVal} is not a perfect ${isCube ? 'cube' : 'square'}`, difficulty: 2 };
  },

  // All prime, one composite (or vice versa)
  function primes(rng) {
    const allPrimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
    const usePrimes = rng() < 0.5; // true = 3 primes + 1 composite, false = 3 composite + 1 prime
    if (usePrimes) {
      const three = seededShuffle(allPrimes.filter(p => p > 3), rng).slice(0, 3).map(String);
      const composites = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28];
      const odd = composites[Math.floor(rng() * composites.length)];
      const oddIdx = Math.floor(rng() * 4);
      const items: string[] = [...three];
      items.splice(oddIdx, 0, String(odd));
      return { type: 'number', items, oddIndex: oddIdx, explanation: `${odd} is composite, the rest are prime`, difficulty: 2 };
    } else {
      const composites = seededShuffle([9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28], rng).slice(0, 3).map(String);
      const odd = allPrimes[Math.floor(rng() * allPrimes.length)];
      const oddIdx = Math.floor(rng() * 4);
      const items: string[] = [...composites];
      items.splice(oddIdx, 0, String(odd));
      return { type: 'number', items, oddIndex: oddIdx, explanation: `${odd} is prime, the rest are composite`, difficulty: 2 };
    }
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a set of odd-one-out rounds.
 * Mix of category (word) and number pattern types.
 */
export function generateOddOneRounds(
  count: number = 20,
  seed?: number
): OddOneRound[] {
  const rng = seed !== undefined
    ? createSeededRandom(seed)
    : createSeededRandom(Date.now());

  const rounds: OddOneRound[] = [];
  const usedPairs = new Set<string>(); // avoid repeating same category/pattern combos

  // Alternate between category and number rounds, with some randomness
  const sequence: ('category' | 'number')[] = [];
  for (let i = 0; i < count; i++) {
    sequence.push(i % 2 === 0 ? 'category' : 'number');
  }
  const shuffledSeq = seededShuffle(sequence, rng);

  // Re-sort to ensure good mix: interleave
  const finalSeq: ('category' | 'number')[] = [];
  const cats: number[] = [];
  const nums: number[] = [];
  shuffledSeq.forEach((type, i) => {
    if (type === 'category') cats.push(i);
    else nums.push(i);
  });
  let ci = 0, ni = 0;
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0 && ci < cats.length) { finalSeq.push('category'); ci++; }
    else if (ni < nums.length) { finalSeq.push('number'); ni++; }
    else if (ci < cats.length) { finalSeq.push('category'); ci++; }
  }

  for (const type of finalSeq) {
    if (rounds.length >= count) break;

    let round: OddOneRound | null = null;
    let attempts = 0;

    if (type === 'category') {
      while (!round && attempts < 10) {
        round = generateCategoryRound(rng);
        if (round) {
          const key = [...round.items].sort().join(',');
          if (usedPairs.has(key)) { round = null; }
          else { usedPairs.add(key); }
        }
        attempts++;
      }
    } else {
      const pattern = NUM_PATTERNS[Math.floor(rng() * NUM_PATTERNS.length)];
      round = pattern(rng);
    }

    if (round) rounds.push(round);
  }

  return rounds;
}
