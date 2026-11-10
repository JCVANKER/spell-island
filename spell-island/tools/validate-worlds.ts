// Checks every lesson world: references, quest chains, that each model answer is accepted by its own
// checker, and that the rule brain understands every magic/do model sentence (no LLM needed).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ruleBrain, matchGroups, pickOption, type LessonWorld, type BrainContext, type PerceivedThing } from '../packages/shared/src/index';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const MODELS = new Set(Object.keys(JSON.parse(fs.readFileSync(path.resolve(toolDir, '..', 'apps/web/public/models/manifest.json'), 'utf8'))));
const PROCEDURAL = new Set(['elephant_mom', 'baby_elephant', 'giraffe', 'lion', 'acacia', 'fruit_tree', 'berry_bush', 'lantern', 'lamp_post', 'magic_door', 'book_pile', 'stall_fruit', 'round_tree', 'pine', 'house', 'portal_arch', 'none', 'word_star']);
const PENDING = new Set((process.env.PENDING_MODELS || '').split(/[ ,]+/).filter(Boolean)); // still generating: allowed with a warning
/** the events an action fires in the game (runtime.spelled / event names) */
function eventsFor(a: { type: string; target?: string; value?: string; target2?: string }): string[] {
  const t = a.target, v = a.value;
  const m: Record<string, string[]> = {
    tint: [`tint:${t}:${v}`], levitate: [`fly:${t}`], grow_size: [`big:${t}`], shrink: [`small:${t}`], spin: [`spin:${t}`], light: [`light:${t}`], dark: [`dark:${t}`],
    open: [`open:${t}`], close: [`close:${t}`], heal: [`heal:${t}`], dance: t ? [`dance:${t}`] : ['dance'], hop: [`hop:${t}`], shake: [`shake:${t}`], nap: [`nap:${t}`], sing: [`sing:${t}`],
    glow: [`glow:${t}`], freeze: [`freeze:${t}`], melt: [`melt:${t}`], vanish: [`vanish:${t}`], appear: [`appear:${t}`], clone: [`clone:${t}`], summon: [`summon:${t}`],
    transform: [`into:${t}:${v}`], restore: [`restore:${t}`], emote: [`${v}:${t}`], scurry: [`scurry:${t}`], night: ['night'], day: ['day'], rainbow: ['rainbow'], fireworks: ['fireworks'], bubbles: ['bubbles'],
    weather: [`weather:${v}`], season: [`season:${v}`], conjure: [`conjure:${v}`], grow_tree: [`grow:${v || 'tree'}`], fruit_rain: [`fruit_rain:${v}`],
    give: [`give:${t || v}:${a.target2}`], put: [`put:${t}:${a.target2}:${v || 'on'}`], pick_up: [`pick:${t}`], eat: [`eat:${v || t}`], walk_to: [`reach:${t}`], talk_to: [`talk:${t}`],
    read: [`read:${t}`], hit: [`hit:${t}`], jump: ['jump'], broom_on: ['broom'], invisible: ['invisible'],
  };
  const ev = m[a.type] || [];
  return t && !['walk_to', 'talk_to'].includes(a.type) ? [...ev, `spell:${t}`] : ev;
}
const goalHit = (goal: string, ev: string) => goal.split('|').some((g) => { const gp = g.split(':'), ep = ev.split(':'); return gp.length <= ep.length && gp.every((p, i) => p === '*' || p === ep[i]); });

const root = path.resolve(toolDir, '..', 'content');
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean); // ONLY=fruit-market,weather-town
const files = [path.join(root, 'island.json'), ...fs.readdirSync(path.join(root, 'worlds')).sort().map((f) => path.join(root, 'worlds', f))].filter((f) => !ONLY.length || ONLY.some((o) => f.includes(o)));
let errors = 0, warns = 0;
const err = (w: string, m: string) => { errors++; console.log(`  ✗ [${w}] ${m}`); };
const warn = (w: string, m: string) => { warns++; console.log(`  ! [${w}] ${m}`); };

for (const f of files) {
  const w = JSON.parse(fs.readFileSync(f, 'utf8')) as LessonWorld & { tutorial?: any[] };
  console.log(`${w.order} ${w.id} — ${w.grade} — ${w.things.length} things, ${w.npcs.length} npcs, ${w.quests.length} quests`);
  const ids = new Set([...w.things, ...w.npcs].map((t) => t.id));
  if (ids.size !== w.things.length + w.npcs.length) err(w.id, 'duplicate thing/npc id');
  const qids = new Set(w.quests.map((q) => q.id));
  const things: PerceivedThing[] = [...w.things.map((t) => ({ ...t, kind: 'thing' as const })), ...w.npcs.map((n) => ({ ...n, kind: 'npc' as const }))]
    .map((t) => ({ id: t.id, name: t.name, aliases: t.aliases || [], tags: t.tags || [], color: t.color, kind: t.kind, distance: 6, can: t.can || [] }));
  const skills = new Set(w.quests.map((q) => q.skill));
  if (w.quests.length && skills.size < 4) warn(w.id, `only skills ${[...skills].join('')}`);
  for (const q of w.quests) {
    const tag = `${w.id}/${q.id}`;
    if (!ids.has(q.giver)) err(tag, `giver ${q.giver} missing`);
    if (q.needs && !qids.has(q.needs)) err(tag, `needs ${q.needs} missing`);
    if (q.to && !ids.has(q.to)) err(tag, `guide target ${q.to} missing`);
    if ((q.kind === 'listen' || q.kind === 'choose' || (q.kind === 'read' && !q.readAloud)) && (!q.options || q.answer === undefined || q.answer >= q.options.length)) err(tag, 'options/answer invalid');
    if (q.kind === 'listen' && !q.audio) err(tag, 'listen without audio');
    if (q.options && q.answer !== undefined) {
      const self = pickOption(q.options[q.answer], q.options);
      if (self !== q.answer) err(tag, `saying the right option "${q.options[q.answer]}" picks ${self}`);
    }
    if ((q.kind === 'speak' || q.kind === 'write') && q.accept) {
      for (const m of q.model) if (!matchGroups(m, q.accept)) err(tag, `model "${m}" is not accepted by ${JSON.stringify(q.accept)}`);
    }
    if ((q.kind === 'speak' || q.kind === 'write') && !q.accept && !q.judge) err(tag, 'open quest without accept or judge');
    if ((q.kind === 'magic' || q.kind === 'do') && !q.goal) err(tag, 'magic/do without goal');
    if (q.kind === 'magic' || q.kind === 'do' || q.kind === 'guide') {
      const ctx: BrainContext = { worldId: w.id, grade: w.gradeNum, things, holding: null, flying: false, history: [], activeQuest: null };
      const evs: string[] = [];
      for (const m of q.model) {
        const out = ruleBrain(m, { ...ctx, holding: null });
        if (!out.understood) err(tag, `rule brain does not understand "${m}"`);
        else { out.actions.forEach((a) => evs.push(...eventsFor(a).map((e) => e.replace(':undefined', ':' + (out.actions.find((x) => x.type === 'conjure')?.value || ''))))); if (process.env.VERBOSE) console.log(`    ✓ "${m}" → ${out.actions.map((a) => [a.type, a.target, a.value, a.target2].filter(Boolean).join(':')).join(', ')}`); }
      }
      if (q.goal && (q.kind === 'magic' || q.kind === 'do') && !q.goal.startsWith('give:') && !q.goal.startsWith('put:') && !evs.some((e) => goalHit(q.goal!, e))) err(tag, `model sentences ${JSON.stringify(q.model)} never fire goal ${q.goal} (they fire ${evs.join(' ')})`);
    }
  }
  // models, stars, zones, secrets, decor
  const b = (w as any).bounds || 40;
  for (const t of [...w.things, ...w.npcs]) {
    if (!MODELS.has(t.model) && !PROCEDURAL.has(t.model) && !t.model.startsWith('food:')) (PENDING.has(t.model) ? warn : err)(w.id, `${t.id}: model ${t.model} not installed`);
    if (Math.hypot(t.pos[0], t.pos[2]) > b + 2 && t.model !== 'none') warn(w.id, `${t.id} at ${t.pos} is outside bounds ${b}`);
    for (const r of t.reveal || []) { const x = [...w.things, ...w.npcs].find((y) => y.id === r) || ((w as any).words || []).find((y: any) => y.id === r); if (!x) err(w.id, `${t.id} reveals missing ${r}`); else if (!x.hidden) warn(w.id, `${t.id} reveals ${r} which is not hidden`); }
  }
  const wsIds = new Set<string>();
  for (const ws of (w as any).words || []) {
    if (wsIds.has(ws.id) || ids.has(ws.id)) err(w.id, `duplicate id ${ws.id}`); wsIds.add(ws.id);
    if (!ws.say || !ws.zh) err(w.id, `star ${ws.id} needs say + zh`);
    if (Math.hypot(ws.pos[0], ws.pos[1]) > b) warn(w.id, `star ${ws.id} outside bounds`);
    if (ws.hidden && ![...w.things, ...w.npcs].some((t) => (t.reveal || []).includes(ws.id))) err(w.id, `hidden star ${ws.id} is never revealed`);
  }
  for (const d of (w as any).decor || []) if (d.k === 'model' && !MODELS.has(d.m) && !PROCEDURAL.has(d.m)) (PENDING.has(d.m) ? warn : err)(w.id, `decor model ${d.m} not installed`);
  if (w.order > 0 && (w as any).words && (w as any).words.length < 8) warn(w.id, `only ${(w as any).words.length} word stars`);

  for (const s of w.spellIdeas || []) {
    const ctx: BrainContext = { worldId: w.id, grade: w.gradeNum, things, holding: null, flying: false, history: [], activeQuest: null };
    const out = ruleBrain(s.say, ctx);
    // a spell must become magic, not a fallback walk ("Make the dragon statue fly" → walk to it would be wrong)
    if (!out.understood || !out.actions.length || out.actions.some((a) => ['walk_to', 'talk_to', 'look_at', 'forward', 'stop'].includes(a.type))) err(w.id, `spell idea not understood as magic: "${s.say}" → ${JSON.stringify(out.actions)}`);
    if (process.env.SPELLS) console.log(`    ${s.say.padEnd(46)} ${out.actions.map((a) => [a.type, a.target, a.value].filter(Boolean).join(':')).join(' + ')}`);
    if (s.near && !ids.has(s.near)) err(w.id, `spell idea near ${s.near} missing`);
  }
  for (const st of w.tutorial || []) {
    const ctx: BrainContext = { worldId: w.id, grade: w.gradeNum, things, holding: null, flying: false, history: [], activeQuest: null };
    for (const h of st.hint) { const out = ruleBrain(h, ctx); if (!out.understood && !/^Go to/.test(h)) err(w.id, `tutorial hint not understood: "${h}"`); }
  }
}
console.log(`\n${files.length} files, ${errors} errors, ${warns} warnings`);
process.exit(errors ? 1 : 0);
