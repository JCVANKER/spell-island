// Server side of the brain: the shared logic with the server's model and settings.
import { spellBrain as sb, npcReply as nr, judgeAnswer as ja, coachReply as cr, companionAnswer as ca, type BrainContext, type LlmEnv } from '@spell/shared';
import { getLlm } from '../providers/llm';
import { CONFIG } from '../config';

const env = (): LlmEnv => ({ llm: getLlm(), brainMode: CONFIG.brainMode, timeoutMs: CONFIG.llmTimeoutMs });
export const spellBrain = (text: string, ctx: BrainContext) => sb(env(), text, ctx);
export const npcReply = (text: string, npc: { name: string; persona: string; knows?: string[] }, grade: number, history: { who: string; text: string }[]) => nr(env(), text, npc, grade, history);
export const judgeAnswer = (b: { question: string; criteria: string; answer: string; grade: number }) => ja(env(), b);
export const coachReply = (b: any) => cr(env(), b);
export const companionAnswer = (b: any) => ca(env(), b);
