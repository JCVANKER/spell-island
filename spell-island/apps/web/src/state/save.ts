// Progress: finished quests per world, crystals, badges, chosen companion, settings. localStorage only.
export interface SaveData {
  v: 1;
  companion: string | null;
  tutorialDone: boolean;
  done: Record<string, string[]>; // worldId -> quest ids
  crystals: number;
  badges: string[];
  words: string[]; // English words the child has used
  stars?: Record<string, string[]>; // worldId -> collected word stars
  spells?: Record<string, string[]>; // worldId -> spells of the book already cast
  bookSeen?: string[]; // worlds whose spell book has been shown once
  profile: { name: string } | null;
  settings: { autoMic: boolean;
    bgm?: boolean; companion: boolean; showZh: boolean; textInput: boolean; voiceRate: number };
}

const KEY = 'spell-island-save-v1';

function fresh(): SaveData {
  return {
    v: 1, companion: null, tutorialDone: false, done: {}, crystals: 0, badges: [], words: [], profile: null,
    settings: { autoMic: true, companion: true, showZh: true, textInput: false, voiceRate: 1 },
  };
}

class Store {
  data: SaveData = fresh();
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
      this.data.settings = { ...fresh().settings, ...(this.data.settings || {}) };
    } catch { this.data = fresh(); }
    const qs = new URLSearchParams(location.search);
    if (qs.has('text')) this.data.settings.textInput = true;
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ } }
  isDone(world: string, quest: string) { return (this.data.done[world] || []).includes(quest); }
  markDone(world: string, quest: string) {
    const l = (this.data.done[world] ||= []);
    if (!l.includes(quest)) { l.push(quest); this.data.crystals++; }
    this.save();
  }
  hasStar(world: string, id: string) { return (this.data.stars?.[world] || []).includes(id); }
  addStar(world: string, id: string) { const all = (this.data.stars ||= {}); const l = (all[world] ||= []); if (!l.includes(id)) l.push(id); this.save(); }
  starCount(world: string) { return (this.data.stars?.[world] || []).length; }
  spellsOf(world: string) { return this.data.spells?.[world] || []; }
  addSpell(world: string, say: string) { const all = (this.data.spells ||= {}); const l = (all[world] ||= []); if (!l.includes(say)) { l.push(say); this.save(); } }
  addWords(ws: string[]) { for (const w of ws) if (!this.data.words.includes(w)) this.data.words.push(w); this.save(); }
  reset() { this.data = fresh(); this.save(); }
}

export const store = new Store();
