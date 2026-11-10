// Pre-generate every fixed line of the game with Doubao Seed-TTS 2.0, so playback starts instantly.
// Usage: pnpm pregen            (reads DOUBAO_SPEECH_API_KEY from .env)
//        pnpm pregen --dry      (only count lines)
// Output: apps/web/public/voice/<key>.mp3 + manifest.json
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { W, fillW, FOODS, FRUITS, REACT, SHOWERS, SHAPES, ttsKey, voiceFor, COMPANIONS, coachLine, ruleBrain, teachLine, type LessonWorld, type QuestDef, type PerceivedThing } from '../packages/shared/src/index';
const NOT_HEARD = ['没听清，再说一遍吧～', '嗯？再说一次？', '我没听清哦，大声一点再说一遍～', '试试念咒语表上的咒语吧～'];
const CN_TEACH = ['我听懂啦！Milo 只听得懂英语，跟他说：“{t}”', '好主意！用英语说：“{t}”，Milo 就会照做。'];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(ROOT, '.env') });
const OUT = path.join(ROOT, 'apps/web/public/voice');
fs.mkdirSync(OUT, { recursive: true });
const KEY = process.env.DOUBAO_SPEECH_API_KEY || '';
const DRY = process.argv.includes('--dry');

const island = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/island.json'), 'utf8')) as LessonWorld & { tutorial: { say: string[] }[] };
const worlds: LessonWorld[] = fs.readdirSync(path.join(ROOT, 'content/worlds')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content/worlds', f), 'utf8')));
const all = [island, ...worlds];

const lines = new Map<string, { role: string; text: string }>();
function add(role: string, text: string | undefined) {
  if (!text || !text.trim()) return;
  const t = text.trim();
  lines.set(ttsKey(role, t), { role, text: t });
}
const COMP = COMPANIONS.map((c) => c.id);
const comp = (text: string) => COMP.forEach((c) => add(c, text));
// companion coaching ladders / teaching lines are many (×5 companions): they are synthesised live unless PREGEN_FULL=1
const FULL = !!process.env.PREGEN_FULL;
const compMore = (text: string) => { if (FULL) comp(text); };

// ---- the wizard's fixed lines and templates filled with every name / value in the game
const names = new Set<string>();
for (const w of all) for (const t of [...w.things, ...w.npcs]) names.add(t.name);
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'black', 'white', 'brown', 'grey', 'gold', 'rainbow'];
const vals = [...FOODS, ...COLORS, 'sunny', 'rainy', 'snowy', 'windy', 'cloudy', 'foggy', 'stormy', 'spring', 'summer', 'autumn', 'winter'];
for (const arr of Object.values(W)) for (const tpl of arr) {
  if (!/\{/.test(tpl)) { add('wizard', tpl); continue; }
  if (tpl === W.shower[0]) { for (const v of new Set(Object.values(SHOWERS))) add('wizard', fillW(tpl, '', v)); continue; }
  if (tpl.includes('{x}') && tpl.includes('{v}')) { // colour spells: only the ones the game suggests (others are synthesised live)
    for (const w of all) for (const t of w.things.concat(w.npcs)) for (const v of t.id === 'duck' ? ['yellow'] : []) add('wizard', fillW(tpl, t.name, v));
    for (const w of all) for (const s of w.spellIdeas || []) { const m = s.say.match(/^Make (?:the )?(.+?) (red|orange|yellow|green|blue|purple|pink|black|white|brown|grey|gold)!$/i); if (m) add('wizard', fillW(tpl, m[1], m[2].toLowerCase())); }
    continue; }
  if (tpl.includes('{x}')) { for (const x of names) add('wizard', fillW(tpl, x)); for (const w of worlds) add('wizard', fillW(tpl, w.title)); continue; }
  if (tpl.includes('{v}')) for (const v of vals) add('wizard', fillW(tpl, '', v));
}
for (const f of FRUITS) add('wizard', fillW(W.fruitRain[0], '', f));
for (const k of Object.keys(SHAPES)) add('wizard', fillW(W.conjure[0], '', k)); // "Make a duck!" where there is no duck
for (const x of names) { add('wizard', `The ${x} is too big for me!`); add('wizard', `Up you go! Fly, ${x}, fly!`); }
['Hmm, I can\'t get there. Can you tell me the way?', 'Hmm, let\'s use kind words! Where shall we go?', 'I can\'t pick up a friend! Let\'s say hello instead.',
  'Abracadabra! Look at all the colours!', 'Yes! A word star for you!', 'That\'s a secret! Let\'s keep exploring!', 'There is no lamp here!', 'This way! Follow me!', 'Hi! Who will come with us? Pick a friend!', 'Okay!', 'Hmm! Let\'s do some magic instead!'].forEach((t) => add('wizard', t));

for (const w of worlds) add('narrator', `Go to ${w.title}!`); // the portal map in the spell book
// ---- every world: NPC lines, quests, signs, listening audio, companion coaching
for (const w of all) {
  const voiceOf = (id: string) => w.npcs.find((n) => n.id === id)?.voice || 'wizard';
  for (const n of w.npcs) { add(n.voice, n.greet); (n.idle || []).forEach((t) => add(n.voice, t)); add(n.voice, n.ouch || 'Ouch! Hey, that tickles!'); add(n.voice, 'Oh! Thank you so much!'); add(n.voice, 'Oh! You already did it!'); }
  for (const t of w.things) if (t.text) add('wizard', t.text);
  // magic v2: friends answer spells, chat as you pass by; word stars are read out
  const voiced = new Set<string>([...w.npcs.map((n) => n.voice), ...w.things.map((t) => t.params?.voice).filter(Boolean)]);
  for (const v of voiced) for (const line of Object.values(REACT)) add(v, line);
  for (const t of [...w.things, ...w.npcs]) for (const c of (t as any).chatter || []) add((t as any).voice || t.params?.voice || 'wizard', c);
  for (const ws of (w as any).words || []) add('narrator', ws.say);
  // the spell book: every spell and sentence pattern can be heard (tap)
  for (const s of w.spellIdeas || []) add('narrator', s.say);
  for (const p of w.patterns || []) add('narrator', p);
  if ((w as any).words?.length) comp(`太厉害了！这里的 ${(w as any).words.length} 颗单词星全部收集完啦！`);
  comp(w.intro.join(''));
  for (const s of w.spellIdeas || []) comp(`想玩点魔法吗？${s.zh}，试试说：“${s.say}”`);
  for (const q of w.quests as QuestDef[]) {
    const v = voiceOf(q.giver);
    q.intro.forEach((t) => add(v, t));
    add(v, q.prompt); q.done.forEach((t) => add(v, t)); add(v, q.retry || 'Hmm, not quite. Let\'s try again!');
    if (q.kind === 'listen') { add('narrator', q.audio); add(v, q.retry || 'Not this one. Listen again and try another one!'); }
    if (q.tipZh) comp(q.tipZh);
    const giverName = w.npcs.find((n) => n.id === q.giver)?.zh || w.things.find((t) => t.id === q.giver)?.zh || '';
    for (let L = 1; L <= 4; L++) (L === 1 ? comp : compMore)(coachLine({ kind: 'quest', level: L, quest: q, giverName, distractor: q.kind === 'magic' || q.kind === 'do' ? 'Jump!' : undefined }));
    if (q.model[0]) compMore(coachLine({ kind: 'chinese', level: 1, model: q.model[0] }));
  }
  for (const st of (w as any).tutorial || []) comp(st.say.join(''));
  // the child says it in Chinese → the companion gives the English (same sentence the game will build)
  const things: PerceivedThing[] = [...w.things.map((t) => ({ ...t, kind: 'thing' as const })), ...w.npcs.map((n) => ({ ...n, kind: 'npc' as const }))].map((t, i) => ({ id: t.id, name: t.name, aliases: t.aliases || [], tags: t.tags || [], kind: t.kind, distance: 3 + i, can: t.can || [] }));
  const phrases = new Set<string>([...(w.spellIdeas || []).map((x) => x.say), ...((w as any).tutorial || []).flatMap((x: any) => x.hint), ...w.quests.filter((q) => ['magic', 'do', 'guide'].includes(q.kind)).flatMap((q) => q.model), 'Jump!', 'Fly!', 'Dance!', 'Make a cake!', 'Grow a tree!', 'Be invisible!']);
  for (const ph of phrases) {
    const out = ruleBrain(ph, { worldId: w.id, grade: w.gradeNum, things, holding: null, flying: false, history: [], activeQuest: null });
    const t = out.understood ? teachLine(out.actions, things) : null;
    if (t) for (const tpl of CN_TEACH) compMore(tpl.replace('{t}', t));
  }
  for (const q of w.quests as QuestDef[]) {
    const gz = w.npcs.find((n) => n.id === q.giver)?.zh || w.things.find((t) => t.id === q.giver)?.zh || '他';
    if (q.kind === 'speak' && q.model[0]) compMore(`意思对啦！用英语回答${gz}：“${q.model[0]}”`);
    if (q.kind === 'write' && q.model[0]) compMore(`意思对啦！用英文把它写下来：“${q.model[0]}”`);
  }
}
NOT_HEARD.forEach(comp);
for (const k of ['praise', 'arrive', 'chinese'] as const) comp(coachLine({ kind: k, level: 1 }));
for (let L = 1; L <= 4; L++) comp(coachLine({ kind: 'explore', level: L }));
for (const c of COMPANIONS) add(c.id, coachLine({ kind: 'welcome', level: 1, companion: c.name }));

console.log(`lines: ${lines.size}`);
if (DRY) { console.log(`missing: ${[...lines.keys()].filter((k) => !fs.existsSync(path.join(OUT, `${k}.mp3`))).length}`); process.exit(0); }
if (!KEY) { console.error('DOUBAO_SPEECH_API_KEY missing'); process.exit(1); }

let hasFfmpeg = true;
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { hasFfmpeg = false; }

async function synth(role: string, text: string): Promise<Buffer> {
  const v = voiceFor(role);
  const rp: any = { text, speaker: v.voice, audio_params: { format: 'mp3', sample_rate: 24000, speech_rate: v.speed } };
  if (v.ctx) rp.additions = JSON.stringify({ context_texts: [v.ctx] });
  const res = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': KEY, 'X-Api-Resource-Id': 'seed-tts-2.0', 'X-Api-Request-Id': randomUUID() },
    body: JSON.stringify({ user: { uid: 'spell-pregen' }, req_params: rp }),
  });
  const body = await res.text();
  const parts: Buffer[] = [];
  for (const line of body.split('\n')) {
    if (!line.trim()) continue;
    try { const d = JSON.parse(line); if (d.data) parts.push(Buffer.from(d.data, 'base64')); else if (d.code && d.code !== 20000000 && d.code !== 0) throw new Error(d.message); } catch (e: any) { if (e?.message && !e.message.includes('JSON')) throw e; }
  }
  const buf = Buffer.concat(parts);
  if (!buf.length) throw new Error('empty audio: ' + body.slice(0, 200));
  return buf;
}

const todo = [...lines.entries()].filter(([k]) => !fs.existsSync(path.join(OUT, `${k}.mp3`)));
console.log(`to generate: ${todo.length}`);
let done = 0, failed = 0;
async function worker() {
  while (todo.length) {
    const [k, { role, text }] = todo.shift()!;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const buf = await synth(role, text);
        const dst = path.join(OUT, `${k}.mp3`);
        if (hasFfmpeg) {
          const tmp = dst + '.src.mp3';
          fs.writeFileSync(tmp, buf);
          try { execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', tmp, '-ac', '1', '-ar', '24000', '-b:a', '40k', dst]); } catch { fs.copyFileSync(tmp, dst); }
          fs.unlinkSync(tmp);
        } else fs.writeFileSync(dst, buf);
        done++;
        if (done % 25 === 0) console.log(`  ${done} done`);
        break;
      } catch (e: any) {
        if (attempt === 2) { failed++; console.warn(`FAIL [${role}] ${text}: ${e?.message}`); }
        else await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp3') && !lines.has(f.replace(/\.mp3$/, ''))) fs.unlinkSync(path.join(OUT, f)); // drop lines no longer used
const keys = fs.readdirSync(OUT).filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, ''));
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ generated: new Date().toISOString(), keys }));
console.log(`generated ${done}, failed ${failed}, manifest ${keys.length}`);
