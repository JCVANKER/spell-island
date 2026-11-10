import { ruleBrain, spellBrain, npcReply, judgeAnswer, coachReply, companionAnswer, type BrainContext, type BrainOutput } from '@spell/shared';
import { DIRECT, directHealth, directLlmEnv } from './native/direct';
import { appUrl } from './urls';

export interface Health { ok: boolean; asr: boolean; tts: boolean; llm: string | null }

async function post<T>(url: string, body: unknown, ms = 4000): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(appUrl(url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    clearTimeout(t);
    return r.ok ? ((await r.json()) as T) : null;
  } catch { return null; }
}

export const api = {
  health: null as Health | null,

  async checkHealth(): Promise<Health | null> {
    if (DIRECT) { this.health = directHealth(); return this.health; }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const r = await fetch(appUrl('/api/health'), { signal: ctrl.signal });
      clearTimeout(t);
      this.health = r.ok ? await r.json() : null;
    } catch { this.health = null; }
    return this.health;
  },

  /** Rules first (instant, on the device); only if they don't understand, ask the LLM on the server. */
  async brain(text: string, ctx: BrainContext, preferLlm = false): Promise<BrainOutput> {
    const local = ruleBrain(text, ctx);
    if ((local.understood && !preferLlm) || !this.health?.llm) return local;
    const r = DIRECT ? await spellBrain(directLlmEnv(), text, ctx).catch(() => null) : await post<BrainOutput>('/api/brain', { text, ctx }, 4500);
    return r && (r.understood || !local.understood) ? r : local;
  },

  async npc(text: string, npc: { name: string; persona: string; knows?: string[] }, grade: number, history: { who: string; text: string }[]): Promise<string | null> {
    if (!this.health?.llm) return null;
    if (DIRECT) return npcReply(directLlmEnv(), text, npc, grade, history).catch(() => null);
    return (await post<{ line: string | null }>('/api/npc', { text, npc, grade, history }))?.line || null;
  },

  /** Open answers ("Why?", "Which season do you like best?"): is it a good answer? */
  async judge(body: { question: string; criteria: string; answer: string; grade: number }): Promise<{ ok: boolean; feedback?: string } | null> {
    if (!this.health?.llm) return null;
    if (DIRECT) return judgeAnswer(directLlmEnv(), body).catch(() => null);
    return post('/api/judge', body, 4500);
  },

  /** the child spoke Chinese: the companion answers in Chinese with the English to say */
  async companion(body: Parameters<typeof companionAnswer>[1]): Promise<string | null> {
    if (!this.health?.llm) return null;
    if (DIRECT) return companionAnswer(directLlmEnv(), body).catch(() => null);
    return (await post<{ line: string | null }>('/api/companion', body, 4500))?.line || null;
  },

  async coach(body: unknown): Promise<string | null> {
    if (!this.health?.llm) return null;
    if (DIRECT) return coachReply(directLlmEnv(), body).catch(() => null);
    return (await post<{ line: string | null }>('/api/coach', body, 4500))?.line || null;
  },
};
