#!/usr/bin/env python3
"""Source of truth for Spell Island's lesson worlds (original stories aligned to textbook topics).
Writes content/island.json and content/worlds/*.json."""
import json, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'content')

import importlib, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'worlds'))
from common import T, N, Q, S, Z
# --only w03,w05 builds just those worlds (handy while several worlds are being edited at once)
ONLY = next((a.split('=', 1)[1] if '=' in a else sys.argv[sys.argv.index(a) + 1] for a in sys.argv[1:] if a.startswith('--only')), '')
mods = sorted(f[:-3] for f in os.listdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'worlds')) if re.match(r'w\d\d_.*\.py$', f))
if ONLY: mods = [m for m in mods if any(m.startswith(o.strip()) for o in ONLY.split(','))]
worlds = [importlib.import_module(m).WORLD for m in mods]

island = dict(id='island', order=0, grade='咒语岛', gradeNum=3, unit='Spell Island · 魔法入门', title='Spell Island', titleZh='咒语岛', scene='island',
  intro=['回到咒语岛啦！每一道传送门通向一篇课文。说“Go to …”就能进去。'],
  vocab=['wake up', 'jump', 'light', 'lamp', 'fly', 'pig', 'cake', 'eat', 'portal'],
  patterns=['Wake up!', 'Light the lamp!', 'Make the pig fly!', 'Make a cake!', 'Go to Rainbow Zoo!'],
  spawn={'pos': [0, 0, 6], 'rot': 3.14159},
  things=[
    T('tower', 'tower', 'wizard_tower', (0, 0, -6), '魔法塔', aliases=['wizard tower', 'magic tower'], radius=3.4, can=['light']),
    T('lamp1', 'lamp', 'lamp_post', (-4, 0, 4), '路灯', aliases=['light', 'lamp post'], radius=0.3, can=['light']),
    T('lamp2', 'lamp', 'lamp_post', (4, 0, 4), '路灯', aliases=['light', 'lamp post'], radius=0.3, can=['light'], label=False),
    T('pig', 'pig', 'pig', (4.5, 0, 0.5), '小猪', aliases=['piggy', 'little pig'], tags=['pink'], color='pink', radius=0.5, can=['fly', 'pick']),
    T('chest', 'treasure chest', 'treasure_chest', (-5.5, 0, 0), '宝箱', aliases=['chest', 'box', 'treasure'], radius=0.6, can=['open', 'fly']),
    T('balloon', 'hot air balloon', 'hot_air_balloon', (14, 0, -4), '热气球', aliases=['balloon'], radius=1.6, can=['fly']),
    T('fountain', 'fountain', 'fountain', (-12, 0, 10), '喷泉', radius=1.6, can=['light']),
    T('bunny', 'rabbit', 'rabbit', (-9, 0, 4), '兔子', aliases=['bunny'], tags=['white'], color='white', radius=0.4, can=['fly', 'pick'], params={'voice': 'animal'}),
    T('kitty', 'cat', 'cat', (9, 0, 9), '猫', aliases=['kitty'], tags=['grey'], color='grey', radius=0.4, can=['fly', 'pick'], params={'voice': 'animal'}),
    T('signpost', 'signpost', 'signpost', (0, 0, 14), '路牌', aliases=['sign', 'board'], radius=0.3, can=['read'], text='Spell Island\nTen magic portals, ten lesson worlds.\nSay: Go to ... !'),
  ],
  npcs=[], quests=[],
  decor=[{'k': 'model', 'm': 'bench', 'at': [-6, 12], 'rot': 0.6, 'solid': 0.9}, {'k': 'model', 'm': 'bench', 'at': [6, 12], 'rot': -0.6, 'solid': 0.9},
    {'k': 'model', 'm': 'flower_bed', 'at': [-3, 9], 'rot': 0}, {'k': 'model', 'm': 'flower_bed', 'at': [3, 9], 'rot': 0},
    {'k': 'model', 'm': 'bush', 'at': [-8, -2]}, {'k': 'model', 'm': 'bush', 'at': [8, -2]}, {'k': 'meadow', 'at': [-14, 2], 'r': 6, 'n': 50}, {'k': 'meadow', 'at': [14, 6], 'r': 6, 'n': 50}],
  spellIdeas=[{'say': 'Make the cat dance!', 'zh': '让小猫跳舞', 'near': 'kitty'}, {'say': 'Make the balloon fly!', 'zh': '让热气球飞起来', 'near': 'balloon'}, {'say': 'Make three rabbits!', 'zh': '变出三只兔子', 'near': 'bunny'}, {'say': 'Make it night!', 'zh': '让天黑下来'}, {'say': 'Fireworks!', 'zh': '放烟花'},{'say': 'Make the pig fly!', 'zh': '让小猪飞起来', 'near': 'pig'}, {'say': 'Open the chest!', 'zh': '打开宝箱', 'near': 'chest'}, {'say': 'Fly!', 'zh': '骑扫帚飞起来'}, {'say': 'Grow a tree!', 'zh': '长出一棵树'}, {'say': 'Make it rain durians!', 'zh': '让天上掉榴莲'}, {'say': 'Be invisible!', 'zh': '隐身'}, {'say': 'Make the tower blue!', 'zh': '把魔法塔变成蓝色', 'near': 'tower'}],
  tutorial=[
    {'say': ['小魔法师 Milo 还在睡觉呢！我们一起大声叫醒他：“Wake up, Milo!”'], 'hint': ['Wake up, Milo!'], 'goal': 'wake'},
    {'say': ['他醒啦！从现在起，他只听你的英语指挥。先让他跳一下：“Jump!”'], 'hint': ['Jump!'], 'goal': 'jump'},
    {'say': ['旁边有一盏路灯。念咒语点亮它：“Light the lamp!”'], 'hint': ['Light the lamp!'], 'goal': 'light:*'},
    {'say': ['看那只小猪！让它飞起来：“Make the pig fly!”'], 'hint': ['Make the pig fly!'], 'goal': 'fly:pig'},
    {'say': ['魔法师肚子饿了，变一个蛋糕出来：“Make a cake!”'], 'hint': ['Make a cake!'], 'goal': 'conjure:*'},
    {'say': ['蛋糕来啦！让他吃掉：“Eat the cake!”'], 'hint': ['Eat the cake!'], 'goal': 'eat:*'},
    {'say': ['魔杖还能让东西活起来！看那只小猫，让它跳舞：“Make the cat dance!”'], 'hint': ['Make the cat dance!'], 'goal': 'dance:kitty'},
    {'say': ['太棒了！你还能让东西变大变小、变颜色、唱歌、睡觉、消失，还能让天黑、放烟花：“Make it night!”“Fireworks!”。', '每个课文世界里都飘着金色的单词星，大声说出来就能收集。现在选一道传送门吧！比如说：“Go to Rainbow Zoo!”'], 'hint': ['Go to Rainbow Zoo!', 'Fireworks!', 'Make the pig big!'], 'goal': 'enter:*'},
  ],
)

os.makedirs(os.path.join(ROOT, 'worlds'), exist_ok=True)
from spellbook import BOOK
for w in worlds + [island]:  # the spell book: each world's own ideas, then its extra lesson spells
    have = {x['say'] for x in w['spellIdeas']}
    w['spellIdeas'] += [{'say': say, 'zh': zh} for say, zh in BOOK.get(w['id'], []) if say not in have]
for w in worlds:
    json.dump(w, open(os.path.join(ROOT, 'worlds', f"{w['order']:02d}-{w['id']}.json"), 'w'), ensure_ascii=False, indent=1)
if not ONLY: json.dump(island, open(os.path.join(ROOT, 'island.json'), 'w'), ensure_ascii=False, indent=1)
print(len(worlds), 'worlds,', sum(len(w['quests']) for w in worlds), 'quests')
