// Voice casting (Doubao Seed-TTS 2.0). `ctx` is a speaking-style hint (additions.context_texts).
export interface VoiceSpec { voice: string; ctx?: string; speed: number; label: string; pitch?: number }

const EN = {
  kid: 'en_female_stokie_uranus_bigtts', woman: 'en_female_dacey_uranus_bigtts', lady: 'en_female_skye_uranus_bigtts',
  man: 'en_male_michael_uranus_bigtts', youngman: 'en_male_tim_uranus_bigtts', oldman: 'en_male_bruce_uranus_bigtts',
};

export const VOICES: Record<string, VoiceSpec> = {
  // the little wizard
  wizard: { voice: EN.kid, ctx: 'Speak like a cheerful, brave little wizard kid who loves magic: bright, playful and excited.', speed: -5, label: 'Milo', pitch: 1.4 },
  // companions (Chinese + English examples)
  owl: { voice: 'zh_male_ruyayichen_uranus_bigtts', ctx: '像一只博学又慈祥的猫头鹰博士，语气温和、有耐心，带一点点幽默，英文例句读得清楚标准。', speed: 0, label: '咕咕博士' },
  red_panda: { voice: 'zh_female_mengyatou_uranus_bigtts', ctx: '像一只活泼可爱的小熊猫，开心、有活力，常常鼓励小朋友，英文例句读得清楚。', speed: 5, label: '团团' },
  capybara: { voice: 'zh_male_wennuanahu_uranus_bigtts', ctx: '像一只慢悠悠、超级淡定又暖心的水豚，说话不紧不慢，很会安慰人，英文例句读得清楚。', speed: -10, label: '卡皮' },
  baby_dragon: { voice: 'zh_male_naiqimengwa_uranus_bigtts', ctx: '像一只调皮又热情的小火龙宝宝，爱冒险、爱玩魔法，说话带点小得意，英文例句读得清楚。', speed: 5, label: '焰焰' },
  penguin: { voice: 'zh_female_kailangjiejie_uranus_bigtts', ctx: '像一只温柔开朗的小企鹅姐姐，说话亲切、爱笑，英文例句读得清楚。', speed: 0, label: '啾啾' },
  // NPCs (English)
  woman: { voice: EN.woman, ctx: 'Speak like a warm, friendly grown-up woman talking to a child. Clear and kind.', speed: -12, label: 'Woman' },
  lady: { voice: EN.lady, ctx: 'Speak like a gentle, cheerful young lady talking to a child. Clear and slow.', speed: -12, label: 'Lady' },
  teacher: { voice: EN.lady, ctx: 'Speak like a kind primary school English teacher. Clear, slow and encouraging.', speed: -15, label: 'Teacher' },
  man: { voice: EN.man, ctx: 'Speak like a friendly, cheerful man talking to a child. Clear and warm.', speed: -10, label: 'Man' },
  funny: { voice: EN.man, ctx: 'Speak like a funny, energetic TV weatherman. Big and cheerful.', speed: -5, label: 'Weatherman' },
  youngman: { voice: EN.youngman, ctx: 'Speak like a cool, friendly teenage boy. Relaxed and clear.', speed: -8, label: 'Boy' },
  oldman: { voice: EN.oldman, ctx: 'Speak like a kind, slightly forgetful old grandpa. Slow and warm.', speed: -15, label: 'Grandpa' },
  granny: { voice: EN.woman, ctx: 'Speak like a kind, wise old granny healer. Slow, warm and caring.', speed: -18, label: 'Granny' },
  child: { voice: EN.kid, ctx: 'Speak like a sweet little child. Simple and clear.', speed: -10, label: 'Kid' },
  guard: { voice: EN.oldman, ctx: 'Speak like a polite, proud castle guard. Formal but friendly.', speed: -12, label: 'Guard' },
  animal: { voice: EN.youngman, ctx: 'Speak like a funny cartoon animal. Playful and silly.', speed: -5, label: 'Animal' },
  // listening-test narrator
  narrator: { voice: EN.lady, ctx: 'Read clearly and naturally for an English listening test for children.', speed: -15, label: 'Listening' },
};

export function voiceFor(role: string): VoiceSpec {
  return VOICES[role] || VOICES.wizard;
}

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** Stable cache key for a synthesized line (same on client, server and pregen tool). */
export function ttsKey(role: string, text: string): string {
  const v = voiceFor(role);
  const s = `${v.voice}|${v.ctx || ''}|${v.speed}|${text.trim()}`;
  return fnv1a(s, 0x811c9dc5).toString(16).padStart(8, '0') + fnv1a(s, 0x01234567).toString(16).padStart(8, '0');
}

export const COMPANIONS = [
  { id: 'owl', name: '咕咕博士', en: 'Hoot', desc: '博学的猫头鹰博士，什么都知道一点', persona: '一只博学、慈祥、有点幽默的猫头鹰博士' },
  { id: 'red_panda', name: '团团', en: 'Momo', desc: '活泼的小熊猫，最会给你加油', persona: '一只活泼可爱、超会鼓励人的小熊猫' },
  { id: 'capybara', name: '卡皮', en: 'Capy', desc: '超淡定的水豚，慢慢来不着急', persona: '一只慢悠悠、超级淡定、很会安慰人的水豚' },
  { id: 'baby_dragon', name: '焰焰', en: 'Ember', desc: '调皮的小火龙，最爱玩魔法', persona: '一只调皮、热情、最爱魔法和冒险的小火龙宝宝' },
  { id: 'penguin', name: '啾啾', en: 'Pebble', desc: '温柔的小企鹅姐姐，总是笑眯眯', persona: '一只温柔开朗、爱笑的小企鹅姐姐' },
] as const;
