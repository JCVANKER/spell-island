// Shared types between the web client, the server and the tools.

export type Vec3 = [number, number, number];

/** A thing in a lesson world: prop, animal, building, NPC... Everything can be talked about and enchanted. */
export interface ThingDef {
  id: string;
  name: string; // English name used for speech ("pig", "red apple", "museum")
  zh?: string;
  aliases?: string[];
  tags?: string[]; // adjectives: big, yellow, old...
  color?: string;
  model: string; // model key (GLB id or procedural)
  pos: Vec3;
  rot?: number;
  scale?: number;
  radius?: number; // obstacle radius (0 = walk-through)
  label?: boolean;
  /** what it can do / what magic does to it */
  can?: Array<'light' | 'open' | 'fly' | 'pick' | 'eat' | 'sit' | 'read' | 'grow' | 'ride'>;
  /** text written on it (signs, books, posters) – reading tasks */
  text?: string;
  /** spoken when the hero bonks it */
  ouch?: string;
  /** a few lines it says now and then when the wizard walks by (key sentences of the lesson) */
  chatter?: string[];
  /** secrets: `reveal` ids appear when `revealOn` happens to this thing (e.g. 'open', 'light', 'big', 'tint', 'fly', 'dance', 'any') */
  reveal?: string[];
  revealOn?: string;
  params?: Record<string, any>;
  hidden?: boolean;
}

export interface NpcDef extends ThingDef {
  voice: string; // voice role (see voices.ts)
  persona: string; // for the LLM
  greet: string; // first line when you talk to them (no open quest)
  knows?: string[]; // facts the NPC may use in free chat
  idle?: string[]; // things they say when you talk again
}

export type QuestKind = 'speak' | 'listen' | 'read' | 'write' | 'choose' | 'magic' | 'do' | 'guide';
export type Skill = '听' | '说' | '读' | '写';

/** Words that must appear: every group needs at least one of its words. */
export type AcceptGroups = string[][];

export interface QuestDef {
  id: string;
  kind: QuestKind;
  skill: Skill;
  title: string; // short English title
  titleZh: string; // what to do, in Chinese (shown in the quest log)
  giver: string; // npc / thing id
  /** lines the giver says when the quest starts */
  intro: string[];
  /** the question / prompt (spoken for speak/listen, shown for read/write/choose) */
  prompt?: string;
  /** listen: the audio the child must listen to (spoken by `audioVoice`, mic closed) */
  audio?: string;
  audioVoice?: string;
  /** read: the text shown on a sign / book / poster card */
  passage?: string;
  /** choose / listen / read: options (A, B, C...) and the right index */
  options?: string[];
  answer?: number;
  /** speak / write: what counts as right */
  accept?: AcceptGroups;
  /** speak / write: an open answer judged by the LLM when the rules don't match (e.g. "Why?") */
  judge?: string;
  /** read aloud: the child must read `passage` aloud (similarity score) */
  readAloud?: boolean;
  /** magic / do: the effect that completes it, e.g. "tint:duck:red", "fly:pig", "weather:rainy", "give:umbrella:girl", "put:book:desk:on" */
  goal?: string;
  /** guide: walk the NPC to this place (NPC follows the hero) */
  to?: string;
  /** model sentence(s) – shown as hint cards and used by the companion's ladder */
  model: string[];
  /** companion's Chinese explanation when it starts */
  tipZh?: string;
  done: string[]; // giver's lines on success
  retry?: string; // giver's line when wrong
  needs?: string; // another quest id that must be done first
}

export interface LessonWorld {
  id: string;
  order: number;
  grade: string; // 三年级上册
  gradeNum: number; // 3..9
  unit: string; // "Unit · Animals & colours" (topic alignment, original story)
  title: string;
  titleZh: string;
  scene: string; // environment builder key
  intro: string[]; // companion (zh) lines on arrival
  vocab: string[];
  patterns: string[];
  spawn: { pos: Vec3; rot: number };
  things: ThingDef[];
  npcs: NpcDef[];
  quests: QuestDef[];
  /** spells that are fun in this world (companion suggests them) */
  spellIdeas: { say: string; zh: string; near?: string }[];
  /** word stars: key words / sentences of the lesson floating around the world — walk up, say it, collect it */
  words?: WordStar[];
  /** named areas: a title card shows when the wizard walks in */
  zones?: { id: string; name: string; zh: string; pos: [number, number]; r: number }[];
}

export interface WordStar {
  id: string;
  /** what the child says to collect it (a word, a phrase or a whole key sentence) */
  say: string;
  zh: string;
  pos: [number, number];
  /** hidden until something reveals it (a chest opens, a spell is cast on a thing) */
  hidden?: boolean;
}

// ---------- the command brain ----------

export type ActionType =
  | 'walk_to' | 'forward' | 'back' | 'turn_left' | 'turn_right' | 'turn_around' | 'stop' | 'run' | 'walk' | 'jump' | 'come'
  | 'talk_to' | 'pick_up' | 'drop' | 'give' | 'put' | 'eat' | 'read' | 'look_at' | 'hit' | 'dance' | 'wave' | 'sleep' | 'wake'
  | 'broom_on' | 'broom_off' | 'invisible' | 'visible'
  | 'light' | 'dark' | 'open' | 'close' | 'levitate' | 'tint' | 'grow_size' | 'shrink' | 'conjure' | 'grow_tree' | 'fruit_rain'
  | 'weather' | 'season' | 'spin' | 'heal' | 'sparkle' | 'go_home' | 'enter'
  // magic v2: things come alive
  | 'hop' | 'shake' | 'nap' | 'sing' | 'glow' | 'freeze' | 'melt' | 'vanish' | 'appear' | 'clone' | 'summon' | 'transform' | 'restore' | 'emote' | 'scurry'
  // magic v2: sky
  | 'night' | 'day' | 'rainbow' | 'fireworks' | 'bubbles'
  // magic v3: move things, clouds, sky shows, spells on everyone, Milo's size
  | 'move' | 'cloud_ride' | 'shower' | 'butterflies' | 'whirlwind' | 'shooting_stars' | 'everyone' | 'hero_size';

export interface BrainAction {
  type: ActionType;
  target?: string; // thing id
  value?: string; // colour, food, weather, season, world id, preposition
  target2?: string; // give X to [target2] / put X on [target2]
  count?: number; // clone / conjure: how many
}

export interface PerceivedThing {
  id: string;
  name: string;
  aliases: string[];
  tags: string[];
  color?: string;
  kind: 'thing' | 'npc' | 'portal';
  /** Chinese name, so "去找饲养员" finds the zookeeper */
  zh?: string;
  distance: number;
  can: string[];
}

export interface BrainContext {
  worldId: string;
  grade: number;
  things: PerceivedThing[];
  holding: string | null;
  flying: boolean;
  history: { who: string; text: string }[];
  activeQuest: { kind: QuestKind; prompt?: string; giver?: string } | null;
  /** what "it" refers to */
  lastTarget?: string | null;
}

export interface BrainOutput {
  actions: BrainAction[];
  /** what the little wizard says back (short English) */
  say: string;
  /** a model English sentence when the child spoke Chinese or with mistakes */
  teach?: string;
  understood: boolean;
  source?: 'rules' | 'llm';
}
