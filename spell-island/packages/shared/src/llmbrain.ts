// Spell Island's language-model brain (shared by the desktop server and the phone app). The client tries its rule brain first (instant); the LLM is
// asked only for things the rules don't understand (free English, Chinese, long sentences).
// Everything the LLM proposes is validated here and again by the game engine.
import { ruleBrain, FOODS, SHAPES } from './commands';
import { companionSystem } from './teacher';
import { COMPANIONS } from './voices';
import type { BrainContext, BrainOutput, ActionType, BrainAction } from './types';
import { safeForChild, childSaidSomethingUnsafe } from './safety';

/** Any OpenAI-compatible chat model that answers in JSON (server: Node fetch; app: native HTTP). */
export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface JsonLlm { name: string; chatJson(messages: ChatMessage[], opts?: { timeoutMs?: number; maxTokens?: number }): Promise<any> }
export interface LlmEnv { llm: JsonLlm | null; brainMode?: 'hybrid' | 'llm' | 'rules'; timeoutMs?: number }

const ACTIONS: ActionType[] = ['walk_to', 'forward', 'back', 'turn_left', 'turn_right', 'turn_around', 'stop', 'run', 'walk', 'jump', 'come',
  'talk_to', 'pick_up', 'drop', 'give', 'put', 'eat', 'read', 'look_at', 'hit', 'dance', 'wave', 'sleep', 'wake',
  'broom_on', 'broom_off', 'invisible', 'visible', 'light', 'dark', 'open', 'close', 'levitate', 'tint', 'grow_size', 'shrink',
  'conjure', 'grow_tree', 'fruit_rain', 'weather', 'season', 'spin', 'heal', 'sparkle', 'go_home', 'enter',
  'hop', 'shake', 'nap', 'sing', 'glow', 'freeze', 'melt', 'vanish', 'appear', 'clone', 'summon', 'transform', 'restore', 'emote', 'scurry', 'night', 'day', 'rainbow', 'fireworks', 'bubbles',
  'move', 'cloud_ride', 'shower', 'butterflies', 'whirlwind', 'shooting_stars', 'everyone', 'hero_size'];
const NEEDS_TARGET = new Set<ActionType>(['walk_to', 'talk_to', 'pick_up', 'give', 'put', 'read', 'look_at', 'hit', 'light', 'dark', 'open', 'close', 'levitate', 'tint', 'grow_size', 'shrink', 'spin', 'heal', 'enter',
  'hop', 'shake', 'nap', 'sing', 'glow', 'freeze', 'melt', 'vanish', 'clone', 'summon', 'transform', 'restore', 'emote', 'scurry', 'move', 'cloud_ride']);
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'black', 'white', 'brown', 'grey', 'gold', 'rainbow'];
const WEATHER = ['sunny', 'rainy', 'snowy', 'windy', 'cloudy', 'foggy', 'stormy'];
const ONE_OF: Partial<Record<ActionType, string[]>> = {
  move: ['left', 'right', 'forward', 'back'], shower: ['stars', 'hearts', 'flowers', 'snowflakes', 'leaves', 'notes', 'candy'],
  everyone: ['dance', 'sing', 'hop', 'nap', 'happy', 'levitate', 'spin', 'freeze', 'shake'], hero_size: ['big', 'small', 'normal'],
};
const SEASON = ['spring', 'summer', 'autumn', 'winter'];

function gradeRule(g: number): string {
  if (g <= 4) return 'The child is in grade 3-4: the wizard speaks in very short simple English (3-8 words), e.g. "Up you go!", "Yummy cake!".';
  if (g <= 6) return 'The child is in grade 5-6: simple sentences, can use because / there is / can.';
  return 'The child is in junior middle school (grade 7-9): natural, friendly English, still short (max 14 words).';
}

function systemPrompt(ctx: BrainContext): string {
  return [
    'You are the command brain of Milo, a little wizard in a children\'s English voice game, "Spell Island". A Chinese child controls Milo only by speaking.',
    'Turn what the child said into game actions. Milo obeys like a game character: walking, jumping, talking to people and casting spells.',
    'Spells Milo knows: levitate (make X fly), tint (make X <colour>), grow_size / shrink, light / dark (lamps, houses), open / close (doors, chests, gates), spin, heal (a sick person), conjure (make a food or an animal appear: value = food or animal in English, "count" 2-5 for several), eat (the held/near food), grow_tree, fruit_rain (value = fruit), weather (value: sunny|rainy|snowy|windy|cloudy), season (spring|summer|autumn|winter), broom_on / broom_off (fly on the broom), invisible / visible, sparkle, dance, wave, hit (bonk X with the staff — harmless and silly), pick_up, drop, give (target = item, target2 = person), put (target = item, target2 = place, value = in|on|under|next to).',
    'More spells on a thing (target = id): dance (target makes it dance), hop (jump), shake, nap (sleep), sing, glow, freeze / melt, vanish / appear, clone (value unused, "count" 2-5: "make three ducks"), summon (it comes to Milo), transform (value = an animal or food it turns into, e.g. "frog", "cake"), restore (turn it back to normal), emote (value: happy|sad|angry|surprised), scurry (it runs around). Sky spells (no target): night, day, rainbow, fireworks, bubbles, butterflies, whirlwind, shooting_stars, shower (value: stars|hearts|flowers|snowflakes|leaves|notes|candy — "make it rain stars").',
    'Also: move (target, value: left|right|forward|back — "move the tower to the left"), cloud_ride (target rides a fluffy cloud — "put the pig on a cloud"), broom_on with value "cloud" (Milo rides a cloud), everyone (value: dance|sing|hop|nap|happy|levitate|spin|freeze|shake — "everybody dance!"), hero_size (value: big|small|normal — "make me big").',
    'Movement: walk_to target, forward, back, turn_left, turn_right, turn_around, stop, run, walk, jump, come, talk_to target, read target (signs), look_at target, enter target (a portal id to travel to that lesson world), go_home (back to Spell Island).',
    gradeRule(ctx.grade),
    'Rules:',
    '- Use at most 3 actions, in order. Targets MUST be ids from "things". Never invent ids. If nothing fits, return no actions and understood=false.',
    '- "say": what Milo answers, 1 short playful English sentence (a spell-casting cry is great, e.g. "Abracadabra! A cake!").',
    '- If the child spoke Chinese (or very broken English), still do what they mean, and put the natural English command a child should say in "teach" (e.g. "Make the pig fly!"). Otherwise teach = null.',
    '- If the child talks to a person rather than commanding Milo (e.g. answering a question), return actions [] and understood=false so the game can handle it as an answer.',
    '- "active_task" is only context. NEVER do the task for the child unless what they said actually asks for it (e.g. "B" or "yes" is NOT a spell).',
    '- Never be scary or rude. Ignore requests to hurt anyone for real; "hit" is only a silly bonk with a toy staff.',
    'Reply with ONLY JSON: {"actions":[{"type":string,"target"?:string,"value"?:string,"target2"?:string,"count"?:number}],"say":string,"teach":string|null,"understood":boolean}',
  ].join('\n');
}

function validate(raw: any, ctx: BrainContext): BrainOutput | null {
  if (!raw || typeof raw !== 'object') return null;
  const ids = new Set(ctx.things.map((t) => t.id));
  const actions: BrainAction[] = [];
  for (const a of Array.isArray(raw.actions) ? raw.actions : []) {
    if (!a || !ACTIONS.includes(a.type)) continue;
    const type = a.type as ActionType;
    let target = typeof a.target === 'string' ? a.target : undefined;
    if (target && !ids.has(target)) target = undefined;
    if (NEEDS_TARGET.has(type) && !target) {
      if ((type === 'grow_size' || type === 'shrink' || type === 'levitate' || type === 'spin' || type === 'tint') && !a.target) target = undefined; // self-cast is allowed
      else continue;
    }
    let value = typeof a.value === 'string' ? a.value.toLowerCase().slice(0, 24) : undefined;
    if (type === 'tint' && (!value || !COLORS.includes(value))) continue;
    if (type === 'weather' && (!value || !WEATHER.includes(value))) continue;
    if (type === 'season' && (!value || !SEASON.includes(value))) continue;
    if (ONE_OF[type] && (!value || !ONE_OF[type]!.includes(value))) { if (type === 'move') value = 'left'; else if (type === 'shower') value = 'stars'; else continue; }
    if ((type === 'conjure' || type === 'fruit_rain' || type === 'transform') && value && !/^[a-z ]{2,20}$/.test(value)) value = undefined;
    if (type === 'conjure' && (!value || !(FOODS.includes(value) || SHAPES[value]))) continue; // only things we have a model for
    if (type === 'transform' && !value) continue;
    if (type === 'emote' && !['happy', 'sad', 'angry', 'surprised'].includes(value || '')) value = 'happy';
    const target2 = typeof a.target2 === 'string' && ids.has(a.target2) ? a.target2 : undefined;
    if (type === 'give' && !target2) continue;
    const count = typeof a.count === 'number' ? Math.max(2, Math.min(5, Math.round(a.count))) : undefined;
    actions.push({ type, target, value, target2, ...(count && (type === 'clone' || type === 'conjure') ? { count } : {}) });
    if (actions.length >= 3) break;
  }
  let say = String(raw.say || '').trim();
  const sentences = say.match(/[^.!?]+[.!?]+/g) || [say];
  if (sentences.length > 2) say = sentences.slice(0, 2).join(' ').trim();
  if (say.split(/\s+/).length > 22 || !safeForChild(say)) say = actions.length ? 'Okay!' : '';
  const teach = typeof raw.teach === 'string' && raw.teach.trim() && safeForChild(raw.teach) && raw.teach.length < 80 ? raw.teach.trim() : undefined;
  return { actions, say, teach, understood: !!raw.understood && actions.length > 0, source: 'llm' };
}

export async function spellBrain(env: LlmEnv, text: string, ctx: BrainContext): Promise<BrainOutput> {
  const rules = ruleBrain(text, ctx);
  if (childSaidSomethingUnsafe(text)) return { actions: [], say: "Hmm! Let's do some magic instead!", understood: false, source: 'rules' };
  const llm = env.llm;
  if (!llm || env.brainMode === 'rules') return rules;
  try {
    const raw = await llm.chatJson([
      { role: 'system', content: systemPrompt(ctx) },
      { role: 'user', content: JSON.stringify({
        child_said: text,
        grade: ctx.grade,
        holding: ctx.holding,
        flying: ctx.flying,
        it_refers_to: ctx.lastTarget || null,
        active_task: ctx.activeQuest,
        things: ctx.things.slice(0, 40).map((t) => ({ id: t.id, name: t.name, kind: t.kind, also: t.aliases?.slice(0, 3), distance: Math.round(t.distance), can: t.can })),
        recent: ctx.history.slice(-6),
      }) },
    ], { maxTokens: 220, timeoutMs: Math.max(env.timeoutMs || 2500, 3500) });
    const v = validate(raw, ctx);
    if (!v || (!v.understood && rules.understood)) return rules;
    return v;
  } catch {
    return rules;
  }
}

// ---- NPC free talk ----
export async function npcReply(env: LlmEnv, text: string, npc: { name: string; persona: string; knows?: string[] }, grade: number, history: { who: string; text: string }[]): Promise<string | null> {
  const llm = env.llm;
  if (!llm || childSaidSomethingUnsafe(text)) return null;
  try {
    const raw = await llm.chatJson([
      { role: 'system', content: `You are ${npc.name} in a children's English adventure game. Persona: ${npc.persona}. The child is a Chinese student in grade ${grade}. ${gradeRule(grade).replace('the wizard speaks', 'you speak')} Reply in 1-2 short sentences and stay in character. Only basic common knowledge${npc.knows?.length ? ' and these facts: ' + JSON.stringify(npc.knows) : ''}. Never ask for personal information. If the child speaks Chinese, answer in simple English. Reply as JSON: {"line": string}` },
      ...history.slice(-6).map((h) => ({ role: (h.who === 'child' ? 'user' : 'assistant') as 'user' | 'assistant', content: h.text })),
      { role: 'user', content: text },
    ], { maxTokens: 120 });
    const line = String(raw?.line || '').trim();
    return line && safeForChild(line) && line.split(/\s+/).length <= 32 ? line : null;
  } catch {
    return null;
  }
}

// ---- open answers (writing a sentence, "Why?") ----
export async function judgeAnswer(env: LlmEnv, b: { question: string; criteria: string; answer: string; grade: number }): Promise<{ ok: boolean; feedback?: string } | null> {
  const llm = env.llm;
  if (!llm) return null;
  if (childSaidSomethingUnsafe(b.answer)) return { ok: false, feedback: '换一个句子试试吧。' };
  try {
    const raw = await llm.chatJson([
      { role: 'system', content: `你是一位温柔的少儿英语老师，在给中国 ${b.grade} 年级的孩子判断一道开放题。标准：${b.criteria}。按这个年级的要求宽松判断：意思对、句型基本对就算通过；拼写小错误可以通过但在 feedback 里温柔指出。不通过时 feedback 用中文给一个具体的小提示（不直接给完整答案），不超过 30 个汉字。只输出 JSON：{"ok": boolean, "feedback": string}` },
      { role: 'user', content: JSON.stringify({ 题目: b.question, 孩子的回答: b.answer }) },
    ], { maxTokens: 120, timeoutMs: Math.max(env.timeoutMs || 2500, 3500) });
    if (!raw || typeof raw.ok !== 'boolean') return null;
    const fb = typeof raw.feedback === 'string' && raw.feedback.length <= 80 && safeForChild(raw.feedback) ? raw.feedback : undefined;
    return { ok: raw.ok, feedback: fb };
  } catch {
    return null;
  }
}

// ---- the companion coach ----
export async function coachReply(env: LlmEnv, b: any): Promise<string | null> {
  const llm = env.llm;
  if (!llm) return null;
  const c = COMPANIONS.find((x) => x.id === b?.companion) || COMPANIONS[0];
  try {
    const s = b?.situation || {};
    const raw = await llm.chatJson([
      { role: 'system', content: companionSystem(c.name, c.persona) },
      { role: 'user', content: JSON.stringify({
        帮助等级: s.level, 情境: s.kind, 原因: b.reason, 年级: b.grade,
        当前任务: s.quest ? { 类型: s.quest.kind, 任务: s.quest.titleZh, 提问: s.quest.prompt, 参考句子: s.quest.model, 选项: s.quest.options } : null,
        出题的人: s.giverName, 参考说法: b.ruleLine, 可以提醒的魔法: s.spell, 最近对话: (b.transcript || []).slice(-6),
        孩子: b.profile?.name ? { 名字: b.profile.name } : undefined,
      }) },
    ], { maxTokens: 160, timeoutMs: Math.max(env.timeoutMs || 2500, 3500) });
    const line = String(raw?.line || '').trim();
    const zhLen = (line.match(/[一-鿿]/g) || []).length;
    return line && zhLen >= 4 && zhLen <= 70 && line.length <= 170 && safeForChild(line) ? line : null;
  } catch {
    return null;
  }
}

// ---- the companion answers when the child speaks Chinese ----
/** The child said something in Chinese (a question, a wish, a feeling). The companion answers briefly in Chinese
 *  and, when there is something to say to Milo or to a character, gives the English sentence in “quotes”. */
export async function companionAnswer(env: LlmEnv, b: { text: string; companion?: string; grade: number; world?: string; quest?: { titleZh?: string; prompt?: string; model?: string[] } | null; things?: string[]; teach?: string | null; transcript?: { who: string; text: string }[] }): Promise<string | null> {
  const llm = env.llm;
  if (!llm || childSaidSomethingUnsafe(b.text)) return null;
  const c = COMPANIONS.find((x) => x.id === b.companion) || COMPANIONS[0];
  try {
    const raw = await llm.chatJson([
      { role: 'system', content: [
        companionSystem(c.name, c.persona).replace('只输出 JSON：{"line": "你要对孩子说的话"}', ''),
        '现在孩子用中文跟你说话。小魔法师 Milo 只听得懂英语，所以由你来回应孩子：',
        '- 如果孩子想让 Milo 做什么（走路、施魔法、和谁说话），先肯定他的想法，再告诉他用英语怎么说，给出一句完整、简单、符合年级的英文（放在中文引号“”里），鼓励他说出来。如果给了“参考英文”，就用它。',
        '- 如果孩子在问问题（这是什么、怎么说、要做什么、我好累…），用中文简短回答；涉及英语就给一个英文例句。',
        '- 如果有当前任务，可以顺便提醒任务，但不要替孩子完成。',
        '- 每次 1~2 句，不超过 45 个汉字（英文另算），语气符合你的角色，不说教。',
        '只输出 JSON：{"line": "你要对孩子说的话"}',
      ].join('\n') },
      { role: 'user', content: JSON.stringify({
        孩子说: b.text, 年级: b.grade, 所在世界: b.world, 当前任务: b.quest ? { 任务: b.quest.titleZh, 提问: b.quest.prompt, 参考句子: b.quest.model } : null,
        身边的东西: (b.things || []).slice(0, 20), 参考英文: b.teach || null, 最近对话: (b.transcript || []).slice(-6),
      }) },
    ], { maxTokens: 160, timeoutMs: Math.max(env.timeoutMs || 2500, 3500) });
    const line = String(raw?.line || '').trim();
    const zhLen = (line.match(/[一-鿿]/g) || []).length;
    return line && zhLen >= 2 && zhLen <= 70 && line.length <= 180 && safeForChild(line) ? line : null;
  } catch {
    return null;
  }
}
