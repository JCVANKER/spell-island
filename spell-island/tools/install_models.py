#!/usr/bin/env python3
"""Copy finished GLBs into apps/web/public/models and write the manifest.
Source priority per model: Tripo3D v3.1 (spell-assets/tripo/opt) → older Seed3D batch (spell-assets/opt) → lumi-assets/opt.
Re-run any time while a batch is still generating; missing models fall back to procedural ones."""
import json, os, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'apps/web/public/models')
NEW = '/home/claude/spell-assets'
SOURCES = [os.path.join(NEW, 'tripo', 'opt'), os.path.join(NEW, 'opt'), '/home/claude/lumi-assets/opt']
# creatures and people breathe / bob when they have no skeleton
ALIVE = {'wizard', 'owl', 'red_panda', 'capybara', 'baby_dragon', 'penguin', 'pig', 'zookeeper', 'duck', 'cat', 'dog', 'panda', 'monkey', 'rabbit',
         'fruit_seller', 'teacher', 'student', 'weatherman', 'girl_raincoat', 'ranger', 'snowman', 'girl_scarf', 'tourist', 'guitar_boy', 'dancer_girl',
         'healer', 'sick_boy', 'guard', 'guide', 'elephant_mom', 'baby_elephant', 'giraffe', 'zebra', 'lion',
         'tiger', 'brown_bear', 'parrot', 'frog', 'sheep', 'horse', 'shopper_girl', 'granny', 'girl_sunhat', 'swan', 'deer', 'squirrel', 'fish', 'police_officer', 'art_girl', 'sick_girl'}
WOBBLE = {'flowers': 0.5, 'fruit_tree': 0.35, 'berry_bush': 0.4, 'acacia': 0.2, 'kite': 0.3, 'bush': 0.25, 'flower_bed': 0.3, 'potted_plant': 0.3,
          'herb_plant': 0.35, 'scarecrow': 0.15, 'round_tree': 0.15, 'pine': 0.1}
NO_SHADOW = {'broom'}  # held in the hand / under the hero
# Tripo models face +X (yaw -90° turns them to +Z); profile-drawn animals face the other way round
YAW = {**{a: 3.1416 for a in ('elephant_mom', 'baby_elephant', 'giraffe', 'pig', 'tiger', 'brown_bear', 'horse', 'fish', 'lion', 'dog', 'deer', 'zebra')},
       'swan': 0.0, 'cannon': 0.0}

os.makedirs(OUT, exist_ok=True)
jobs = {j['id']: j for j in json.load(open(os.path.join(NEW, 'jobs.json')))}
man, origin = {}, {}
for jid, j in jobs.items():
    src = next((os.path.join(d, f'{jid}.glb') for d in SOURCES if os.path.exists(os.path.join(d, f'{jid}.glb'))), None)
    if not src: continue
    shutil.copy2(src, os.path.join(OUT, f'{jid}.glb'))
    origin[jid] = 'tripo' if '/tripo/' in src else 'old'
    e = {'file': f'{jid}.glb', 'h': j['h']}
    if jid in ALIVE: e['alive'] = True
    if jid in WOBBLE: e['wobble'] = WOBBLE[jid]
    if jid in YAW: e['yaw'] = YAW[jid]
    elif origin[jid] == 'tripo': e['yaw'] = -1.5708  # Tripo (align_image) faces +X; the game wants +Z
    if jid in NO_SHADOW: e['shadow'] = 0
    man[jid] = e
for f in os.listdir(OUT):  # remove stale files
    if f.endswith('.glb') and f[:-4] not in man: os.remove(os.path.join(OUT, f))
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
size = sum(os.path.getsize(os.path.join(OUT, m['file'])) for m in man.values()) / 1e6
print(f'{len(man)} models ({size:.1f} MB): {sum(v == "tripo" for v in origin.values())} Tripo, {sum(v == "old" for v in origin.values())} older; missing {len(jobs) - len(man)}')
