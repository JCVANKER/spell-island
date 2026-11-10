// Checking answers: keyword groups for speaking/writing, similarity for reading aloud, A/B/C for choices.
import { lemmas, normalize, containsAny } from './text';
import type { AcceptGroups } from './types';

/** Every group must be matched by at least one of its words/phrases. */
export function matchGroups(text: string, groups: AcceptGroups | undefined): boolean {
  if (!groups || !groups.length) return false;
  const lem = lemmas(text);
  return groups.every((g) => !!containsAny(lem, g));
}

/** Share of the passage's words (in order-insensitive bag form) that were read; 0..1. */
export function readScore(said: string, passage: string): number {
  const want = lemmas(passage).filter((w) => w.length > 1 || /[a-z]/.test(w));
  if (!want.length) return 1;
  const got = new Map<string, number>();
  for (const w of lemmas(said)) got.set(w, (got.get(w) || 0) + 1);
  let hit = 0;
  for (const w of want) { const c = got.get(w) || 0; if (c > 0) { hit++; got.set(w, c - 1); } }
  return hit / want.length;
}

const LETTERS = ['a', 'b', 'c', 'd'];
/** "A", "the second one", "B. It's a cat", or the option's own words → index, else -1. */
export function pickOption(said: string, options: string[]): number {
  const n = ' ' + normalize(said) + ' ';
  // 1) just a letter: "B", "option B", "I choose C", "the answer is A"
  const m = n.match(/^ (?:(?:option|answer|choose|i choose|the answer is|it is|its|letter) )?([abcd]) $/) || n.match(/\b(?:option|answer|choose|letter) ([abcd])\b/);
  if (m && LETTERS.indexOf(m[1]) < options.length) return LETTERS.indexOf(m[1]);
  // 2) the option's own words ("a mountain", "turn right at the first crossing")
  const lem = new Set(lemmas(said));
  let best = -1, bestScore = 0;
  options.forEach((o, i) => {
    const ol = lemmas(o).filter((w) => !['a', 'an', 'the', 'it', 'is', 'i', 'to', 'at', 'she', 'he', 'can', 'they'].includes(w));
    const s = ol.filter((w) => lem.has(w)).length / Math.max(1, ol.length);
    if (s > bestScore + 1e-6) { bestScore = s; best = i; }
  });
  if (bestScore >= 0.5) return best;
  // 3) "the second one"
  const ord = ['first', 'second', 'third', 'fourth'].findIndex((o) => n.includes(` ${o} `));
  if (ord >= 0 && ord < options.length) return ord;
  return -1;
}

/** Writing: compare ignoring case, punctuation and extra spaces. */
export function sameText(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}
