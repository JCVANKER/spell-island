// The companion's teaching voice (Chinese, with English examples in “quotes”).
// Socratic "least help first" ladder, one rung per intervention:
//   1. notice + goal question   2. sentence frame   3. choose one of two   4. model + echo
// Lines are deterministic so they can be pre-synthesised; with an LLM the server phrases 1-3 freshly.
import type { QuestDef } from './types';

export interface CoachSituation {
  kind: 'quest' | 'explore' | 'chinese' | 'praise' | 'welcome' | 'arrive';
  level: number; // 1..4
  quest?: Pick<QuestDef, 'kind' | 'titleZh' | 'prompt' | 'model' | 'options'>;
  giverName?: string;
  model?: string;
  distractor?: string;
  companion?: string; // the companion's name, e.g. 团团
}

const q = (s: string) => `“${s}”`;

export function frameOf(sentence: string): string {
  const words = sentence.replace(/[.!?]+$/, '').split(/\s+/);
  if (words.length < 2) return '';
  words[words.length - 1] = '___';
  return words.join(' ') + (sentence.trim().endsWith('?') ? '?' : '.');
}

export function coachLine(s: CoachSituation): string {
  const L = Math.max(1, Math.min(4, s.level));
  const model = s.model || s.quest?.model?.[0] || '';
  switch (s.kind) {
    case 'welcome':
      return `嗨！我是${s.companion || '你的小伙伴'}，会一直陪着你。麦克风一直开着，你直接用英语跟小魔法师说话就行。不会的时候，点我旁边的“求助”。`;
    case 'praise':
      return '你看，你自己做到了！这句说得真棒，继续加油！';
    case 'chinese':
      return model ? `意思完全对！试试用英语说：${q(model)} 说错了也没关系，敢开口就很棒。` : '我懂你的意思！试着用英语说一说，哪怕一个词也很棒。';
    case 'explore':
      if (L <= 1) return '想一想，你想让小魔法师去哪儿？可以说：“Go to the …”，后面接一个你看到的东西。';
      if (L === 2) return '你也可以让他施魔法！比如：“Make the … fly!” 或者 “Light the lamp!”';
      return `我们一起说：${q(model || 'Go to the tree.')} 你来说一遍！`;
    case 'arrive':
      return '我们到啦！头上有感叹号的人在等你帮忙，去跟他们说话吧。';
    case 'quest':
    default: {
      const k = s.quest?.kind;
      const who = s.giverName || '他';
      const frame = model ? frameOf(model) : '';
      if (k === 'listen') {
        if (L <= 2) return `先别急着选，再仔细听一遍。听到了哪些关键词？想好了就说出 A、B 还是 C。`;
        return s.quest?.options ? `我们排除一下：想想哪一个选项和你听到的不一样？` : '再听一次，抓住关键词。';
      }
      if (k === 'read') {
        if (L <= 2) return '先把卡片上的句子慢慢读一遍，找找和问题有关的那个词。';
        return model ? `可以这样读：${q(model)} 一个词一个词来！` : '一个词一个词慢慢读，读错也没关系！';
      }
      if (k === 'write') {
        if (L === 1) return `想想${s.quest?.titleZh ? `“${s.quest.titleZh}”` : '这道题'}要写什么？先在心里说一遍，再一个字母一个字母写。`;
        if (L === 2) return frame ? `开头可以这样写：${q(frame)} 空格里填什么？` : '先写出最关键的那个词！';
        if (L === 3 && s.distractor && model) return `你觉得是${q(model)}，还是${q(s.distractor)}？`;
        return model ? `答案可以是：${q(model)} 照着写一遍试试！` : '照着提示写一遍试试！';
      }
      if (k === 'choose') {
        if (L <= 2) return '把每个选项都读一读，哪一个最合适？说出 A、B 或者 C 就行。';
        return '先去掉一个最不可能的，再在剩下的里面选！';
      }
      if (k === 'magic' || k === 'do') {
        if (L === 1) return `我们要做什么呢？${s.quest?.titleZh ? `任务是“${s.quest.titleZh}”。` : ''}想一想，要对小魔法师说哪句咒语？`;
        if (L === 2) return frame ? `咒语的开头是：${q(frame)} 后面接什么？` : '咒语一般用 “Make the …” 开头哦！';
        if (L === 3 && s.distractor && model) return `是${q(model)}，还是${q(s.distractor)}？大声念出来！`;
        return model ? `跟我念咒语：${q(model)}` : '大声念出咒语，魔法就会生效！';
      }
      if (k === 'guide') {
        if (L <= 2) return `${who}要你带路！先告诉小魔法师往哪走：“Go straight”、“Turn left” 或者 “Go to the …”。`;
        return model ? `可以这样说：${q(model)}` : '一步一步来，说一句走一段！';
      }
      // speak
      if (L === 1) return s.quest?.prompt ? `${who}在问你：${q(s.quest.prompt)} 你听懂了吗？他想知道什么？` : `${who}在等你回答呢。你觉得他想知道什么？`;
      if (L === 2) return frame ? `回答可以这样开头：${q(frame)} 空格里说什么？` : '可以用问题里的词来回答，试试看！';
      if (L === 3 && s.distractor && model) return `你觉得是${q(model)}，还是${q(s.distractor)}？选一个说出来！`;
      return model ? `你可以这样说：${q(model)} 来，说给${who}听！` : '大胆说一个词就好！';
    }
  }
}

/** System prompt for the LLM version of the companion. */
export function companionSystem(name: string, persona: string): string {
  return [
    `你是“${name}”，${persona}。你是中国小朋友在英语魔法冒险游戏《咒语岛》里的伙伴兼老师，像顶尖的少儿英语教育专家一样陪伴孩子。`,
    '孩子用英语语音指挥小魔法师 Milo：走路、和 NPC 说话、施魔法（让东西飞起来、变颜色、变出食物、长树、下雨…），完成听说读写任务。',
    '引导原则：苏格拉底式提问——先问孩子“我们要做什么”，让他自己想；按给定的帮助等级（1 提问→2 句子开头→3 二选一→4 示范）只给这一级的帮助；',
    '表扬努力和方法，不说“错了”，说“差一点”“再试试”；每次 1~2 句，不超过 45 个汉字（英文例句另算），英文例句用中文引号“”括起来；',
    '可以时不时提醒孩子能用英语施的有趣魔法；只用游戏给出的任务和句子，不编造新任务；不问孩子隐私；语气要符合你的角色性格。',
    '只输出 JSON：{"line": "你要对孩子说的话"}',
  ].join('\n');
}
