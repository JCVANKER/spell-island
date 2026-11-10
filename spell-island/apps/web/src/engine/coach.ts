// The companion's brain: watches what the child is doing and steps in like a good one-to-one teacher,
// and now and then suggests a fun spell to try. Lines come from the Socratic ladder (shared/teacher);
// with an LLM the server phrases them freshly in the companion's own personality.
import { coachLine, type CoachSituation, type QuestDef } from '@spell/shared';
import { api } from '../api';
import { store } from '../state/save';

export interface CoachHost {
  activeQuest(): { q: QuestDef; giverName: string } | null;
  idle(): boolean;
  transcript(): { who: string; text: string }[];
  companionSay(text: string): Promise<void>;
  showHints(cards: string[]): void;
  spellIdea(): { say: string; zh: string } | null;
  grade: number;
}

export class Coach {
  private focus = '';
  private rung = 0;
  private misses = 0;
  private zh = 0;
  private quietFor = 0;
  private sinceIdea = 0;
  private helped = false;
  private busy = false;
  private lastTick = 0;

  constructor(private host: CoachHost) {}

  get on() { return store.data.settings.companion; }

  private sync() {
    const a = this.host.activeQuest();
    const f = a ? a.q.id : 'explore';
    if (f !== this.focus) { this.focus = f; this.rung = 0; this.misses = 0; this.helped = false; this.quietFor = 0; }
  }

  /** Called every frame; `childTurn` = mic open and nobody talking. Uses wall-clock time. */
  tick(childTurn: boolean) {
    const now = performance.now();
    const dt = this.lastTick ? Math.min(1, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;
    if (!this.on) return;
    this.sync();
    if (!childTurn || !this.host.idle() || this.busy) { if (!childTurn) this.quietFor = 0; return; }
    this.quietFor += dt;
    this.sinceIdea += dt;
    const quest = !!this.host.activeQuest();
    const wait = (this.host.grade <= 4 ? 14 : 18) * (this.rung >= 4 ? 1.6 : 1) * (quest ? 1 : 1.6);
    if (this.quietFor > wait) { this.quietFor = 0; this.intervene('silence'); return; }
    // exploring happily: every ~50 s suggest a spell idea nearby
    if (!quest && this.sinceIdea > 50 && this.quietFor > 6) { this.sinceIdea = 0; this.suggestSpell(); }
  }

  heard(kind: 'ok' | 'unclear' | 'zh') {
    if (!this.on) return;
    this.sync();
    this.quietFor = 0;
    if (kind === 'ok') { this.misses = 0; return; }
    if (kind === 'zh' && this.host.grade >= 5) { if (++this.zh >= 2) { this.zh = 0; this.intervene('zh'); } return; }
    if (kind === 'unclear' && ++this.misses >= 2) { this.misses = 0; this.intervene('miss'); }
  }

  /** a quest the companion helped with was solved */
  async solved() {
    if (!this.on) return;
    if (this.helped) { this.helped = false; await this.host.companionSay(coachLine({ kind: 'praise', level: 1 })); }
  }

  help() { if (!this.on) return; this.sync(); this.rung = Math.max(this.rung, 1); this.intervene('help'); }

  async suggestSpell() {
    const idea = this.host.spellIdea();
    if (!idea || !this.on) return;
    this.sinceIdea = 0;
    await this.host.companionSay(`想玩点魔法吗？${idea.zh}，试试说：“${idea.say}”`);
    this.host.showHints([idea.say]);
  }

  async intervene(reason: 'silence' | 'miss' | 'zh' | 'help') {
    if (this.busy || !this.on) return;
    this.busy = true;
    try {
      this.rung = Math.min(4, this.rung + 1);
      this.helped = true;
      const a = this.host.activeQuest();
      if (!a && reason !== 'zh') {
        // free exploring: alternate between a direction idea and a spell idea
        if (this.rung % 2 === 0 && this.host.spellIdea()) { await this.suggestSpell(); return; }
      }
      let sit: CoachSituation = a ? { kind: 'quest', level: this.rung, quest: a.q, giverName: a.giverName, distractor: this.distractor(a.q) } : { kind: 'explore', level: this.rung };
      if (reason === 'zh') sit = { kind: 'chinese', level: 1, model: a?.q.model[0] };
      const rule = coachLine(sit);
      let line = rule;
      if (sit.level <= 3 && sit.kind !== 'chinese' && api.health?.llm) {
        const llm = await api.coach({ situation: { ...sit, quest: a ? { kind: a.q.kind, titleZh: a.q.titleZh, prompt: a.q.prompt, model: a.q.model, options: a.q.options } : undefined }, ruleLine: rule, transcript: this.host.transcript(), profile: store.data.profile, companion: store.data.companion, grade: this.host.grade, reason });
        if (llm) line = llm;
        if (this.host.activeQuest()?.q !== a?.q) return; // the child solved it while we were thinking
      }
      if (a && sit.level >= 3 && a.q.model.length && a.q.kind !== 'listen' && a.q.kind !== 'choose') this.host.showHints(a.q.model);
      await this.host.companionSay(line);
    } finally {
      this.busy = false;
      this.quietFor = 0;
    }
  }

  private distractor(q: QuestDef): string | undefined {
    if (q.kind === 'magic' || q.kind === 'do') return 'Jump!';
    return q.model[1] && q.model[1] !== q.model[0] ? undefined : undefined;
  }
}
