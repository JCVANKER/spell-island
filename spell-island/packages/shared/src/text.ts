// Small, dependency-free text utilities for children's spoken English.

export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black', 'white', 'grey', 'gold', 'silver', 'rainbow'];

export const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwhat's\b/g, 'what is'], [/\bwhere's\b/g, 'where is'], [/\bit's\b/g, 'it is'], [/\bthat's\b/g, 'that is'],
  [/\bthere's\b/g, 'there is'], [/\bi'm\b/g, 'i am'], [/\byou're\b/g, 'you are'], [/\bwe're\b/g, 'we are'],
  [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bdon't\b/g, 'do not'], [/\bdoesn't\b/g, 'does not'],
  [/\bisn't\b/g, 'is not'], [/\bwon't\b/g, 'will not'], [/\blet's\b/g, 'lets'], [/\blet us\b/g, 'lets'],
  [/\bi'll\b/g, 'i will'], [/\byou'll\b/g, 'you will'], [/\bhe's\b/g, 'he is'], [/\bshe's\b/g, 'she is'],
  [/\bi've\b/g, 'i have'], [/\bthey're\b/g, 'they are'], [/\b(\w+)'ll\b/g, '$1 will'], [/\b(\w+)n't\b/g, '$1 not'],
  [/\b(should|could|would|did|does|do|is|are|was|were|has|have|had|ca|wo)nt\b/g, '$1 not'],
];

/** Lowercase, unify quotes, expand contractions, drop punctuation, convert digits to words. */
export function normalize(text: string): string {
  let t = (text || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"');
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  t = t.replace(/(\d+)/g, (m) => {
    const n = parseInt(m, 10);
    const w = Object.entries(NUMBER_WORDS).find(([, v]) => v === n);
    return w ? ` ${w[0]} ` : ` ${m} `;
  });
  t = t.replace(/gray/g, 'grey').replace(/\bcolour/g, 'color').replace(/\bgolden\b/g, 'gold');
  t = t.replace(/[^a-z0-9'一-鿿\s-]/g, ' ').replace(/-/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

const IRREGULAR: Record<string, string> = {
  feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose', children: 'child', people: 'person', men: 'man', women: 'woman',
  leaves: 'leaf', wolves: 'wolf', ran: 'run', went: 'go', saw: 'see', ate: 'eat', grapes: 'grape', footprints: 'footprint',
  humps: 'hump', bigger: 'big', biggest: 'big', taller: 'tall', tallest: 'tall', berries: 'berry',
};

/** Very small lemmatizer: plural nouns -> singular, enough for matching object names. */
const KEEP = new Set(['lets', 'its', 'this', 'yes', 'us', 'was', 'has', 'does', 'is', 'his', 'bus', 'gas', 'grass', 'glass', 'class', 'dress', 'across', 'species', 'thanks', 'always', 'perhaps', 'princess', 'chess', 'boss', 'moss', 'kiss']);
export function lemma(w: string): string {
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (KEEP.has(w)) return w;
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && /(ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
  return w;
}

export function tokens(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ').filter(Boolean) : [];
}

export function lemmas(text: string): string[] {
  return tokens(text).map(lemma);
}

export function hasCJK(text: string): boolean {
  return /[一-鿿]/.test(text || '');
}

/** Ordered Chinese -> English keyword dictionary (longest phrases first): lets a child's Chinese command still work. */
const ZH: [string, string][] = [
  ['你好', 'hello'], ['嗨', 'hi'], ['哈喽', 'hello'], ['谢谢', 'thank you'], ['再见', 'bye'], ['起床', 'wake up'], ['醒醒', 'wake up'], ['醒来', 'wake up'],
  ['变回来', 'turn back'], ['变回', 'turn back'], ['跳舞', 'dance'], ['唱歌', 'sing'], ['发光', 'glow'], ['闪闪发光', 'glow'], ['闪光', 'glow'], ['冻住', 'freeze'], ['冰冻', 'freeze'], ['结冰', 'freeze'], ['融化', 'melt'],
  ['不见', 'disappear'], ['藏起来', 'disappear'], ['复制', 'make more'], ['更多', 'more'], ['好多', 'lots of'], ['很多', 'lots of'], ['抖一抖', 'shake'], ['摇一摇', 'shake'], ['发抖', 'shake'], ['蹦', 'jump'], ['跳一跳', 'jump'], ['跳起来', 'jump'],
  ['睡觉', 'sleep'], ['睡', 'sleep'], ['开心', 'happy'], ['高兴', 'happy'], ['笑', 'happy'], ['难过', 'sad'], ['伤心', 'sad'], ['哭', 'sad'], ['生气', 'angry'], ['惊讶', 'surprised'],
  ['晚上', 'make it night'], ['黑夜', 'make it night'], ['天黑', 'make it night'], ['夜晚', 'make it night'], ['白天', 'make it day'], ['天亮', 'make it day'], ['彩虹', 'rainbow'], ['烟花', 'fireworks'], ['烟火', 'fireworks'], ['泡泡', 'bubbles'], ['跑来跑去', 'run around'],
  ['骑扫帚', 'ride the broom'], ['扫帚', 'broom'], ['飞起来', 'fly'], ['飞', 'fly'], ['降落', 'land'], ['下来', 'get down'], ['隐身', 'invisible'], ['消失', 'disappear'], ['现身', 'appear'], ['出来', 'appear'],
  ['点亮', 'light up'], ['点灯', 'light the lamp'], ['熄灭', 'turn off'], ['关灯', 'turn off the lamp'], ['开门', 'open the door'], ['打开', 'open'], ['关门', 'close the door'], ['关上', 'close'],
  ['变得超大', 'make it giant'], ['超级大', 'giant'], ['变大', 'make it big'], ['变小', 'make it small'], ['变成', 'turn into'], ['变出', 'make a'], ['变一个', 'make a'], ['变', 'make'], ['长出', 'grow'], ['种', 'grow'],
  ['掉下', 'drop'], ['下雨', 'make it rainy'], ['下雪', 'make it snowy'], ['晴天', 'make it sunny'], ['出太阳', 'make it sunny'], ['刮风', 'make it windy'], ['多云', 'make it cloudy'],
  ['春天', 'spring'], ['夏天', 'summer'], ['秋天', 'autumn'], ['冬天', 'winter'], ['转圈', 'spin'], ['治好', 'heal'],
  ['敲', 'hit'], ['打', 'hit'], ['揍', 'hit'], ['跑', 'run'], ['快点', 'run'], ['慢点', 'walk'], ['回家', 'go home'], ['回岛', 'go home'],
  ['拿起', 'pick up'], ['捡起', 'pick up'], ['拿', 'pick up'], ['捡', 'pick up'], ['给', 'give'], ['放在', 'put on'], ['放', 'put'], ['读', 'read'], ['看看', 'look at'],
  ['停下', 'stop'], ['停', 'stop'], ['别动', 'stop'], ['等一下', 'wait'], ['等等', 'wait'],
  ['往前', 'go forward'], ['向前', 'go forward'], ['前进', 'go forward'], ['往后', 'go back'], ['后退', 'go back'], ['回来', 'come back'], ['过来', 'come here'],
  ['左转', 'turn left'], ['向左', 'turn left'], ['往左', 'turn left'], ['左边', 'left'], ['左', 'left'], ['右转', 'turn right'], ['向右', 'turn right'], ['往右', 'turn right'], ['右边', 'right'], ['右', 'right'],
  ['跳', 'jump'], ['吃', 'eat'], ['和', 'and'], ['跟', 'talk to'], ['说话', 'talk'], ['去', 'go to'], ['走', 'go'],
  ['蛋糕', 'cake'], ['苹果', 'apple'], ['香蕉', 'banana'], ['橙子', 'orange'], ['梨', 'pear'], ['西瓜', 'watermelon'], ['葡萄', 'grapes'], ['榴莲', 'durian'], ['草莓', 'strawberry'], ['冰淇淋', 'ice cream'], ['披萨', 'pizza'], ['面包', 'bread'], ['糖果', 'candy'],
  ['小猪', 'pig'], ['猪', 'pig'], ['小狗', 'dog'], ['狗', 'dog'], ['小猫', 'cat'], ['猫', 'cat'], ['鸭子', 'duck'], ['熊猫', 'panda'], ['猴子', 'monkey'], ['兔子', 'rabbit'], ['大象', 'elephant'], ['长颈鹿', 'giraffe'], ['斑马', 'zebra'], ['狮子', 'lion'], ['老虎', 'tiger'], ['熊', 'bear'], ['鹦鹉', 'parrot'], ['小鸟', 'bird'], ['鸟', 'bird'], ['青蛙', 'frog'], ['绵羊', 'sheep'], ['羊', 'sheep'], ['马', 'horse'],
  ['天鹅', 'swan'], ['小鹿', 'deer'], ['鹿', 'deer'], ['松鼠', 'squirrel'], ['鱼', 'fish'], ['恐龙', 'dinosaur'], ['小龙', 'dragon'], ['龙', 'dragon'], ['企鹅', 'penguin'], ['猫头鹰', 'owl'], ['雪人', 'snowman'], ['南瓜', 'pumpkin'],
  ['公交车', 'bus'], ['巴士', 'bus'], ['自行车', 'bike'], ['出租车', 'taxi'], ['钢琴', 'piano'], ['小提琴', 'violin'], ['吉他', 'guitar'], ['鼓', 'drums'], ['钟', 'clock'], ['地球仪', 'globe'], ['电脑', 'computer'], ['热气球', 'balloon'], ['喷泉', 'fountain'], ['长椅', 'bench'],
  ['大树', 'big tree'], ['树', 'tree'], ['花', 'flower'], ['河', 'river'], ['湖', 'lake'], ['桥', 'bridge'], ['船', 'boat'], ['山', 'mountain'],
  ['灯笼', 'lantern'], ['路灯', 'lamp'], ['灯', 'lamp'], ['门', 'door'], ['书', 'book'], ['桌子', 'desk'], ['椅子', 'chair'], ['书包', 'schoolbag'], ['铅笔盒', 'pencil box'], ['黑板', 'blackboard'], ['伞', 'umbrella'], ['风筝', 'kite'], ['宝箱', 'chest'], ['箱子', 'box'],
  ['塔', 'tower'], ['传送门', 'portal'], ['博物馆', 'museum'], ['邮局', 'post office'], ['医院', 'hospital'], ['电影院', 'cinema'], ['书店', 'bookstore'], ['城堡', 'castle'],
  ['红色', 'red'], ['红', 'red'], ['蓝色', 'blue'], ['蓝', 'blue'], ['黄色', 'yellow'], ['黄', 'yellow'], ['绿色', 'green'], ['绿', 'green'],
  ['白色', 'white'], ['白', 'white'], ['黑色', 'black'], ['黑', 'black'], ['棕色', 'brown'], ['紫色', 'purple'], ['紫', 'purple'], ['粉色', 'pink'], ['粉', 'pink'], ['橙色', 'orange'], ['金色', 'gold'], ['银色', 'silver'], ['灰色', 'grey'],
  ['很大', 'big'], ['大', 'big'], ['小', 'small'], ['高', 'tall'],
  ['是的', 'yes'], ['是', 'yes'], ['对', 'yes'], ['好的', 'okay'], ['好', 'okay'], ['可以', 'yes'], ['不要', 'no'], ['不是', 'no'], ['不', 'no'], ['没有', 'no'],
  ['一个', 'a'], ['两个', 'two'], ['三个', 'three'], ['一', 'one'], ['二', 'two'], ['两', 'two'], ['三', 'three'], ['四', 'four'], ['五', 'five'], ['六', 'six'], ['七', 'seven'], ['八', 'eight'], ['九', 'nine'], ['十', 'ten'],
];

/** Translate Chinese keywords inside a sentence to English keywords (keeping any English already there). */
export function zhToEnglishKeywords(text: string): string {
  const src = text || '';
  const found: { at: number; en: string; len: number }[] = [];
  const used = new Array(src.length).fill(false);
  for (const [zh, en] of ZH) {
    let from = 0;
    while (true) {
      const i = src.indexOf(zh, from);
      if (i < 0) break;
      let free = true;
      for (let k = i; k < i + zh.length; k++) if (used[k]) { free = false; break; }
      if (free) {
        for (let k = i; k < i + zh.length; k++) used[k] = true;
        found.push({ at: i, en, len: zh.length });
      }
      from = i + zh.length;
    }
  }
  const latin = src.replace(/[一-鿿]/g, ' ');
  found.sort((a, b) => a.at - b.at);
  return (found.map((f) => f.en).join(' ') + ' ' + latin).replace(/\s+/g, ' ').trim();
}

export function containsAny(lem: string[], words: string[]): string | null {
  for (const w of words) {
    const parts = lemmas(w);
    if (parts.length === 0) continue;
    if (parts.length === 1) {
      if (lem.includes(parts[0])) return w;
    } else if (isSubsequence(parts, lem, true)) return w;
  }
  return null;
}

/** Is `needle` a subsequence of `hay`? With contiguous=true it must appear as a contiguous run. */
export function isSubsequence(needle: string[], hay: string[], contiguous = false): boolean {
  if (contiguous) {
    outer: for (let i = 0; i + needle.length <= hay.length; i++) {
      for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
      return true;
    }
    return false;
  }
  let j = 0;
  for (const h of hay) if (h === needle[j]) j++;
  return j === needle.length;
}

const FUNCTION_WORDS = new Set(['the', 'a', 'an', 'lets', 'let', 'i', 'think', 'you', 'can', 'it', 'is', 'am', 'are', 'just', 'some', 'please', 'okay', 'ok', 'lumi', 'oh', 'um', 'uh', 'hey', 'now', 'and', 'so']);

/** True if the child's sentence already contains the core of the model sentence, in order. */
export function closeEnough(child: string, model: string): boolean {
  const c = lemmas(child).filter((w) => !FUNCTION_WORDS.has(w));
  const m = lemmas(model).filter((w) => !FUNCTION_WORDS.has(w));
  if (m.length === 0) return true;
  return isSubsequence(m, c);
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function wordCount(text: string): number {
  return tokens(text).filter((w) => /[a-z]/.test(w)).length;
}

export function findNumber(lem: string[]): number | null {
  for (const w of lem) {
    if (w in NUMBER_WORDS) return NUMBER_WORDS[w];
    if (/^\d+$/.test(w)) return parseInt(w, 10);
  }
  return null;
}

export function findColor(lem: string[]): string | null {
  for (const w of lem) if (COLORS.includes(w)) return w;
  return null;
}

// Very small child-safety word list (server applies a fuller check on LLM output too).
const BAD = ['kill', 'die', 'dead', 'blood', 'stupid', 'idiot', 'shut up', 'hate you', 'gun', 'fuck', 'shit', 'damn', 'bitch', 'sex', '傻', '笨蛋', '滚', '去死', '妈的'];
export function isUnsafe(text: string): boolean {
  const t = ' ' + normalize(text) + ' ';
  const raw = text || '';
  return BAD.some((b) => (/[一-鿿]/.test(b) ? raw.includes(b) : t.includes(' ' + b + ' ')));
}

const PERSONAL = /(where do you live|your (address|school|phone|number)|what school|phone number|address|which school|你家在哪|电话|学校在哪|住在哪)/i;
export function asksPersonalInfo(text: string): boolean {
  return PERSONAL.test(text || '');
}
