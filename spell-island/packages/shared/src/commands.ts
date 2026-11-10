// Rule brain: turns what a child says into actions for the little wizard (movement, talking, items and
// lots of magic). Instant and deterministic; the server adds an LLM for anything these rules don't get.
import type { BrainContext, BrainOutput, BrainAction, PerceivedThing } from './types';
import { lemmas, normalize, hasCJK, zhToEnglishKeywords, findColor, isSubsequence } from './text';

export const FOODS = ['cake', 'apple', 'banana', 'orange', 'pear', 'watermelon', 'grapes', 'durian', 'strawberry', 'ice cream', 'pizza', 'bread', 'candy', 'cookie', 'carrot', 'egg', 'hamburger', 'hot dog', 'noodles', 'rice', 'peach', 'lemon', 'mango'];
export const FRUITS = ['apple', 'banana', 'orange', 'pear', 'watermelon', 'grapes', 'durian', 'strawberry', 'peach', 'lemon', 'mango'];
export const WEATHERS: Record<string, string> = { sunny: 'sunny', sun: 'sunny', rainy: 'rainy', rain: 'rainy', snowy: 'snowy', snow: 'snowy', windy: 'windy', wind: 'windy', cloudy: 'cloudy', foggy: 'foggy', fog: 'foggy', misty: 'foggy', stormy: 'stormy', storm: 'stormy', thunder: 'stormy' };
/** picture rain: what the child says → kind */
export const SHOWERS: Record<string, string> = { star: 'stars', stars: 'stars', heart: 'hearts', hearts: 'hearts', flower: 'flowers', flowers: 'flowers', snowflake: 'snowflakes', snowflakes: 'snowflakes', leaf: 'leaves', leaves: 'leaves', note: 'notes', notes: 'notes', candy: 'candy', candies: 'candy', sweets: 'candy' };
/** "Everybody …!" → which spell lands on everyone */
const EVERY: [RegExp, string][] = [[/\bdanc(e|ing)\b/, 'dance'], [/\bsing(ing)?\b/, 'sing'], [/\b(jump|hop|bounce)\b/, 'hop'], [/\b(sleep|nap)\b/, 'nap'], [/\b(happy|smile|laugh)\b/, 'happy'], [/\b(fly|float)\b/, 'levitate'], [/\b(spin|turn around)\b/, 'spin'], [/\b(freeze)\b/, 'freeze'], [/\b(shake|wiggle)\b/, 'shake']];
export const SEASONS: Record<string, string> = { spring: 'spring', summer: 'summer', autumn: 'autumn', fall: 'autumn', winter: 'winter' };

/** What the wizard says (all pre-synthesised; {x} is filled with a thing name). */
export const W = {
  walk: ['Okay! Going to the {x}!', 'To the {x}! Let\'s go!'],
  walkUnknown: ['Hmm, where is that? Can you say it again?'],
  forward: ['Okay, walking forward!'],
  back: ['Okay, going back!'],
  come: ['Coming!'],
  stop: ['Okay, I\'m stopping!'],
  run: ['Run run run!'],
  walkSlow: ['Okay, nice and slow.'],
  jump: ['Hop! Wheee!'],
  turnLeft: ['Turning left!'],
  turnRight: ['Turning right!'],
  turnAround: ['Turning around!'],
  talk: ['Let\'s talk to the {x}!'],
  hello: ['Hello! Where shall we go? You can tell me to cast a spell, too!'],
  pick: ['Got it! I have the {x}.'],
  pickNone: ['What should I pick up?'],
  give: ['Here you are! This {x} is for you.'],
  giveNone: ['I\'m not holding anything.'],
  put: ['Okay! I put it there.'],
  drop: ['Okay, I put it down.'],
  eat: ['Yummy! Mmm, delicious!'],
  eatNone: ['What should I eat? Try: Make a cake!'],
  read: ['Let me read it!'],
  look: ['Ooh, look at the {x}!'],
  hit: ['Bonk!'],
  hitNone: ['Hit what? Hmm, let\'s be gentle!'],
  dance: ['Let\'s dance! La la la!'],
  wave: ['Hello! Hello!'],
  wake: ['Yawn... Good morning! I\'m awake!'],
  sleep: ['Zzz... just kidding! Let\'s play!'],
  broomOn: ['Up, up and away! I\'m flying on my broom!'],
  broomOff: ['Landing! Back on the ground.'],
  invisible: ['Abracadabra! Now you can\'t see me!'],
  visible: ['Ta-da! I\'m back!'],
  light: ['Light up! Abracadabra!'],
  dark: ['Lights out!'],
  open: ['Open sesame!'],
  close: ['Okay, I closed it.'],
  levitate: ['Up you go! Fly, {x}, fly!'],
  tint: ['Abracadabra! The {x} is {v} now!'],
  big: ['Grow, grow, grow! The {x} is big now!'],
  small: ['Shrink! The {x} is small now!'],
  conjure: ['Abracadabra! A {v}! Ta-da!'],
  conjureMany: ['Abracadabra! Look at all that yummy food!'],
  conjureFriends: ['Abracadabra! Look at all my new friends!'],
  growTree: ['Grow, little tree, grow!'],
  fruitRain: ['Fruit, fruit, fall down! {V}s everywhere!'],
  weather: ['Abracadabra! It\'s {v} now!'],
  season: ['Abracadabra! Now it\'s {v}!'],
  spin: ['Spin, spin, spin!'],
  heal: ['Feel better! A little magic for you!'],
  sparkle: ['Sparkle sparkle!'],
  goHome: ['Back to Spell Island!'],
  // magic v2 (no names inside, so every line is pre-recorded)
  thingDance: ['Dance, dance, dance! La la la!'],
  hop: ['Jump, jump! Boing, boing!'],
  shake: ['Shake, shake, shake!'],
  sing: ['Sing a song! La la la!'],
  nap: ['Shh... time to sleep.'],
  glow: ['Shine, shine, shine bright!'],
  freeze: ['Freeze! Brrr, now it\'s ice!'],
  melt: ['Melt, melt! Warm again!'],
  vanish: ['Poof! It\'s gone!'],
  appear: ['Ta-da! It\'s back!'],
  clone: ['Abracadabra! One, two, three! Look at them all!'],
  summon: ['Come here! Come to me!'],
  transform: ['Abracadabra! Look what it is now!'],
  restore: ['Back to normal! Ta-da!'],
  happy: ['Be happy! Smile!'],
  sad: ['Oh no, so sad!'],
  angry: ['Uh-oh, so angry!'],
  surprised: ['Wow! What a surprise!'],
  scurry: ['Go, go, go! Run around!'],
  giant: ['Grow, grow, GROW! Super big!'],
  tiny: ['Shrink, shrink! Super tiny!'],
  night: ['Abracadabra! Good night, moon! Hello, stars!'],
  day: ['Abracadabra! Good morning, sun!'],
  rainbow: ['Abracadabra! Look! A rainbow!'],
  fireworks: ['Fireworks! Boom! Wow!'],
  bubbles: ['Bubbles, bubbles everywhere!'],
  enter: ['Into the {x}! Let\'s go!'],
  // magic v3
  move: ['Whoosh! Move, move, move!'],
  cloudRide: ['Fluffy cloud, up you go!'],
  cloudMe: ['A magic cloud! Let\'s ride it! Whee!'],
  shower: ['Look up! It\'s raining {v}!'],
  butterflies: ['Butterflies, butterflies! So pretty!'],
  whirlwind: ['Whoosh! A big whirlwind!'],
  shootingStars: ['Look! Shooting stars! Make a wish!'],
  allDance: ['Everybody, dance! La la la!'], allSing: ['Everybody, sing!'], allHop: ['Everybody, jump! Boing, boing!'], allNap: ['Everybody, sleep. Shh...'],
  allHappy: ['Everybody, be happy!'], allLevitate: ['Everybody, fly! Whee!'], allSpin: ['Everybody, spin!'], allFreeze: ['Everybody, freeze!'], allShake: ['Everybody, shake!'],
  meBig: ['Grow, grow! I\'m a giant wizard!'], meSmall: ['Shrink, shrink! I\'m so tiny!'], meNormal: ['Back to my size! Ta-da!'],
  unclear: ['Hmm? Say it again?'],
  yay: ['Yay!'],
  thanks: ['You\'re welcome!'],
  praise: ['Thank you! You\'re a great wizard teacher!'],
};

/** what an enchanted friend says back (pre-recorded in every NPC voice) */
export const REACT: Record<string, string> = {
  dance: 'Wheee! I love dancing!', hop: 'Boing, boing! This is fun!', shake: 'Whoa, whoa! I\'m shaking!', nap: 'Yawn... I\'m so sleepy...',
  sing: 'La la la! I love singing!', glow: 'Wow! I\'m shining!', freeze: 'Brrr! I\'m so cold!', melt: 'Ahh, I\'m warm again! Thank you!',
  big: 'Wow! I\'m so big now!', small: 'Whoa! I\'m so small now!', tint: 'Wow! Look at my new colour!', summon: 'Here I am!',
  happy: 'Yay! I\'m so happy!', sad: 'Boo hoo... I\'m sad.', angry: 'Grr! I\'m angry!', surprised: 'Oh! What a surprise!',
  scurry: 'Wheee! Catch me if you can!', restore: 'Phew! I\'m me again!', appear: 'Here I am again!', fly: 'Whoa! I\'m flying! Put me down, please!',
  cloud: 'Wheee! I\'m on a cloud!', move: 'Whoa! Where am I going?',
};

export function fillW(tpl: string, x = '', v = ''): string {
  // names ("Tom", "Uncle Bob", "Rainbow Zoo") don't take "the"
  if (/^[A-Z]/.test(x)) tpl = tpl.replace(/\b([Tt])he \{x\}/g, (_m, t) => (t === 'T' ? '{X}' : '{x}'));
  if (/^[aeiou]/i.test(v)) tpl = tpl.replace(/\bA \{v\}/g, 'An {v}').replace(/\ba \{v\}/g, 'an {v}');
  return tpl.replace(/\{X\}/g, x).replace(/\{x\}/g, x).replace(/\{v\}/g, v).replace(/\{V\}/g, v ? v[0].toUpperCase() + v.slice(1) : v);
}

// ---------- target resolution ----------

const STOP = new Set(['the', 'a', 'an', 'to', 'go', 'lets', 'please', 'one', 'that', 'this', 'there', 'is', 'are', 'it', 'and', 'with', 'of', 'at', 'on', 'in', 'milo', 'big', 'small', 'make', 'fly', 'up', 'little']);

export interface Resolved { thing: PerceivedThing; score: number; said?: string }

export function resolveTarget(lem: string[], things: PerceivedThing[], exclude?: string): Resolved | null {
  let best: Resolved | null = null;
  for (const th of things) {
    if (th.id === exclude) continue;
    let score = 0;
    let said: string | undefined;
    const nameL = lemmas(th.name);
    if (nameL.length && isSubsequence(nameL, lem, true)) score = 6 + nameL.length;
    else {
      for (const al of th.aliases) {
        const aL = lemmas(al);
        if (aL.length && isSubsequence(aL, lem, true) && 5 + aL.length > score) { score = 5 + aL.length; said = al; }
      }
      if (score === 0) {
        const noun = nameL[nameL.length - 1];
        if (noun && !STOP.has(noun) && lem.includes(noun)) score = 3;
      }
    }
    if (score === 0) continue;
    for (const tg of th.tags) if (lem.includes(lemmas(tg)[0])) score += 1;
    if (th.color && lem.includes(th.color)) score += 2;
    if (!best || score > best.score || (score === best.score && th.distance < best.thing.distance)) best = { thing: th, score, said };
  }
  return best && best.score >= 3 ? best : null;
}

function findFood(n: string): string | null {
  let best: string | null = null;
  let at = -1;
  for (const f of FOODS) {
    const re = new RegExp(`\\b${f}(e?s)?\\b`);
    const m = n.match(re);
    if (m && (m.index ?? 0) >= at) { best = f; at = m.index ?? 0; }
  }
  return best;
}

const out = (actions: BrainAction[], say: string, extra: Partial<BrainOutput> = {}): BrainOutput => ({ actions, say, understood: true, source: 'rules', ...extra });
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const art = (w: string) => (/^(a|an|the|some)\b/.test(w) || /s$/.test(w) && !/ss$/.test(w) ? w : (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w);
const SAME_PLURAL = new Set(['sheep', 'fish', 'deer', 'grapes', 'drums', 'sunglasses', 'rain boots', 'flowers']);
export function plural(w: string): string {
  if (SAME_PLURAL.has(w) || /s$/.test(w)) return w;
  if (/(ch|sh|x)$/.test(w)) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  if (/(potato|tomato|mango)$/.test(w)) return w + 'es';
  if (/(leaf|knife)$/.test(w)) return w.replace(/f(e)?$/, 'ves');
  return w + 's';
}

/** what a thing can be turned into: animals and treats (model keys) */
export const SHAPES: Record<string, string> = {
  pig: 'pig', cat: 'cat', dog: 'dog', duck: 'duck', rabbit: 'rabbit', bunny: 'rabbit', frog: 'frog', panda: 'panda', monkey: 'monkey', elephant: 'baby_elephant',
  tiger: 'tiger', bear: 'brown_bear', sheep: 'sheep', horse: 'horse', pony: 'horse', dragon: 'baby_dragon', penguin: 'penguin', snowman: 'snowman', pumpkin: 'pumpkin',
  fish: 'fish', bird: 'parrot', parrot: 'parrot', owl: 'owl', squirrel: 'squirrel', swan: 'swan', deer: 'deer', lion: 'lion', giraffe: 'giraffe', zebra: 'zebra',
  ball: 'beach_ball', balloon: 'hot_air_balloon',
};
const SHAPE_WORDS = [...Object.keys(SHAPES), ...FOODS];
function findShape(after: string): string | null {
  const n = ' ' + normalize(after) + ' ';
  let best: string | null = null, at = 1e9;
  for (const w of SHAPE_WORDS) { const m = n.match(new RegExp(`\\b${w}(e?s)?\\b`)); if (m && (m.index ?? 0) < at) { at = m.index ?? 0; best = w; } }
  return best;
}
/** an animal word in what was said (not food): "make three ducks" when there is no duck here */
function findAnimal(n: string): string | null {
  for (const w of Object.keys(SHAPES)) if (!['ball', 'balloon', 'pumpkin', 'snowman'].includes(w) && new RegExp(`\\b${w}(e?s)?\\b`).test(n)) return w;
  return null;
}
const COUNT: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, more: 3, many: 4, lots: 5, double: 2, another: 2 };

/** Parse one utterance. */
/** The English a child could say for an action — shown when they spoke Chinese. */
export function teachFor(a: BrainAction, things: PerceivedThing[]): string | null {
  const nm = (id?: string) => { const t = things.find((x) => x.id === id); return t ? (t.kind === 'npc' && /^[A-Z]/.test(t.name) ? t.name : 'the ' + t.name) : 'it'; };
  switch (a.type) {
    case 'walk_to': return `Go to ${nm(a.target)}!`;
    case 'talk_to': return `Talk to ${nm(a.target)}!`;
    case 'levitate': return `Make ${nm(a.target)} fly!`;
    case 'tint': return `Make ${nm(a.target)} ${a.value}!`;
    case 'grow_size': return `Make ${nm(a.target)} ${a.value === 'giant' ? 'giant' : 'big'}!`;
    case 'shrink': return `Make ${nm(a.target)} ${a.value === 'tiny' ? 'tiny' : 'small'}!`;
    case 'light': return `Light ${nm(a.target)}!`;
    case 'dark': return `Turn off ${nm(a.target)}!`;
    case 'open': return `Open ${nm(a.target)}!`;
    case 'close': return `Close ${nm(a.target)}!`;
    case 'spin': return `Make ${nm(a.target)} spin!`;
    case 'heal': return a.target ? `Heal ${nm(a.target).replace(/^the /, '')}!` : 'Heal!';
    case 'hit': return `Hit ${nm(a.target)}!`;
    case 'pick_up': return `Pick up ${nm(a.target)}!`;
    case 'give': return `Give ${a.target ? nm(a.target) : 'the ' + (a.value || 'gift')} to ${nm(a.target2)}!`;
    case 'put': return `Put ${nm(a.target)} ${a.value || 'on'} ${nm(a.target2)}!`;
    case 'read': return `Read ${nm(a.target)}!`;
    case 'look_at': return `Look at ${nm(a.target)}!`;
    case 'enter': return `Go to ${things.find((x) => x.id === a.target)?.name || 'the portal'}!`;
    case 'conjure': return `Make ${/^[aeiou]/.test(a.value || '') ? 'an' : 'a'} ${a.value}!`;
    case 'eat': return 'Eat it!';
    case 'grow_tree': return a.value === 'flower' ? 'Grow a flower!' : 'Grow a tree!';
    case 'fruit_rain': return `Make it rain ${a.value === 'grapes' ? 'grapes' : (a.value || 'apple') + 's'}!`;
    case 'weather': return `Make it ${a.value}!`;
    case 'season': return `Make it ${a.value}!`;
    case 'broom_on': return a.value === 'cloud' ? 'Ride a cloud!' : 'Fly on your broom!';
    case 'broom_off': return 'Land!';
    case 'invisible': return 'Be invisible!';
    case 'visible': return 'Come back!';
    case 'jump': return 'Jump!';
    case 'run': return 'Run!';
    case 'stop': return 'Stop!';
    case 'forward': return 'Go forward!';
    case 'back': return 'Go back!';
    case 'turn_left': return 'Turn left!';
    case 'turn_right': return 'Turn right!';
    case 'turn_around': return 'Turn around!';
    case 'come': return 'Come here!';
    case 'dance': return a.target ? `Make ${nm(a.target)} dance!` : 'Dance!';
    case 'wave': return 'Say hello!';
    case 'wake': return 'Wake up!';
    case 'sleep': return 'Go to sleep!';
    case 'go_home': return 'Go home!';
    case 'sparkle': return 'Abracadabra!';
    case 'hop': return `Make ${nm(a.target)} jump!`;
    case 'shake': return `Make ${nm(a.target)} shake!`;
    case 'nap': return `Make ${nm(a.target)} sleep!`;
    case 'sing': return `Make ${nm(a.target)} sing!`;
    case 'glow': return `Make ${nm(a.target)} glow!`;
    case 'freeze': return `Freeze ${nm(a.target)}!`;
    case 'melt': return `Melt ${nm(a.target)}!`;
    case 'vanish': return `Make ${nm(a.target)} disappear!`;
    case 'appear': return a.target ? `Make ${nm(a.target)} appear!` : 'Come back!';
    case 'clone': return `Make ${a.count && a.count > 1 && a.count < 6 ? ['', '', 'two', 'three', 'four', 'five'][a.count] : 'more'} ${plural(things.find((x) => x.id === a.target)?.name || 'thing')}!`;
    case 'summon': return `Come here, ${nm(a.target).replace(/^the /, '')}!`;
    case 'transform': return `Turn ${nm(a.target)} into ${art(a.value || 'cake')}!`;
    case 'restore': return `Turn ${nm(a.target)} back!`;
    case 'emote': return `Make ${nm(a.target)} ${a.value || 'happy'}!`;
    case 'scurry': return `Make ${nm(a.target)} run!`;
    case 'night': return 'Make it night!';
    case 'day': return 'Make it day!';
    case 'rainbow': return 'Make a rainbow!';
    case 'fireworks': return 'Fireworks!';
    case 'bubbles': return 'Make bubbles!';
    case 'move': return `Move ${nm(a.target)} ${a.value === 'left' || a.value === 'right' ? 'to the ' + a.value : a.value || 'left'}!`;
    case 'cloud_ride': return `Put ${nm(a.target)} on a cloud!`;
    case 'shower': return `Make it rain ${a.value || 'stars'}!`;
    case 'butterflies': return 'Make butterflies!';
    case 'whirlwind': return 'Make a whirlwind!';
    case 'shooting_stars': return 'Shooting stars!';
    case 'everyone': return `Everybody, ${({ hop: 'jump', nap: 'sleep', levitate: 'fly', happy: 'be happy' } as Record<string, string>)[a.value || ''] || a.value || 'dance'}!`;
    case 'hero_size': return a.value === 'small' ? 'Make me small!' : a.value === 'normal' ? 'Make me normal!' : 'Make me big!';
    default: return null;
  }
}

/** One English sentence for a list of actions: "Jump and hit the monkey!" */
export function teachLine(actions: BrainAction[], things: PerceivedThing[]): string | null {
  const t = actions.map((a) => teachFor(a, things)).filter(Boolean) as string[];
  if (!t.length) return null;
  return t.slice(0, 3).join(' ').replace(/! (\w)/g, (_, c) => ', then ' + c.toLowerCase()).replace(/^(.*), then (.*)$/, '$1 and $2');
}

/** Compound commands: "jump and hit the zookeeper", "make a cake, then eat it", "跳起来然后打一下猴子". */
export function ruleBrain(input: string, ctx: BrainContext): BrainOutput {
  const raw = (input || '').trim();
  const zh = hasCJK(raw);
  const callOver = /^[\w ]+,\s*(come here|come to me|come)\b/i.test(raw);
  const parts = callOver ? [raw] : raw.split(zh ? /\s*(?:然后|再|接着|之后|并且|，|,|。|；)\s*/ : /\s*(?:,|;|\band then\b|\bthen\b|\band\b)\s*/i).map((x) => x.trim()).filter(Boolean);
  let out: BrainOutput | null = null;
  if (parts.length >= 2 && parts.length <= 4) {
    const acts: BrainAction[] = [], says: string[] = [];
    let last = ctx.lastTarget, ok = true;
    for (const p of parts) {
      const o = ruleBrainOne(p, { ...ctx, lastTarget: last });
      if (!o.understood || !o.actions.length) { ok = false; break; }
      acts.push(...o.actions);
      if (o.say && !says.includes(o.say)) says.push(o.say);
      last = o.actions.map((a) => a.target).filter(Boolean).pop() || last;
    }
    if (ok) out = { actions: acts.slice(0, 4), say: says.slice(0, 2).join(' '), understood: true, source: 'rules' };
  }
  if (!out) out = ruleBrainOne(raw, ctx);
  if (zh && out.understood && out.actions.length && !out.teach) out.teach = teachLine(out.actions, ctx.things) || undefined;
  return out;
}

function ruleBrainOne(input: string, ctx: BrainContext): BrainOutput {
  let raw = (input || '').trim();
  const zh = hasCJK(raw);
  if (zh) {
    // Chinese names of the things in this world first ("饲养员" → zookeeper), longest first
    for (const t of [...ctx.things].filter((x) => x.zh).sort((a, b) => b.zh!.length - a.zh!.length)) {
      for (const z of t.zh!.split(/[（(]/)[0].split(/[、\/]/)) if (z && raw.includes(z)) raw = raw.split(z).join(` ${t.name} `);
    }
  }
  const text = zh ? zhToEnglishKeywords(raw) : raw;
  const n = ' ' + normalize(text) + ' ';
  const lem = lemmas(text);
  const has = (re: RegExp) => re.test(n);
  const things = ctx.things;
  const tgt = resolveTarget(lem, things);
  const it = tgt?.thing || (has(/\b(it|them|him|her)\b/) && ctx.lastTarget ? things.find((t) => t.id === ctx.lastTarget) : undefined);
  const nm = (t?: PerceivedThing) => (t ? t.name : '');
  const col = findColor(lem);
  const food = findFood(n);
  if (lem.length === 0) return { actions: [], say: '', understood: false, source: 'rules' };

  // --- stop / basic movement first: they must always work instantly ---
  if (has(/\b(stop|freeze|halt|stand still|do not move|hold on)\b/) && !has(/\b(stop flying)\b/) && !((tgt || has(/\b(everybody|everyone)\b/)) && has(/\bfreeze\b/))) return out([{ type: 'stop' }], W.stop[0]);
  if (has(/\b(wake up|get up|good morning|rise and shine)\b/)) return out([{ type: 'wake' }], W.wake[0]);

  // --- magic v3: spells on everyone, Milo's size, clouds, moving things, sky shows ---
  if (has(/\b(everybody|everyone|all of you|all the (animals|friends|people|things))\b/)) {
    const hit = EVERY.find(([re]) => re.test(n));
    const colEvery = !hit && col && has(/\b(make|turn|be)\b/);
    if (hit) return out([{ type: 'everyone', value: hit[1] }], (W as any)['all' + cap(hit[1])][0]);
    if (colEvery) return out([{ type: 'everyone', value: col! }], 'Abracadabra! Look at all the colours!');
  }
  if (!tgt && has(/\b(me|milo|yourself)\b/) && has(/\b(make|turn|be|get|grow)\b/)) {
    if (has(/\b(big|bigger|giant|huge|tall|grow)\b/)) return out([{ type: 'hero_size', value: 'big' }], W.meBig[0]);
    if (has(/\b(small|smaller|tiny|little|short)\b/)) return out([{ type: 'hero_size', value: 'small' }], W.meSmall[0]);
    if (has(/\b(normal|back)\b/)) return out([{ type: 'hero_size', value: 'normal' }], W.meNormal[0]);
  }
  if (has(/\bclouds?\b/) && !has(/\bcloudy\b/)) {
    if (it && it.kind !== 'portal' && has(/\b(put|on|ride|lift|carry|take|make|give)\b/)) return out([{ type: 'cloud_ride', target: it.id }], W.cloudRide[0]);
    if (!it && has(/\b(make|ride|magic|come|call|i want|give me|get on|jump on)\b/)) return out([{ type: 'broom_on', value: 'cloud' }], W.cloudMe[0]);
  }
  // (a lost first word — "Leave the tower to the left" — still means moving it)
  if (it && it.kind !== 'portal' && (has(/\b(move|push|slide|shift)\b|\bput .+ on the (left|right)\b/) || (has(/\bto the (left|right)\b/) && !has(/\b(go|walk|run|turn|fly|come)\b/)))) {
    const dir = has(/\bleft\b/) ? 'left' : has(/\bright\b/) ? 'right' : has(/\b(back|backward|closer)\b/) ? 'back' : has(/\b(forward|away|ahead)\b/) ? 'forward' : (it.distance * 10) % 2 > 1 ? 'left' : 'right';
    return out([{ type: 'move', target: it.id, value: dir }], W.move[0]);
  }
  {
    const sw = Object.keys(SHOWERS).find((k) => new RegExp(`\\b${k}\\b`).test(n));
    if (sw && has(/\b(rain|snow|fall|shower|drop|come down)\b/) && !(sw === 'leaves' && it && has(/\bfly\b/))) return out([{ type: 'shower', value: SHOWERS[sw] }], fillW(W.shower[0], '', SHOWERS[sw]));
  }
  if (has(/\bbutterfl(y|ies)\b/)) return out([{ type: 'butterflies' }], W.butterflies[0]);
  if (has(/\b(whirlwind|tornado|twister|whirl wind)\b/)) return out([{ type: 'whirlwind' }], W.whirlwind[0]);
  if (has(/\b(shooting stars?|falling stars?|make a wish)\b/)) return out([{ type: 'shooting_stars' }], W.shootingStars[0]);
  if (has(/\b(thunder|lightning)\b/) && !tgt) return out([{ type: 'weather', value: 'stormy' }], fillW(W.weather[0], '', 'stormy'));

  // --- magic v2: sky (no target needed) ---
  if (!tgt && has(/\b(night|nighttime|moon|good night)\b/) && (has(/\b(make|let|it is|turn|magic|i want|time|good night)\b/))) return out([{ type: 'night' }], W.night[0]);
  if (!tgt && has(/\b(day|daytime|daylight|sunrise)\b/) && has(/\b(make|let|it is|turn|magic|i want|time)\b/)) return out([{ type: 'day' }], W.day[0]);
  if (!tgt && has(/\brainbow\b/)) return out([{ type: 'rainbow' }], W.rainbow[0]);
  if (has(/\bfireworks?\b/)) return out([{ type: 'fireworks' }], W.fireworks[0]);
  if (has(/\bbubbles?\b/) && !tgt) return out([{ type: 'bubbles' }], W.bubbles[0]);

  // --- magic v2: turn X into Y / back ---
  if (it && has(/\b(turn|change|make)\b/) && has(/\b(back|normal|undo)\b/)) return out([{ type: 'restore', target: it.id }], W.restore[0]);
  if (has(/\b(into|become|to be)\b/) && has(/\b(turn|change|make|magic)\b/)) {
    const [before, after] = n.split(/\b(?:into|become|to be)\b/);
    const x = resolveTarget(lemmas(before), things)?.thing || it;
    const y = x ? findShape(' ' + after.replace(new RegExp(`\\b${normalize(x.name)}\\b`, 'g'), ' ')) : null;
    const colAfter = findColor(lemmas(after));
    // "turn it into orange" is a colour; "turn the orange box into a cake" is a new shape
    if (x && y && y !== colAfter && x.kind !== 'portal') return out([{ type: 'transform', target: x.id, value: y }], W.transform[0]);
  }

  // --- magic v2: more of a thing ---
  {
    const cw = Object.keys(COUNT).find((k) => new RegExp(`\\b${k}\\b`).test(n));
    if (cw && it && !food && has(/\b(make|magic|i want|give me|copy|create|lots)\b/) && it.kind !== 'portal') return out([{ type: 'clone', target: it.id, count: Math.min(5, COUNT[cw]) }], W.clone[0]);
    if (cw && food && has(/\b(make|magic|i want|give me|create|lots)\b/) && !has(/\b(rain|drop|fall)\b/)) return out([{ type: 'conjure', value: food, count: Math.min(5, COUNT[cw]) }], W.conjureMany[0]);
    // an animal that isn't here: conjure real ones (not stand-ins)
    const animal = !it && !food ? findAnimal(n) : null;
    if (animal && has(/\b(make|magic|conjure|create|give me|i want|bring)\b/)) {
      const k = cw ? Math.min(5, COUNT[cw]) : 1;
      return out([{ type: 'conjure', value: animal, ...(k > 1 ? { count: k } : {}) }], k > 1 ? W.conjureFriends[0] : fillW(W.conjure[0], '', animal));
    }
  }

  // "make the pig a duck" = turn it into one
  if (it && it.kind !== 'portal' && has(/\b(make|turn)\b/) && !has(/\b(two|three|four|five|more|many)\b/)) {
    const y = findAnimal(n.replace(new RegExp(`\\b${normalize(it.name)}\\b`, 'g'), ' '));
    if (y && !lemmas(it.name).includes(y)) return out([{ type: 'transform', target: it.id, value: y }], W.transform[0]);
  }

  // --- magic v2: things come alive (need a target) ---
  if (it && has(/\bdanc(e|ing)\b/)) return out([{ type: 'dance', target: it.id }], W.thingDance[0]);
  if (it && has(/\bsing(ing)?\b|\bsong\b/)) return out([{ type: 'sing', target: it.id }], W.sing[0]);
  if (it && has(/\b(jump|hop|bounce|jumping)\b/) && it.kind !== 'portal') return out([{ type: 'hop', target: it.id }], W.hop[0]);
  if (it && has(/\b(shake|wiggle|wobble|shiver)\b/)) return out([{ type: 'shake', target: it.id }], W.shake[0]);
  if (it && has(/\b(sleep|nap|sleepy|go to bed)\b/) && !has(/\bwake\b/)) return out([{ type: 'nap', target: it.id }], W.nap[0]);
  if (it && has(/\b(melt|unfreeze|warm up)\b/)) return out([{ type: 'melt', target: it.id }], W.melt[0]);
  if (it && has(/\b(freeze|frozen|icy|ice)\b/) && !has(/\bice cream\b/)) return out([{ type: 'freeze', target: it.id }], W.freeze[0]);
  if (it && has(/\b(disappear|vanish|go away|invisible|hide)\b/)) return out([{ type: 'vanish', target: it.id }], W.vanish[0]);
  if (it && has(/\b(appear|come back|visible|show)\b/) && !has(/\bshow me\b/)) return out([{ type: 'appear', target: it.id }], W.appear[0]);
  if (it && it.kind !== 'portal' && has(/\b(come here|come to me|come|follow me|over here)\b/) && !has(/\b(go to|lets go|walk to|take me)\b/)) return out([{ type: 'summon', target: it.id }], W.summon[0]);
  if (it && has(/\b(make|let)\b/) && has(/\b(run|run around|walk around|go around|race)\b/)) return out([{ type: 'scurry', target: it.id }], W.scurry[0]);
  if (it && has(/\b(make|let|be)\b/)) {
    const emo = has(/\b(happy|smile|laugh|glad)\b/) ? 'happy' : has(/\b(sad|cry)\b/) ? 'sad' : has(/\b(angry|mad)\b/) ? 'angry' : has(/\b(surprised|amazed)\b/) ? 'surprised' : null;
    if (emo) return out([{ type: 'emote', target: it.id, value: emo }], (W as any)[emo][0]);
  }

  // guiding someone: the NPC follows by itself, so just wave them along
  if (has(/\b(follow me|come with me|this way|come on|lets go)\b/) && !tgt) return out([{ type: 'wave' }], 'This way! Follow me!');

  // --- broom & invisibility ---
  if (has(/\b(land|get down|stop flying|come down|get off)\b/)) return out([{ type: 'broom_off' }], W.broomOff[0]);
  if (has(/\b(broom|take off)\b/) || (has(/\bfly\b/) && !it && !has(/\bmake\b/) && !has(/\b(let|make) (the |a )?\w+ fly\b/))) return out([{ type: 'broom_on' }], W.broomOn[0]);
  if (has(/\b(invisible|disappear|vanish|hide yourself|you can not see me)\b/)) return out([{ type: 'invisible' }], W.invisible[0]);
  if (has(/\b(appear|visible|come back out|show yourself)\b/)) return out([{ type: 'visible' }], W.visible[0]);

  // --- magic on things ---
  if (has(/\b(light|lumos|turn on|switch on|make it bright|bright)\b/) && (it?.can.includes('light') || !it)) {
    const t = it || things.filter((x) => x.can.includes('light')).sort((a, b) => a.distance - b.distance)[0];
    if (t) return out([{ type: 'light', target: t.id }], W.light[0]);
  }
  if (has(/\b(turn off|switch off|put out|dark)\b/) && it) return out([{ type: 'dark', target: it.id }], W.dark[0]);
  if (it && has(/\b(glow|shine|shiny|sparkle|sparkly|bright|twinkle)\b/)) return out([{ type: 'glow', target: it.id }], W.glow[0]);
  if (has(/\b(open|unlock|open sesame)\b/)) {
    const t = it || things.filter((x) => x.can.includes('open')).sort((a, b) => a.distance - b.distance)[0];
    if (t) return out([{ type: 'open', target: t.id }], W.open[0]);
  }
  if (has(/\bclose|shut\b/) && it) return out([{ type: 'close', target: it.id }], W.close[0]);
  if (it && has(/\b(fly|float|levitate|up up|go up|in the air|wingardium)\b/)) return out([{ type: 'levitate', target: it.id }], W.levitate[0].replace('{x}', nm(it)));
  if (it && col && (has(/\b(make|turn|paint|color|colour|change|be)\b/) || lem.length <= 3)) return out([{ type: 'tint', target: it.id, value: col }], fillW(W.tint[0], nm(it), col));
  if (it && has(/\b(giant|huge|very big|super big|enormous)\b/)) return out([{ type: 'grow_size', target: it.id, value: 'giant' }], W.giant[0]);
  if (it && has(/\b(tiny|very small|super small)\b/)) return out([{ type: 'shrink', target: it.id, value: 'tiny' }], W.tiny[0]);
  if (it && has(/\b(big|bigger|grow|large)\b/) && !has(/\btree\b/)) return out([{ type: 'grow_size', target: it.id }], fillW(W.big[0], nm(it)));
  if (it && has(/\b(small|smaller|little|shrink)\b/)) return out([{ type: 'shrink', target: it.id }], fillW(W.small[0], nm(it)));
  if (it && has(/\b(spin|turn around|roll)\b/) && has(/\bmake\b/)) return out([{ type: 'spin', target: it.id }], W.spin[0]);
  if (has(/\b(heal|cure|feel better|potion)\b/)) return out([{ type: 'heal', target: it?.id }], W.heal[0]);

  // a tree that drops fruit: "grow a tree with durians"
  if (has(/\b(grow|plant)\b/) && has(/\btree\b/) && food && FRUITS.includes(food)) return out([{ type: 'grow_tree', value: 'tree' }, { type: 'fruit_rain', value: food }], W.growTree[0]);
  // fruit rain must win over plain rain: "make it rain apples"
  if (food && FRUITS.includes(food) && has(/\b(drop|fall|rain|shake|throw|come down|give me lots)\b/)) return out([{ type: 'fruit_rain', value: food }], fillW(W.fruitRain[0], '', food));
  // weather & seasons
  const wk = Object.keys(WEATHERS).find((k) => new RegExp(`\\b${k}\\b`).test(n));
  if (wk && has(/\b(make|let|it is|its|turn|weather|magic|i want)\b/)) return out([{ type: 'weather', value: WEATHERS[wk] }], fillW(W.weather[0], '', WEATHERS[wk]));
  const sk = Object.keys(SEASONS).find((k) => new RegExp(`\\b${k}\\b`).test(n));
  if (sk && has(/\b(make|let|it is|its|turn|change|magic|i want|bring)\b/)) return out([{ type: 'season', value: SEASONS[sk] }], fillW(W.season[0], '', SEASONS[sk]));

  // trees & fruit
  if (has(/\b(grow|plant)\b/) && has(/\b(tree|flower|plant)\b/)) return out([{ type: 'grow_tree', value: has(/\bflower/) ? 'flower' : 'tree' }], W.growTree[0]);

  // conjure / eat
  if (has(/\beat\b/) && !food && !it) return out([{ type: 'eat' }], W.eat[0]);
  if (food && has(/\b(make|magic|conjure|create|give me|i want|i would like|can i have|some|appear)\b/)) {
    const acts: BrainAction[] = [{ type: 'conjure', value: food }];
    if (has(/\beat\b/)) acts.push({ type: 'eat' });
    return out(acts, fillW(W.conjure[0], '', food));
  }
  if (has(/\beat\b/)) return out([{ type: 'eat', target: it?.id, value: food || undefined }], W.eat[0]);
  if (has(/\b(sparkle|magic|abracadabra|spell)\b/) && !it) return out([{ type: 'sparkle' }], W.sparkle[0]);

  // --- items ---
  if (has(/\b(give|hand|pass)\b/)) {
    // "give the umbrella to the girl" / "give it to her" / "give her the umbrella"
    const to = n.match(/\bto (the )?([a-z ]+?) ?$/);
    const recv = to ? resolveTarget(lemmas(to[2]), things.filter((t) => t.kind === 'npc')) : resolveTarget(lem, things.filter((t) => t.kind === 'npc'));
    const item = resolveTarget(lem, things.filter((t) => t.kind !== 'npc'), recv?.thing.id);
    const what = item?.thing.id || (food ? undefined : ctx.holding) || undefined;
    if (!what && food) return out([{ type: 'give', value: food, target2: recv?.thing.id }], fillW(W.give[0], food));
    if (!what) return out([], W.giveNone[0]);
    return out([{ type: 'give', target: what, target2: recv?.thing.id }], fillW(W.give[0], item?.thing.name || 'gift'));
  }
  if (has(/\b(put|place|leave)\b/)) {
    const prep = (n.match(/\b(on|in|under|behind|next to|near|into|onto)\b/) || [])[1] || 'on';
    const after = n.split(new RegExp(`\\b${prep}\\b`)).slice(-1)[0];
    const dest = resolveTarget(lemmas(after), things);
    const item = resolveTarget(lemmas(n.split(new RegExp(`\\b${prep}\\b`))[0]), things.filter((t) => t.id !== dest?.thing.id));
    const what = item?.thing.id || ctx.holding || undefined;
    if (what && dest) return out([{ type: 'put', target: what, target2: dest.thing.id, value: prep === 'into' ? 'in' : prep === 'onto' ? 'on' : prep }], W.put[0]);
    if (what) return out([{ type: 'drop', target: what }], W.drop[0]);
  }
  if (has(/\b(pick up|pick it up|take|grab|get|carry|hold)\b/)) {
    if (it) return out([{ type: 'pick_up', target: it.id }], fillW(W.pick[0], nm(it)));
    return out([], W.pickNone[0]);
  }
  if (has(/\b(drop|put down|let go)\b/)) return out([{ type: 'drop', target: ctx.holding || undefined }], W.drop[0]);
  if (has(/\b(hit|bonk|tap|poke|attack|fight|strike|beat|smack|punch|kick|whack)\b/)) {
    if (it) return out([{ type: 'hit', target: it.id }], W.hit[0]);
    return out([], W.hitNone[0]);
  }
  if (it && has(/\b(read|what does it say)\b/)) return out([{ type: 'read', target: it.id }], W.read[0]);

  // --- going places ---
  if (has(/\b(go home|back to the island|spell island|go back home)\b/)) return out([{ type: 'go_home' }], W.goHome[0]);
  if (it && it.kind === 'portal' && has(/\b(go|enter|open|visit|lets|take me|jump in|into)\b/)) return out([{ type: 'enter', target: it.id }], fillW(W.enter[0], nm(it)));
  if (it && it.kind === 'npc' && has(/\b(hello|hi|hey|talk|say|ask|speak|greet|meet|chat)\b/)) return out([{ type: 'talk_to', target: it.id }], fillW(W.talk[0], nm(it)));
  if (has(/\b(run|hurry|quick|faster|fast)\b/)) {
    const acts: BrainAction[] = [{ type: 'run' }];
    if (it) acts.push({ type: 'walk_to', target: it.id });
    return out(acts, W.run[0]);
  }
  if (has(/\b(slow|slowly|walk)\b/) && !it && !has(/\b(forward|ahead|straight|on|go)\b/)) return out([{ type: 'walk' }], W.walkSlow[0]);
  if (has(/\bjump\b/)) return out([{ type: 'jump' }], W.jump[0]);
  if (has(/\bturn around\b/)) return out([{ type: 'turn_around' }], W.turnAround[0]);
  if (has(/\b(turn )?left\b/) && (has(/\bturn\b/) || lem.length <= 4)) return out([{ type: 'turn_left' }], W.turnLeft[0]);
  if (has(/\b(turn )?right\b/) && !has(/\b(all right|right now|that is right|you are right)\b/) && (has(/\bturn\b/) || lem.length <= 4)) return out([{ type: 'turn_right' }], W.turnRight[0]);
  if (has(/\b(come here|come back|come to me)\b/)) return out([{ type: 'come' }], W.come[0]);
  if (has(/\b(go back|back up|backward|backwards)\b/)) return out([{ type: 'back' }], W.back[0]);
  if (it && has(/\b(look at|look|see)\b/) && !has(/\b(go|walk)\b/)) return out([{ type: 'look_at', target: it.id }], fillW(W.look[0], nm(it)));
  if (it) return out([{ type: 'walk_to', target: it.id }], fillW(W.walk[it.distance % 2 > 1 ? 1 : 0], tgt?.said || nm(it)));
  if (has(/\b(go|walk|move|forward|straight|ahead|keep going|go on)\b/)) return out([{ type: 'forward' }], W.forward[0]);
  if (has(/\bdance\b/)) return out([{ type: 'dance' }], W.dance[0]);
  if (has(/\b(wave|hello|hi|hey)\b/)) return out([{ type: 'wave' }], W.hello[0]);
  if (has(/\b(sleep|go to bed)\b/)) return out([{ type: 'sleep' }], W.sleep[0]);
  if (has(/\b(thank you|thanks)\b/)) return out([], W.thanks[0]);
  if (has(/\b(good job|well done|great|awesome|cool|nice|good boy)\b/)) return out([{ type: 'wave' }], W.praise[0]);
  return { actions: [], say: '', understood: false, source: 'rules' };
}

/** Every fixed line the wizard can say, for pre-synthesis (names are filled in by the tool). */
export function wizardTemplates(): string[] {
  return Object.values(W).flat();
}
