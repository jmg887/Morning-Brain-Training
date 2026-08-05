// ─── Odd One Out Round Generator ────────────────────────────────────────────────
// Generates rounds with multiple cognitive types: category, number pattern,
// shape difference, color shade, word property, and size sequence.

import { createSeededRandom, seededShuffle, getTodaySeedStr, dateToSeed } from './seededRandom';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type RoundType =
  | 'category'
  | 'number_pattern'
  | 'shape'
  | 'color_shade'
  | 'word_property'
  | 'size_sequence';

export type DisplayMode = 'emoji' | 'number' | 'shape' | 'color' | 'text' | 'size_shape';

export interface OddOneItem {
  display: string;
  label?: string;
  shapeType?: string;
  color?: string;
  size?: number;
  rotation?: number;
}

export interface OddOneRound {
  type: RoundType;
  displayMode: DisplayMode;
  items: OddOneItem[];
  correctIndex: number;
  hint: string;
  phase: number;
}

export interface PhaseInfo {
  name: string;
  count: number;
  timePerRound: number;
  color: string;
  roundTypes: RoundType[];
  optionCount: [number, number];
}

// ─── Phase Definitions ──────────────────────────────────────────────────────────

export const PHASES: PhaseInfo[] = [
  {
    name: 'Quick Spot',
    count: 7,
    timePerRound: 6000,
    color: '#00BFA6',
    roundTypes: ['category', 'number_pattern', 'shape'],
    optionCount: [4, 4],
  },
  {
    name: 'Sharp Eye',
    count: 7,
    timePerRound: 5000,
    color: '#FF9600',
    roundTypes: ['category', 'number_pattern', 'shape', 'color_shade', 'word_property'],
    optionCount: [4, 5],
  },
  {
    name: 'Lightning Round',
    count: 6,
    timePerRound: 4000,
    color: '#FF3B30',
    roundTypes: ['color_shade', 'word_property', 'size_sequence', 'shape', 'number_pattern'],
    optionCount: [5, 6],
  },
];

// ─── Category Data ──────────────────────────────────────────────────────────────

const CATEGORIES: { name: string; items: string[] }[] = [
  { name: 'Fruits', items: ['🍎', '🍌', '🍊', '🍇', '🍓', '🍑', '🍒', '🥝', '🍋', '🍐'] },
  { name: 'Animals', items: ['🐶', '🐱', '🐰', '🐻', '🦊', '🐼', '🐨', '🦁', '🐸', '🐔'] },
  { name: 'Vehicles', items: ['🚗', '🚌', '🚂', '✈️', '🚢', '🚲', '🚀', '🚁', '🏍️', '🚕'] },
  { name: 'Clothing', items: ['👕', '👖', '👗', '🧢', '🧤', '🧣', '👠', '👢', '🥾', '👘'] },
  { name: 'Food', items: ['🍕', '🍔', '🍟', '🌮', '🍣', '🍩', '🧁', '🍪', '🥐', '🧀'] },
  { name: 'Sports', items: ['⚽', '🏀', '🎾', '🏐', '🎳', '🏓', '🥊', '⛳', '🏄', '🤿'] },
  { name: 'Weather', items: ['☀️', '🌧️', '⛈️', '❄️', '🌈', '🌬️', '🌪️', '🌤️', '🌥️', '🌙'] },
  { name: 'Body Parts', items: ['👁️', '👃', '👄', '👂', '🖐️', '🦶', '🦷', '💪', '🧠', '🫀'] },
  { name: 'Instruments', items: ['🎸', '🎹', '🥁', '🎺', '🎻', '🪗', '🪕', '🎷', '🪘', '🔔'] },
  { name: 'Ocean Life', items: ['🐳', '🦈', '🐙', '🦑', '🦐', '🐠', '🐡', '🦀', '🐚', '🪸'] },
  { name: 'Tools', items: ['🔨', '🔧', '⛏️', '🪚', '🔩', '🪛', '📐', '📏', '🪜', '💡'] },
];

// Items from different categories that can serve as the odd one out
const ODD_CATEGORY_ITEMS: { category: string; items: string[] }[] = [
  { category: 'Vegetables', items: ['🥕', '🥦', '🌽', '🥬', '🌶️', '🥒', '🧅', '🥔', '🍆', '🫑'] },
  { category: 'Furniture', items: ['🪑', '🛋️', '🛏️', '🪟', '🚪', '📦', '🧸', '🖼️', '🕯️', '🪞'] },
  { category: 'Electronics', items: ['💻', '📱', '📷', '🖥️', '⌨️', '🖱️', '🖨️', '🔌', '🔋', '💾'] },
  { category: 'Nature', items: ['🌳', '🌸', '🌺', '🌻', '🍄', '🌵', '🍁', '🌾', '🌲', '🌿'] },
  { category: 'Buildings', items: ['🏠', '🏢', '🏫', '🏥', '⛪', '🏰', '🌉', '🗼', '🏗️', '🛕'] },
  { category: 'Music', items: ['🎵', '🎶', '🎤', '📻', '🎼', '🪗', '🎹', '🥁', '🎷', '🎻'] },
];

// ─── Word Property Data ─────────────────────────────────────────────────────────

const WORD_PROPERTY_SETS: { hint: string; words: string[]; oddOneOut: string; oddHint: string }[] = [
  { hint: 'These are all verbs', words: ['run', 'jump', 'swim', 'fly', 'dance'], oddOneOut: 'table', oddHint: 'Not an action word' },
  { hint: 'These are all colors', words: ['red', 'blue', 'green', 'yellow', 'purple'], oddOneOut: 'happy', oddHint: 'Not a color' },
  { hint: 'These all end in "at"', words: ['cat', 'bat', 'hat', 'rat', 'mat'], oddOneOut: 'dog', oddHint: 'Does not end in "at"' },
  { hint: 'These all end in "ing"', words: ['running', 'jumping', 'swimming', 'flying', 'dancing'], oddOneOut: 'runner', oddHint: 'Does not end in "ing"' },
  { hint: 'These are all mammals', words: ['dog', 'cat', 'horse', 'whale', 'dolphin'], oddOneOut: 'eagle', oddHint: 'Not a mammal' },
  { hint: 'These are all metals', words: ['gold', 'silver', 'iron', 'copper', 'bronze'], oddOneOut: 'wood', oddHint: 'Not a metal' },
  { hint: 'These are all countries', words: ['France', 'Japan', 'Brazil', 'Canada', 'Egypt'], oddOneOut: 'Texas', oddHint: 'Not a country' },
  { hint: 'These all start with "s"', words: ['sun', 'star', 'sand', 'snow', 'stone'], oddOneOut: 'moon', oddHint: 'Does not start with "s"' },
  { hint: 'These are all planets', words: ['Mars', 'Venus', 'Saturn', 'Jupiter', 'Neptune'], oddOneOut: 'Pluto', oddHint: 'Dwarf planet, not a major planet' },
  { hint: 'These all rhyme with "ake"', words: ['cake', 'lake', 'make', 'take', 'bake'], oddOneOut: 'cook', oddHint: 'Does not rhyme with "ake"' },
  { hint: 'These are all emotions', words: ['joy', 'anger', 'fear', 'love', 'hope'], oddOneOut: 'table', oddHint: 'Not an emotion' },
  { hint: 'These are all seasons', words: ['spring', 'summer', 'autumn', 'winter'], oddOneOut: 'Tuesday', oddHint: 'Not a season' },
  { hint: 'These are all liquids', words: ['water', 'milk', 'juice', 'oil', 'honey'], oddOneOut: 'bread', oddHint: 'Not a liquid' },
  { hint: 'These all have double letters', words: ['apple', 'balloon', 'coffee', 'letter', 'rabbit'], oddOneOut: 'fruit', oddHint: 'No double letters' },
  { hint: 'These all start with "b"', words: ['bear', 'bird', 'beach', 'bridge', 'butter'], oddOneOut: 'eagle', oddHint: 'Does not start with "b"' },
  { hint: 'These are all musical genres', words: ['jazz', 'rock', 'blues', 'pop', 'folk'], oddOneOut: 'novel', oddHint: 'Not a music genre' },
  { hint: 'These all end in "ound"', words: ['sound', 'ground', 'found', 'round', 'bound'], oddOneOut: 'floor', oddHint: 'Does not end in "ound"' },
  { hint: 'These are all body parts', words: ['elbow', 'knee', 'ankle', 'wrist', 'spine'], oddOneOut: 'pillow', oddHint: 'Not a body part' },
];

// ─── Shape Data ─────────────────────────────────────────────────────────────────

const SHAPE_TYPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'] as const;
type ShapeType = (typeof SHAPE_TYPES)[number];

const SHAPE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

// ─── Generator Functions ────────────────────────────────────────────────────────

function generateCategoryRound(rng: () => number, optionCount: number): OddOneRound {
  // Pick a main category and a different category for the odd one
  const mainIdx = Math.floor(rng() * CATEGORIES.length);
  let oddCatIdx = Math.floor(rng() * ODD_CATEGORY_ITEMS.length);
  // Ensure odd category is different
  while (ODD_CATEGORY_ITEMS[oddCatIdx].category === CATEGORIES[mainIdx].name) {
    oddCatIdx = (oddCatIdx + 1) % ODD_CATEGORY_ITEMS.length;
  }

  const mainCat = CATEGORIES[mainIdx];
  const oddCat = ODD_CATEGORY_ITEMS[oddCatIdx];

  const mainItems = seededShuffle(mainCat.items, rng).slice(0, optionCount - 1);
  const oddItem = oddCat.items[Math.floor(rng() * oddCat.items.length)];

  const items: OddOneItem[] = mainItems.map((emoji) => ({ display: emoji }));
  const oddOneOut: OddOneItem = { display: oddItem };

  // Insert odd one at random position
  const correctIndex = Math.floor(rng() * optionCount);
  items.splice(correctIndex, 0, oddOneOut);

  return {
    type: 'category',
    displayMode: 'emoji',
    items,
    correctIndex,
    hint: `Find the item that is not a ${mainCat.name.toLowerCase()}`,
    phase: 0,
  };
}

function generateNumberPatternRound(rng: () => number, optionCount: number, difficulty: number): OddOneRound {
  const patternType = Math.floor(rng() * 4);
  let numbers: number[] = [];
  let oddNumber: number;
  let hint = '';

  switch (patternType) {
    case 0: {
      // All even, one odd
      const base = 2 + Math.floor(rng() * 20);
      numbers = Array.from({ length: optionCount - 1 }, (_, i) => base + i * 2);
      oddNumber = numbers[Math.floor(rng() * numbers.length)] + 1;
      hint = 'All numbers are even';
      break;
    }
    case 1: {
      // All odd, one even
      const base = 1 + Math.floor(rng() * 10) * 2;
      numbers = Array.from({ length: optionCount - 1 }, (_, i) => base + i * 2);
      oddNumber = numbers[Math.floor(rng() * numbers.length)] + 1;
      hint = 'All numbers are odd';
      break;
    }
    case 2: {
      // Arithmetic sequence, one wrong
      const start = 1 + Math.floor(rng() * 10);
      const step = 2 + Math.floor(rng() * 5);
      numbers = Array.from({ length: optionCount - 1 }, (_, i) => start + i * step);
      // Replace one with a number that's off by 1-3
      const replaceIdx = Math.floor(rng() * numbers.length);
      oddNumber = numbers[replaceIdx] + (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 3));
      hint = `Find the number breaking the pattern (+${step} each time)`;
      break;
    }
    case 3: {
      // All multiples of N, one not
      const multiple = 3 + Math.floor(rng() * 5);
      const start = multiple * (1 + Math.floor(rng() * 5));
      numbers = Array.from({ length: optionCount - 1 }, (_, i) => start + i * multiple);
      oddNumber = numbers[Math.floor(rng() * numbers.length)] + 1;
      hint = `All numbers are multiples of ${multiple}`;
      break;
    }
    default: {
      // Fallback
      numbers = [2, 4, 6, 8, 10].slice(0, optionCount - 1);
      oddNumber = 7;
      hint = 'All numbers are even';
    }
  }

  const items: OddOneItem[] = numbers.map((n) => ({ display: n.toString() }));
  const correctIndex = Math.floor(rng() * optionCount);
  items.splice(correctIndex, 0, { display: oddNumber.toString() });

  return {
    type: 'number_pattern',
    displayMode: 'number',
    items,
    correctIndex,
    hint,
    phase: 0,
  };
}

function generateShapeRound(rng: () => number, optionCount: number, difficulty: number): OddOneRound {
  const color = SHAPE_COLORS[Math.floor(rng() * SHAPE_COLORS.length)];

  if (difficulty <= 1) {
    // Easy: all same shape, one different
    const normalShape = SHAPE_TYPES[Math.floor(rng() * (SHAPE_TYPES.length - 1))];
    let oddShape: ShapeType;
    do {
      oddShape = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)];
    } while (oddShape === normalShape);

    const items: OddOneItem[] = Array.from({ length: optionCount - 1 }, () => ({
      display: normalShape,
      shapeType: normalShape,
      color,
    }));
    const correctIndex = Math.floor(rng() * optionCount);
    items.splice(correctIndex, 0, { display: oddShape, shapeType: oddShape, color });

    return {
      type: 'shape',
      displayMode: 'shape',
      items,
      correctIndex,
      hint: 'One shape is different',
      phase: 0,
    };
  } else {
    // Hard: all same shape, one is rotated
    const shape = ['square', 'triangle', 'diamond'][Math.floor(rng() * 3)];
    const normalRotation = 0;
    const oddRotation = [45, 90, 135, 180][Math.floor(rng() * 4)];

    const items: OddOneItem[] = Array.from({ length: optionCount - 1 }, () => ({
      display: shape,
      shapeType: shape,
      color,
      rotation: normalRotation,
    }));
    const correctIndex = Math.floor(rng() * optionCount);
    items.splice(correctIndex, 0, { display: shape, shapeType: shape, color, rotation: oddRotation });

    return {
      type: 'shape',
      displayMode: 'shape',
      items,
      correctIndex,
      hint: 'One shape is rotated differently',
      phase: 0,
    };
  }
}

function generateColorShadeRound(rng: () => number, optionCount: number): OddOneRound {
  // Generate a base color and make the odd one slightly different
  const baseHue = Math.floor(rng() * 360);
  const saturation = 60 + Math.floor(rng() * 30);
  const lightness = 45 + Math.floor(rng() * 20);

  const normalColor = `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
  // Odd color: shift hue by a small amount (10-25 degrees)
  const hueShift = 10 + Math.floor(rng() * 15);
  const oddColor = `hsl(${(baseHue + hueShift) % 360}, ${saturation}%, ${lightness}%)`;

  const items: OddOneItem[] = Array.from({ length: optionCount - 1 }, () => ({
    display: '●',
    color: normalColor,
    shapeType: 'circle',
  }));
  const correctIndex = Math.floor(rng() * optionCount);
  items.splice(correctIndex, 0, { display: '●', color: oddColor, shapeType: 'circle' });

  return {
    type: 'color_shade',
    displayMode: 'color',
    items,
    correctIndex,
    hint: 'One color is slightly different',
    phase: 0,
  };
}

function generateWordPropertyRound(rng: () => number, optionCount: number): OddOneRound {
  const set = WORD_PROPERTY_SETS[Math.floor(rng() * WORD_PROPERTY_SETS.length)];

  const normalWords = seededShuffle(set.words, rng).slice(0, optionCount - 1);
  const items: OddOneItem[] = normalWords.map((w) => ({ display: w }));
  const correctIndex = Math.floor(rng() * optionCount);
  items.splice(correctIndex, 0, { display: set.oddOneOut });

  return {
    type: 'word_property',
    displayMode: 'text',
    items,
    correctIndex,
    hint: set.hint,
    phase: 0,
  };
}

function generateSizeSequenceRound(rng: () => number, optionCount: number): OddOneRound {
  const shape = ['circle', 'square'][Math.floor(rng() * 2)];
  const color = SHAPE_COLORS[Math.floor(rng() * SHAPE_COLORS.length)];

  // Create an increasing size sequence
  const baseSize = 1;
  const step = 1;
  const sizes = Array.from({ length: optionCount - 1 }, (_, i) => baseSize + i * step);

  // Make one size wrong (swap with a nearby value)
  const wrongIdx = Math.floor(rng() * sizes.length);
  const oddSize = sizes[wrongIdx] + (rng() > 0.5 ? 0.5 : -0.5);

  const items: OddOneItem[] = sizes.map((s) => ({
    display: shape,
    shapeType: shape,
    color,
    size: s,
  }));
  const correctIndex = Math.floor(rng() * optionCount);
  items.splice(correctIndex, 0, {
    display: shape,
    shapeType: shape,
    color,
    size: oddSize,
  });

  return {
    type: 'size_sequence',
    displayMode: 'size_shape',
    items,
    correctIndex,
    hint: 'One breaks the size pattern',
    phase: 0,
  };
}

// ─── Main Generator ─────────────────────────────────────────────────────────────

export function generateOddOneOutRounds(seed?: string): OddOneRound[] {
  const seedStr = seed ?? getTodaySeedStr();
  const seedNum = dateToSeed(seedStr);
  const rng = createSeededRandom(seedNum);

  const allRounds: OddOneRound[] = [];

  for (let p = 0; p < PHASES.length; p++) {
    const phase = PHASES[p];
    const difficulty = p;

    for (let r = 0; r < phase.count; r++) {
      const roundType = phase.roundTypes[Math.floor(rng() * phase.roundTypes.length)];
      const optRange = phase.optionCount;
      const optCount = optRange[0] + Math.floor(rng() * (optRange[1] - optRange[0] + 1));

      let round: OddOneRound;
      switch (roundType) {
        case 'category':
          round = generateCategoryRound(rng, optCount);
          break;
        case 'number_pattern':
          round = generateNumberPatternRound(rng, optCount, difficulty);
          break;
        case 'shape':
          round = generateShapeRound(rng, optCount, difficulty);
          break;
        case 'color_shade':
          round = generateColorShadeRound(rng, optCount);
          break;
        case 'word_property':
          round = generateWordPropertyRound(rng, optCount);
          break;
        case 'size_sequence':
          round = generateSizeSequenceRound(rng, optCount);
          break;
      }

      round.phase = p;
      allRounds.push(round);
    }
  }

  return allRounds;
}

export function getOddOneOutTotalRounds(): number {
  return PHASES.reduce((sum, p) => sum + p.count, 0);
}
